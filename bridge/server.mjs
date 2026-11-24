#!/usr/bin/env node
// Nts bridge: lets the PWA use your Claude subscription through the local `claude` CLI.
// Run: node bridge/server.mjs   (no dependencies)
import http from 'node:http';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { homedir, tmpdir } from 'node:os';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { logUsage, fromClaude, fromGemini, estimate, usageSummary, checkCap, hash, cget, cput, noiseOf, sameKey, tesseract } from './thrift.mjs';

const CONF_DIR = join(homedir(), '.config', 'hizli-note');
const CONF_FILE = join(CONF_DIR, 'bridge.json');
const WORK_DIR = join(tmpdir(), 'hizli-note-bridge'); // empty cwd so no project CLAUDE.md is loaded

function loadConfig() {
  mkdirSync(CONF_DIR, { recursive: true });
  mkdirSync(WORK_DIR, { recursive: true });
  let conf = {};
  if (existsSync(CONF_FILE)) conf = JSON.parse(readFileSync(CONF_FILE, 'utf8'));
  conf.port ??= 8787;
  conf.token ??= randomBytes(18).toString('base64url');
  conf.origins ??= ['https://mohamedattiadev.github.io'];
  conf.askModel ??= 'sonnet';
  conf.organizeModel ??= 'haiku';
  conf.ai ??= 'claude'; // 87: which CLI answers (claude | codex | gemini), chosen in the app
  conf.dailyTokens ??= 1000000; // 148: background AI jobs wait for tomorrow past this (0 = no cap); set in the app's settings
  writeFileSync(CONF_FILE, JSON.stringify(conf, null, 2), { mode: 0o600 });
  return conf;
}
const conf = loadConfig();
// systemd starts us with a short PATH: add the usual per-user bin folders so `codex` / `gemini` from npm -g are found (87)
process.env.PATH = [...new Set([...(process.env.PATH || '').split(':'), ...['.local/bin', '.npm-global/bin', '.bun/bin', '.volta/bin', '.deno/bin'].map(d => join(homedir(), d)), '/usr/local/bin'].filter(Boolean))].join(':');

// the address phones use: a `tailscale serve` entry that points at this bridge (cached for a minute)
let remoteCache = { at: 0, url: null };
function remoteUrl() {
  if (Date.now() - remoteCache.at < 60e3) return Promise.resolve(remoteCache.url);
  return new Promise(res => execFile('tailscale', ['serve', 'status', '--json'], { timeout: 4000 }, (err, out) => {
    let url = conf.remoteUrl || null;
    if (!url && !err) try {
      const web = JSON.parse(out || '{}').Web || {};
      for (const [host, v] of Object.entries(web)) {
        if (Object.values(v.Handlers || {}).some(h => new RegExp(`^https?://(127\\.0\\.0\\.1|localhost):${conf.port}/?$`).test(h.Proxy || ''))) { url = 'https://' + host.replace(/:443$/, ''); break; }
      }
    } catch { }
    remoteCache = { at: Date.now(), url }; res(url);
  }));
}

// ---- inbox: things sent from this PC (hn CLI, file manager, hotkey) until a device picks them up ----
const INBOX = join(CONF_DIR, 'inbox'), INBOX_IDX = join(INBOX, 'index.json');
mkdirSync(INBOX, { recursive: true });
const readInbox = () => existsSync(INBOX_IDX) ? JSON.parse(readFileSync(INBOX_IDX, 'utf8')) : [];
const writeInbox = list => writeFileSync(INBOX_IDX, JSON.stringify(list));
const rid = () => Date.now().toString(36) + randomBytes(3).toString('hex');
function addInbox({ text = '', files = [], source }) {
  const e = { id: rid(), ts: Date.now(), text, files: [], ...(source === 'web' ? { source } : {}) }; // 95g: 'web' = the browser extension
  for (const f of files) {
    const fid = rid(); writeFileSync(join(INBOX, fid), Buffer.from(f.data, 'base64'));
    e.files.push({ fid, name: f.name, mime: f.mime || '', size: f.size || 0 });
  }
  writeInbox([...readInbox(), e]); return e;
}
function ackInbox(ids) {
  const keep = [], list = readInbox();
  for (const e of list) { if (ids.includes(e.id)) e.files.forEach(f => { try { unlinkSync(join(INBOX, f.fid)); } catch { } }); else keep.push(e); }
  writeInbox(keep);
}

