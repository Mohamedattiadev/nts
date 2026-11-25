'use strict';
// 123-2: the date dial the owner chose (design/dial2.html d-A2 "Yarım kadran"): the top half of a safe dial, day outside, month in the
// middle, year inside; drag a ring (momentum, detents with a soft tick), mouse wheel, ← → ↑ ↓ PageUp/Down Home End on a focused ring,
// tap a value to turn there. A day the month doesn't have fades; the chosen day is remembered (31 → Şubat 28 → Mart 31).
// "Git" opens the list from that day. It sits on top of "Tarihe git"; the months/heat map under it stay (the dial is never the only way).
const DateDial = (() => {
  const NS = 'http://www.w3.org/2000/svg', mod = (a, n) => ((a % n) + n) % n, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sv = (tag, at, txt) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (txt != null) e.textContent = txt; return e; };
  const RM = () => reduced();
  const MON = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const MS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const WD = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1));
  const dim = (y, m) => new Date(y, m + 1, 0).getDate();
  let lastTick = 0; const tick = () => { const t = performance.now(); if (t - lastTick < 28) return; lastTick = t; haptic(3); };

  class Spin {
    constructor(n, render, onSettle) { this.n = n; this.render = render; this.onSettle = onSettle; this.pos = 0; this.raf = 0; this.v = 0; this.last = 0; }
    get i() { return mod(Math.round(this.pos), this.n); }
    set(p) { const t = Math.round(this.pos); this.pos = p; if (Math.round(p) !== t) tick(); this.render(p); }
    stop() { cancelAnimationFrame(this.raf); this.raf = 0; }
    go(target, ms) { this.stop(); const from = this.pos, d = target - from;
      if (RM() || !d) { this.set(target); this.onSettle(this.i); return; }
      const dur = ms || clamp(180 + Math.abs(d) * 40, 180, 650), t0 = performance.now();
      const f = t => { const k = Math.min(1, (t - t0) / dur), e = 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2); this.set(from + d * e);
        if (k < 1) this.raf = requestAnimationFrame(f); else { this.raf = 0; this.onSettle(this.i); } };
      this.raf = requestAnimationFrame(f); }
    to(i) { let d = mod(i - this.pos, this.n); if (d > this.n / 2) d -= this.n; this.go(this.pos + d); }
    by(k) { this.go(Math.round(this.pos) + k, 170); }
    start() { this.stop(); this.v = 0; this.last = performance.now(); }
    move(dp) { const t = performance.now(), dt = Math.max(1, t - this.last); this.v = this.v * .6 + (dp / dt) * .4; this.last = t; this.set(this.pos + dp); }
    end() { const idle = performance.now() - this.last > 90, v = idle || RM() ? 0 : clamp(this.v, -.06, .06); this.go(Math.round(this.pos + v * 140)); }
  }
  const P = (r, a) => { const t = a * Math.PI / 180; return [+(r * Math.sin(t)).toFixed(2), +(-r * Math.cos(t)).toFixed(2)]; };
  const sector = (r0, r1, lim) => { const [a, b] = P(r1, -lim), [c, d] = P(r1, lim), [e, f] = P(r0, lim), [g, h] = P(r0, -lim), L = lim > 90 ? 1 : 0;
    return `M${a},${b}A${r1},${r1} 0 ${L} 1 ${c},${d}` + (r0 ? `L${e},${f}A${r0},${r0} 0 ${L} 0 ${g},${h}Z` : 'L0,0Z'); };
  const arc = (r, lim) => { const [a, b] = P(r, -lim), [c, d] = P(r, lim); return `M${a},${b}A${r},${r} 0 ${lim > 90 ? 1 : 0} 1 ${c},${d}`; };
  const at = (e, svg) => { const m = svg.getScreenCTM().inverse(), x = m.a * e.clientX + m.c * e.clientY + m.e, y = m.b * e.clientX + m.d * e.clientY + m.f; return { a: Math.atan2(x, -y) * 180 / Math.PI, d: Math.hypot(x, y), x }; };
  const nrm = a => ((a + 540) % 360) - 180;

  function wheel(parent, labels, o) {
    const n = labels.length, wrap = sv('g', { class: 'ring', tabindex: '0', role: 'slider', 'aria-label': o.name });
    wrap.append(sv('path', { class: 'focus', d: arc(o.band[1] - 1, o.lim) }));
    const items = labels.map(s => { const g = sv('g', { class: 'it' });
      if (o.ticks) { g.append(sv('line', { class: 'tk m', x1: 0, x2: 0, y1: -o.band[1] + 2, y2: -o.band[1] + 7 }), sv('line', { class: 'tk', x1: 0, x2: 0, y1: -o.band[1] + 2, y2: -o.band[1] + 5, transform: `rotate(${o.step / 2})` })); }
      const t = sv('text', { style: `font-size:${o.fs}px` }, s); g.append(t); wrap.append(g); return { g, t, hid: 0 }; });
    parent.append(wrap);
    const R = { wrap, items, n, step: o.step, band: o.band, r: o.r, sel: -1 };
    R.spin = new Spin(n, p => {
      for (let i = 0; i < n; i++) { const it = items[i], d = mod(i - p + n / 2, n) - n / 2, a = d * o.step, A = Math.abs(a);
        if (A > o.lim + o.step * .6) { if (!it.hid) { it.g.style.display = 'none'; it.hid = 1; } continue; }
        if (it.hid) { it.g.style.display = ''; it.hid = 0; }
        it.g.setAttribute('transform', `rotate(${a.toFixed(2)})`);
        it.g.style.opacity = Math.max(0, 1 - Math.pow(A / o.lim, 1.5)).toFixed(3);
        it.t.setAttribute('transform', `translate(0 ${-o.r}) scale(${(1 + o.grow * Math.max(0, 1 - Math.abs(d))).toFixed(3)})`); }
      const i = mod(Math.round(p), n); if (i !== R.sel) { if (R.sel >= 0) items[R.sel].t.classList.remove('on'); items[i].t.classList.add('on'); R.sel = i; }
    }, i => { wrap.setAttribute('aria-valuetext', labels[i]); o.settle(i); });
    wrap.addEventListener('keydown', e => { const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1, PageDown: 5, PageUp: -5 }[e.key];
      if (k) { e.preventDefault(); e.stopPropagation(); R.spin.by(k); } else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); R.spin.to(e.key === 'Home' ? 0 : n - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); o.enter(); } });
    return R;
  }
  function drive(svg, rings) {
    let cur = null, la = 0, sx = 0, sy = 0, moved = false;
    const pick = p => rings.find(R => p.d >= R.band[0] - 3 && p.d <= R.band[1] + 8) || null;
    svg.addEventListener('pointerdown', e => { const p = at(e, svg); cur = pick(p); sx = e.clientX; sy = e.clientY; moved = false; if (!cur) return;
      svg.setPointerCapture(e.pointerId); svg.classList.add('grab'); la = p.a; cur.spin.start(); });
    svg.addEventListener('pointermove', e => { if (!cur) return; if (Math.hypot(e.clientX - sx, e.clientY - sy) > 4) moved = true; const p = at(e, svg);
      if (p.d < 20) return; const d = nrm(p.a - la); la = p.a; cur.spin.move(-d / cur.step); });
    const up = e => { if (!cur) return; svg.classList.remove('grab');
      if (!moved) { const off = Math.round(at(e, svg).a / cur.step); cur.spin.stop(); cur.spin.go(Math.round(cur.spin.pos) + off); } else cur.spin.end();
      cur.wrap.focus({ preventScroll: true }); cur = null; };
    svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
    let acc = 0, wR = null;
    svg.addEventListener('wheel', e => { e.preventDefault(); const R = pick(at(e, svg)) || rings[0]; if (R !== wR) { acc = 0; wR = R; }
      acc += Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX; const k = Math.trunc(acc / 36); if (k) { acc -= k * 36; R.spin.by(clamp(k, -3, 3)); } }, { passive: false });
  }

  // box: an element to fill; go(dayKey) is called by "Git" / Enter
  function mount(box, go) {
    const today = new Date(now()); today.setHours(0, 0, 0, 0);
    let y0 = today.getFullYear(); for (const i of S.items) if (!i.deleted && i.ts) { const y = new Date(i.ts).getFullYear(); if (y < y0 && y > 1990) y0 = y; }
    const YEARS = Array.from({ length: today.getFullYear() + 1 - y0 + 1 }, (_, k) => String(y0 + k));
    box.innerHTML = '';
    const svg = sv('svg', { class: 'dial half', viewBox: '-172 -174 344 178', 'aria-label': 'Tarih çarkı' }); box.append(svg);
    const read = document.createElement('div'); read.className = 'dd-read';
    read.innerHTML = `<div class="v" aria-live="polite"><b></b><span></span></div><button class="dd-today" type="button">Bugün</button><button class="dd-go" type="button">Git</button>`; box.append(read);
    const st = { y: today.getFullYear(), m: today.getMonth(), d: today.getDate(), want: today.getDate() }; let auto = 0;
    svg.append(sv('path', { class: 'face', d: sector(0, 170, 90) }));
    [131, 95].forEach(r => svg.append(sv('path', { class: 'hair', d: arc(r, 86) })));
    const enter = () => doGo();
    const D = wheel(svg, DAYS, { r: 150, band: [133, 168], step: 12.5, fs: 13, lim: 84, grow: .24, ticks: true, name: 'Gün', settle: i => set('d', i + 1), enter });
    const Mo = wheel(svg, MS, { r: 114, band: [97, 131], step: 21, fs: 12.5, lim: 84, grow: .22, name: 'Ay', settle: i => set('m', i), enter });
    const Y = wheel(svg, YEARS, { r: 78, band: [61, 95], step: 27, fs: 11.5, lim: 84, grow: .2, name: 'Yıl', settle: i => set('y', y0 + i), enter });
    svg.append(sv('path', { class: 'hub', d: sector(0, 59, 90) }));
    const hw = sv('text', { class: 'hw', y: -32 }, ''), hr = sv('text', { class: 'hr', y: -15 }, ''); svg.append(hw, hr);
    svg.append(sv('rect', { class: 'win', x: -21, y: -171, width: 42, height: 113, rx: 14 }));
    const key = () => `${st.y}-${String(st.m + 1).padStart(2, '0')}-${String(st.d).padStart(2, '0')}`;
    const paint = () => { const dt = new Date(st.y, st.m, st.d), diff = Math.round((dt - today) / 864e5);
      const rel = diff === 0 ? 'bugün' : diff === -1 ? 'dün' : diff === 1 ? 'yarın' : diff < 0 ? (-diff) + ' gün önce' : diff + ' gün sonra';
      read.querySelector('b').textContent = `${st.d} ${MON[st.m]} ${st.y}`; read.querySelector('span').textContent = WD[dt.getDay()] + ' · ' + rel;
      hw.textContent = WD[dt.getDay()]; hr.textContent = rel; };
    function set(k, v) { st[k] = v; if (k === 'd') { if (v === auto) auto = 0; else st.want = v; }
      const n = dim(st.y, st.m), t = Math.min(st.want, n); D.items.forEach((it, i) => it.t.classList.toggle('off', i >= n));
      if (st.d !== t) { auto = t; D.spin.to(t - 1); return; } paint(); }
    const doGo = () => { haptic(10); go(key()); };
    read.querySelector('.dd-go').onclick = doGo;
    read.querySelector('.dd-today').onclick = () => { Y.spin.to(today.getFullYear() - y0); Mo.spin.to(today.getMonth()); D.spin.to(today.getDate() - 1); };
    drive(svg, [D, Mo, Y]);
    Y.spin.set(st.y - y0); Mo.spin.set(st.m); D.spin.set(st.d - 1); set('d', st.d);
  }
  return { mount };
})();
