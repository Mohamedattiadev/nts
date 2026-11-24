const $ = id => document.getElementById(id), msg = (t, ok) => { $('msg').textContent = t; $('msg').className = ok ? 'ok' : 'bad'; };
const ALL = { origins: ['<all_urls>'] };
chrome.storage.local.get(['port', 'token']).then(c => { $('port').value = c.port || 8787; $('token').value = c.token || ''; });
const imgsLabel = async () => { const has = await chrome.permissions.contains(ALL); $('imgs').textContent = has ? 'Resimler dosya olarak gider ✓' : 'Resimleri dosya olarak gönder'; $('imgs').disabled = has; };
imgsLabel();
$('imgs').onclick = async () => { await chrome.permissions.request(ALL); imgsLabel(); };
$('save').onclick = async () => {
  const port = parseInt($('port').value, 10) || 8787, token = $('token').value.trim().replace(/^anahtar\s+/i, '');
  await chrome.storage.local.set({ port, token }); $('token').value = token;
  try {
    const r = await fetch(`http://127.0.0.1:${port}/health`, { headers: { authorization: 'Bearer ' + token } });
    if (r.status === 401) return msg('Köprü açık ama anahtar yanlış.');
    if (!r.ok) return msg('Köprü yanıt vermedi (HTTP ' + r.status + ').');
    msg('Bağlandı ✓ Artık sağ tıkla gönderebilirsin.', true);
  } catch { msg(`Köprü kapalı: 127.0.0.1:${port} yanıt vermiyor (systemctl --user start hizli-note-bridge).`); }
};
