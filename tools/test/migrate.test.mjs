// 107d: tests for migrate.js (Keep, Apple Notes, Notion, Evernote, Telegram readers). Run: node tools/test/migrate.test.mjs
import { createRequire } from 'node:module';
const M = createRequire(import.meta.url)('../../migrate.js');
let ok = 0, bad = 0; const eq = (name, got, want) => { if (JSON.stringify(got) === JSON.stringify(want)) ok++; else { bad++; console.log('✗', name, '\n  got ', got, '\n  want', want); } };

// detect
eq('detect keep', M.detect(['Takeout/Keep/Alışveriş.json', 'Takeout/Keep/Alışveriş.html']), 'keep');
eq('detect keep peek', M.detect(['note.json'], '{"textContent":"a","userEditedTimestampUsec":1}'), 'keep');
eq('detect enex', M.detect(['Defterim.enex']), 'evernote');
eq('detect tg', M.detect(['ChatExport_2024/result.json', 'ChatExport_2024/photos/a.jpg']), 'telegram');
eq('detect tg peek', M.detect(['x.json'], '{"name":"A","messages":[{"date_unixtime":"1"}]}'), 'telegram');
eq('detect notion', M.detect(['Gezi planı 0123456789abcdef0123456789abcdef.md']), 'notion');
eq('detect notion part', M.detect(['Export-1a2b3c4d-Part-1.zip']), 'notion');
eq('detect apple', M.detect(['Notes/Tarifler/Mercimek.html']), 'apple');
eq('detect none', M.detect(['a.pdf']), '');

// Keep
const k = M.keep(JSON.stringify({ color: 'YELLOW', isTrashed: false, isPinned: true, isArchived: false, title: 'Alışveriş', textContent: '',
  listContent: [{ text: 'süt', isChecked: false }, { text: 'ekmek', isChecked: true }], labels: [{ name: 'Ev İşleri' }],
  userEditedTimestampUsec: 1700000000000000, attachments: [{ filePath: '1a.jpg', mimetype: 'image/jpeg' }], annotations: [{ url: 'https://x.com/a', title: 'X' }] }), 'Takeout/Keep/Alışveriş.json');
eq('keep title', k.title, 'Alışveriş');
eq('keep list', k.text, '[ ] süt\n[x] ekmek');
eq('keep ts', k.ts, 1700000000000);
eq('keep tag tr', k.tags, ['ev-işleri']);
eq('keep pin', k.starred, true);
eq('keep color', k.color, 'yellow');
eq('keep att path', k.atts[0].path, 'Takeout/Keep/1a.jpg');
eq('keep url', k.url, 'https://x.com/a');
eq('keep trashed', M.keep({ isTrashed: true, textContent: 'x' }), null);
eq('keep empty', M.keep({ textContent: '  ' }), null);
eq('keep bad json', M.keep('{oops'), null);
eq('keep arabic', M.keep({ title: 'ملاحظة', textContent: 'مرحبا', labels: [{ name: 'عمل' }], createdTimestampUsec: 1e15 }).tags, ['عمل']);

// HTML → text
eq('html br/p', M.htmlText('<p>a<br>b</p><p>c &amp; d</p>'), 'a\nb\n\nc & d');
eq('html list', M.htmlText('<ul><li>bir</li><li>iki</li></ul>'), '- bir\n- iki');
eq('html todo', M.htmlText('<div><en-todo checked="true"/>yap</div><div><en-todo/>yapma</div>'), '[x] yap\n[ ] yapma');
eq('html link', M.htmlText('<a href="https://a.com/x">Site</a>'), 'Site (https://a.com/x)');
eq('html link same', M.htmlText('<a href="https://a.com/x">https://a.com/x</a>'), 'https://a.com/x');
eq('html entities', M.htmlText('&#304;stanbul &#x131; &nbsp;x'), 'İstanbul ı  x');

// Apple Notes
const a = M.apple('<html><head><title>Mercimek çorbası</title></head><body><h1>Mercimek çorbası</h1><div>1 su bardağı mercimek</div><div><img src="Mercimek_files/Image.png"></div><div><img src="data:image/png;base64,iVBORw0KGgo="></div></body></html>', 'Notes/Tarifler/Mercimek.html', 1600000000000);
eq('apple title', a.title, 'Mercimek çorbası');
eq('apple text', a.text, '1 su bardağı mercimek');
eq('apple folder tag', a.tags, ['tarifler']);
eq('apple ts = mtime', a.ts, 1600000000000);
eq('apple atts', a.atts.map(x => x.path || x.mime), ['Notes/Tarifler/Mercimek_files/Image.png', 'image/png']);
const a2 = M.apple('<div><b>Başlıksız</b></div><div>gövde</div>', 'Notes/x.html');
eq('apple first line title', [a2.title, a2.text, a2.tags], ['Başlıksız', 'gövde', []]);

