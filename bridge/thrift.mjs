// 148: spend fewer AI tokens. Usage log (every call), a result cache (same content is never sent twice),
// local answers for noise (WhatsApp "ok", emoji, "<Media omitted>"), tesseract before vision, and a daily cap for background jobs.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, appendFileSync, existsSync, statSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const DATA_DIR = process.env.NTS_DATA_DIR || join(homedir(), '.local', 'share', 'nts');
mkdirSync(DATA_DIR, { recursive: true });
const USAGE = join(DATA_DIR, 'usage.jsonl'), CACHE = join(DATA_DIR, 'ai-cache.json');

// ---- usage: one JSON line per AI call ----
// "token" for people = input + cache writes + output + cache reads / 10 (cache reads cost a tenth, like the plan limits count them)
export const weight = u => (u.in || 0) + (u.cw || 0) + (u.out || 0) + Math.round((u.cr || 0) / 10);
export function fromClaude(j) {
  const u = j?.usage || {};
  return { in: u.input_tokens || 0, cw: u.cache_creation_input_tokens || 0, cr: u.cache_read_input_tokens || 0, out: u.output_tokens || 0, usd: j?.total_cost_usd || 0, turns: j?.num_turns || 1 };
}
export function fromGemini(j) {
  let i = 0, o = 0, c = 0;
  for (const m of Object.values(j?.stats?.models || {})) { const t = m.tokens || {}; i += t.prompt || 0; o += t.candidates || 0; c += t.cached || 0; }
  return { in: Math.max(0, i - c), cr: c, out: o };
}
export const estimate = s => Math.ceil(String(s || '').length / 3.6); // no usage report (Codex): a rough count, marked est
export function logUsage(e) {
  try { appendFileSync(USAGE, JSON.stringify({ ts: Date.now(), ...e }) + '\n', { mode: 0o600 }); } catch (err) { console.warn('usage log', err.message); }
  sumCache = null;
}
let sumCache = null;
const dayKey = t => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export function usageSummary(now = Date.now()) {
  if (sumCache && sumCache.day === dayKey(now) && sumCache.size === (existsSync(USAGE) ? statSync(USAGE).size : 0)) return sumCache.v;
  const today = dayKey(now), month = today.slice(0, 7), v = { today: 0, month: 0, calls: 0, saved: 0, kinds: {}, days: {} };
  if (existsSync(USAGE)) for (const line of readFileSync(USAGE, 'utf8').split('\n')) {
    if (!line) continue; let e; try { e = JSON.parse(line); } catch { continue; }
    const d = dayKey(e.ts), w = weight(e);
    if (d.slice(0, 7) !== month) continue;
    v.month += w; v.saved += e.saved || 0; if (!e.local) v.calls++;
    if (d === today) v.today += w;
    v.days[d] = (v.days[d] || 0) + w;
    const k = v.kinds[e.kind || '?'] ||= { tok: 0, calls: 0, items: 0 }; k.tok += w; if (!e.local) k.calls++; k.items += e.n || 0;
  }
  sumCache = { day: today, size: existsSync(USAGE) ? statSync(USAGE).size : 0, v };
  return v;
}

// ---- daily cap: background jobs wait for tomorrow; things the person asks for (ask, board-plan) still run ----
export const BACKGROUND = new Set(['organize', 'ocr', 'summaries', 'folders', 'brief', 'tags']);
export class LimitError extends Error { constructor(until) { super('limit'); this.code = 'limit'; this.until = until; } }
export function checkCap(kind, cap, now = Date.now()) {
  if (!cap || !BACKGROUND.has(kind)) return;
  if (usageSummary(now).today >= cap) { const d = new Date(now); throw new LimitError(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime()); }
}

