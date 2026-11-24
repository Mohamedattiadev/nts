// 107e: tests for plain-word dates and reminders (when.js). Run: node tools/test/when.test.mjs
import { createRequire } from 'node:module';
const W = createRequire(import.meta.url)('../../when.js');
const NOW = new Date(2026, 10, 24, 15, 0).getTime(); // Tuesday 24 Nov 2026, 15:00
let pass = 0, fail = 0;
const eq = (name, got, want) => { const g = JSON.stringify(got), w = JSON.stringify(want); if (g === w) pass++; else { fail++; console.log('FAIL', name, '\n  got ', g, '\n  want', w); } };
const R = (t, due, text) => { const r = W.remindOf(t, NOW); eq('remind ' + t, r && [r.due, r.text], due ? [due, text] : null); };
const D = (t, due, text) => { const r = W.parseDue(t, NOW); eq('due ' + t, [r.due, r.text], [due, text]); };
// reminders said in words
R("yarın 9'da annemi ara", '2026-11-25T09:00', 'annemi ara');
R("yarın 3'te dişçi", '2026-11-25T15:00', 'dişçi');
R('annemi ara yarın saat 10', '2026-11-25T10:00', 'annemi ara');
R('2 saat sonra fırını kapat', '2026-11-24T17:00', 'fırını kapat');
R('yarım saat sonra çayı demle', '2026-11-24T15:30', 'çayı demle');
R('20 dk sonra toplantı', '2026-11-24T15:20', 'toplantı');
R('cuma akşam sinema', '2026-11-27T19:00', 'sinema');
R('akşam 8 ilaç', '2026-11-24T20:00', 'ilaç');
R('bu akşam çöpü çıkar', '2026-11-24T19:00', 'çöpü çıkar');
R('sabah 7:30 koşu', '2026-11-25T07:30', 'koşu');
R("bana hatırlat: 16.30'da kargo", '2026-11-24T16:30', 'kargo');
R('hatırlat yarın fatura öde', '2026-11-25T09:00', 'fatura öde');
R('3 gün sonra saat 14:00 rapor', '2026-11-27T14:00', 'rapor');
R("pazartesi 10'da Ali ile görüşme", '2026-11-30T10:00', 'Ali ile görüşme');
R('12 aralık 11:00 doktor', '2026-12-12T11:00', 'doktor');
R("öbür gün 9'da banka", '2026-11-26T09:00', 'banka');
R('Yarın 9’da İlaç al', '2026-11-25T09:00', 'İlaç al');
R('tomorrow 9am call mom', '2026-11-25T09:00', 'call mom');
R('in 2 hours check oven', '2026-11-24T17:00', 'check oven');
R('remind me to pay rent on friday at 6pm', '2026-11-27T18:00', 'pay rent');
// not reminders: notes that only mention time words
R('akşam yemeği tarifi', null);
R('sabah rutini fikirleri', null);
R('toplantı notları 14:30', null);
R('yarın toplantı notları', null);
R('https://site.com yarın 9da', null);
R('yarın 9\'da\nikinci satır', null);
R('Saat kaç?', null);
// task lines (Todo.add) keep the old behaviour
D('yarın 10:30 diş', '2026-11-25T10:30', 'diş');
D('cuma toplantı', '2026-11-27', 'toplantı');
D('haftaya rapor', '2026-12-01', 'rapor');
D('12 mart vergi', '2027-03-12', 'vergi');
D('bugün süt al', '2026-11-24', 'süt al');
D('16:30 toplantı', '2026-11-24T16:30', 'toplantı');
D('10:00 kahve', '2026-11-25T10:00', 'kahve'); // gone today → tomorrow
D('süt al', undefined, 'süt al');
// snooze
eq('snooze 1h', W.snoozeDue('1h', NOW + 20e3), '2026-11-24T16:01');
eq('snooze tomorrow', W.snoozeDue('tomorrow', NOW), '2026-11-25T09:00');
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