// ---- AI runner (one job at a time): Claude Code, Codex or Gemini CLI (87) ----
const AIS = { claude: 'Claude', codex: 'Codex', gemini: 'Gemini' };
const which = cmd => new Promise(ok => execFile('sh', ['-c', `command -v ${cmd}`], { timeout: 3000 }, e => ok(!e)));
let haveCache = { at: 0, v: null };
async function haveAIs() {
  if (Date.now() - haveCache.at < 60e3 && haveCache.v) return haveCache.v;
  const v = {}; for (const k of Object.keys(AIS)) v[k] = await which(k);
  haveCache = { at: Date.now(), v }; return v;
}
let chain = Promise.resolve();
// 148: every call is counted (~/.local/share/nts/usage.jsonl); background jobs stop at the daily cap
function runClaude(opts) {
  checkCap(opts.kind, conf.dailyTokens);
  return conf.ai === 'codex' || conf.ai === 'gemini' ? runOther(conf.ai, opts) : runClaudeCli(opts);
}
const retry = async opts => { try { return await runClaude(opts); } catch (e) { if (e.code === 'limit') throw e; return await runClaude(opts); } };
// Codex / Gemini have no loose-schema flag like claude --json-schema: the schema goes into the prompt and the JSON is cut out of the reply
const pickJson = t => { const s = String(t).replace(/^```(?:json)?\s*|\s*```$/g, '').trim(); try { return JSON.parse(s); } catch { } const a = s.indexOf('{'), b = s.lastIndexOf('}'); return JSON.parse(s.slice(a, b + 1)); };
function runOther(ai, { prompt, system, schema, readDir, kind, n }) {
  const job = chain.then(() => new Promise((resolve, reject) => {
    const full = `${system}\n\n${schema ? `Reply with ONLY one JSON object (no prose, no code fence) that matches this JSON schema:\n${JSON.stringify(schema)}\n\n` : ''}${prompt}`;
    const imgs = readDir ? [...new Set(prompt.match(new RegExp(WORK_DIR.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/[\\w.-]+', 'g')) || [])] : [];
    const outFile = join(WORK_DIR, `last-${rid()}.txt`);
    const [cmd, args] = ai === 'codex'
      ? ['codex', ['exec', '--skip-git-repo-check', '--ephemeral', '-s', 'read-only', '-C', WORK_DIR, '-o', outFile, ...imgs.flatMap(f => ['-i', f]), '-']]
      : ['gemini', ['--output-format', 'json', '-p', 'Follow the instructions given on standard input.']];
    const p = spawn(cmd, args, { cwd: WORK_DIR, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '', err = '';
    const timer = setTimeout(() => { p.kill('SIGKILL'); reject(new Error(`${ai} timeout`)); }, 240000);
    p.stdout.on('data', d => out += d); p.stderr.on('data', d => err += d);
    p.on('error', e => { clearTimeout(timer); reject(new Error(e.code === 'ENOENT' ? `${AIS[ai]} bu bilgisayarda kurulu değil. Kur ya da Ayarlar'dan başka bir yapay zekâ seç.` : e.message)); });
    p.on('close', code => {
      clearTimeout(timer);
      try {
        let text = out;
        if (ai === 'codex') { text = existsSync(outFile) ? readFileSync(outFile, 'utf8') : ''; try { unlinkSync(outFile); } catch { } }
        else { const j = JSON.parse(out); if (j.error) throw new Error(j.error.message || 'gemini error'); text = j.response ?? ''; const u = fromGemini(j); if (u.in || u.out) logUsage({ kind, ai, n, ...u }); }
        if (ai === 'codex') logUsage({ kind, ai, n, in: estimate(full) + imgs.length * 1600, out: estimate(text), est: true });
        if (!text.trim()) throw new Error('empty');
        resolve(schema ? pickJson(text) : text.trim());
      } catch { reject(new Error(`${ai} exit ${code}: ${(err || out).slice(-400)}`)); }
    });
    p.stdin.end(full);
  }));
  chain = job.catch(() => {});
  return job;
}
function runClaudeCli({ prompt, system, schema, model, readDir, kind, n }) {
  const job = chain.then(() => new Promise((resolve, reject) => {
    const args = ['-p', '--model', model, '--output-format', 'json', '--tools', readDir ? 'Read' : '',
      ...(readDir ? ['--allowedTools', `Read(${readDir}/**)`, '--max-turns', '12'] : []),
      '--no-session-persistence', '--strict-mcp-config', '--disable-slash-commands',
      '--setting-sources', '', '--system-prompt', system];
    if (schema) args.push('--json-schema', JSON.stringify(schema));
    const p = spawn('claude', args, { cwd: WORK_DIR, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '', err = '';
    const timer = setTimeout(() => { p.kill('SIGKILL'); reject(new Error('claude timeout')); }, 180000);
    p.stdout.on('data', d => out += d);
    p.stderr.on('data', d => err += d);
    p.on('error', e => { clearTimeout(timer); reject(e); });
    p.on('close', code => {
      clearTimeout(timer);
      try {
        const j = JSON.parse(out);
        logUsage({ kind, ai: 'claude', model, n, ...fromClaude(j) });
        if (j.is_error) return reject(new Error(j.result || 'claude error'));
        resolve(schema ? (j.structured_output ?? JSON.parse(j.result)) : j.result);
      } catch { reject(new Error(`claude exit ${code}: ${(err || out).slice(0, 400)}`)); }
    });
    p.stdin.end(prompt);
  }));
  chain = job.catch(() => {});
  return job;
}

const localTime = ts => new Date(ts).toLocaleString('sv-SE', { hour12: false }).slice(0, 16); // PC's own timezone
// 148: organize only needs the start of a long text to title and tag it (L = shorter limits)
const LONG = { text: 1500, content: 3000, ocr: 1500 }, SHORT = { text: 900, content: 1500, ocr: 800 };
const compact = (items, L = LONG) => items.map(i => ({
  id: i.id, date: i.ts ? localTime(i.ts) : undefined, type: i.type,
  title: i.title || undefined, text: (i.text || '').slice(0, L.text) || undefined, url: i.url || undefined,
  file: i.fileName || undefined, content: i.content ? i.content.slice(0, L.content) : undefined, image: i._imgPath || undefined, ocr: i.ocr ? i.ocr.slice(0, L.ocr) : undefined,
  tags: i.tags?.length ? i.tags : undefined, summary: L === LONG && i.summary || undefined,
  page: i.meta ? [i.meta.title, i.meta.description].filter(Boolean).join(' — ').slice(0, 400) : undefined,
}));

// 148: the same question on the same items the same day → the answer from before, no call
async function once(tag, parts, opts) {
  const k = hash(tag, conf.ai, opts.model, ...parts), hit = cget(k);
  if (hit) { logUsage({ kind: opts.kind, local: true, n: 1, saved: estimate(opts.prompt) }); return hit; }
  const r = await runClaude(opts); cput(k, r); return r;
}
// groups whose content is unchanged come from the cache by content; the rest go in one call; answers keep the asked keys
async function perGroup(tag, groups, contentOf, valueOf, run) {
  const out = [], send = [], keys = new Map(); let saved = 0;
  for (const g of groups) {
    const k = hash(tag, conf.ai, contentOf(g)), hit = cget(k);
    if (hit !== undefined) { out.push({ ...hit, key: g.key }); saved += estimate(JSON.stringify(contentOf(g))); }
    else { keys.set(g.key, k); send.push(g); }
  }
  if (out.length) logUsage({ kind: tag === 'sum' ? 'summaries' : 'folders', local: true, n: out.length, saved });
  if (!send.length) return { items: out };
  const r = await run(send);
  for (const x of r.items || []) { const k = keys.get(x.key); if (k && valueOf(x)) { const { key, ...keep } = x; cput(k, keep); } }
  return { ...r, items: [...out, ...(r.items || [])] };
}

const ORGANIZE_SCHEMA = {
  type: 'object', required: ['items'],
  properties: {
    items: { type: 'array', items: {
      type: 'object', required: ['id', 'title', 'summary', 'tags'],
      properties: {
        id: { type: 'string' },
        title: { type: 'string', description: 'short clear title, same language as content' },
        summary: { type: 'string', description: 'one sentence: what it is and why it matters' },
        tags: { type: 'array', items: { type: 'string' }, description: '1-3 broad topic tags, reuse existing ones' },
        related: { type: 'array', items: { type: 'string' }, description: 'ids of clearly related items in this batch' },
        todo: { type: 'object', required: ['text'], description: 'ONLY if the item is something the person must do (task, appointment, reminder, errand). Omit otherwise.',
          properties: { text: { type: 'string', description: 'short task in the item language, e.g. "Diş randevusu"' },
            due: { type: 'string', description: 'local date "YYYY-MM-DD" or date-time "YYYY-MM-DDTHH:mm" if a day/time is stated or clearly implied (yarın, cuma, 10:30), resolved from "Now"; omit if none' } } },
        lists: { type: 'array', items: { type: 'string', enum: ['bakilacak', 'begendim', 'onemli'] },
          description: 'smart lists, zero or more: bakilacak = to read/watch/check later (articles, videos, tools to try); begendim = something the person liked/inspiration (designs, quotes, products); onemli = important to keep (documents, IDs, contracts, receipts, passwords hints, key decisions)' },
        ocr: { type: 'string', description: 'ONLY for an "image" file (photo, screenshot, scanned page): the readable text you see in it, verbatim, in reading order (signs, receipts, documents, UI text), max ~1500 characters; empty string if there is no text' },
        labels: { type: 'array', items: { type: 'string' }, description: 'ONLY for an "image" file: 3-6 short lowercase Turkish words for what is SEEN in it, for search: main objects, colours, style (e.g. kedi, deniz, mavi, siyah-beyaz, logo, ekran-görüntüsü, el-yazısı, grafik); no sentences' },
        project: { type: 'string', description: 'name of a clear ongoing project or product this belongs to (lowercase, e.g. poultrycare), reuse an existing project name; omit if none' },
      } } },
  },
};

// 148: what reaches the AI is only what needs it: noise is answered here, a result seen before comes from the cache,
// the same content twice in a batch goes once, text-heavy images go as tesseract text instead of a picture
async function organize(items, existingTags, projects = []) {
  const out = [], send = [], firstOf = new Map(), twins = [], keys = new Map(), tess = new Map(); let saved = 0;
  const orgKey = i => hash('org', conf.ai, conf.organizeModel, i.type, i.url || '', i.text || '', i.title || '', i.fileName || '', (i.content || '').slice(0, 1500), i.ocr || '', i.image ? hash(i.image) : '', i.ts ? localTime(i.ts).slice(0, 10) : '');
  for (const i of items) {
    const quiet = noiseOf(i); if (quiet) { out.push(quiet); saved += estimate(JSON.stringify(compact([i], SHORT))); continue; }
    const k = orgKey(i), hit = cget(k);
    if (hit) { out.push({ ...hit, id: i.id }); saved += estimate(JSON.stringify(compact([i], SHORT))) + (i.image ? 1600 : 0); continue; }
    const s = sameKey(i);
    if (s && firstOf.has(s)) { twins.push([i.id, firstOf.get(s), k]); saved += estimate(JSON.stringify(compact([i], SHORT))); continue; }
    if (s) firstOf.set(s, i.id);
    keys.set(i.id, k); send.push(i);
  }
  const local = items.length - send.length;
  if (local) logUsage({ kind: 'organize', local: true, n: local, saved });
  if (!send.length) return { items: [...out, ...twins.map(([id, from]) => ({ ...out.find(x => x.id === from), id }))] };
  for (const i of send) if (i.archive && i.text) i.text = i.text.slice(0, 500); // an old chat archive: the gist is enough for a title and tags
  // images come as small base64 JPEGs; write them where the read-only Read tool may look
  for (const i of send) if (i.image) {
    const p = join(WORK_DIR, `img-${String(i.id).replace(/\W/g, '')}.jpg`); writeFileSync(p, Buffer.from(i.image, 'base64')); delete i.image;
    const text = await tesseract(p).catch(() => null);
    if (text) { tess.set(i.id, text); i.ocr = text; try { unlinkSync(p); } catch { } } // a screenshot / receipt / page: its text is enough
    else i._imgPath = p;
  }
  if (tess.size) logUsage({ kind: 'organize', local: true, n: 0, saved: tess.size * 1600 });
  const hasImg = send.some(i => i._imgPath);
  items = send;
  const system = 'You organize a person\'s saved notes, links and files (things they sent to themselves). ' +
    'For each item give a short title, a one-sentence summary and 1-3 lowercase Turkish topic tags. ' +
    'TAG RULES: keep the whole tag set small and reusable, like folders. ALWAYS reuse an existing tag when it fits, even loosely; create a new tag only for a clearly new topic. ' +
    'Prefer broad topics (e.g. iş, proje names like poultrycare, sağlık, alışveriş, yazılım, öğrenme, fikir, finans, ev, seyahat). ' +
    'Never use tags about the item type or format (dosya, link, not, resim, pdf, görsel, belge, video, referans, diğer, genel, kişisel, liste, hatırlatma). Single words, no spaces. ' +
    'Write title and summary in the language of the item (Turkish if unsure), natural and plain, like a helpful friend. ' +
    'For notes keep the user\'s key details (times, dates, amounts, names) in the title. Use "content" (text inside a PDF) and look at "image" files with the Read tool to understand files. ' +
    'Never talk about yourself, tags, or what you could not see; if a file is unclear, just describe it briefly. Mark related items (same project/topic/task). Add "todo" only for real tasks/appointments/reminders (resolve relative days from Now). Put items in smart "lists" only when clearly fitting. Output only per schema.';
  // people want ~10-20 folders, not 100+ tags: once the set is full, only existing tags may be used
  const full = existingTags.length >= 25 ? `\nThe tag set is full (${existingTags.length}). Do NOT invent new tags: pick only from the existing ones.` : '';
  const now = new Date(), day = now.toLocaleDateString('en-US', { weekday: 'long' });
  const proj = projects.length ? `\nExisting projects: ${projects.join(', ')}` : '';
  const prompt = `Now: ${localTime(now)} (${day})\nExisting tags: ${existingTags.join(', ') || '(none)'}${full}${proj}\n\nItems:\n${JSON.stringify(compact(items, SHORT))}`;
  const opts = { prompt, system, schema: ORGANIZE_SCHEMA, model: conf.organizeModel, readDir: hasImg ? WORK_DIR : null, kind: 'organize', n: items.length };
  let r;
  try { r = await retry(opts); }
  finally { for (const i of items) if (i._imgPath) try { unlinkSync(i._imgPath); } catch { } }
  const got = r.items || [];
  for (const x of got) {
    if (tess.has(x.id) && !String(x.ocr || '').trim()) x.ocr = tess.get(x.id);
    const k = keys.get(x.id); if (k) { const { id, related, ...keep } = x; cput(k, keep); }
  }
  const all = [...out, ...got];
  return { ...r, items: [...all, ...twins.map(([id, from, k]) => { const x = all.find(y => y.id === from); if (!x) return null; const { id: _, related, ...keep } = x; cput(k, keep); return { ...keep, id }; }).filter(Boolean)] };
}

// text inside images (photos, screenshots, scanned PDF pages) + 130b content labels (what is seen) for search, for items organized before this existed
const OCR_SCHEMA = { type: 'object', required: ['items'], properties: { items: { type: 'array', items: { type: 'object', required: ['id', 'text'],
  properties: { id: { type: 'string' }, text: { type: 'string', description: 'all readable text in the image, verbatim, reading order, max ~1500 chars; empty string if none' },
    labels: { type: 'array', items: { type: 'string' }, description: '3-6 short lowercase Turkish words for what is SEEN in it, for search: main objects, colours, style (e.g. kedi, deniz, mavi, siyah-beyaz, logo, ekran-görüntüsü, el-yazısı, grafik); no sentences' } } } } } };
async function ocr(items) {
  // 148: the same picture is read once (cache); tesseract reads text-heavy ones here, only photos go to the AI (for "labels")
  const done = [], send = [], keys = new Map(); let saved = 0;
  for (const i of items) {
    const k = hash('ocr', conf.ai, i.image || ''), hit = cget(k);
    if (hit) { done.push({ ...hit, id: i.id }); saved += 1700; continue; }
    const p = join(WORK_DIR, `ocr-${String(i.id).replace(/\W/g, '')}.jpg`); writeFileSync(p, Buffer.from(i.image, 'base64')); delete i.image;
    const text = await tesseract(p).catch(() => null);
    if (text) { const x = { text, labels: ['yazı'] }; cput(k, x); done.push({ ...x, id: i.id }); saved += 1700; try { unlinkSync(p); } catch { } continue; }
    i._imgPath = p; keys.set(i.id, k); send.push(i);
  }
  if (done.length) logUsage({ kind: 'ocr', local: true, n: done.length, saved });
  if (!send.length) return { items: done };
  const system = 'You read text in images. For each item, open its "image" file with the Read tool and copy the readable text verbatim (any language), in reading order; empty string if there is no text. Do not describe the image in "text"; put 3-6 short lowercase Turkish words for what is seen (objects, colours, style) in "labels". Output only per schema.';
  const prompt = `Items:\n${JSON.stringify(send.map(i => ({ id: i.id, image: i._imgPath })))}`;
  try {
    const r = await runClaude({ prompt, system, schema: OCR_SCHEMA, model: conf.organizeModel, readDir: WORK_DIR, kind: 'ocr', n: send.length });
    for (const x of r.items || []) { const k = keys.get(x.id); if (k) { const { id, ...keep } = x; cput(k, keep); } }
    return { ...r, items: [...done, ...(r.items || [])] };
  } finally { for (const i of send) try { unlinkSync(i._imgPath); } catch { } }
}

// 95a: voice notes → text on this computer (whisper.cpp, no cloud): ffmpeg makes 16 kHz mono wav, whisper-cli in the mic language (tr/en/ar)
const WHISPER_MODELS = ['ggml-small.bin', 'ggml-medium.bin', 'ggml-base.bin'].map(f => join(homedir(), '.local', 'share', 'whisper', f));
const whisperBin = async () => (await which('whisper-cli')) ? 'whisper-cli' : (await which('whisper.cpp')) ? 'whisper.cpp' : null;
async function transcribe(b64, mime, hint) {
  const lang = /^(tr|en|ar)$/.test(hint || '') ? hint : 'auto'; // the app's mic language; auto guesses badly on short notes
  const bin = await whisperBin(), model = WHISPER_MODELS.find(f => existsSync(f));
  if (!bin || !model) return { ok: false, error: 'no-whisper' };
  const id = randomBytes(6).toString('hex'), src = join(WORK_DIR, `voice-${id}.${/mp4|m4a|aac/.test(mime || '') ? 'm4a' : /ogg/.test(mime || '') ? 'ogg' : 'webm'}`), wav = join(WORK_DIR, `voice-${id}.wav`);
  const run = (cmd, args, ms) => new Promise((ok, no) => execFile(cmd, args, { timeout: ms, maxBuffer: 8e6 }, (e, out, err) => e ? no(new Error(String(err || e.message).slice(-300))) : ok({ out: String(out), err: String(err) })));
  writeFileSync(src, Buffer.from(b64, 'base64'));
  try {
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-ar', '16000', '-ac', '1', wav], 60000);
    const r = await run(bin, ['-m', model, '-l', lang, '-nt', '-np', '-t', '4', '-bs', '2', '-bo', '2', '-f', wav], 600000);
    return { ok: true, text: r.out.replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim(), lang };
  } finally { for (const f of [src, wav]) try { unlinkSync(f); } catch { } }
}

const TAGS_SCHEMA = {
  type: 'object', required: ['map'],
  properties: { map: { type: 'array', items: { type: 'object', required: ['from', 'to'],
    properties: { from: { type: 'string' }, to: { type: 'string', description: 'target tag, or empty string to drop the tag' } } } } },
};
async function cleanTags(tags) {
  const system = 'You clean up the tag list of a personal notes app. Merge synonyms, plurals, spelling variants and near-duplicates into one tag; ' +
    'fold tiny niche tags into a broader existing tag; drop tags that only describe the item type or are meaningless (dosya, link, not, resim, görsel, pdf, belge, referans, diğer, genel, kişisel, liste). ' +
    'ALWAYS keep project, product, company and person names as their own tags (e.g. poultrycare). Aim for at most ~15 tags total, lowercase Turkish single words. Return a mapping for EVERY input tag (to = itself if unchanged, empty to drop).';
  return runClaude({ prompt: `Tags with counts:\n${tags.map(([t, n]) => `${t} (${n})`).join('\n')}`, system, schema: TAGS_SCHEMA, model: conf.organizeModel, kind: 'tags', n: tags.length });
}

// 106e: the answer may carry a few allowed parts (OpenUI idea, no library): the app draws only these types, anything else becomes plain text
const PART_TYPES = ['records', 'table', 'timeline', 'checklist', 'chart', 'actions'];
const ASK_SCHEMA = {
  type: 'object', required: ['answer', 'sources'],
  properties: {
    answer: { type: 'string', description: 'concise answer in markdown, in the question language; ALWAYS a plain sentence first' },
    sources: { type: 'array', items: { type: 'string' }, description: 'ids of items used, most relevant first' },
    parts: { type: 'array', maxItems: 3, description: 'OPTIONAL extra parts, only when the question really needs one (a list of found items, a table of amounts, dates in order, steps to tick, numbers over time). Usually 0 or 1. Never invent values: every value must come from the items.',
      items: { type: 'object', required: ['type'], properties: {
        type: { type: 'string', enum: PART_TYPES, description: 'records = item cards (ids); table = cols + rows; timeline = rows of {date, text, id}; checklist = rows of {text, id}; chart = labels + values; actions = buttons (acts)' },
        title: { type: 'string', description: 'short label, optional' },
        ids: { type: 'array', items: { type: 'string' }, description: 'records: item ids, best first, max 8' },
        cols: { type: 'array', items: { type: 'string' }, description: 'table: column names, max 5' },
        rows: { type: 'array', description: 'table: arrays of cell strings (max 12); timeline/checklist: objects {text, date?, id?, done?} (max 10)', items: {} },
        labels: { type: 'array', items: { type: 'string' }, description: 'chart: x labels, 2-24' },
        values: { type: 'array', items: { type: 'number' }, description: 'chart: one number per label' },
        acts: { type: 'array', maxItems: 2, description: 'actions: board = put ids on the board, todo = make a task (text), open = open an item (ids[0])',
          items: { type: 'object', required: ['do'], properties: { do: { type: 'string', enum: ['board', 'todo', 'open'] }, label: { type: 'string' }, ids: { type: 'array', items: { type: 'string' } }, text: { type: 'string' } } } },
      } } },
    next: { type: 'array', maxItems: 3, items: { type: 'string' }, description: 'optional: up to 3 short follow-up questions the person may ask next, in the question language' },
  },
};

async function ask(question, items) {
  const system = 'You answer questions about a person\'s saved notes, links and files. Use only the given items. ' +
    'Be concise and plain, list items when asked, mention dates/times when useful. "content" is the text inside a PDF. If nothing matches, say so. Answer in the question\'s language. Never describe your own process. ' +
    'Start with a plain sentence. Add a part only when it really helps (found items → records, amounts → table, dates → timeline, things to do → checklist, numbers over time → chart); usually none or one. ' +
    'Never invent numbers, ratings, prices or advice that are not in the items. No emojis, no sales talk.';
  const prompt = `Now: ${localTime(Date.now())}\nQuestion: ${question}\n\nItems:\n${JSON.stringify(compact(items))}`;
  return once('ask', [question, compact(items), localTime(Date.now()).slice(0, 10)], { prompt, system, schema: ASK_SCHEMA, model: conf.askModel, kind: 'ask', n: items.length });
}

// 93: "poultrycare için pano hazırla" → the AI picks the fitting items and puts them in titled groups; only ids + group names come back
const PLAN_SCHEMA = { type: 'object', required: ['name', 'summary', 'groups'], properties: {
  name: { type: 'string', description: 'short board name, 1-3 lowercase words, max 30 characters, in the request language, not one of the existing boards' },
  summary: { type: 'string', description: '2-3 short plain sentences: what is on this board and what stands out (open tasks, dates); in the request language' },
  groups: { type: 'array', maxItems: 6, items: { type: 'object', required: ['title', 'ids'], properties: {
    title: { type: 'string', description: '1-2 words, e.g. Belgeler, Linkler, Görevler, Fikirler, Kişiler, or a topic' },
    ids: { type: 'array', maxItems: 12, items: { type: 'string' }, description: 'item ids, most useful first' } } } } } };
async function boardPlan(request, items, boards) {
  const system = 'You make a board (a canvas of cards) from a person\'s saved notes, links and files. Pick ONLY the items that really fit the request; leave the rest out. ' +
    'Put the picked items in 2-6 groups with short titles (Belgeler, Linkler, Görevler, Fikirler, Kişiler, or topics when that reads better). Every id at most once; never invent ids. ' +
    'Name the board and write a short plain summary in the request language. No emojis, no sales talk, never describe your own process. Output only per schema.';
  const lite = items.map(i => ({ id: i.id, type: i.type, date: i.ts ? localTime(i.ts) : undefined, title: (i.title || '').slice(0, 140) || undefined,
    text: (i.text || '').slice(0, 300) || undefined, url: i.url || undefined, file: i.fileName || undefined, tags: i.tags?.length ? i.tags : undefined,
    project: i.project || undefined, summary: i.summary ? i.summary.slice(0, 200) : undefined, todo: i.todo ? (i.todo.done ? 'done' : 'open') : undefined }));
  const prompt = `Now: ${localTime(Date.now())}\nRequest: ${request}\nExisting boards: ${boards.join(', ') || '(none)'}\n\nItems:\n${JSON.stringify(lite)}`;
  return once('plan', [request, lite, boards, localTime(Date.now()).slice(0, 10)], { prompt, system, schema: PLAN_SCHEMA, model: conf.askModel, kind: 'board-plan', n: items.length });
}

// 95b: the morning brief — one or two plain sentences on what was saved yesterday (+ a nudge for today's tasks)
const BRIEF_SCHEMA = { type: 'object', required: ['line'], properties: { line: { type: 'string', description: '1-2 short sentences, max ~220 characters' } } };
async function brief(saved, tasks) {
  const system = 'You write a calm morning note for one person about what they saved yesterday in their notes app (notes, links, photos, files, tasks). ' +
    'In 1-2 short sentences say what yesterday was mostly about (themes, not a list of every item); if there are tasks for today, end with the most important one. ' +
    'Write in the language most items are written in (Turkish when unsure). No greeting (the card already says good morning), no emojis, no sales talk, never describe your own process. Output only per schema.';
  const prompt = `Yesterday saved:\n${JSON.stringify(saved.map(i => ({ type: i.type, title: String(i.title || '').slice(0, 100), tags: i.tags?.length ? i.tags : undefined })))}\n\nToday's tasks:\n${JSON.stringify(tasks.map(t => ({ text: String(t.text || '').slice(0, 100), late: !!t.late })))}`;
  return runClaude({ prompt, system, schema: BRIEF_SCHEMA, model: conf.organizeModel, kind: 'brief', n: saved.length });
}

// one line per day / month for the list's day headers and the board's month grid (61)
const SUM_SCHEMA = { type: 'object', required: ['items'], properties: { items: { type: 'array', items: { type: 'object', required: ['key', 'line'],
  properties: { key: { type: 'string' }, line: { type: 'string', description: 'one short line, max ~90 characters, in Turkish' } } } } } };
async function summaries(all) {
  // 148: a day / month whose items did not change keeps its line (cache); only changed groups are sent
  return perGroup('sum', all, g => (g.items || []).slice(0, 40).map(i => [i.type, i.title, (i.text || '').slice(0, 200), i.tags, i.chat]), x => x.line, groups => summaries0(groups));
}
async function summaries0(groups) {
  const system = 'You write one-line summaries of a person\'s day or month from the things they saved to themselves (notes, links, files, chats). ' +
    'For each group write ONE short, plain Turkish line (max ~90 characters) naming the main things, like a diary index: "poultrycare demo, 3 fatura, annemle konuşma". ' +
    'No dates and no total item count (both are shown already), no "bu gün"/"bugün", no full sentences about yourself, no emojis. Group similar items ("4 link: yapay zeka"). Output only per schema.';
  const prompt = `Groups:\n${JSON.stringify(groups.map(g => ({ key: g.key, items: (g.items || []).slice(0, 40).map(i => ({ type: i.type, title: (i.title || '').slice(0, 120) || undefined, text: (i.text || '').slice(0, 200) || undefined, tags: i.tags?.length ? i.tags : undefined, chat: i.chat || undefined })) })))}`;
  return runClaude({ prompt, system, schema: SUM_SCHEMA, model: conf.organizeModel, kind: 'summaries', n: groups.length });
}
// 131b: a short name for each group of items the phone/PC put together by meaning ("Ev tadilatı", "Logo fikirleri")
const FOLD_SCHEMA = { type: 'object', required: ['items'], properties: { items: { type: 'array', items: { type: 'object', required: ['key', 'name'],
  properties: { key: { type: 'string' }, name: { type: 'string', description: '1-3 words, max ~24 characters' } } } } } };
async function folderNames(all) {
  return perGroup('fold', all, g => (g.items || []).slice(0, 14).map(i => [i.type, i.title, (i.tags || []).slice(0, 4)]), x => x.name, groups => folderNames0(groups));
}
async function folderNames0(groups) {
  const system = 'You name folders. Each group is a set of things one person saved (notes, links, files, chats) that are close in meaning. ' +
    'Give each group ONE short folder name, 1-3 words, max ~24 characters, naming what they have in common, like "Ev tadilatı", "Logo fikirleri", "Faturalar". ' +
    'Use the language most of the items are written in (Turkish when unsure). No emojis, no quotes, no "Klasör", no numbers. Different groups get different names. Output only per schema.';
  const prompt = `Groups:\n${JSON.stringify(groups.map(g => ({ key: g.key, items: (g.items || []).slice(0, 14).map(i => ({ type: i.type, title: (i.title || '').slice(0, 100) || undefined, tags: i.tags?.length ? i.tags.slice(0, 4) : undefined })) })))}`;
  return runClaude({ prompt, system, schema: FOLD_SCHEMA, model: conf.organizeModel, kind: 'folders', n: groups.length });
}

// ---- link metadata ----
const decode = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;|&#x27;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).trim();
// sites that block bots or return a generic <title> (Reddit gives "Reddit - The heart of the internet") → ask their oEmbed
const OEMBED = [
  [/(^|\.)reddit\.com$/, u => `https://www.reddit.com/oembed?url=${encodeURIComponent(u)}`],
  [/(^|\.)(youtube\.com|youtu\.be)$/, u => `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(u)}`],
  [/(^|\.)vimeo\.com$/, u => `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(u)}`],
];
async function oembed(u) {
  const hit = OEMBED.find(([re]) => re.test(u.hostname)); if (!hit) return null;
  try {
    const r = await fetch(hit[1](u.href), { signal: AbortSignal.timeout(6000), headers: { 'user-agent': 'Mozilla/5.0 (compatible; NtsBot/1.0)' } });
    if (!r.ok) return null;
    const j = await r.json();
    return j.title ? { title: j.title, description: j.author_name ? `${j.author_name} · ${j.provider_name || u.hostname}` : undefined, image: j.thumbnail_url, site: j.provider_name } : null;
  } catch { return null; }
}
async function meta(url) {
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return null;
    const oe = await oembed(u); if (oe) return oe;
    const res = await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(6000),
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; HizliNoteBot/1.0)', 'accept-language': 'tr,en;q=0.8' } });
    if (!(res.headers.get('content-type') || '').includes('html')) return { title: u.pathname.split('/').pop() || u.hostname };
    const reader = res.body.getReader(); let html = '', size = 0;
    while (size < 512 * 1024) { const { done, value } = await reader.read(); if (done) break; size += value.length; html += Buffer.from(value).toString('utf8'); if (html.includes('</head>')) break; }
    reader.cancel().catch(() => {});
    const m = (re) => { const x = html.match(re); return x ? decode(x[1]) : undefined; };
    const og = p => m(new RegExp(`<meta[^>]+(?:property|name)=["']${p}["'][^>]+content=["']([^"']*)["']`, 'i'))
      || m(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${p}["']`, 'i'));
    return {
      title: og('og:title') || m(/<title[^>]*>([^<]*)<\/title>/i),
      description: og('og:description') || og('description'),
      image: og('og:image'), site: og('og:site_name'),
    };
  } catch { return null; }
}

// 107f: does a saved link still open? dead = the site says it's gone (404/410) or the name no longer exists. A timeout, 403, 5xx = not sure → not dead
async function linkAlive(url) {
  try {
    const u = new URL(url); if (!/^https?:$/.test(u.protocol)) return { dead: false };
    const go = m => fetch(u, { method: m, redirect: 'follow', signal: AbortSignal.timeout(8000), headers: { 'user-agent': 'Mozilla/5.0 (compatible; NtsBot/1.0)' } });
    let r = await go('HEAD'); if (r.status === 405 || r.status === 501 || r.status === 404) { r.body?.cancel?.().catch(() => {}); r = await go('GET'); }
    r.body?.cancel?.().catch(() => {});
    return { dead: r.status === 404 || r.status === 410, status: r.status };
  } catch (e) {
    const c = e.cause?.code || e.code || '';
    return { dead: c === 'ENOTFOUND' || c === 'EAI_NONAME', status: 0, err: c || e.name };
  }
}

// ---- readable copy of a page (no libraries: pick the main block, keep headings / paragraphs / lists / quotes) ----
async function article(url) {
  const u = new URL(url); if (!/^https?:$/.test(u.protocol)) throw new Error('bad url');
  const res = await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(12000),
    headers: { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36', 'accept-language': 'tr,en;q=0.8' } });
  if (!(res.headers.get('content-type') || '').includes('html')) throw new Error('not a web page');
  let html = (await res.text()).slice(0, 3e6);
  const m = re => { const x = html.match(re); return x ? decode(x[1]) : undefined; };
  const og = p => m(new RegExp(`<meta[^>]+(?:property|name)=["']${p}["'][^>]+content=["']([^"']*)["']`, 'i'))
    || m(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${p}["']`, 'i'));
  const title = og('og:title') || m(/<title[^>]*>([^<]*)<\/title>/i), image = og('og:image'), byline = og('author') || og('article:author'), site = og('og:site_name');
  html = html.replace(/<(script|style|noscript|svg|nav|header|footer|aside|form|iframe|button|select|figure[^>]*class=["'][^"']*(?:ad|promo)[^"']*["'])[\s\S]*?<\/\1>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
  // candidates: <article>, <main>, else <body>; take the one with the most paragraph text
  const cands = [...html.matchAll(/<(article|main)[^>]*>([\s\S]*?)<\/\1>/gi)].map(x => x[2]);
  cands.push((html.match(/<body[^>]*>([\s\S]*)<\/body>/i) || [, html])[1]);
  const ptext = h => (h.match(/<p[\s>][\s\S]*?<\/p>/gi) || []).join(' ').replace(/<[^>]+>/g, '').length;
  const main = cands.sort((a, b) => ptext(b) - ptext(a))[0] || '';
  const strip = h => decode(h.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/[ \t\r\f\v]+/g, ' ').replace(/\n\s*/g, '\n'));
  const blocks = []; let size = 0;
  for (const x of main.matchAll(/<(h[1-4]|p|li|blockquote|pre)[\s>][\s\S]*?<\/\1>/gi)) {
    const tag = x[1].toLowerCase(), text = strip(x[0]).trim(); if (!text) continue;
    if (tag === 'p' && text.length < 30 && !/[.!?:]$/.test(text)) continue; // menu bits, captions
    if (tag === 'li' && text.length < 20) continue;
    const t = tag[0] === 'h' ? 'h' : tag === 'blockquote' ? 'q' : tag === 'pre' ? 'code' : tag;
    if (blocks.at(-1)?.x === text) continue;
    blocks.push({ t, x: text.slice(0, 4000) }); size += text.length; if (size > 80000) break;
  }
  // the page title / site name usually repeat at the top: the reader shows the title itself
  const same = (a, b) => a && b && a.toLowerCase().replace(/\W+/g, '') === b.toLowerCase().replace(/\W+/g, '');
  while (blocks.length && blocks[0].t === 'h' && (same(blocks[0].x, title) || same(blocks[0].x, site) || (title || '').toLowerCase().includes(blocks[0].x.toLowerCase()))) blocks.shift();
  if (blocks.filter(b => b.t === 'p').length < 2) throw new Error('no readable text');
  return { title, image, byline, site, blocks, words: blocks.reduce((n, b) => n + b.x.split(/\s+/).length, 0), at: Date.now() };
}

// ---- relay (74): a phone without Tailscale reaches this bridge through Supabase Realtime (broadcast: nothing is stored).
// Every message is AES-GCM sealed with a key made from the bridge token, so Supabase never sees the content, and only a
// device that knows the token (the owner's own, via the synced 'bridge' record) can ask anything; others get no answer.
const RELAY_PATHS = new Set(['/health', '/ai-conf', '/ask', '/organize', '/article', '/meta', '/check', '/ocr', '/tags', '/summaries', '/folders', '/board-plan', '/transcribe', '/brief', '/usage', '/usage-conf']);
const RELAY_CHUNK = 180000;
const relay = { ws: null, ref: 0, hb: null, retry: 0, key: null, keyFor: null, parts: new Map(), topic: '' };
async function relayKey() {
  if (relay.keyFor !== conf.token) { relay.keyFor = conf.token; relay.key = await crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', new TextEncoder().encode('nts-relay:' + conf.token)), 'AES-GCM', false, ['encrypt', 'decrypt']); }
  return relay.key;
}
async function relaySeal(obj) { const iv = crypto.getRandomValues(new Uint8Array(12)), ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await relayKey(), new TextEncoder().encode(JSON.stringify(obj)))); return Buffer.concat([iv, ct]).toString('base64'); }
async function relayOpen(b64) { const b = Buffer.from(b64, 'base64'); return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.subarray(0, 12) }, await relayKey(), b.subarray(12)))); }
function relaySend(event, payload) { if (relay.ws?.readyState === 1) relay.ws.send(JSON.stringify({ topic: relay.topic, event: 'broadcast', payload: { type: 'broadcast', event, payload }, ref: String(++relay.ref), join_ref: '1' })); }
async function relayReply(id, obj) { const s = await relaySeal(obj), n = Math.max(1, Math.ceil(s.length / RELAY_CHUNK)); for (let k = 0; k < n; k++) relaySend('relay-res', { id, k, n, d: s.slice(k * RELAY_CHUNK, (k + 1) * RELAY_CHUNK) }); }
async function relayReq(m) {
  if (!m || typeof m.id !== 'string' || typeof m.d !== 'string' || !(m.n >= 1 && m.n <= 60) || !(m.k >= 0 && m.k < m.n)) return;
  let e = relay.parts.get(m.id); if (!e) relay.parts.set(m.id, e = { got: [], at: Date.now() }); e.got[m.k] = m.d;
  if (e.got.filter(x => x != null).length < m.n) return; relay.parts.delete(m.id);
  let req; try { req = await relayOpen(e.got.join('')); } catch { return; } // not sealed with our token: not for us, say nothing
  if (!RELAY_PATHS.has(req.path)) return relayReply(m.id, { status: 404, body: { error: 'not allowed' } });
  try {
    const r = await fetch(`http://127.0.0.1:${conf.port}${req.path}`, { method: req.body ? 'POST' : 'GET', headers: { authorization: 'Bearer ' + conf.token, 'content-type': 'application/json' }, body: req.body ? JSON.stringify(req.body) : undefined, signal: AbortSignal.timeout(200000) });
    await relayReply(m.id, { status: r.status, body: await r.json().catch(() => ({})) });
    if (req.path !== '/health') console.log(`relay ${req.path} ${r.status}`);
  } catch (err) { await relayReply(m.id, { status: 500, body: { error: err.message } }); }
}
function relayStart() {
  const c = conf.relay; if (!c?.url || !c?.key || !c?.uid || relay.ws || typeof WebSocket === 'undefined') return;
  relay.topic = 'realtime:nts-' + c.uid;
  const ws = relay.ws = new WebSocket(c.url.replace(/^http/, 'ws') + '/realtime/v1/websocket?apikey=' + encodeURIComponent(c.key) + '&vsn=1.0.0');
  ws.onopen = () => {
    relay.retry = 0;
    ws.send(JSON.stringify({ topic: relay.topic, event: 'phx_join', payload: { config: { broadcast: { self: false }, presence: { key: '' }, private: false } }, ref: String(++relay.ref), join_ref: '1' }));
    clearInterval(relay.hb); relay.hb = setInterval(() => { if (ws.readyState === 1) ws.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(++relay.ref) })); }, 25e3);
    console.log('relay: telefon Supabase üzerinden bağlanabilir');
  };
  ws.onmessage = e => { try { const m = JSON.parse(e.data); if (m.event === 'broadcast' && m.payload?.event === 'relay-req') relayReq(m.payload.payload); } catch { } };
  ws.onerror = () => { };
  ws.onclose = () => { clearInterval(relay.hb); if (relay.ws === ws) { relay.ws = null; setTimeout(relayStart, Math.min(60e3, 2e3 * 2 ** relay.retry++)); } };
}
function relayRestart() { const w = relay.ws; relay.ws = null; try { w?.close(); } catch { } relay.retry = 0; relayStart(); }
setInterval(() => { for (const [id, e] of relay.parts) if (Date.now() - e.at > 120e3) relay.parts.delete(id); }, 60e3).unref();

// ---- http ----
function send(res, code, body, origin) {
  res.writeHead(code, {
    'content-type': 'application/json',
    ...(origin ? { 'access-control-allow-origin': origin, vary: 'Origin' } : {}),
  });
  res.end(JSON.stringify(body));
}
// the PWA itself, served on localhost so the PC needs no CORS / local-network permission
const APP_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const API = /^\/(health|meta|article|organize|ask|tags|ocr|inbox|new-repo|config|snapshot|gh-token|import-items|usage)(\/|$)/;
function serveStatic(req, res) {
  const p = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[\/\\])+/, '');
  const file = join(APP_DIR, p === '/' ? 'index.html' : p);
  if (!file.startsWith(APP_DIR) || file.includes(`${'/'}bridge${'/'}`) || !existsSync(file) || !TYPES[extname(file)]) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[extname(file)], 'cache-control': 'no-cache' }); res.end(readFileSync(file));
}

const allowed = o => o && (conf.origins.includes(o) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o));

