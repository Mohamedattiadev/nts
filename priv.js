// 107l: fingerprint / face unlock + hidden records.
// Bio: a platform passkey with the WebAuthn PRF extension. The PRF output (only the authenticator can make it, and only after the
// fingerprint/face check) becomes an AES key that wraps the app lock's 64 derived bytes, so the password is never stored and the
// encrypted sync keeps working. No PRF on this device → we say so and keep the password (no fake "gate" that stores the key in clear).
// Priv: an item with `priv: true` is left out of every list, board, search and count (app.js hid()) until "Gizli kayıtlar" is opened
// with the fingerprint/face or the password; it closes again as soon as the app goes to the background.
const rnd = n => crypto.getRandomValues(new Uint8Array(n));
const FP = '<svg class="i sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 11v3a6 6 0 0 1-1.2 3.6"/><path d="M8.5 9.5a3.5 3.5 0 0 1 7 0V13a10 10 0 0 1-.8 4"/><path d="M5.6 15.5A10 10 0 0 0 6 13V9.5a6 6 0 0 1 9.4-4.9"/><path d="M18 8.5c.3.6.5 1.3.5 2V13a14 14 0 0 1-.4 3.4"/><path d="M3.5 10a8.5 8.5 0 0 1 1.3-3.8"/></svg>';
const Bio = {
  KV: 'lock-bio',
  ok: () => !!(window.PublicKeyCredential && navigator.credentials?.create && window.isSecureContext) && !/^[\d.]+$|:/.test(location.hostname), // passkeys need a domain name (localhost ok, 127.0.0.1 not)
  conf() { return DB.get('kv', this.KV); },
  async bits(pass) { // the same 64 bytes Crypt.derive makes: 32 = AES key, 32 = check
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveBits']);
    return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode('hizli-note-v1'), iterations: 310000 }, base, 512));
  },
  async kek(out) {
    const base = await crypto.subtle.importKey('raw', out, 'HKDF', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: new TextEncoder().encode('nts-bio-v1') }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  },
  async eval(id, salt) {
    const a = await navigator.credentials.get({ publicKey: { challenge: rnd(32), allowCredentials: [{ type: 'public-key', id }], userVerification: 'required', timeout: 60000, extensions: { prf: { eval: { first: salt } } } } });
    const r = a.getClientExtensionResults().prf?.results?.first; if (!r) throw new Error('noprf'); return r;
  },
  async enroll(pass) {
    const bits = await this.bits(pass); if (b64(bits.slice(32)) !== Lock.conf?.check) throw new Error('pass');
    const salt = rnd(32);
    const cred = await navigator.credentials.create({ publicKey: { challenge: rnd(32), rp: { name: 'Nts' }, user: { id: rnd(16), name: 'Nts kilidi', displayName: 'Nts kilidi' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }], timeout: 60000,
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' }, extensions: { prf: { eval: { first: salt } } } } });
    const ext = cred.getClientExtensionResults().prf;
    if (ext?.enabled === false) throw new Error('noprf');
    const out = ext?.results?.first || await this.eval(cred.rawId, salt); // some authenticators answer PRF only on get()
    const iv = rnd(12), ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await this.kek(out), bits));
    await DB.put('kv', { id: b64(new Uint8Array(cred.rawId)), salt: b64(salt), iv: b64(iv), ct: b64(ct) }, this.KV);
  },
  async unlock() { // → the app lock's AES key, after the fingerprint/face check
    const c = await this.conf(); if (!c || !Lock.conf) throw new Error('none');
    const out = await this.eval(unb64(c.id), unb64(c.salt));
    const bits = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(c.iv) }, await this.kek(out), unb64(c.ct)));
    if (b64(bits.slice(32)) !== Lock.conf.check) throw new Error('stale'); // the password changed since
    return crypto.subtle.importKey('raw', bits.slice(0, 32), 'AES-GCM', false, ['encrypt', 'decrypt']);
  },
  why(e) { return e?.name === 'NotAllowedError' || e?.name === 'AbortError' ? '' : e?.message === 'noprf' ? 'Bu cihaz parmak izi/yüzle anahtar saklamayı desteklemiyor; şifre kullan.' : e?.message === 'stale' ? 'Şifre değişmiş; parmak izini Ayarlar\'dan yeniden aç.' : e?.message === 'pass' ? 'Şifre yanlış' : 'Parmak izi/yüz açılamadı; şifreyi gir.'; },
  async offer(form, done) { // on the lock screen: one button above the password
    if (!this.ok() || !await this.conf()) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn secondary bio-btn'; b.innerHTML = FP + '<span>Parmak izi / yüzle aç</span>';
    form.querySelector('input').before(b);
    b.onclick = async () => { const err = form.querySelector('.lock-err'); err.textContent = '';
      try { done(await this.unlock()); } catch (e) { err.textContent = this.why(e); form.querySelector('input').focus(); } };
    setTimeout(() => b.focus(), 60);
  },
};

