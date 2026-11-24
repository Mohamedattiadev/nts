#!/usr/bin/env node
// 148: a stand-in `claude` for tools/tokbench.mjs. It never calls a model: it answers the schema with plain values and
// reports a usage block the way claude -p does, from the real sizes it was given (system + schema + stdin, images, tool turns).
// Every call is also appended to $FAKE_LOG, so the old bridge (which logged nothing) can be measured the same way.
import { appendFileSync } from 'node:fs';
const a = process.argv.slice(2), arg = k => { const i = a.indexOf(k); return i < 0 ? '' : a[i + 1]; };
let input = ''; for await (const c of process.stdin) input += c;
const system = arg('--system-prompt'), schema = arg('--json-schema'), tools = arg('--tools');
const tok = s => Math.ceil(String(s).length / 3.6);
const imgs = tools === 'Read' ? [...new Set(input.match(/\/[\w./-]+\.jpg/g) || [])].length : 0;
const base = 400 + tok(system) + tok(schema) + tok(input) + (tools === 'Read' ? 300 : 0);
// the agent reads ~4 pictures per turn; every next turn re-sends the conversation (cache reads) plus the new pictures
const turns = 1 + Math.ceil(imgs / 4);
let ids = []; try { ids = [...new Set([...input.matchAll(/"(?:id|key)":"([^"]+)"/g)].map(m => m[1]))]; } catch { }
const isKey = /"key":/.test(input);
const items = ids.map(id => isKey ? { key: id, line: 'özet', name: 'Klasör' } : { id, title: 'Başlık', summary: 'Kısa bir özet cümlesi.', tags: ['iş'], text: '', labels: ['foto'] });
const out = Math.max(20, ids.length * 45);
const usage = { input_tokens: 3, cache_creation_input_tokens: base + imgs * 1600, cache_read_input_tokens: turns > 1 ? (turns - 1) * (base + imgs * 800) : 0, output_tokens: out };
const so = schema.includes('"answer"') ? { answer: 'Cevap.', sources: ids.slice(0, 3) } : schema.includes('"line"') && !isKey ? { line: 'Dün iş.' } : schema.includes('"groups"') ? { name: 'pano', summary: 'x', groups: [] } : schema.includes('"map"') ? { map: [] } : { items };
if (process.env.FAKE_LOG) appendFileSync(process.env.FAKE_LOG, JSON.stringify({ imgs, turns, ...usage }) + '\n');
process.stdout.write(JSON.stringify({ type: 'result', is_error: false, result: JSON.stringify(so), structured_output: so, num_turns: turns, total_cost_usd: 0, usage }));
