#!/usr/bin/env node
// Nts MCP server for Claude Code: search / list / add your saved notes, links and files.
// Reads the snapshot the open Nts app gives the bridge (~/.config/hizli-note/snapshot.json); adding goes to the bridge inbox.
// Register once:  claude mcp add nts -- node /path/to/hizli_note/bridge/mcp.mjs
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { createInterface } from 'node:readline';

const DIR = join(homedir(), '.config', 'hizli-note');
const conf = () => JSON.parse(readFileSync(join(DIR, 'bridge.json'), 'utf8'));
function snapshot() {
  const f = join(DIR, 'snapshot.json');
  if (!existsSync(f)) throw new Error('Henüz kopya yok: Nts uygulamasını bu bilgisayarda bir kez aç (Claude köprüsü bağlıyken).');
  return JSON.parse(readFileSync(f, 'utf8'));
}
const norm = s => (s || '').toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');
const hay = i => norm([i.title, i.text, i.url, i.file, i.summary, (i.tags || []).join(' '), i.project, i.todo?.text, (i.highlights || []).join(' ')].join(' '));
const brief = i => ({ ...i, text: i.text?.slice(0, 500) });
const age = s => { const { at } = s; const m = Math.round((Date.now() - at) / 60000); return m < 2 ? 'az önce' : m < 120 ? `${m} dk önce` : `${Math.round(m / 60)} saat önce`; };

const TOOLS = [
  { name: 'nts_search', description: 'Search the user\'s saved Nts items (notes, links, files, photos, tasks) by words. Turkish-aware, accent-insensitive.',
    inputSchema: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'number', description: 'default 20' } }, required: ['query'] } },
  { name: 'nts_recent', description: 'List items the user saved in the last N days, newest first ("geçen hafta ne kaydettim?").',
    inputSchema: { type: 'object', properties: { days: { type: 'number', description: 'default 7' }, type: { type: 'string', enum: ['link', 'note', 'photo', 'file'] }, limit: { type: 'number' } } } },
  { name: 'nts_todos', description: 'The user\'s open to-do items with due dates (overdue first).', inputSchema: { type: 'object', properties: {} } },
  { name: 'nts_add', description: 'Save a new note or link into Nts (it appears in the app the next time it is open on this computer).',
    inputSchema: { type: 'object', properties: { text: { type: 'string', description: 'note text, may contain a URL' } }, required: ['text'] } },
];

async function call(name, a = {}) {
  if (name === 'nts_add') {
    const c = conf(), r = await fetch(`http://127.0.0.1:${c.port}/inbox`, { method: 'POST', headers: { authorization: `Bearer ${c.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ text: String(a.text || '') }) });
    if (!r.ok) throw new Error('Köprü kapalı: systemctl --user start hizli-note-bridge');
    return 'Kaydedildi. Nts açıldığında kutuya düşer.';
  }
  const s = snapshot(), items = s.items, head = `(${items.length} kayıt, kopya ${age(s)})`;
  if (name === 'nts_search') {
    const toks = norm(a.query).split(/\s+/).filter(Boolean);
    const hits = items.map(i => { const h = hay(i); return [i, toks.reduce((n, t) => n + (h.includes(t) ? 1 : 0), 0)]; }).filter(x => x[1] === toks.length || (toks.length > 2 && x[1] >= toks.length - 1))
      .sort((x, y) => y[1] - x[1] || y[0].date.localeCompare(x[0].date)).slice(0, a.limit || 20).map(x => brief(x[0]));
    return `${hits.length} sonuç ${head}\n${JSON.stringify(hits, null, 1)}`;
  }
  if (name === 'nts_recent') {
    const since = Date.now() - (a.days || 7) * 864e5;
    const list = items.filter(i => Date.parse(i.date) >= since && (!a.type || i.type === a.type)).sort((x, y) => y.date.localeCompare(x.date)).slice(0, a.limit || 50).map(brief);
    return `${list.length} kayıt son ${a.days || 7} günde ${head}\n${JSON.stringify(list, null, 1)}`;
  }
  if (name === 'nts_todos') {
    const list = items.filter(i => i.todo && !i.todo.done).sort((x, y) => (x.todo.due || '9').localeCompare(y.todo.due || '9'));
    return `${list.length} açık görev ${head}\n${list.map((i, n) => `${n + 1}. ${i.todo.text}${i.todo.due ? ` (${i.todo.due})` : ''}${i.project ? ` [${i.project}]` : ''}`).join('\n')}`;
  }
  throw new Error('unknown tool ' + name);
}

const out = m => process.stdout.write(JSON.stringify(m) + '\n');
createInterface({ input: process.stdin }).on('line', async line => {
  let m; try { m = JSON.parse(line); } catch { return; }
  const { id, method, params } = m;
  if (id === undefined) return; // notifications
  try {
    if (method === 'initialize') return out({ jsonrpc: '2.0', id, result: { protocolVersion: params?.protocolVersion || '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'nts', version: '1.0.0' } } });
    if (method === 'tools/list') return out({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
    if (method === 'tools/call') {
      try { return out({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: await call(params.name, params.arguments) }] } }); }
      catch (e) { return out({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: 'Hata: ' + e.message }], isError: true } }); }
    }
    if (method === 'ping') return out({ jsonrpc: '2.0', id, result: {} });
    out({ jsonrpc: '2.0', id, error: { code: -32601, message: 'method not found' } });
  } catch (e) { out({ jsonrpc: '2.0', id, error: { code: -32603, message: e.message } }); }
});
