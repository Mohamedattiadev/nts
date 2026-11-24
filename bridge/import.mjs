#!/usr/bin/env node
// nts import whatsapp.zip [--yes] [--videos=keep|thumb]
// A big WhatsApp export (1 GB+, videos included) on the PC: first a dry-run report, then with --yes the real import.
// - messages close together (same day, < 30 min) become one conversation item; photos/files live inside it (same ids as the app)
// - every file once (sha1); photos shrunk to ~1600 px; videos over 95 MB re-encoded with ffmpeg (H.264) under 95 MB;
//   originals kept in ~/.local/share/nts/originals/
// - files + ~320 px webp previews go to the private GitHub repos nts-files-1, -2… (git push, a new repo past ~900 MB)
// - resumable: what is done is remembered; run the same command again to continue
// - items wait in the bridge (import-queue.json); the app picks them up, syncs them, Claude organizes them in batches
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync, copyFileSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, basename, extname } from 'node:path';

const CONF = join(homedir(), '.config', 'hizli-note'), DATA = join(homedir(), '.local', 'share', 'nts');
const STATE = join(DATA, 'import-state.json'), QUEUE = join(CONF, 'import-queue.json'), ORIG = join(DATA, 'originals'), REPOS = join(DATA, 'repos');
const LIMIT = (+process.env.NTS_REPO_MB || 900) * 1024 * 1024, MAX_FILE = (+process.env.NTS_MAX_MB || 95) * 1024 * 1024; // env overrides only for tests
const args = process.argv.slice(2).filter((a, k) => !(k === 0 && a === 'import')), zipPath = args.find(a => !a.startsWith('--')), yes = args.includes('--yes');
const videoMode = (args.find(a => a.startsWith('--videos=')) || '--videos=keep').split('=')[1];
const MB = n => (n / 1048576).toFixed(n > 1048576 * 10 ? 0 : 1) + ' MB';
const sh = (cmd, a, opt = {}) => { const r = spawnSync(cmd, a, { encoding: 'utf8', maxBuffer: 1e8, ...opt }); if (r.status !== 0 && !opt.ok) throw new Error(`${cmd} ${a.slice(0, 3).join(' ')}: ${(r.stderr || '').slice(-400)}`); return (r.stdout || '').trim(); };
if (!zipPath || !existsSync(zipPath)) { console.log('Kullanım: nts import WhatsApp-sohbeti.zip [--yes] [--videos=keep|thumb]'); process.exit(1); }