// ---- result cache (content hash → answer), bounded, on disk ----
const MAX = 6000;
let cache = null, dirty = null;
const load = () => { if (!cache) { try { cache = new Map(Object.entries(JSON.parse(readFileSync(CACHE, 'utf8')))); } catch { cache = new Map(); } } return cache; };
export const hash = (...parts) => createHash('sha1').update(parts.map(p => typeof p === 'string' ? p : JSON.stringify(p)).join('\u0001')).digest('base64url').slice(0, 22);
export function cget(k) { const c = load(); if (!c.has(k)) return undefined; const v = c.get(k); c.delete(k); c.set(k, v); return v; }
export function cput(k, v) {
  const c = load(); c.delete(k); c.set(k, v);
  while (c.size > MAX) c.delete(c.keys().next().value);
  clearTimeout(dirty); dirty = setTimeout(() => { try { writeFileSync(CACHE, JSON.stringify(Object.fromEntries(c)), { mode: 0o600 }); } catch { } }, 1500);
}

// ---- noise: messages that need no AI at all ----
const NOISE = /^(?:<?(?:media omitted|medya dahil edilmedi|görüntü dahil edilmedi|video dahil edilmedi|ses dahil edilmedi|bu mesaj silindi|this message was deleted|you deleted this message|bu mesajı sildiniz|تم حذف هذه الرسالة|missed (?:voice|video) call|cevapsız (?:sesli|görüntülü) arama|null)>?|ok(?:ay|ey)?|tamam(?:dır)?|tmm|tm|evet|hayır|yok|var|olur|peki|eyvallah|sağol|sağ ?ol|teşekkürler|teşekkür ederim|tşk|tşkr|merhaba|selam|selamun aleyküm|aleyküm selam|günaydın|iyi geceler|hah+a+(?:ha)*|ha+ha+|ahah+|lol|yes|no|thanks|thank you|thx|hi|hello|bye|nice|good|cool|hmm+|ه+ه+|شكرا|تمام|نعم|لا|اوك|السلام عليكم|وعليكم السلام|مرحبا)[\s.!?…,]*$/iu;
const ONLY_SYMBOLS = /^[\p{Extended_Pictographic}\p{P}\p{S}\p{Z}‍️\d]*$/u;
// a plain note that is only noise → the app gets a title and no tags, nothing is sent
export function noiseOf(i) {
  if (i.type !== 'note' || i.image || i.fileName || i.url || i.content || i.conv) return null;
  const t = String(i.text || '').trim();
  if (t.length > 60) return null;
  if (!t || ONLY_SYMBOLS.test(t) || NOISE.test(t)) return { id: i.id, title: t.slice(0, 60) || 'Boş not', summary: '', tags: [], local: true };
  return null;
}
// same content in one batch (forwarded twice, the same link saved again) → sent once, the answer is copied
export const sameKey = i => i.image ? null : hash(i.type, (i.url || '').replace(/[#?].*$/, ''), String(i.text || '').trim().toLowerCase().replace(/\s+/g, ' '), i.fileName || '', (i.content || '').slice(0, 400));

// ---- tesseract before vision: text-heavy images (screenshots, receipts, documents) need no image tokens ----
let tessLangs = null;
function langs() {
  if (tessLangs) return tessLangs;
  return tessLangs = new Promise(ok => execFile('tesseract', ['--list-langs'], { timeout: 5000 }, (e, out) => {
    if (e) return ok(null);
    const have = String(out).split('\n').map(s => s.trim());
    ok(['tur', 'eng', 'ara'].filter(l => have.includes(l)).join('+') || null);
  }));
}
// returns the text when tesseract read a real amount of it, else null (photos, drawings → the AI looks)
export async function tesseract(file) {
  const l = await langs(); if (!l) return null;
  const out = await new Promise(ok => execFile('tesseract', [file, 'stdout', '-l', l, '--psm', '3'], { timeout: 30000, maxBuffer: 4e6 }, (e, o) => ok(e ? '' : String(o))));
  return goodText(out);
}
export function goodText(out) {
  const text = String(out || '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  const words = text.split(/\s+/).filter(Boolean), real = words.filter(w => /^[\p{L}\p{N}][\p{L}\p{N}'’.,:;%()\-/]*$/u.test(w) && /[\p{L}]{2,}|\d{2,}/u.test(w));
  if (real.length < 12 || real.length / words.length < .7) return null;
  return text.slice(0, 1500);
}
