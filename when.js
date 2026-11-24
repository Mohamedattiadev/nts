// 107e: dates and times in plain words, for tasks and reminders: "yarın 9'da annemi ara", "2 saat sonra fırını kapat",
// "cuma akşam sinema", "bana hatırlat 15:30 ilaç", "tomorrow 9am call mom", "in 20 min". Turkish first, some English.
// parseDue(text) → { text (the words left), due ('YYYY-MM-DD' or 'YYYY-MM-DDTHH:MM'), strong (said like a reminder), cue ("hatırlat") }
// remindOf(text) → the same when the line reads as a reminder (a time is said clearly), else null.
// snoozeDue('1h' | 'tomorrow') → the new time for a reminder snoozed from its notification (page and service worker).
// Works in the page, in the service worker (importScripts) and in node (tools/test/when.test.mjs).
(function (root) {
  const TR_DAYS = ['pazar', 'pazartesi', 'salı', 'çarşamba', 'perşembe', 'cuma', 'cumartesi'];
  const EN_DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const TR_MONTHS = ['ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık'];
  const NUM = { bir: 1, iki: 2, üç: 3, dört: 4, beş: 5, altı: 6, yedi: 7, sekiz: 8, dokuz: 9, on: 10, yarım: .5, a: 1, an: 1, one: 1, two: 2, three: 3, half: .5 };
  const UNIT = { dakika: 60e3, dk: 60e3, min: 60e3, mins: 60e3, minute: 60e3, minutes: 60e3, saat: 3600e3, sa: 3600e3, hour: 3600e3, hours: 3600e3, gün: 864e5, day: 864e5, days: 864e5, hafta: 6048e5, week: 6048e5, weeks: 6048e5 };
  // day parts: default hour, and whether a small hour means the afternoon/evening ("akşam 8" = 20:00)
  const PARTS = [['öğleden sonra', 15, 1], ['sabah', 9, 0], ['öğlen', 12, 0], ['öğle', 12, 0], ['akşam', 19, 1], ['gece', 22, 2], ['morning', 9, 0], ['noon', 12, 0], ['afternoon', 15, 1], ['evening', 19, 1], ['tonight', 21, 1]];
  const pad = n => String(n).padStart(2, '0');
  const dayStr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dueStr = (ts, time = true) => { const d = new Date(ts); return dayStr(d) + (time ? `T${pad(d.getHours())}:${pad(d.getMinutes())}` : ''); };
  const E = '(?=[\\s,.!?;:]|$)', S = '(?:^|\\s)'; // word end / start (Turkish letters are not \w, so no \b)
  const AP = "['’]";

  function parseDue(t, now = Date.now()) {
    let text = t, day = null, h = null, mi = 0, part = null, strong = false, cue = false, at = null, low = false;
    const lo = () => text.toLocaleLowerCase('tr');
    const cut = re => { const m = lo().match(re); if (!m) return null; text = (text.slice(0, m.index) + ' ' + text.slice(m.index + m[0].length)).replace(/\s{2,}/g, ' ').trim(); return m; };
    const d0 = new Date(now); d0.setHours(0, 0, 0, 0); const add = n => { const d = new Date(d0); d.setDate(d.getDate() + n); return d; };
    let m;
    if (cut(new RegExp(`${S}(?:bana\\s+)?hatırlat(?:ıcı|ma|ır mısın|)\\s*:?${E}|${S}remind me(?:\\s+to)?${E}|${S}reminder\\s*:?${E}`))) cue = true;
    // "2 saat sonra", "yarım saat sonra", "in 20 min"
    const n = `(\\d+(?:[.,]\\d)?|${Object.keys(NUM).join('|')})`, u = `(${Object.keys(UNIT).sort((a, b) => b.length - a.length).join('|')})`;
    if ((m = cut(new RegExp(`${S}${n}\\s*${u}\\s+sonra${E}`))) || (m = cut(new RegExp(`${S}in\\s+${n}\\s*${u}${E}`)))) {
      const k = NUM[m[1]] ?? parseFloat(m[1].replace(',', '.')), ms = k * UNIT[m[2]];
      if (k > 0 && ms < 400 * 864e5) { strong = true; if (UNIT[m[2]] < 864e5) at = now + ms; else day = add(Math.round(ms / 864e5)); }
    }
    if (at == null) {
      // a part of the day, maybe after "bu" ("bu akşam") — "tonight" also says today
      for (const [w, hh, pm] of PARTS) if ((m = cut(new RegExp(`${S}(?:bu\\s+)?${w}(?:leyin|ı|i)?${E}`)))) { part = [hh, pm]; if (/^\s*bu\s/.test(m[0]) || w === 'tonight') { day = add(0); strong = true; } break; }
      // the time: "15:30", "9.30'da", "saat 9", "9'da", "9am", "at 9"
      if ((m = cut(new RegExp(`${S}(?:saat\\s*)?([01]?\\d|2[0-3])[:.]([0-5]\\d)(?:${AP}[dt][ae]n?)?\\s*(am|pm)?${E}`)))) { h = +m[1]; mi = +m[2]; low = m[1].length === 1; strong = strong || /saat|['’]|am|pm/.test(m[0]); if (m[3]) h = h % 12 + (m[3] === 'pm' ? 12 : 0); }
      else if ((m = cut(new RegExp(`${S}saat\\s*([01]?\\d|2[0-3])(?:${AP}[dt][ae])?${E}`))) || (m = cut(new RegExp(`${S}([01]?\\d|2[0-3])${AP}[dt][ae]${E}`)))) { h = +m[1]; low = true; strong = true; }
      else if ((m = cut(new RegExp(`${S}(?:at\\s+)?(1[0-2]|0?[1-9])\\s*(am|pm)${E}`))) || (m = cut(new RegExp(`${S}at\\s+(1[0-2]|0?[1-9])${E}`)))) { h = +m[1] % 12 + (m[2] === 'pm' ? 12 : 0); strong = true; low = !m[2]; }
      else if (part && (m = cut(new RegExp(`${S}([01]?\\d|2[0-3])${E}`)))) { h = +m[1]; strong = true; } // "akşam 8"
      if (h != null && part) { strong = true; if (part[1] === 1 && h < 12) h += 12; else if (part[1] === 2 && h >= 7 && h < 12) h += 12; }
      else if (h != null && low && h >= 1 && h <= 6) h += 12; // "yarın 3'te" = 15:00
      if (h == null && part) h = part[0];
      const lone = part && !strong && !cue; // "akşam yemeği tarifi": a day part alone is no time (checked after the day below)
      // the day
      if (!day) {
        if (cut(new RegExp(`${S}(?:bugün|today)${E}`))) day = add(0);
        else if (cut(new RegExp(`${S}(?:yarından sonra|öbür gün|day after tomorrow)${E}`))) day = add(2);
        else if (cut(new RegExp(`${S}(?:yarın|tomorrow)${E}`))) day = add(1);
        else if (cut(new RegExp(`${S}(?:haftaya|gelecek hafta|next week)${E}`))) day = add(7);
        else if ((m = cut(new RegExp(`${S}(\\d{1,2})\\s+(${TR_MONTHS.join('|')})${E}`)))) { const d = new Date(d0.getFullYear(), TR_MONTHS.indexOf(m[2]), +m[1]); if (d < d0) d.setFullYear(d.getFullYear() + 1); day = d; }
        else if ((m = cut(new RegExp(`${S}(?:on\\s+|next\\s+)?(${TR_DAYS.join('|')}|${EN_DAYS.join('|')})(?:\\s+günü)?${E}`)))) { const w = Math.max(TR_DAYS.indexOf(m[1]), EN_DAYS.indexOf(m[1])); day = add(((w - d0.getDay()) + 7) % 7 || 7); }
        if (day) strong = true;
      }
      if (lone && !day) return { text: t, cue };
      if (h != null) {
        const d = new Date(day || d0); d.setHours(h, mi, 0, 0);
        if (!day && d.getTime() <= now) d.setDate(d.getDate() + 1); // a time already gone today → tomorrow
        at = d.getTime();
      }
    }
    text = text.replace(/^[\s,.;:–-]+|[\s,;:–-]+$/g, '');
    if (at != null) return { text: text || t, due: dueStr(at), strong, cue };
    if (day) return { text: text || t, due: dayStr(day), strong, cue };
    return { text: t, cue };
  }
  // a line that reads as a reminder: one short line, no link, a clearly said time (or "hatırlat" + a day)
  function remindOf(t, now = Date.now()) {
    t = (t || '').trim(); if (!t || t.length > 160 || t.includes('\n') || /https?:\/\//.test(t)) return null;
    const p = parseDue(t, now); if (!p.due || p.text === t) return null;
    if (!p.due.includes('T')) { if (!p.cue) return null; p.due += 'T09:00'; }
    return p.cue || p.strong ? p : null;
  }
  function snoozeDue(kind, now = Date.now()) {
    if (kind === 'tomorrow') { const d = new Date(now); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return dueStr(d.getTime()); }
    return dueStr(Math.ceil((now + 3600e3) / 60e3) * 60e3);
  }
  const api = { parseDue, remindOf, snoozeDue, dueStr, TR_DAYS, TR_MONTHS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.NtsWhen = api;
})(typeof self !== 'undefined' ? self : this);
