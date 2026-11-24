// Nts'e gönder (95g): right click → page / link / selection / image → the Nts bridge on this PC (POST /inbox, same as the `hn` command).
// The open Nts app picks the inbox up within seconds; items show under the source "Tarayıcı".
const MAX = 25e6; // an image bigger than this goes as its link
const conf = async () => ({ port: 8787, token: '', ...(await chrome.storage.local.get(['port', 'token'])) });

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'page', title: "Sayfayı Nts'e gönder", contexts: ['page'] });
    chrome.contextMenus.create({ id: 'sel', title: "Seçili yazıyı Nts'e gönder", contexts: ['selection'] });
    chrome.contextMenus.create({ id: 'link', title: "Linki Nts'e gönder", contexts: ['link'] });
    chrome.contextMenus.create({ id: 'img', title: "Resmi Nts'e gönder", contexts: ['image'] });
  });
  if (reason === 'install' && !(await conf()).token) chrome.runtime.openOptionsPage();
});

function badge(tabId, ok, msg) {
  chrome.action.setBadgeBackgroundColor({ color: ok ? '#1a7f37' : '#c62828' });
  chrome.action.setBadgeText({ text: ok ? '✓' : '!', tabId });
  chrome.action.setTitle({ title: msg, tabId });
  setTimeout(() => { chrome.action.setBadgeText({ text: '', tabId }); chrome.action.setTitle({ title: "Bu sayfayı Nts'e gönder", tabId }); }, ok ? 2500 : 8000);
}

async function send(body, tabId) {
  const { port, token } = await conf();
  if (!token) { badge(tabId, false, 'Anahtar yok: eklenti ayarlarını aç'); chrome.runtime.openOptionsPage(); return false; }
  try {
    const r = await fetch(`http://127.0.0.1:${port}/inbox`, {
      method: 'POST', headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
      body: JSON.stringify({ ...body, source: 'web' }),
    });
    if (r.status === 401) throw new Error('anahtar yanlış (ayarlar)');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    badge(tabId, true, "Nts'e gönderildi ✓"); return true;
  } catch (e) {
    badge(tabId, false, `Gönderilemedi: ${/fetch/i.test(e.message) ? 'Nts köprüsü kapalı' : e.message}`); return false;
  }
}

const b64 = buf => { let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
const quote = (sel, url) => `${sel.trim()}\n\n${url}`;

async function sendImage(src, pageUrl, tabId) {
  if (/^https?:|^data:/.test(src)) try {
    const r = await fetch(src); if (!r.ok) throw 0;
    const blob = await r.blob(); if (!/^image\//.test(blob.type) || blob.size > MAX) throw 0;
    const ext = blob.type.split('/')[1].replace('jpeg', 'jpg').replace(/\+.*/, '');
    let name = 'resim'; try { name = decodeURIComponent(new URL(src).pathname.split('/').pop()).replace(/\.[^.]*$/, '') || name; } catch { }
    return send({ text: '', files: [{ name: `${name.slice(0, 60)}.${ext}`, mime: blob.type, size: blob.size, data: b64(await blob.arrayBuffer()) }] }, tabId);
  } catch { }
  return send({ text: /^https?:/.test(src) ? src : pageUrl }, tabId); // could not read it (no access, too big): keep the link
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const id = tab?.id, page = info.pageUrl || tab?.url || '';
  if (info.menuItemId === 'page') return send({ text: page }, id);
  if (info.menuItemId === 'sel') return send({ text: quote(info.selectionText || '', page) }, id);
  if (info.menuItemId === 'link') return send({ text: info.linkUrl }, id);
  if (info.menuItemId === 'img') return sendImage(info.srcUrl, page, id);
});

// toolbar button / Alt+Shift+S: the page, with the selected text if there is any
async function sendTab(tab) {
  if (!tab?.url || !/^https?:/.test(tab.url)) return badge(tab?.id, false, 'Bu sayfa gönderilemez');
  let sel = '';
  try { [{ result: sel }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => String(getSelection() || '') }); } catch { }
  return send({ text: sel.trim() ? quote(sel, tab.url) : tab.url }, tab.id);
}
chrome.action.onClicked.addListener(sendTab);
chrome.commands.onCommand.addListener(async c => { if (c === 'send-page') sendTab((await chrome.tabs.query({ active: true, currentWindow: true }))[0]); });