// Notion
const n = M.notion('# Gezi planı\n\nCreated: March 4, 2023 10:22 AM\nTags: seyahat, İtalya\n\nRoma 3 gün\n\n![](Gezi%20plan%C4%B1%200123456789abcdef0123456789abcdef/foto.png)\n\n[Otel](Otel%20aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.md)', 'Export-x/Seyahat 11111111111111111111111111111111/Gezi planı 0123456789abcdef0123456789abcdef.md');
eq('notion title', n.title, 'Gezi planı');
eq('notion ts', n.ts, new Date(2023, 2, 4, 10, 22).getTime());
eq('notion tags', n.tags, ['seyahat', 'italya', 'seyahat'].filter((x, i, s) => s.indexOf(x) === i));
eq('notion text', n.text, 'Roma 3 gün\n\nOtel');
eq('notion att', n.atts[0].path, 'Export-x/Seyahat 11111111111111111111111111111111/Gezi planı 0123456789abcdef0123456789abcdef/foto.png');
const n2 = M.notion('---\ntitle: Ders\ndate: 2024-01-05\ntags: [okul]\n---\nmetin', 'Ders.md', 5);
eq('md front matter', [n2.title, n2.ts, n2.tags, n2.text], ['Ders', Date.parse('2024-01-05'), ['okul'], 'metin']);
eq('notion date tr', M.notionDate('4 Mart 2023 10:22'), new Date(2023, 2, 4, 10, 22).getTime());
eq('notion date pm', M.notionDate('January 2, 2024 3:05 PM'), new Date(2024, 0, 2, 15, 5).getTime());
eq('notion no title from file', M.notion('just text', 'Kısa not 0123456789abcdef0123456789abcdef.md').title, 'Kısa not');

// Evernote
const enx = `<?xml version="1.0"?><en-export><note><title>Toplantı &amp; plan</title><content><![CDATA[<?xml version="1.0"?><!DOCTYPE en-note><en-note><div>Gündem</div><div><en-todo checked="true"/>bütçe</div><en-media hash="ab" type="image/png"/></en-note>]]></content><created>20230115T093000Z</created><tag>İş</tag><note-attributes><source-url>https://ex.com/p</source-url></note-attributes><resource><data encoding="base64">iVBO
Rw0K</data><mime>image/png</mime><resource-attributes><file-name>tahta.png</file-name></resource-attributes></resource></note><note><title>İkinci</title><content><![CDATA[<en-note>x</en-note>]]></content><created>20230116T000000Z</created></note></en-export>`;
const e = M.enex(enx, 'İş Defteri.enex');
eq('enex count', e.length, 2);
eq('enex title', e[0].title, 'Toplantı & plan');
eq('enex text', e[0].text, 'Gündem\n[x] bütçe');
eq('enex ts', e[0].ts, Date.UTC(2023, 0, 15, 9, 30));
eq('enex tag', e[0].tags, ['iş']);
eq('enex notebook tag', e[1].tags, ['iş-defteri']);
eq('enex url', e[0].url, 'https://ex.com/p');
eq('enex att', [e[0].atts[0].name, e[0].atts[0].mime, e[0].atts[0].b64], ['tahta.png', 'image/png', 'iVBORw0K']);

// Telegram
const tg = M.telegram(JSON.stringify({ name: null, type: 'saved_messages', messages: [
  { id: 1, type: 'message', date_unixtime: '1700000000', from: 'Ben', text: ['bak: ', { type: 'link', text: 'https://a.com' }] },
  { id: 2, type: 'service', date_unixtime: '1700000001', text: '' },
  { id: 3, type: 'message', date_unixtime: '1700000100', photo: 'photos/p1.jpg', text: '', media_group_id: 'g' },
  { id: 4, type: 'message', date_unixtime: '1700000101', photo: 'photos/p2.jpg', text: 'tatil', media_group_id: 'g' },
  { id: 5, type: 'message', date_unixtime: '1700000500', file: 'files/x.pdf', file_name: 'rapor.pdf', mime_type: 'application/pdf', text: '' },
  { id: 6, type: 'message', date_unixtime: '1700000520', text: 'raporun açıklaması' },
  { id: 7, type: 'message', date_unixtime: '1700009000', photo: '(File not included. Change data exporting settings to download.)', text: '' },
  { id: 8, type: 'message', date_unixtime: '1700009999', text: [{ type: 'text_link', text: 'yazı', href: 'https://b.com' }], forwarded_from: 'Kanal' } ] }));
eq('tg name', tg.name, 'Kaydedilen Mesajlar');
eq('tg msgs', tg.msgs.map(m => m.id), [1, 3, 4, 5, 6, 8]);
eq('tg text join', tg.msgs[0].text, 'bak: https://a.com');
eq('tg text_link', tg.msgs.at(-1).text, 'yazı (https://b.com)');
eq('tg who fwd', tg.msgs.at(-1).who, 'Kanal');
eq('tg att', tg.msgs[3].att, { path: 'files/x.pdf', name: 'rapor.pdf', mime: 'application/pdf' });
eq('tg groups', M.tgGroups(tg.msgs).map(g => g.map(m => m.id)), [[1], [3, 4], [5, 6], [8]]);
const full = M.telegram({ chats: { list: [{ name: 'Ali', type: 'personal_chat', messages: [] }, { type: 'saved_messages', messages: [{ id: 1, type: 'message', date: '2024-02-01T10:00:00', text: 'x' }] }] } });
eq('tg full export picks saved', [full.saved, full.msgs.length], [true, 1]);
eq('tg bad', M.telegram('nope'), null);

console.log(`${ok} ok, ${bad} bad`); process.exit(bad ? 1 : 0);
