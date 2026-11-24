// 152: tests for dedup.js (link folding tr/en/ar, groups, merge, import index). Run: node tools/test/dedup.test.mjs
import { createRequire } from 'node:module';
const D = createRequire(import.meta.url)('../../dedup.js');
let ok = 0, bad = 0; const eq = (name, got, want) => { if (JSON.stringify(got) === JSON.stringify(want)) ok++; else { bad++; console.log('✗', name, '\n  got ', got, '\n  want', want); } };
const same = (a, b) => eq(`same ${a} ~ ${b}`, D.urlKey(a), D.urlKey(b));
const diff = (a, b) => eq(`diff ${a} ≠ ${b}`, D.urlKey(a) === D.urlKey(b), false);

// scheme, www, m., mobile., trailing /, host case, fragment, default port
same('http://example.com/a', 'https://example.com/a');
same('https://www.example.com/a/', 'https://example.com/a');
same('https://m.example.com/a', 'https://example.com/a');
same('https://mobile.twitter.com/x/status/1', 'https://twitter.com/x/status/1');
same('https://EXAMPLE.com/a', 'https://example.com/a');
same('https://example.com/a#part', 'https://example.com/a');
same('https://example.com:443/a', 'https://example.com/a');
same('example.com/a', 'https://example.com/a');
same('https://example.com', 'https://example.com/');
// tracking params, order of params
same('https://example.com/a?utm_source=wa&utm_medium=x&id=5', 'https://example.com/a?id=5');
same('https://www.instagram.com/p/Cxyz/?igsh=MTc4', 'https://instagram.com/p/Cxyz');
same('https://example.com/a?fbclid=IwAR0&b=2&a=1', 'https://example.com/a?a=1&b=2');
same('https://open.spotify.com/track/1?si=abc123', 'https://open.spotify.com/track/1');
same('https://example.com/a?gclid=1&mibextid=2', 'https://example.com/a');
// YouTube: every spelling of one video
same('https://youtu.be/vqXLGX0szIQ', 'https://www.youtube.com/watch?v=vqXLGX0szIQ');
same('https://youtu.be/vqXLGX0szIQ?si=Zx_9', 'https://m.youtube.com/watch?v=vqXLGX0szIQ&feature=share');
same('https://www.youtube.com/shorts/cGx8eoX88IU', 'https://youtu.be/cGx8eoX88IU');
same('https://youtube.com/watch?v=cGx8eoX88IU&t=42s&list=PL1', 'https://youtu.be/cGx8eoX88IU');
same('https://www.youtube.com/embed/cGx8eoX88IU', 'https://youtu.be/cGx8eoX88IU');
same('https://music.youtube.com/watch?v=cGx8eoX88IU', 'https://youtu.be/cGx8eoX88IU');
diff('https://youtu.be/vqXLGX0szIQ', 'https://youtu.be/cGx8eoX88IU');
diff('https://www.youtube.com/@kanal', 'https://www.youtube.com/@kanal2');
// real differences stay different
diff('https://example.com/a', 'https://example.com/b');
diff('https://example.com/a?id=5', 'https://example.com/a?id=6');
diff('https://example.com/search?q=süt', 'https://example.com/search?q=sut');
diff('https://a.example.com/x', 'https://b.example.com/x');
diff('https://example.com/A', 'https://example.com/a'); // paths can be case-sensitive
// Turkish, Arabic, %-encoded paths and IDN hosts
same('https://tr.wikipedia.org/wiki/%C4%B0stanbul', 'https://tr.wikipedia.org/wiki/İstanbul');
same('https://tr.wikipedia.org/wiki/Çanakkale/', 'http://www.tr.wikipedia.org/wiki/%C3%87anakkale');
same('https://ar.wikipedia.org/wiki/%D9%85%D8%B5%D8%B1', 'https://ar.wikipedia.org/wiki/مصر');
same('https://ar.wikipedia.org/wiki/مصر?utm_campaign=x', 'https://m.ar.wikipedia.org/wiki/مصر'.replace('m.ar', 'ar'));
same('https://örnek.com.tr/sayfa', 'https://xn--rnek-4qa.com.tr/sayfa');
same('https://example.com/ş/', 'https://example.com/%C5%9F');
same('https://example.com/a?q=%C3%BCr%C3%BCn', 'https://example.com/a?q=ürün');
diff('https://example.com/ı', 'https://example.com/i');
eq('empty', D.urlKey(''), '');
eq('garbage never throws', typeof D.urlKey('http://[bad'), 'string');

// keyOf
eq('link key', D.keyOf({ type: 'link', url: 'https://youtu.be/abcdefg' }), 'u:youtube.com/watch?v=abcdefg');
eq('file key', D.keyOf({ type: 'file', sha: 'ab12' }), 'h:ab12');
eq('note no key', D.keyOf({ type: 'note', text: 'x' }), null);
eq('file w/o sha', D.keyOf({ type: 'file', fileName: 'a.jpg' }), null);

