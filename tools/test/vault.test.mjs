// 107j: bridge/vault.mjs — folder sync rules (write, same, rename, hand edit = conflict, force, remove, unsafe paths)
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { vaultWrite, vaultStatus, checkDir } from '../../bridge/vault.mjs';
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const dir = mkdtempSync(join(tmpdir(), 'nts-vault-')), conf = { vault: dir }, F = p => join(dir, p);
const f1 = { id: 'a', p: 'Nts/2024-03/2024-03-01 Bir.md', u: 1, text: '# Bir\n' };
let r = vaultWrite(conf, { files: [f1, { id: 'b', p: 'Nts/2024-03/2024-03-02 Foto.md', u: 1, text: '![[x.png]]', att: { p: 'attachments/x.png', b64: Buffer.from('PNG').toString('base64') } }] });
ok(r.written === 2 && readFileSync(F(f1.p), 'utf8') === '# Bir\n' && readFileSync(F('attachments/x.png'), 'utf8') === 'PNG', 'write');
ok(vaultStatus(conf).u.a === 1 && vaultStatus(conf).n === 2, 'status');
r = vaultWrite(conf, { files: [f1] }); ok(r.same === 1 && r.written === 0, 'same');
r = vaultWrite(conf, { files: [{ ...f1, u: 2, text: '# Bir v2\n' }] }); ok(r.written === 1 && readFileSync(F(f1.p), 'utf8') === '# Bir v2\n', 'update');
writeFileSync(F(f1.p), '# Obsidian edit\n');
r = vaultWrite(conf, { files: [{ ...f1, u: 3, text: '# Bir v3\n' }] }); ok(r.conflicts.length === 1 && readFileSync(F(f1.p), 'utf8') === '# Obsidian edit\n', 'hand edit kept');
r = vaultWrite(conf, { files: [], remove: ['a'] }); ok(r.removed === 0 && existsSync(F(f1.p)), 'hand edit not removed');
r = vaultWrite(conf, { files: [{ ...f1, u: 3, text: '# Bir v3\n' }], force: ['a'] }); ok(r.written === 1 && readFileSync(F(f1.p), 'utf8') === '# Bir v3\n', 'force');
const np = 'Nts/2024-03/2024-03-01 Yeni ad.md';
r = vaultWrite(conf, { files: [{ ...f1, p: np, u: 4, text: '# Yeni ad\n' }] }); ok(r.written === 1 && existsSync(F(np)) && !existsSync(F(f1.p)), 'rename');
r = vaultWrite(conf, { files: [], remove: ['b'] }); ok(r.removed === 1 && !existsSync(F('Nts/2024-03/2024-03-02 Foto.md')) && !existsSync(F('attachments/x.png')), 'remove + attachment');
writeFileSync(F('Nts/2024-03/2024-03-05 Benim.md'), 'mine');
r = vaultWrite(conf, { files: [{ id: 'c', p: 'Nts/2024-03/2024-03-05 Benim.md', u: 1, text: 'nts' }] }); ok(r.conflicts.length === 1 && readFileSync(F('Nts/2024-03/2024-03-05 Benim.md'), 'utf8') === 'mine', 'someone else\'s file');
for (const p of ['../x.md', 'Nts/../../x.md', '/etc/x.md', 'Nts/a.sh', 'other/a.md', 'Nts//a.md']) { let t = false; try { vaultWrite(conf, { files: [{ id: 'z', p, u: 1, text: 'x' }] }); } catch { t = true; } ok(t, 'unsafe ' + p); }
for (const d of ['/etc', '~', 'rel/dir', '~/.ssh/x']) { let t = false; try { checkDir(d); } catch { t = true; } ok(t, 'bad dir ' + d); }
ok(checkDir('~/Documents/Nts').endsWith('/Documents/Nts'), 'good dir');
rmSync(dir, { recursive: true });
console.log(`vault ${pass}/${pass + fail}`); process.exit(fail ? 1 : 0);
