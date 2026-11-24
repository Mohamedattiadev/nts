// 107j: Obsidian / Markdown folder sync. The app sends one .md per item (+ its attachment once); this writes them into a folder on this PC.
// One way (Nts → folder). A file changed by hand in the folder (Obsidian) is never overwritten or deleted: it is reported as a conflict.
// The folder keeps .nts-sync.json: { files: { id: { p: 'Nts/2024-03/…md', h: sha1 of what we wrote, u: item's updatedAt, a: attachment path } } }
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync, unlinkSync, statSync, rmdirSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname, normalize, isAbsolute, sep } from 'node:path';

const sha = b => createHash('sha1').update(b).digest('hex');
export const defaultDir = () => { const d = join(homedir(), 'Documents'); return join(existsSync(d) ? d : homedir(), 'Nts'); };
export const vaultDir = conf => conf.vault || defaultDir();

// only a folder inside the home folder, never home itself or a hidden/system one
export function checkDir(d) {
  d = String(d || '').trim().replace(/^~(?=\/|$)/, homedir());
  if (!isAbsolute(d)) throw new Error('Tam yol yaz (ör. ~/Documents/Obsidian/Nts)');
  d = normalize(d).replace(/\/+$/, '');
  if (!d.startsWith(homedir() + sep) || d === homedir()) throw new Error('Klasör ev klasörünün içinde olmalı');
  if (/\/\.(config|ssh|gnupg|local|cache)(\/|$)/.test(d.slice(homedir().length))) throw new Error('Bu klasör olmaz');
  return d;
}
// a relative path from the app: Nts/… or attachments/…, no "..", no absolute, .md or a file under attachments/
function safe(dir, p) {
  p = String(p || '').replace(/\\/g, '/');
  if (!/^(Nts|attachments)\//.test(p) || p.split('/').some(s => !s || s === '.' || s === '..') || p.length > 400) throw new Error('bad path ' + p);
  if (p.startsWith('Nts/') && !p.endsWith('.md')) throw new Error('bad path ' + p);
  const f = join(dir, p); if (!f.startsWith(dir + sep)) throw new Error('bad path ' + p);
  return f;
}
const MAN = dir => join(dir, '.nts-sync.json');
const readMan = dir => { try { return JSON.parse(readFileSync(MAN(dir), 'utf8')); } catch { return { files: {} }; } };
const hashOf = f => { try { return sha(readFileSync(f)); } catch { return null; } };
function dropEmpty(dir, f) { // remove now-empty month folders, never the vault itself
  for (let d = dirname(f); d.startsWith(dir + sep); d = dirname(d)) { try { if (readdirSync(d).length) break; rmdirSync(d); } catch { break; } }
}

export function vaultStatus(conf) {
  const dir = vaultDir(conf), m = readMan(dir), u = {};
  for (const [id, e] of Object.entries(m.files)) u[id] = e.u;
  return { dir, exists: existsSync(dir), n: Object.keys(u).length, u, at: m.at || 0 };
}

// body: { files: [{ id, p, u, text, att?: { p, b64 } }], remove: [id], force?: [id] }  force = overwrite a conflict (the user said so)
export function vaultWrite(conf, body) {
  const dir = vaultDir(conf); mkdirSync(dir, { recursive: true });
  const m = readMan(dir), force = new Set(body.force || []), out = { dir, written: 0, same: 0, removed: 0, conflicts: [] };
  const mine = (f, h) => { const now = hashOf(f); return now === null || now === h; }; // gone, or still exactly what we wrote
  for (const x of (body.files || []).slice(0, 2000)) {
    if (!x || typeof x.id !== 'string' || typeof x.text !== 'string') continue;
    const f = safe(dir, x.p), old = m.files[x.id], text = Buffer.from(x.text, 'utf8'), h = sha(text);
    if (old && old.p !== x.p) { // renamed (title changed): the old file goes if it was not edited by hand
      const of = safe(dir, old.p);
      if (mine(of, old.h) || force.has(x.id)) { if (existsSync(of)) { unlinkSync(of); dropEmpty(dir, of); } }
      else { out.conflicts.push(old.p); continue; }
    }
    if (existsSync(f)) {
      const now = hashOf(f);
      if (now === h) { m.files[x.id] = { ...old, p: x.p, h, u: x.u }; out.same++; continue; }
      const ours = old && old.p === x.p && now === old.h;
      if (!ours && !force.has(x.id)) { out.conflicts.push(x.p); continue; } // edited in Obsidian, or someone else's file with that name
    }
    mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, text);
    const e = { p: x.p, h, u: x.u };
    if (x.att?.p && typeof x.att.b64 === 'string') { const af = safe(dir, x.att.p); if (!existsSync(af)) { mkdirSync(dirname(af), { recursive: true }); writeFileSync(af, Buffer.from(x.att.b64, 'base64')); } e.a = x.att.p; }
    else if (old?.a) e.a = old.a;
    m.files[x.id] = e; out.written++;
  }
  for (const id of (body.remove || []).slice(0, 5000)) {
    const e = m.files[id]; if (!e) continue;
    const f = safe(dir, e.p);
    if (!mine(f, e.h) && !force.has(id)) { out.conflicts.push(e.p); continue; }
    if (existsSync(f)) { unlinkSync(f); dropEmpty(dir, f); }
    if (e.a) { const af = safe(dir, e.a); if (existsSync(af) && statSync(af).isFile()) unlinkSync(af); }
    delete m.files[id]; out.removed++;
  }
  m.at = Date.now();
  writeFileSync(MAN(dir), JSON.stringify(m));
  return out;
}