// ---------- parse (same rules as the app) ----------
const WA_LINE = [
  /^‎?\[(\d{1,4})[./-](\d{1,2})[./-](\d{1,4}),?\s+(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?\s*([AaPp]\.?\s?[Mm]\.?)?\]\s*([^:]+?):\s?([\s\S]*)$/,
  /^‎?(\d{1,4})[./-](\d{1,2})[./-](\d{1,4}),?\s+(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?\s*([AaPp]\.?\s?[Mm]\.?)?\s+-\s+([^:]+?):\s?([\s\S]*)$/,
];
const WA_SKIP = /^(<Medya dahil edilmedi>|<Media omitted>|Bu mesaj silindi|Bu mesajı sildiniz|This message was deleted|You deleted this message|null|<Bu mesaj düzenlendi>|‎?image omitted|‎?video omitted)$/i;
const WA_ATTACH = [/^‎?<(?:attached|ekli):\s*([^>]+)>/i, /^‎?(.+?\.\w{2,5})\s+\((?:dosya ekli|file attached)\)/i];
function parse(txt) {
  const msgs = [];
  for (const raw of txt.replace(/\r/g, '').split('\n')) {
    const line = raw.replace(/[‎ ]/g, m => m === ' ' ? ' ' : '');
    let m = null; for (const re of WA_LINE) { m = line.match(re); if (m) break; }
    if (m) msgs.push({ a: +m[1], b: +m[2], y: +m[3], h: +m[4], mi: +m[5], s: +(m[6] || 0), ap: m[7], who: m[8], text: m[9] });
    else if (msgs.length) msgs.at(-1).text += '\n' + line;
  }
  const mdy = !msgs.some(x => x.a > 12) && msgs.some(x => x.b > 12);
  return msgs.map(x => {
    let d, mo, y;
    if (x.a > 31) [y, mo, d] = [x.a, x.b, x.y]; else if (mdy) [mo, d, y] = [x.a, x.b, x.y]; else [d, mo, y] = [x.a, x.b, x.y];
    if (y < 100) y += 2000;
    let h = x.h; if (x.ap) { const pm = /p/i.test(x.ap); if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0; }
    return { ts: new Date(y, mo - 1, d, h, x.mi, x.s).getTime(), who: x.who.trim(), text: x.text.trim() };
  }).filter(x => !isNaN(x.ts));
}
const dayKey = ts => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const fnv = t => { let h = 2166136261; for (let k = 0; k < t.length; k++) { h ^= t.charCodeAt(k); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
const kindOf = n => /\.(jpe?g|png|webp|gif|heic)$/i.test(n) ? 'image' : /\.(mp4|mov|3gp|webm|mkv)$/i.test(n) ? 'video' : /\.(opus|mp3|m4a|ogg|aac|wav)$/i.test(n) ? 'audio' : 'file';
const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', heic: 'image/heic', mp4: 'video/mp4', mov: 'video/quicktime', '3gp': 'video/3gpp', webm: 'video/webm', opus: 'audio/ogg', ogg: 'audio/ogg', mp3: 'audio/mpeg', m4a: 'audio/mp4', pdf: 'application/pdf', txt: 'text/plain', vcf: 'text/vcard' };
const mimeOf = n => MIME[extname(n).slice(1).toLowerCase()] || 'application/octet-stream';
const URL_RE = /https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]]/g;

// ---------- unzip + read ----------
mkdirSync(DATA, { recursive: true }); mkdirSync(ORIG, { recursive: true }); mkdirSync(REPOS, { recursive: true });
const work = join(tmpdir(), 'nts-import-' + fnv(zipPath + statSync(zipPath).size));
if (!existsSync(join(work, '.done'))) { rmSync(work, { recursive: true, force: true }); mkdirSync(work, { recursive: true }); console.log('Zip açılıyor…'); sh('unzip', ['-o', '-q', zipPath, '-d', work], { ok: true }); writeFileSync(join(work, '.done'), ''); }
const all = []; (function walk(d) { for (const f of readdirSync(d, { withFileTypes: true })) { const p = join(d, f.name); f.isDirectory() ? walk(p) : all.push(p); } })(work);
const txt = all.filter(p => p.endsWith('.txt')).sort((a, b) => (/chat|sohbet/i.test(basename(b)) - /chat|sohbet/i.test(basename(a))) || statSync(b).size - statSync(a).size)[0];
if (!txt) { console.log('Zip içinde sohbet .txt dosyası yok'); process.exit(1); }
const byName = new Map(all.map(p => [basename(p), p]));
const chat = (basename(zipPath).replace(/\.(zip|txt)$/i, '').match(/(?:chat with|sohbeti?\s*-|ile sohbet|-)\s*(.+)$/i)?.[1] || basename(zipPath).replace(/\.zip$/i, '')).trim().slice(0, 60);
const msgs = parse(readFileSync(txt, 'utf8')).filter(m => m.text && !WA_SKIP.test(m.text));
const groups = []; for (const m of msgs) { const g = groups.at(-1); if (g && dayKey(g.at(-1).ts) === dayKey(m.ts) && m.ts - g.at(-1).ts < 30 * 60e3) g.push(m); else groups.push([m]); }

// ---------- plan: which files, how big, what happens to them ----------
const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : { files: {}, items: {} };
const plan = [], seen = new Set();
for (const g of groups) for (const m of g) for (const re of WA_ATTACH) { const a = m.text.match(re); if (a) { const name = a[1].trim(), p = byName.get(name); if (p && !seen.has(p)) { seen.add(p); plan.push({ name, path: p, size: statSync(p).size, kind: kindOf(name), ts: m.ts }); } break; } }
const hashOf = p => createHash('sha1').update(readFileSync(p)).digest('hex');
for (const f of plan) { f.hash = hashOf(f.path); f.done = !!state.files[f.hash]; }
const hashByPath = new Map(plan.map(f => [f.path, f.hash]));
const dupHashes = new Set(), unique = plan.filter(f => { if (dupHashes.has(f.hash)) return false; dupHashes.add(f.hash); return true; });
const todo = unique.filter(f => !f.done), sum = l => l.reduce((n, f) => n + f.size, 0);
const photos = todo.filter(f => f.kind === 'image'), videos = todo.filter(f => f.kind === 'video'), others = todo.filter(f => f.kind !== 'image' && f.kind !== 'video');
const big = videos.filter(f => f.size > MAX_FILE);
const estPhotos = photos.reduce((n, f) => n + Math.min(f.size, 450e3), 0), estVideos = videoMode === 'thumb' ? 0 : videos.reduce((n, f) => n + Math.min(f.size, MAX_FILE), 0);
const est = estPhotos + estVideos + sum(others) + todo.length * 20e3;
console.log(`\nNts · WhatsApp içe aktarma: ${chat}
  Mesaj:        ${msgs.length}  →  ${groups.length} kayıt (aynı gün, aralarında 30 dk'dan az olanlar tek kayıt)
  Fotoğraf:     ${photos.length}  (${MB(sum(photos))} → küçültünce ~${MB(estPhotos)})
  Video:        ${videos.length}  (${MB(sum(videos))})${big.length ? `, ${big.length} tanesi 95 MB'tan büyük → ffmpeg ile 95 MB altına` : ''}${videoMode === 'thumb' ? ' → sadece küçük resim' : ''}
  Diğer dosya:  ${others.length}  (${MB(sum(others))})
  Zaten içeride: ${unique.length - todo.length} dosya · aynı dosyanın kopyası: ${plan.length - unique.length}
  GitHub'a gidecek: ~${MB(est)}  (repo başına ~900 MB → ${Math.max(1, Math.ceil(est / LIMIT))} repo)
  Orijinaller: ${ORIG}`);
if (!yes) { console.log('\nBu bir deneme raporu. İçe aktarmak için:  nts import "' + zipPath + '" --yes\n'); process.exit(0); }

// ---------- GitHub repos (same names the app uses) ----------
const login = sh('gh', ['api', 'user', '--jq', '.login']);
const existing = sh('gh', ['repo', 'list', login, '--limit', '200', '--json', 'name,diskUsage', '--jq', '.[] | select(.name|test("^nts-files-[0-9]+$")) | "\\(.name) \\(.diskUsage)"'], { ok: true })
  .split('\n').filter(Boolean).map(l => { const [name, kb] = l.split(' '); return { name, kb: +kb || 0, n: +name.split('-').pop() }; }).sort((a, b) => a.n - b.n);
let repo = existing.at(-1) || null, repoBytes = (repo?.kb || 0) * 1024;
function openRepo(r) {
  const dir = join(REPOS, r.name);
  if (!existsSync(join(dir, '.git'))) sh('gh', ['repo', 'clone', `${login}/${r.name}`, dir, '--', '--depth', '1']);
  else sh('git', ['-C', dir, 'pull', '--ff-only', '-q'], { ok: true });
  return dir;
}
function nextRepo() {
  const n = (repo?.n || 0) + 1, name = `nts-files-${n}`;
  sh('gh', ['repo', 'create', name, '--private', '--add-readme', '--description', 'Nts dosyaları (otomatik)'], { ok: true });
  console.log('Yeni repo: ' + name); repo = { name, n, kb: 0 }; repoBytes = 0; return openRepo(repo);
}
let dir = repo ? openRepo(repo) : nextRepo();
let pending = 0, pendingBytes = 0;
// GitHub drops one big push with HTTP 408, so batches stay ~100 MB and a failed push is tried again (it resumes from what arrived)
const pushRetry = () => { for (let t = 1; ; t++) { try { return sh('git', ['-C', dir, '-c', 'http.postBuffer=524288000', 'push', '-q']); } catch (e) { if (t >= 4) throw e; console.log(`\n  push yeniden deneniyor (${t})…`); spawnSync('sleep', [String(10 * t)]); } } };
const push = msg => { if (!pending) return; sh('git', ['-C', dir, 'add', '-A']); sh('git', ['-C', dir, 'commit', '-q', '-m', msg], { ok: true }); pushRetry(); pending = 0; pendingBytes = 0; writeFileSync(STATE, JSON.stringify(state)); };

// ---------- files ----------
const probe = p => { try { return JSON.parse(sh('ffprobe', ['-v', 'quiet', '-print_format', 'json', '-show_format', p])).format; } catch { return {}; } };
function prepare(f, out) { // → path of the file to store
  if (f.kind === 'image' && /\.(jpe?g|png|webp)$/i.test(f.name) && f.size > 500e3) {
    sh('ffmpeg', ['-y', '-v', 'error', '-i', f.path, '-vf', "scale='if(gt(iw,ih),min(1600,iw),-2)':'if(gt(iw,ih),-2,min(1600,ih))'", '-q:v', '4', out + '.jpg']);
    return out + '.jpg';
  }
  if (f.kind === 'video' && f.size > MAX_FILE) { // re-encode under 95 MB: bitrate from the duration, smaller picture when needed
    const dur = +probe(f.path).duration || 60, kbps = Math.max(250, Math.floor((MAX_FILE * 8 * .92) / dur / 1000) - 96);
    const h = kbps < 900 ? 480 : kbps < 2000 ? 720 : 1080;
    sh('ffmpeg', ['-y', '-v', 'error', '-i', f.path, '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', kbps + 'k', '-maxrate', Math.round(kbps * 1.2) + 'k', '-bufsize', kbps * 2 + 'k',
      '-vf', `scale=-2:'min(${h},ih)'`, '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', out + '.mp4']);
    if (statSync(out + '.mp4').size > MAX_FILE) throw new Error(f.name + ' hâlâ 95 MB üstü');
    return out + '.mp4';
  }
  return f.path;
}
function thumb(f, out) {
  if (f.kind !== 'image' && f.kind !== 'video') return null;
  const a = f.kind === 'video' ? ['-ss', '1'] : [];
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', ...a, '-i', f.path, '-frames:v', '1', '-vf', "scale='if(gt(iw,ih),min(320,iw),-2)':'if(gt(iw,ih),-2,min(320,ih))'", '-c:v', 'libwebp', '-quality', '70', out + '.webp']);
  return r.status === 0 && existsSync(out + '.webp') ? out + '.webp' : null;
}
const tmp = join(work, '.out'); mkdirSync(tmp, { recursive: true });
let k = 0;
for (const f of todo) {
  k++;
  try {
    const month = dayKey(f.ts).slice(0, 7), id = 'wf' + f.hash.slice(0, 12);
    copyFileSync(f.path, join(ORIG, f.hash.slice(0, 12) + '-' + f.name)); // the original stays on this PC
    const base = join(tmp, id), storeAs = videoMode === 'thumb' && f.kind === 'video' ? null : prepare(f, base), t = thumb(f, base);
    const size = (storeAs ? statSync(storeAs).size : 0) + (t ? statSync(t).size : 0);
    if (repoBytes + size > LIMIT) { push(`nts import ${chat}`); dir = nextRepo(); }
    const rel = storeAs ? `files/${month}/${id}${extname(storeAs).toLowerCase()}` : null, trel = t ? `thumbs/${month}/${id}.webp` : null;
    if (rel) { mkdirSync(join(dir, 'files', month), { recursive: true }); copyFileSync(storeAs, join(dir, rel)); }
    if (trel) { mkdirSync(join(dir, 'thumbs', month), { recursive: true }); copyFileSync(t, join(dir, trel)); }
    state.files[f.hash] = { repo: `${login}/${repo.name}`, path: rel, thumb: trel, size: storeAs ? statSync(storeAs).size : 0 };
    repoBytes += size; pending++; pendingBytes += size;
    process.stdout.write(`\r  ${k}/${todo.length} ${f.name.slice(0, 40).padEnd(40)} ${MB(repoBytes)} / 900 MB  `);
    if (pending >= 150 || pendingBytes > 100e6) push(`nts import ${chat}`);
  } catch (e) { console.log(`\n  atlandı: ${f.name} (${e.message})`); }
}
push(`nts import ${chat}`); console.log('');

// ---------- items (ids match the app's own WhatsApp import, so nothing doubles) ----------
const items = [];
for (const g of groups) {
  const id = 'wa' + fnv(chat + g[0].ts + g[0].text.slice(0, 60)); if (state.items[id]) continue;
  const log = [], kids = [];
  for (const m of g) {
    let att = null, text = m.text;
    for (const re of WA_ATTACH) { const a = text.match(re); if (a) { att = a[1].trim(); text = text.slice(a[0].length).trim(); break; } }
    if (att) {
      const p = byName.get(att), info = p && state.files[hashByPath.get(p)], kid = 'wf' + fnv(id + att);
      kids.push({ id: kid, type: 'file', fileName: att, mime: mimeOf(att), size: info?.size || 0, text, ts: m.ts, parent: id, archive: true, source: 'whatsapp', chat, tags: [], pending: false,
        ...(info?.path ? { ghRepo: info.repo, ghPath: info.path, fileSynced: true } : {}), ...(info?.thumb ? { ghRepo: info.repo, ghThumb: info.thumb } : {}), ...(!info?.path ? { fileSkip: true } : {}) });
      log.push({ ts: m.ts, who: m.who, text, att: kid });
    } else log.push({ ts: m.ts, who: m.who, text });
  }
  const who = [...new Set(g.map(m => m.who))], photos = kids.filter(x => kindOf(x.fileName) === 'image');
  if (g.length === 1 && !kids.length) {
    const urls = g[0].text.match(URL_RE) || [];
    items.push(urls.length === 1 ? { id, type: 'link', url: urls[0], text: g[0].text.replace(urls[0], '').trim(), ts: g[0].ts, source: 'whatsapp', chat, archive: true, tags: [], pending: true }
      : { id, type: 'note', text: g[0].text, ts: g[0].ts, source: 'whatsapp', chat, archive: true, tags: [], pending: true });
  } else {
    const label = new Date(g[0].ts).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    items.push({ id, type: 'note', title: `${label} · ${g.length} mesaj`, ts: g[0].ts, source: 'whatsapp', chat, archive: true, tags: [], pending: true,
      text: log.map(l => (who.length > 1 ? l.who + ': ' : '') + (l.att ? `[${kids.find(x => x.id === l.att)?.fileName}] ` : '') + l.text).join('\n').trim(),
      conv: { n: g.length, who, end: g.at(-1).ts, log, kids: kids.map(x => x.id) }, ...(photos[0] ? { cover: photos[0].id } : {}) }, ...kids);
  }
  state.items[id] = 1;
}
const t = Date.now(); items.forEach(i => { i.createdAt = t; i.updatedAt = t; });
const q = existsSync(QUEUE) ? JSON.parse(readFileSync(QUEUE, 'utf8')) : [];
writeFileSync(QUEUE, JSON.stringify([...q, ...items]), { mode: 0o600 }); writeFileSync(STATE, JSON.stringify(state));
console.log(`Bitti: ${items.length} kayıt sırada. Uygulama açıkken (PC'de ya da telefonda) kendiliğinden içeri alınır; Claude gruplar halinde düzenler.`);