// groups: the item you saved yourself stays, the archive copy goes
const T = (y, m) => new Date(y, m - 1, 5).getTime();
const items = [
  { id: 'wa1', type: 'link', url: 'https://youtu.be/vqXLGX0szIQ', ts: T(2024, 3), source: 'whatsapp', chat: 'Ben', archive: true, tags: ['video'] },
  { id: 'wa2', type: 'link', url: 'https://youtu.be/vqXLGX0szIQ?si=1', ts: T(2024, 5), source: 'whatsapp', chat: 'Ben', archive: true, tags: [] },
  { id: 'me', type: 'link', url: 'https://www.youtube.com/watch?v=vqXLGX0szIQ', ts: T(2025, 1), source: 'manual', tags: ['izle'], onBoard: true, text: 'sonra izle' },
  { id: 'f1', type: 'file', fileName: 'IMG-1.jpg', mime: 'image/jpeg', sha: 'aa', ts: T(2024, 1), source: 'whatsapp', archive: true, tags: [] },
  { id: 'f2', type: 'file', fileName: 'foto.jpg', mime: 'image/jpeg', sha: 'aa', ts: T(2024, 2), tags: [] },
  { id: 'p1', type: 'file', fileName: 'a.jpg', mime: 'image/jpeg', sha: 'b1', size: 900, ts: T(2023, 1), tags: [] },
  { id: 'p2', type: 'file', fileName: 'a-small.jpg', mime: 'image/jpeg', sha: 'b2', size: 300, ts: T(2023, 2), tags: [] },
  { id: 'p3', type: 'file', fileName: 'other.jpg', mime: 'image/jpeg', sha: 'b3', ts: T(2023, 3), tags: [] },
  { id: 'kid', type: 'file', fileName: 'IMG-1.jpg', mime: 'image/jpeg', sha: 'aa', parent: 'conv', ts: T(2024, 1), tags: [] },
  { id: 'gone', type: 'link', url: 'https://youtu.be/vqXLGX0szIQ', ts: T(2020, 1), deleted: true, tags: [] },
  { id: 'n1', type: 'note', text: 'aynı', ts: 1 }, { id: 'n2', type: 'note', text: 'aynı', ts: 2 },
];
const ph = new Map([['p1', 'f0f0f0f0f0f0f0f0'], ['p2', 'f0f0f0f0f0f0f0f3'], ['p3', '0f0f0f0f0f0f0f0f']]);
const g = D.groups(items, ph);
eq('3 groups', g.map(x => x.kind), ['link', 'file', 'photo']);
eq('link keep = own', g[0].ids, ['me', 'wa1', 'wa2']);
eq('file keep = own, kid left alone', g[1].ids, ['f2', 'f1']);
eq('photo keep = bigger', g[2].ids, ['p1', 'p2']);
eq('no photo groups without ph', D.groups(items).length, 2);
eq('hamming', D.hamming('f0f0f0f0f0f0f0f0', 'f0f0f0f0f0f0f0f3'), 2);
// pigeonhole: 4 bits apart spread over 4 bands still found
const ph2 = new Map([['p1', '0000000000000000'], ['p2', '1001001001000000']]);
eq('4 bits apart, 4 bands', D.groups(items.filter(i => i.id === 'p1' || i.id === 'p2'), ph2).length, 1);
eq('5 bits apart = other photo', D.groups(items.filter(i => i.id === 'p1' || i.id === 'p2'), new Map([['p1', '0000000000000000'], ['p2', '1001001001001000']])).length, 0);

// merge
const by = id => items.find(i => i.id === id);
const m = D.merge(by('me'), [by('wa1'), by('wa2')], 99);
eq('merge tags', m.keep.tags, ['izle', 'video']);
eq('merge keeps own date', m.keep.ts, T(2025, 1));
eq('merge saves', m.keep.saves.map(s => s.id), ['wa1', 'wa2', 'me']);
eq('merge gone → trash', m.gone.map(i => [i.id, i.deleted, i.deletedAt, i.dupOf]), [['wa1', true, 99, 'me'], ['wa2', true, 99, 'me']]);
eq('merge keeps own text', m.keep.text, 'sonra izle');
eq('saves line', D.savesLine(m.keep), "3 kez kaydedildi · ilk Mar 2024 · WhatsApp'ta da var");
eq('saves line once', D.savesLine(by('me')), null);
const m2 = D.merge({ id: 'a', type: 'link', url: 'x', ts: 5, tags: [] }, [{ id: 'b', type: 'link', url: 'x', ts: 3, tags: [], text: 'not', project: 'P', onBoard: true, pos: { x: 1, y: 2 }, starred: true }]);
eq('merge brings board place', [m2.keep.onBoard, m2.keep.pos, m2.keep.project, m2.keep.starred, m2.keep.text], [true, { x: 1, y: 2 }, 'P', true, 'not']);
eq('merge twice no double saves', D.merge(m.keep, [by('wa1')]).keep.saves.length, 3);
eq('addSave', D.addSave(by('me'), { ts: T(2023, 1), src: 'whatsapp', id: 'x' }).saves.map(s => s.id), ['x', 'me']);
eq('addSave keeps date', D.addSave(by('me'), { ts: T(2023, 1), src: 'whatsapp', id: 'x' }).ts, T(2025, 1));

// import index
const ix = D.index(items, ph);
eq('index url', ix.url('https://youtu.be/vqXLGX0szIQ?si=zz')?.id, 'me');
eq('index deleted skipped', D.index([by('gone')]).url('https://youtu.be/vqXLGX0szIQ'), undefined);
eq('index sha', ix.sha('aa')?.id, 'f1');
eq('index photo near', ix.photo('f0f0f0f0f0f0f0f1')?.id, 'p1');
eq('index photo far', ix.photo('ffffffffffffffff'), null);
ix.add({ id: 'new', type: 'link', url: 'https://example.com/yeni' });
eq('index add', ix.url('http://www.example.com/yeni/')?.id, 'new');

console.log(`dedup: ${ok} ok, ${bad} bad`); if (bad) process.exit(1);