const Priv = {
  n() { let n = 0; for (const i of S.items) if (i.priv && !i.deleted) n++; return n; },
  row() {
    const n = this.n(); if (!n && !S.privOn) return '';
    return `<button class="side-row${S.privOn ? ' on' : ''}" data-priv aria-pressed="${!!S.privOn}">${ic('lock')}<span class="lbl">${S.privOn ? 'Gizlileri kapat' : 'Gizli kayıtlar'}</span><span class="n">${n || ''}</span></button>`;
  },
  async toggle(id) {
    const i = byId(id); if (!i) return; const on = !i.priv;
    await upsert([{ ...i, priv: on || undefined }]); render();
    toast(on ? (Lock.conf ? 'Gizlendi · sol çubukta "Gizli kayıtlar" ile açılır' : 'Gizlendi · şifre koyarsan yalnız şifre/parmak iziyle açılır') : 'Artık gizli değil', 4000, 'lock',
      { label: 'Geri al', fn: async () => { const c = byId(id); if (c) { await upsert([{ ...c, priv: on ? undefined : true }]); render(); } } });
  },
  async open() {
    if (S.privOn) return this.close();
    if (Lock.conf && !await this.auth()) return;
    S.privOn = true; render(); toast(`${this.n()} gizli kayıt görünüyor`, 3500, 'lock', { label: 'Kapat', fn: () => this.close() });
  },
  close() { if (!S.privOn) return; S.privOn = false; render(); },
  async auth() {
    if (Bio.ok() && await Bio.conf()) { try { await Bio.unlock(); return true; } catch (e) { if (!Bio.why(e)) return false; toast(Bio.why(e), 4000, 'lock'); } }
    return !!await this.ask('Gizli kayıtlar', 'Görmek için şifreni gir.');
  },
  ask(title, msg) { // → the password if it is right, '' if cancelled
    return new Promise(resolve => {
      const el = document.createElement('dialog'); el.className = 'lock priv-ask'; // a modal dialog: it must sit above Settings (also a modal)
      el.innerHTML = `<form class="lock-card">${ic('lock', 'lg')}<h2>${title}</h2><p>${msg}</p><input type="password" autocomplete="current-password" placeholder="Şifre" aria-label="Şifre"><div class="lock-err"></div>
        <button class="btn primary">Aç</button><button type="button" class="btn ghost" data-x>Vazgeç</button></form>`;
      document.body.appendChild(el); el.showModal();
      const f = el.querySelector('form'), inp = f.querySelector('input'), err = f.querySelector('.lock-err'), end = v => { el.close(); el.remove(); resolve(v); };
      el.oncancel = e => { e.preventDefault(); end(''); }; el.querySelector('[data-x]').onclick = () => end(''); setTimeout(() => inp.focus(), 50);
      f.onsubmit = async e => { e.preventDefault(); err.textContent = '';
        const { check } = await Crypt.derive(inp.value);
        if (check !== Lock.conf?.check) { err.textContent = 'Şifre yanlış'; inp.select(); return; } end(inp.value); };
    });
  },
};

// settings: "Parmak izi / yüzle aç" next to the app lock rows
const _openSettings0 = openSettings;
openSettings = function (...a) {
  const r = _openSettings0.apply(this, a), off = $('#menu [data-do="unlock-off"]');
  if (off && Bio.ok()) Bio.conf().then(c => { if (!off.isConnected) return;
    off.insertAdjacentHTML('beforebegin', c ? `<button class="set-row" data-bio="off">${FP.replace("i sm", "i")}<span>Parmak izi / yüzle açma açık<small>Kapatmak için dokun · şifre her zaman çalışır</small></span></button>`
      : `<button class="set-row" data-bio="on">${FP.replace("i sm", "i")}<span>Parmak izi / yüzle aç<small>Kilit ekranı ve gizli kayıtlar için; şifre yedek kalır</small></span></button>`); });
  return r;
};
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-bio], [data-priv]'); if (!b) return;
  e.preventDefault(); e.stopPropagation();
  if ('priv' in b.dataset) return Priv.open();
  if (b.dataset.bio === 'off') { await DB.del('kv', Bio.KV); toast('Parmak izi / yüzle açma kapatıldı', 2500, 'check'); return openSettings(); }
  const pass = await Priv.ask('Parmak izi / yüz', 'Önce şifreni gir; sonra parmağını okut ya da yüzünü göster.'); if (!pass) return;
  try { await Bio.enroll(pass); toast('Parmak izi / yüzle açma hazır', 3000, 'check'); } catch (err) { const w = Bio.why(err); if (w) toast(w, 5000, 'lock'); }
  openSettings();
}, true);
document.addEventListener('visibilitychange', () => { if (document.hidden) Priv.close(); });
