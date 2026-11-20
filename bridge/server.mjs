#!/usr/bin/env node
// Hızlı Not bridge: lets the PWA use your Claude subscription through the local `claude` CLI.
// Run: node bridge/server.mjs   (no dependencies)
import http from 'node:http';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

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
  writeFileSync(CONF_FILE, JSON.stringify(conf, null, 2), { mode: 0o600 });
  return conf;
}
const conf = loadConfig();

// ---- inbox: things sent from this PC (hn CLI, file manager, hotkey) until a device picks them up ----
const INBOX = join(CONF_DIR, 'inbox'), INBOX_IDX = join(INBOX, 'index.json');
mkdirSync(INBOX, { recursive: true });
const readInbox = () => existsSync(INBOX_IDX) ? JSON.parse(readFileSync(INBOX_IDX, 'utf8')) : [];
const writeInbox = list => writeFileSync(INBOX_IDX, JSON.stringify(list));
const rid = () => Date.now().toString(36) + randomBytes(3).toString('hex');
function addInbox({ text = '', files = [] }) {
  const e = { id: rid(), ts: Date.now(), text, files: [] };
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

// ---- claude runner (one job at a time) ----
let chain = Promise.resolve();
function runClaude({ prompt, system, schema, model }) {
  const job = chain.then(() => new Promise((resolve, reject) => {
    const args = ['-p', '--model', model, '--output-format', 'json', '--tools', '',
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
        if (j.is_error) return reject(new Error(j.result || 'claude error'));
        resolve(schema ? (j.structured_output ?? JSON.parse(j.result)) : j.result);
      } catch { reject(new Error(`claude exit ${code}: ${(err || out).slice(0, 400)}`)); }
    });
    p.stdin.end(prompt);
  }));
  chain = job.catch(() => {});
  return job;
}

const compact = items => items.map(i => ({
  id: i.id, date: i.ts ? new Date(i.ts).toISOString().slice(0, 16) : undefined, type: i.type,
  title: i.title || undefined, text: (i.text || '').slice(0, 1500) || undefined, url: i.url || undefined,
  file: i.fileName || undefined, tags: i.tags?.length ? i.tags : undefined, summary: i.summary || undefined,
  page: i.meta ? [i.meta.title, i.meta.description].filter(Boolean).join(' — ').slice(0, 400) : undefined,
}));

const ORGANIZE_SCHEMA = {
  type: 'object', required: ['items'],
  properties: {
    items: { type: 'array', items: {
      type: 'object', required: ['id', 'title', 'summary', 'tags'],
      properties: {
        id: { type: 'string' },
        title: { type: 'string', description: 'short clear title, same language as content' },
        summary: { type: 'string', description: 'one sentence: what it is and why it matters' },
        tags: { type: 'array', items: { type: 'string' }, description: '1-4 lowercase topic tags' },
        related: { type: 'array', items: { type: 'string' }, description: 'ids of clearly related items in this batch' },
      } } },
  },
};

async function organize(items, existingTags) {
  const system = 'You organize a person\'s saved notes, links and files (things they sent to themselves). ' +
    'For each item give a short title, a one-sentence summary and 1-4 lowercase tags. Reuse existing tags when they fit. ' +
    'Write title and summary in the language of the item (Turkish if unsure). Mark related items (same project/topic/task). Output only per schema.';
  const prompt = `Existing tags: ${existingTags.join(', ') || '(none)'}\n\nItems:\n${JSON.stringify(compact(items))}`;
  try { return await runClaude({ prompt, system, schema: ORGANIZE_SCHEMA, model: conf.organizeModel }); }
  catch { return await runClaude({ prompt, system, schema: ORGANIZE_SCHEMA, model: conf.organizeModel }); }
}

const ASK_SCHEMA = {
  type: 'object', required: ['answer', 'sources'],
  properties: {
    answer: { type: 'string', description: 'concise answer in markdown, in the question language' },
    sources: { type: 'array', items: { type: 'string' }, description: 'ids of items used, most relevant first' },
  },
};

async function ask(question, items) {
  const system = 'You answer questions about a person\'s saved notes, links and files. Use only the given items. ' +
    'Be concise, list items when asked, mention dates when useful. If nothing matches, say so. Answer in the question\'s language.';
  const prompt = `Today: ${new Date().toISOString().slice(0, 10)}\nQuestion: ${question}\n\nItems:\n${JSON.stringify(compact(items))}`;
  return runClaude({ prompt, system, schema: ASK_SCHEMA, model: conf.askModel });
}

// ---- link metadata ----
const decode = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;|&#x27;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).trim();
async function meta(url) {
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return null;
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

// ---- http ----
function send(res, code, body, origin) {
  res.writeHead(code, {
    'content-type': 'application/json',
    ...(origin ? { 'access-control-allow-origin': origin, vary: 'Origin' } : {}),
  });
  res.end(JSON.stringify(body));
}
const allowed = o => o && (conf.origins.includes(o) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o));

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
  if (req.headers.authorization !== `Bearer ${conf.token}`) return send(res, 401, { error: 'bad token' }, origin);
  try {
    let body = {};
    if (req.method === 'POST') {
      let raw = ''; for await (const c of req) { raw += c; if (raw.length > 300e6) throw new Error('too big'); }
      body = JSON.parse(raw || '{}');
    }
    const t = Date.now();
    if (req.url === '/health') return send(res, 200, { ok: true, models: [conf.askModel, conf.organizeModel] }, origin);
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
      if (!/^[\w.-]+\/hizli-note-data-\d+$/.test(name)) return send(res, 400, { error: 'bad name' }, origin);
      await new Promise((ok, no) => execFile('gh', ['repo', 'create', name, '--private', '--description', 'Hızlı Not data'], (e, o, er) => e && !/already exists/i.test(er) ? no(new Error(er || e.message)) : ok()));
      console.log('new repo ' + name); return send(res, 200, { ok: true, name }, origin);
    }
    if (req.url === '/meta') {
      const out = {}; await Promise.all((body.urls || []).slice(0, 30).map(async u => { out[u] = await meta(u); }));
      return send(res, 200, out, origin);
    }
    if (req.url === '/organize') {
      const r = await organize((body.items || []).slice(0, 40), body.tags || []);
      console.log(`organize ${body.items?.length} items ${Date.now() - t}ms`);
      return send(res, 200, r, origin);
    }
    if (req.url === '/ask') {
      const r = await ask(String(body.question || ''), (body.items || []).slice(0, 80));
      console.log(`ask "${String(body.question).slice(0, 60)}" ${Date.now() - t}ms`);
      return send(res, 200, r, origin);
    }
    send(res, 404, { error: 'not found' }, origin);
  } catch (e) {
    console.error(e.message);
    send(res, 500, { error: e.message }, origin);
  }
}).listen(conf.port, '127.0.0.1', () => {
  console.log(`Hızlı Not bridge → http://localhost:${conf.port}`);
  console.log(`Token: ${conf.token}`);
  console.log(`Telefon için: sudo tailscale serve --bg --https=8788 http://127.0.0.1:${conf.port}  → https://<pc>.<tailnet>.ts.net:8788`);
  console.log(`Ayarlar: ${CONF_FILE}`);
});
