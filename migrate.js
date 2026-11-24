// 107d: moving in from other apps. Pure readers (no DOM, no zip) for what each app's export gives you; the page (Mig in app.js) opens the
// zip, shows a preview and makes the items. Works in the page (window.NtsMigrate) and in node (tools/test/migrate.test.mjs).
//   Google Keep  — Google Takeout: Takeout/Keep/*.json (+ attachments next to them)
//   Apple Notes  — HTML export (Exporter / "Dışa aktar"): one .html per note, folders → tags
//   Notion       — "Markdown & CSV" export zip (may hold Part-N.zip inside): "Title 32hex.md" + images in "Title 32hex/"
//   Evernote     — .enex (XML; images/files inside as base64)
//   Telegram     — Desktop → Export chat history → JSON: result.json (+ photos/, files/)
// A note comes out as { key, title, text, ts, tags[], url?, starred?, atts: [{ path | b64, name, mime }] }.
(function (root) {
  'use strict';
  const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  const unent = s => String(s || '').replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENT[e.toLowerCase()] ?? m);
  // HTML / ENML → plain text with line breaks, list dashes and [ ] / [x] boxes (Evernote en-todo, Apple checklists)
  function htmlText(h) {
    let s = String(h || '').replace(/<\?xml[^>]*>|<!DOCTYPE[^>]*>|<!--[\s\S]*?-->/gi, '')
      .replace(/<(head|style|script|title)\b[\s\S]*?<\/\1>/gi, '')
      .replace(/<en-todo\b[^>]*checked="true"[^>]*\/?>/gi, '[x] ').replace(/<en-todo\b[^>]*\/?>/gi, '[ ] ')
      .replace(/<input\b[^>]*type="?checkbox"?[^>]*>/gi, m => /\bchecked\b/i.test(m) ? '[x] ' : '[ ] ')
      .replace(/<li\b[^>]*>/gi, '\u0001- ').replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/?(div|li|tr|en-note|section)\b[^>]*>/gi, '\u0001')
      .replace(/<\/?(p|h[1-6]|ul|ol|table|blockquote|pre)\b[^>]*>/gi, '\u0002')
      .replace(/<a\b[^>]*href="(https?:[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (m, u, t) => { t = t.replace(/<[^>]+>/g, '').trim(); return !t || unent(t) === unent(u) ? unent(u) : `${t} (${unent(u)})`; })
      .replace(/<[^>]+>/g, '');
    s = s.replace(/[ \t\n]*[\u0001\u0002][\s\u0001\u0002]*/g, m => m.includes('\u0002') ? '\n\n' : '\n'); // a run of block edges = one break; a paragraph edge = an empty line
    s = unent(s).replace(/ /g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
    return s.replace(/^- (\[[ x]\] )/gm, '$1').trim();
  }
  const base = p => String(p || '').split('/').pop();
  const dir = p => String(p || '').split('/').slice(0, -1).join('/');
  const tagOf = t => String(t || '').trim().toLocaleLowerCase('tr').replace(/\s+/g, '-').replace(/[#,]/g, '').slice(0, 30);
  const uniq = a => [...new Set(a.filter(Boolean))];

  // ---- which app made this? paths = every file path in the export (zip entries, or the one file picked)
  function detect(paths, peek = '') {
    const P = paths.map(p => p.replace(/\\/g, '/'));
    if (P.some(p => /\.enex$/i.test(p))) return 'evernote';
    if (P.some(p => /(^|\/)result\.json$/i.test(p)) || /"messages"\s*:\s*\[/.test(peek) && /"date_unixtime"|"from_id"/.test(peek)) return 'telegram';
    if (P.some(p => /(^|\/)Keep\/[^/]+\.json$/i.test(p)) || /"(textContent|listContent)"\s*:/.test(peek) && /"userEditedTimestampUsec"/.test(peek)) return 'keep';
    if (P.some(p => /\s[0-9a-f]{32}\.md$/i.test(p)) || P.some(p => /^Export-[0-9a-f-]+/i.test(p) && /\.(md|zip)$/i.test(p))) return 'notion';
    if (P.some(p => /\.html?$/i.test(p))) return 'apple';
    if (P.some(p => /\.md$/i.test(p))) return 'notion'; // plain markdown folders (Notion pages renamed, Bear, Obsidian) read the same way
    return '';
  }

  // ---- Google Keep (one JSON per note)
  function keep(json, path = '') {
    let o; try { o = typeof json === 'string' ? JSON.parse(json) : json; } catch { return null; }
    if (!o || typeof o !== 'object' || o.isTrashed) return null;
    const us = +o.userEditedTimestampUsec || +o.createdTimestampUsec || 0;
    let text = String(o.textContent || '').trim();
    if (Array.isArray(o.listContent) && o.listContent.length) text = [text, o.listContent.map(l => `${l.isChecked ? '[x]' : '[ ]'} ${String(l.text || '').trim()}`).join('\n')].filter(Boolean).join('\n');
    const ann = (o.annotations || []).filter(a => /^https?:/i.test(a?.url || ''));
    const atts = (o.attachments || []).map(a => ({ path: (dir(path) ? dir(path) + '/' : '') + a.filePath, name: base(a.filePath), mime: a.mimetype || '' })).filter(a => a.name);
    const title = String(o.title || '').trim();
    if (!title && !text && !atts.length && !ann.length) return null;
    return { key: 'keep:' + base(path) + us, title, text, ts: us ? Math.round(us / 1000) : 0, tags: uniq((o.labels || []).map(l => tagOf(l.name))),
      url: ann[0]?.url, urlTitle: ann[0]?.title, starred: !!o.isPinned, color: o.color && o.color !== 'DEFAULT' ? String(o.color).toLowerCase() : undefined, archived: !!o.isArchived, atts };
  }

  // ---- Apple Notes (HTML per note). mtime = the file's date in the zip; folders below the export root become tags
  function apple(html, path = '', mtime = 0) {
    const h = String(html || '');
    const tt = h.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || h.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '';
    let title = htmlText(tt).trim();
    let text = htmlText(h.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/i, m => title ? '' : m));
    if (!title) { const ls = text.split('\n'); title = (ls[0] || base(path).replace(/\.html?$/i, '')).trim().slice(0, 120); text = ls.slice(1).join('\n').trim(); }
    else if (text.split('\n')[0].trim() === title) text = text.split('\n').slice(1).join('\n').trim();
    const meta = k => h.match(new RegExp(`<meta[^>]+name="${k}"[^>]+content="([^"]+)"`, 'i'))?.[1];
    const t = Date.parse(meta('created') || meta('date') || '') || mtime || 0;
    const imgs = [...h.matchAll(/<img\b[^>]*src="([^"]+)"/gi)].map(m => m[1]);
    const atts = [], b64 = [];
    for (const s of imgs) {
      const d = s.match(/^data:([^;]+);base64,(.+)$/); if (d) { b64.push({ b64: d[2], mime: d[1], name: `resim-${b64.length + 1}.${d[1].split('/')[1] || 'png'}` }); continue; }
      if (!/^https?:/i.test(s)) atts.push({ path: (dir(path) ? dir(path) + '/' : '') + decodeURIComponent(s), name: base(decodeURIComponent(s)), mime: '' });
    }
    const folders = dir(path).split('/').filter(Boolean).slice(1).filter(f => !/^(notes|notlar|icloud|on my (mac|iphone)|apple notes)$/i.test(f) && !/_files$|attachments/i.test(f));
    if (!title && !text && !atts.length && !b64.length) return null;
    return { key: 'apple:' + path, title, text, ts: t, tags: uniq(folders.slice(-1).map(tagOf)), atts: [...atts, ...b64] };
  }

  // ---- Notion / Markdown. "Gezi planı 3f2a…(32 hex).md": the id is cut; Notion's property lines under the title are read
  const MONTHS = { january: 0, february: 1, march: 2, april: 3, may: 4, june: 5, july: 6, august: 7, september: 8, october: 9, november: 10, december: 11, ocak: 0, şubat: 1, mart: 2, nisan: 3, mayıs: 4, haziran: 5, temmuz: 6, ağustos: 7, eylül: 8, ekim: 9, kasım: 10, aralık: 11 };
  function notionDate(s) {
    s = String(s || '').trim(); const iso = Date.parse(s); if (!isNaN(iso) && /^\d{4}-/.test(s)) return iso;
    const m = s.match(/^([A-Za-zçğıöşüÇĞİÖŞÜ]+)\s+(\d{1,2}),?\s+(\d{4})(?:\s+(\d{1,2}):(\d\d)\s*(AM|PM)?)?/i) || s.match(/^(\d{1,2})\s+([A-Za-zçğıöşüÇĞİÖŞÜ]+)\s+(\d{4})(?:\s+(\d{1,2}):(\d\d))?/);
    if (!m) return isNaN(iso) ? 0 : iso;
    const [mon, day] = isNaN(+m[1]) ? [m[1], m[2]] : [m[2], m[1]], mi = MONTHS[mon.toLocaleLowerCase('tr')]; if (mi == null) return 0;
    let hh = +(m[4] || 0); if (m[6]) hh = hh % 12 + (/pm/i.test(m[6]) ? 12 : 0);
    return new Date(+m[3], mi, +day, hh, +(m[5] || 0)).getTime();
  }
  const PROP = /^(Created|Created time|Last edited time|Date|Tags|Etiketler|Tarih|Oluşturulma|URL|Status|Durum|Type|Tür|Property|Owner):\s*(.*)$/i;
  function notion(md, path = '', mtime = 0) {
    const name = base(path).replace(/\.md$/i, ''), clean = name.replace(/\s+[0-9a-f]{32}$/i, '').trim();
    let lines = String(md || '').replace(/\r\n?/g, '\n').split('\n'), title = clean;
    let ts = 0, tags = [], url;
    if (/^---\s*$/.test(lines[0])) { // YAML front matter (Obsidian, Bear, Notion add-ons): title / date / tags / url
      const e = lines.findIndex((l, k) => k > 0 && /^---\s*$/.test(l));
      if (e > 0) {
        for (const l of lines.slice(1, e)) {
          const m = l.match(/^(\w+):\s*(.*)$/); if (!m) continue; const k = m[1].toLowerCase(), v = m[2].trim().replace(/^["']|["']$/g, '');
          if (k === 'title' && v) title = v; else if (/^(date|created)$/.test(k)) ts = notionDate(v); else if (k === 'tags') tags = v.replace(/^\[|\]$/g, '').split(/,\s*/).map(x => tagOf(x.replace(/^["']|["']$/g, ''))); else if (/^(url|link|source)$/.test(k) && /^https?:/i.test(v)) url = v;
        }
        lines = lines.slice(e + 1);
      }
    }
    const h = lines.findIndex(l => /^#\s+\S/.test(l)); if (h >= 0 && h < 3) { title = lines[h].replace(/^#\s+/, '').trim(); lines.splice(h, 1); }
    while (lines.length && (!lines[0].trim() || PROP.test(lines[0]))) {
      const p = lines.shift().match(PROP); if (!p) continue;
      const k = p[1].toLowerCase(), v = p[2].trim();
      if (/created|date|tarih|oluşturulma/.test(k) && !ts) ts = notionDate(v);
      else if (/tags|etiketler/.test(k)) tags = v.replace(/^\[|\]$/g, '').split(/,\s*/).map(x => tagOf(x.replace(/^["']|["']$/g, '')));
      else if (k === 'url' && /^https?:/i.test(v)) url = v;
    }
    const atts = [];
    let text = lines.join('\n').replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, alt, src) => {
      if (/^https?:/i.test(src)) return m;
      let s = src; try { s = decodeURIComponent(src); } catch {}
      atts.push({ path: (dir(path) ? dir(path) + '/' : '') + s, name: base(s), mime: '' }); return '';
    }).replace(/\n{3,}/g, '\n\n').trim();
    // links to sibling pages "[Alt sayfa](Alt%20sayfa%2032hex.md)" → just the name
    text = text.replace(/\[([^\]]+)\]\(([^)]+?\.md)\)/g, '$1');
    const folder = dir(path).split('/').filter(Boolean).map(f => f.replace(/\s+[0-9a-f]{32}$/i, '').trim()).filter(f => !/^Export-|^Part-\d|^notion$/i.test(f));
    if (!title && !text && !atts.length) return null;
    return { key: 'notion:' + name, title, text, ts: ts || mtime || 0, tags: uniq([...tags, ...folder.slice(-1).map(tagOf)]), url, atts };
  }

  // ---- Evernote .enex (one file can hold thousands of notes; resources inline as base64)
  const enDate = s => { const m = String(s || '').match(/^(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)Z$/); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : 0; };
  const cdata = s => String(s || '').replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1');
  function enex(xml, path = '') {
    const out = [], book = tagOf(base(path).replace(/\.enex$/i, ''));
    for (const [, n] of String(xml || '').matchAll(/<note>([\s\S]*?)<\/note>/g)) {
      const get = t => n.match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`))?.[1];
      const title = unent(cdata(get('title') || '')).trim();
      const body = cdata(get('content') || '');
      const atts = [...n.matchAll(/<resource>([\s\S]*?)<\/resource>/g)].map(([, r], k) => {
        const mime = r.match(/<mime>([^<]+)<\/mime>/)?.[1] || '';
        return { b64: (r.match(/<data[^>]*>([\s\S]*?)<\/data>/)?.[1] || '').replace(/\s+/g, ''), mime, name: unent(r.match(/<file-name>([^<]+)<\/file-name>/)?.[1] || '') || `ek-${k + 1}.${mime.split('/')[1] || 'bin'}` };
      }).filter(a => a.b64);
      const url = unent(n.match(/<source-url>([^<]+)<\/source-url>/)?.[1] || '');
      const tags = uniq([...n.matchAll(/<tag>([^<]+)<\/tag>/g)].map(m => tagOf(unent(m[1]))));
      const text = htmlText(body.replace(/<en-media\b[^>]*\/?>(<\/en-media>)?/g, ''));
      if (!title && !text && !atts.length) continue;
      const ts = enDate(get('created')) || enDate(get('updated'));
      out.push({ key: 'evernote:' + title + ts, title, text, ts, tags: tags.length ? tags : book ? [book] : [], url: /^https?:/i.test(url) ? url : undefined, atts });
    }
    return out;
  }

  // ---- Telegram (result.json). Saved Messages: each message is its own save; a photo album (same media_group / same minute) stays one.
  const tgText = t => Array.isArray(t) ? t.map(x => typeof x === 'string' ? x : x.type === 'text_link' && x.href ? `${x.text} (${x.href})` : x.text || '').join('') : String(t || '');
  function telegram(json) {
    let o; try { o = typeof json === 'string' ? JSON.parse(json) : json; } catch { return null; }
    if (!o) return null;
    const chats = o.messages ? [o] : (o.chats?.list || []);
    const chat = chats.find(c => c.type === 'saved_messages') || chats[0]; if (!chat) return null;
    const saved = chat.type === 'saved_messages' || !chat.name;
    const msgs = [];
    for (const m of chat.messages || []) {
      if (m.type !== 'message') continue;
      const ts = +m.date_unixtime ? +m.date_unixtime * 1000 : Date.parse(m.date) || 0;
      const att = m.photo || m.file; const ok = att && !/^\(File not included/i.test(att);
      const text = tgText(m.text).trim();
      if (!text && !ok) continue;
      msgs.push({ id: m.id, ts, who: m.forwarded_from || m.from || '', text, att: ok ? { path: att, name: m.file_name || base(att), mime: m.mime_type || (m.photo ? 'image/jpeg' : '') } : null, album: m.media_group_id });
    }
    return { name: saved ? 'Kaydedilen Mesajlar' : chat.name, saved, msgs };
  }
  // Saved Messages: an album or a photo + its caption sent right after (≤ 90 s, nothing else between) = one save
  function tgGroups(msgs) {
    const out = [];
    for (const m of msgs) {
      const g = out.at(-1), last = g?.at(-1);
      const same = last && (m.album && m.album === last.album || m.ts - last.ts <= 90e3 && (m.att && last.att && !m.text || !m.att && last.att && !last.text && m.text && g.length === 1));
      if (same) g.push(m); else out.push([m]);
    }
    return out;
  }

  const NAMES = { keep: 'Google Keep', apple: 'Apple Notes', notion: 'Notion', evernote: 'Evernote', telegram: 'Telegram' };
  const api = { detect, keep, apple, notion, enex, telegram, tgGroups, htmlText, notionDate, NAMES };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.NtsMigrate = api;
})(typeof self !== 'undefined' ? self : this);
