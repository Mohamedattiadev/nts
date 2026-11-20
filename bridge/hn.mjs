#!/usr/bin/env node
// hn — send anything to Hızlı Not from the PC (no browser needed).
//   hn "metin ya da link"      hn dosya.pdf resim.jpg      hn --clip (pano)      echo x | hn -
import { readFileSync, existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join, basename } from 'node:path';

const conf = JSON.parse(readFileSync(join(homedir(), '.config/hizli-note/bridge.json'), 'utf8'));
const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', heic: 'image/heic', mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
  mp3: 'audio/mpeg', ogg: 'audio/ogg', opus: 'audio/ogg', m4a: 'audio/mp4', wav: 'audio/wav', pdf: 'application/pdf', txt: 'text/plain', md: 'text/markdown', zip: 'application/zip',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' };
const mimeOf = p => MIME[p.split('.').pop().toLowerCase()] || 'application/octet-stream';
const notify = (msg, urgent) => { try { execFileSync('notify-send', ['-a', 'Hızlı Not', ...(urgent ? ['-u', 'critical'] : []), 'Hızlı Not', msg]); } catch { } console.log(msg); };
const sh = (cmd, args) => { try { return execFileSync(cmd, args, { maxBuffer: 300e6 }); } catch { return null; } };
const fileEntry = p => ({ name: basename(p), mime: mimeOf(p), size: statSync(p).size, data: readFileSync(p).toString('base64') });

let text = [], files = [];
const args = process.argv.slice(2);
if (args[0] === '--clip') {
  const wayland = !!process.env.WAYLAND_DISPLAY;
  const types = String((wayland ? sh('wl-paste', ['--list-types']) : sh('xclip', ['-selection', 'clipboard', '-t', 'TARGETS', '-o'])) || '').split('\n');
  const get = t => wayland ? sh('wl-paste', ['--no-newline', '--type', t]) : sh('xclip', ['-selection', 'clipboard', '-t', t, '-o']);
  const img = types.find(t => /^image\/(png|jpeg|webp|gif)$/.test(t));
  if (types.includes('text/uri-list')) {
    for (const u of String(get('text/uri-list')).split(/\r?\n/).filter(Boolean)) {
      const p = u.startsWith('file://') ? decodeURIComponent(u.slice(7)) : null;
      if (p && existsSync(p) && statSync(p).isFile()) files.push(fileEntry(p)); else if (!p) text.push(u);
    }
  }
  if (!files.length && !text.length && img) { const b = get(img); if (b?.length) files.push({ name: `pano-${Date.now()}.${img.split('/')[1]}`, mime: img, size: b.length, data: b.toString('base64') }); }
  if (!files.length && !text.length) { const t = get('text/plain;charset=utf-8') || get('text/plain') || get('UTF8_STRING'); if (t?.length) text.push(String(t)); }
} else if (args[0] === '-' || (!args.length && !process.stdin.isTTY)) {
  text.push(readFileSync(0, 'utf8'));
} else {
  for (const a of args) {
    const p = a.startsWith('file://') ? decodeURIComponent(a.slice(7)) : a;
    if (existsSync(p) && statSync(p).isFile()) files.push(fileEntry(p)); else text.push(a);
  }
}
const body = { text: text.join('\n').trim(), files };
if (!body.text && !files.length) { notify('Gönderilecek bir şey yok (pano boş?)', true); process.exit(1); }
try {
  const r = await fetch(`http://127.0.0.1:${conf.port}/inbox`, { method: 'POST', headers: { authorization: 'Bearer ' + conf.token, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  notify(files.length ? `${files.length} dosya gönderildi ✓` : `Gönderildi ✓  ${body.text.slice(0, 80)}`);
} catch (e) { notify('Köprü kapalı: node bridge/server.mjs çalışmıyor (' + e.message + ')', true); process.exit(1); }