// ---- task reminders on this PC: the app's snapshot has the to-dos; a desktop notification when one is due ----
const NOTIFIED = join(CONF_DIR, 'notified.json');
function remindTick() {
  try {
    const f = join(CONF_DIR, 'snapshot.json'); if (!existsSync(f)) return;
    const { items = [] } = JSON.parse(readFileSync(f, 'utf8')), done = new Set(existsSync(NOTIFIED) ? JSON.parse(readFileSync(NOTIFIED, 'utf8')) : []);
    const t = Date.now(); let changed = false;
    for (const i of items) {
      const d = i.todo; if (!d || d.done || !d.due) continue;
      const at = new Date(d.due.includes('T') ? d.due : d.due + 'T09:00').getTime(), key = i.id + '@' + d.due;
      if (at > t || t - at > 6 * 3600e3 || done.has(key)) continue; // due now (not older than 6 h)
      done.add(key); changed = true;
      execFile('notify-send', ['-a', 'Nts', '-i', 'appointment-soon', '-u', 'normal', 'Nts · görev zamanı', d.text || i.title || 'Görev'], () => { });
      console.log('hatırlatma:', d.text || i.title);
    }
    if (changed) writeFileSync(NOTIFIED, JSON.stringify([...done].slice(-2000)));
  } catch (e) { console.warn('remind', e.message); }
}
setInterval(remindTick, 60e3); setTimeout(remindTick, 5000);
// 95b: the morning brief on this PC — once a day, in the 6 hours after the time chosen in the app (snapshot.morning, '' = off)
const MORNING = join(CONF_DIR, 'morning.json');
async function morningTick() {
  try {
    const f = join(CONF_DIR, 'snapshot.json'); if (!existsSync(f)) return;
    const { items = [], morning } = JSON.parse(readFileSync(f, 'utf8')), at = morning === undefined ? '08:00' : morning; if (!/^\d\d:\d\d$/.test(at || '')) return;
    const d = new Date(), [h, mi] = at.split(':').map(Number), min = d.getHours() * 60 + d.getMinutes(); if (min < h * 60 + mi || min > h * 60 + mi + 360) return;
    const p = n => String(n).padStart(2, '0'), day = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    const st = existsSync(MORNING) ? JSON.parse(readFileSync(MORNING, 'utf8')) : {}; if (st.last === day) return;
    writeFileSync(MORNING, JSON.stringify({ last: day }));
    const yd = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1), yk = `${yd.getFullYear()}-${p(yd.getMonth() + 1)}-${p(yd.getDate())}`;
    const dk = i => { const x = new Date(i.date); return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`; };
    const saved = items.filter(i => i.date && dk(i) === yk), tasks = items.filter(i => i.todo && !i.todo.done && i.todo.due && i.todo.due.slice(0, 10) <= day)
      .sort((a, b) => a.todo.due < b.todo.due ? -1 : 1).map(i => ({ text: i.todo.text || i.title, late: i.todo.due.slice(0, 10) < day }));
    if (!saved.length && !tasks.length) return;
    const late = tasks.filter(t => t.late).length;
    let body = `${saved.length ? `Dün ${saved.length} kayıt` : 'Dün kayıt yok'} · ${tasks.length ? `bugün ${tasks.length} görev${late ? ` (${late} gecikmiş)` : ''}` : 'bugün görev yok'}`;
    if (saved.length) try { const r = await brief(saved.slice(0, 40).map(i => ({ type: i.type, title: i.title, tags: i.tags })), tasks.slice(0, 8)); if (r?.line) body = r.line + '\n' + body; } catch (e) { console.warn('brief', e.message); }
    else body += '\n' + tasks.slice(0, 3).map(t => '• ' + t.text).join('\n');
    execFile('notify-send', ['-a', 'Nts', '-i', 'weather-clear', '-u', 'normal', 'Günaydın · Nts', body], () => { });
    console.log('sabah özeti:', body.split('\n')[0]);
  } catch (e) { console.warn('morning', e.message); }
}
setInterval(morningTick, 5 * 60e3); setTimeout(morningTick, 20000);

http.createServer(async (req, res) => {
  const origin = allowed(req.headers.origin) ? req.headers.origin : null;
  if (req.method === 'OPTIONS') {
    res.writeHead(204, origin ? {
      'access-control-allow-origin': origin, 'access-control-allow-methods': 'GET,POST',
      'access-control-allow-headers': 'authorization,content-type', 'access-control-max-age': '86400',
      'access-control-allow-private-network': 'true', vary: 'Origin',
    } : {});
    return res.end();
  }
  if (req.method === 'GET' && !API.test(req.url)) return serveStatic(req, res);
  if (req.url === '/config') { // token only for the app on this computer: served from here, or any http://localhost:* page
    const local = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.origin || '');
    if (req.headers['sec-fetch-site'] === 'same-origin' || local) return send(res, 200, { token: conf.token, remote: await remoteUrl() }, local ? req.headers.origin : null);
    return send(res, 403, { error: 'this computer only' });
  }
  if (req.url === '/gh-token') { // GitHub key from the local `gh` login, for this computer's app only (same rule as /config)
    const local = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.origin || '');
    if (!(req.headers['sec-fetch-site'] === 'same-origin' || local)) return send(res, 403, { error: 'this computer only' });
    const run = args => new Promise(ok => execFile('gh', args, { timeout: 8000 }, (e, o) => ok(e ? '' : String(o).trim())));
    const token = await run(['auth', 'token']), login = token ? await run(['api', 'user', '--jq', '.login']) : '';
    return send(res, token ? 200 : 404, token ? { token, login } : { error: 'gh girişi yok: gh auth login' }, local ? req.headers.origin : null);
  }
  if (req.headers.authorization !== `Bearer ${conf.token}`) return send(res, 401, { error: 'bad token' }, origin);
  try {
    let body = {};
    if (req.method === 'POST') {
      let raw = ''; for await (const c of req) { raw += c; if (raw.length > 300e6) throw new Error('too big'); }
      body = JSON.parse(raw || '{}');
    }
    const t = Date.now();
    if (req.url === '/health') return send(res, 200, { ok: true, models: [conf.askModel, conf.organizeModel], ai: conf.ai, have: await haveAIs() }, origin);
    if (req.url === '/ai-conf' && req.method === 'POST') { // 87: the app's choice of AI
      const ai = String(body.ai || ''); if (!AIS[ai]) return send(res, 400, { error: 'unknown ai' }, origin);
      const have = await haveAIs();
      if (ai !== conf.ai) { conf.ai = ai; writeFileSync(CONF_FILE, JSON.stringify(conf, null, 2), { mode: 0o600 }); console.log(`ai → ${ai}`); }
      return send(res, 200, { ok: true, ai, installed: !!have[ai] }, origin);
    }
    if (req.url === '/usage') return send(res, 200, { ...usageSummary(), cap: conf.dailyTokens }, origin); // 148
    if (req.url === '/usage-conf' && req.method === 'POST') {
      const cap = Math.max(0, Math.round(Number(body.cap) || 0)); conf.dailyTokens = cap; writeFileSync(CONF_FILE, JSON.stringify(conf, null, 2), { mode: 0o600 });
      return send(res, 200, { ok: true, cap }, origin);
    }
    if (req.url === '/inbox' && req.method === 'GET') return send(res, 200, readInbox(), origin);
    if (req.url === '/inbox' && req.method === 'POST') { const e = addInbox(body); console.log(`inbox +1 (${e.files.length} dosya)`); return send(res, 200, { ok: true, id: e.id }, origin); }
    if (req.url === '/inbox/ack') { ackInbox(body.ids || []); return send(res, 200, { ok: true }, origin); }
    if (req.url.startsWith('/inbox/file/')) {
      const fid = req.url.slice(12).replace(/[^a-z0-9]/gi, '');
      if (!existsSync(join(INBOX, fid))) return send(res, 404, { error: 'no file' }, origin);
      res.writeHead(200, { 'content-type': 'application/octet-stream', ...(origin ? { 'access-control-allow-origin': origin, vary: 'Origin' } : {}) });
      return res.end(readFileSync(join(INBOX, fid)));
    }
    if (req.url === '/new-repo') { // roll over to a new private data repo with the local gh login
      const name = String(body.name || '').replace(/[^\w./-]/g, '');
      if (!/^[\w.-]+\/(nts|hizli-note)-data-\d+$/.test(name)) return send(res, 400, { error: 'bad name' }, origin);
      await new Promise((ok, no) => execFile('gh', ['repo', 'create', name, '--private', '--description', 'Nts data'], (e, o, er) => e && !/already exists/i.test(er) ? no(new Error(er || e.message)) : ok()));
      console.log('new repo ' + name); return send(res, 200, { ok: true, name }, origin);
    }
    if (req.url === '/snapshot' && req.method === 'POST') { // a plain copy for the MCP server (bridge/mcp.mjs); only this computer reads it
      writeFileSync(join(CONF_DIR, 'snapshot.json'), JSON.stringify({ at: Date.now(), morning: typeof body.morning === 'string' ? body.morning : undefined, app: /^https?:\/\/[^\s"']+$/.test(body.app || '') ? body.app : undefined, items: (body.items || []).slice(0, 20000) }), { mode: 0o600 });
      return send(res, 200, { ok: true, n: body.items?.length || 0 }, origin);
    }
    if (req.url === '/article') {
      try { const r = await article(body.url); console.log(`article ${r.words}w ${Date.now() - t}ms`); return send(res, 200, r, origin); }
      catch (e) { return send(res, 422, { error: e.message }, origin); }
    }
    if (req.url === '/meta') {
      const out = {}; await Promise.all((body.urls || []).slice(0, 30).map(async u => { out[u] = await meta(u); }));
      return send(res, 200, out, origin);
    }
    if (req.url === '/check') {
      const out = {}; await Promise.all((body.urls || []).slice(0, 30).map(async u => { out[u] = await linkAlive(u); }));
      console.log(`check ${Object.keys(out).length} ${Date.now() - t}ms`); return send(res, 200, out, origin);
    }
    if (req.url === '/organize') {
      const r = await organize((body.items || []).slice(0, 60), body.tags || [], (body.projects || []).slice(0, 30));
      console.log(`organize ${body.items?.length} items ${Date.now() - t}ms`);
      return send(res, 200, r, origin);
    }
    if (req.url === '/import-items' && req.method === 'GET') { const f = join(CONF_DIR, 'import-queue.json'); return send(res, 200, existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')).slice(0, 500) : [], origin); }
    if (req.url === '/import-items/ack') { const f = join(CONF_DIR, 'import-queue.json'), ids = new Set(body.ids || []); if (existsSync(f)) writeFileSync(f, JSON.stringify(JSON.parse(readFileSync(f, 'utf8')).filter(i => !ids.has(i.id))), { mode: 0o600 }); return send(res, 200, { ok: true }, origin); }
    if (req.url === '/ocr') { const r = await ocr((body.items || []).slice(0, 8)); console.log(`ocr ${body.items?.length} ${Date.now() - t}ms`); return send(res, 200, r, origin); }
    if (req.url === '/tags') { const r = await cleanTags((body.tags || []).slice(0, 300)); console.log(`tags ${body.tags?.length} ${Date.now() - t}ms`); return send(res, 200, r, origin); }
    if (req.url === '/relay-conf' && req.method === 'POST') { // the PC app (signed in) tells the bridge which Realtime channel the phone uses
      const { url, key, uid } = body || {};
      if (!(/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url || '') || (process.env.NTS_RELAY_DEV && /^http:\/\/127\.0\.0\.1:\d+$/.test(url || ''))) || !/^[\w-]{10,200}$/.test(key || '') || !/^[0-9a-f-]{36}$/.test(uid || '')) return send(res, 400, { error: 'bad relay config' }, origin);
      const same = conf.relay?.url === url && conf.relay?.key === key && conf.relay?.uid === uid;
      if (!same) { conf.relay = { url, key, uid }; writeFileSync(CONF_FILE, JSON.stringify(conf, null, 2), { mode: 0o600 }); relayRestart(); }
      return send(res, 200, { ok: true, on: relay.ws?.readyState === 1 }, origin);
    }
    if (req.url === '/summaries') { const r = await summaries((body.groups || []).slice(0, 24)); console.log(`summaries ${body.groups?.length} ${Date.now() - t}ms`); return send(res, 200, r, origin); }
    if (req.url === '/folders') { const r = await folderNames((body.groups || []).slice(0, 30)); console.log(`folders ${body.groups?.length} ${Date.now() - t}ms`); return send(res, 200, r, origin); }
    if (req.url === '/transcribe') { const r = await transcribe(String(body.audio || ''), String(body.mime || ''), String(body.lang || '')); console.log(`transcribe ${Math.round((body.audio || '').length / 1365)} KB ${Date.now() - t}ms`); return send(res, 200, r, origin); }
    if (req.url === '/brief') { const r = await brief((body.saved || []).slice(0, 40), (body.tasks || []).slice(0, 8)); console.log(`brief ${body.saved?.length} ${Date.now() - t}ms`); return send(res, 200, r, origin); } // 95b
    if (req.url === '/board-plan') { const r = await boardPlan(String(body.request || '').slice(0, 300), (body.items || []).slice(0, 120), (body.boards || []).slice(0, 60)); console.log(`board-plan ${body.items?.length} ${Date.now() - t}ms`); return send(res, 200, r, origin); }
    if (req.url === '/ask') {
      const r = await ask(String(body.question || ''), (body.items || []).slice(0, 80));
      console.log(`ask "${String(body.question).slice(0, 60)}" ${Date.now() - t}ms`);
      return send(res, 200, r, origin);
    }
    send(res, 404, { error: 'not found' }, origin);
  } catch (e) {
    if (e.code === 'limit') { console.log('günlük token sınırı doldu, arka plan işleri yarına'); return send(res, 429, { error: 'limit', until: e.until }, origin); }
    console.error(e.message);
    send(res, 500, { error: e.message }, origin);
  }
}).listen(conf.port, '127.0.0.1', () => {
  console.log(`Nts bridge → http://localhost:${conf.port}  (uygulama da burada açılır)`);
  console.log(`Token: ${conf.token}`);
  console.log('Telefon: aynı Google hesabıyla girince Supabase üzerinden bağlanır (Tailscale gerekmez).');
  relayStart();
  console.log(`Ayarlar: ${CONF_FILE}`);
});
