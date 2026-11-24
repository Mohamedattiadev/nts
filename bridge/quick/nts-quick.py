#!/usr/bin/env python3
# Nts quick box (PLAN 156): a small floating text box at the mouse, from anywhere on the desktop.
# One process waits in the background (Hyprland exec-once) with the window hidden; nts-quick.sh
# writes "toggle" to a FIFO, so opening is just a map, not a Python start.
#   Not  (Enter) → bridge /inbox, the same road as `hn`; bridge down → local queue, sent when it is back
#   Ara  live search in the snapshot the app gives the bridge; Enter opens the record in Nts
#   Sor  asks Claude through the bridge /ask with the best matching records
# Tab / Shift+Tab: mode · Shift+Enter: new line · Esc / F7: close (draft kept); focus leaving closes it only when empty · Ctrl+V: image/file too
# Under the box (156b): the last notes (snapshot + what this box just sent), filtered live as you type; ↑↓ pick, Enter opens.
import os, sys, socket, json, time, base64, threading, subprocess, urllib.request, mimetypes, re, unicodedata
from datetime import datetime, timezone
import gi
gi.require_version('Gtk', '4.0'); gi.require_version('Gdk', '4.0')
from gi.repository import GLib
GLib.set_prgname('nts-quick')  # Wayland app_id → Hyprland class
from gi.repository import Gtk, Gdk, Gio

HERE = os.path.dirname(os.path.abspath(__file__))
CONF_DIR = os.environ.get('NTS_QUICK_CONF') or os.path.expanduser('~/.config/hizli-note')  # tests point this at a fake bridge
QUEUE = os.path.join(CONF_DIR, 'quick-queue.jsonl')
DRAFT = os.path.join(CONF_DIR, 'quick-draft.txt')
SENT = os.path.join(CONF_DIR, 'quick-sent.json')  # what this box sent lately: shown on top until the app has it in the snapshot
RUN = os.environ.get('XDG_RUNTIME_DIR', '/tmp')
QRUN = os.environ.get('NTS_QUICK_RUN') or RUN  # tests run a second box beside the owner's without sharing its FIFO
FIFO = os.path.join(QRUN, 'nts-quick.fifo')
PIDF = os.path.join(QRUN, 'nts-quick.pid')
LOG = os.path.expanduser('~/.cache/nts-quick.log')
APP_URL = 'https://mohamedattiadev.github.io/nts/'
W = 600
RECENT = 8
MODES = [('note', 'Not', 'document-edit-symbolic', 'Not yaz…'), ('find', 'Ara', 'system-search-symbolic', 'Kayıtlarda ara…'), ('ask', 'Sor', 'starred-symbolic', 'Kayıtlarına sor…')]
KEYS = {'note': '↵ kaydet   ⇧↵ yeni satır   ↑↓ seç   Tab mod   Esc kapat', 'find': '↵ aç   ↑↓ seç   Tab mod   Esc kapat', 'ask': '↵ sor   Tab mod   Esc kapat'}
TYPE_ICON = {'link': 'web-browser-symbolic', 'photo': 'image-x-generic-symbolic', 'file': 'x-office-document-symbolic', 'note': 'text-x-generic-symbolic'}
AYLAR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

def ago(iso, now=None):  # "şimdi" · "5 dk önce" · "2 sa önce" · "dün" · "3 gün önce" · "12 Kas" · "12 Kas 2024"
    try: t = datetime.fromisoformat(str(iso).replace('Z', '+00:00'))
    except ValueError: return ''
    if t.tzinfo is None: t = t.replace(tzinfo=timezone.utc)
    now = now or datetime.now(timezone.utc); s = (now - t).total_seconds(); lt, ln = t.astimezone(), now.astimezone()
    if s < 60: return 'şimdi'
    if s < 3600: return f'{int(s // 60)} dk önce'
    if lt.date() == ln.date(): return f'{int(s // 3600)} sa önce'
    d = (ln.date() - lt.date()).days
    if d == 1: return 'dün'
    if d < 7: return f'{d} gün önce'
    return f'{lt.day} {AYLAR[lt.month - 1]}' + ('' if lt.year == ln.year else f' {lt.year}')

def log(*a):
    try:
        with open(LOG, 'a') as f: f.write(time.strftime('%H:%M:%S ') + ' '.join(map(str, a)) + '\n')
    except OSError: pass

def conf():
    with open(os.path.join(CONF_DIR, 'bridge.json')) as f: return json.load(f)

def bridge(path, body=None, timeout=4):
    c = conf()
    req = urllib.request.Request(f'http://127.0.0.1:{c["port"]}{path}', data=json.dumps(body).encode() if body is not None else None,
                                 headers={'authorization': 'Bearer ' + c['token'], 'content-type': 'application/json'}, method='POST' if body is not None else 'GET')
    with urllib.request.urlopen(req, timeout=timeout) as r: return json.loads(r.read() or b'{}')

def hypr(cmd):  # Hyprland's own socket: ~1 ms, where a `hyprctl` process costs 100+ ms
    p = os.path.join(RUN, 'hypr', os.environ.get('HYPRLAND_INSTANCE_SIGNATURE', ''), '.socket.sock')
    with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as k:
        k.settimeout(0.5); k.connect(p); k.sendall(cmd.encode()); out = b''
        while (c := k.recv(65536)): out += c
    return out

def norm(s):  # same folding as bridge/mcp.mjs: lower (tr), no accents, ı → i
    s = (s or '').replace('I', 'ı').replace('İ', 'i').lower()
    return re.sub(r'[̀-ͯ]', '', unicodedata.normalize('NFD', s)).replace('ı', 'i')

CSS = '''
window.nq { background: transparent; }
.card { background: @bg; border: 1px solid @line; border-radius: 18px; padding: 10px 10px 6px 10px; font-family: Inter, "Inter Variable", system-ui, sans-serif; }
.card:focus-within { border-color: @ring; }
.card.in { animation: nq-in 120ms cubic-bezier(.2, .9, .3, 1); }
@keyframes nq-in { from { opacity: 0; transform: translateY(-6px) scale(.98); } to { opacity: 1; transform: none; } }
.row { min-height: 44px; }
.mode { background: @pill; color: @text; border-radius: 999px; padding: 0 12px 0 10px; min-height: 34px; font-weight: 600; font-size: 13px; border: none; box-shadow: none; transition: background 150ms ease, color 150ms ease; }
.mode:hover { background: @pill2; }
.mode.find { color: @hit; } .mode.ask { color: @accent; background: @soft; }
textview, textview text { background: transparent; color: @text; font-size: 17px; caret-color: @accent; }
textview { padding: 9px 4px 9px 4px; }
.ph { color: @muted; font-size: 17px; padding: 0 6px; }
.hint { color: @muted; font-size: 12px; padding: 0 6px; }
.ok { color: @accent; font-weight: 600; }
.logo { margin: 0 2px 0 2px; }
.chip { background: @soft; color: @text; border-radius: 999px; padding: 2px 4px 2px 10px; font-size: 12px; }
.chip button { min-height: 20px; min-width: 20px; padding: 0; background: none; border: none; box-shadow: none; color: @muted; }
.sep { background: @line; min-height: 1px; margin: 8px 2px 4px 2px; }
.head { color: @muted; font-size: 11px; font-weight: 600; letter-spacing: 1px; padding: 4px 8px 2px 8px; }
list.res { background: transparent; }
list.res row { border-radius: 12px; padding: 6px 8px; color: @text; transition: background 120ms ease; }
list.res row:selected { background: @soft; }
list.res row:hover { background: @pill; }
list.res row:selected:hover { background: @soft2; }
.ti { background: @pill; border-radius: 9px; min-width: 30px; min-height: 30px; color: @text2; }
row:selected .ti { color: @accent; }
.rt { font-weight: 600; font-size: 14px; color: @text; }
.rs { font-size: 12px; color: @muted; }
.rw { font-size: 12px; color: @muted; margin-left: 8px; }
.rw.wait { color: @accent; }
.ans { color: @text; font-size: 14px; padding: 8px 8px 2px 8px; }
.keys { color: @muted; font-size: 11px; padding: 6px 8px 2px 8px; }
'''
THEMES = {  # style.css tokens
    'dark': dict(bg='#151519', line='#2a2a31', ring='rgba(255,154,77,.55)', text='#ededf2', text2='#a3a3ad', muted='#8a8a95', accent='#ff9a4d', hit='#f5c451',
                 soft='rgba(255,154,77,.14)', soft2='rgba(255,154,77,.22)', pill='rgba(255,255,255,.07)', pill2='rgba(255,255,255,.12)'),
    'light': dict(bg='#ffffff', line='#e3e3de', ring='rgba(194,65,12,.45)', text='#18181b', text2='#55555e', muted='#6b6b74', accent='#c2410c', hit='#9d7107',
                  soft='rgba(194,65,12,.09)', soft2='rgba(194,65,12,.15)', pill='#f4f4f1', pill2='#ebebe7'),
}

class Quick:
    def __init__(self, show, shot=False):
        self.shot = shot; self.t_show = 0; self.mode = 0; self.files = []; self.results = []; self.picked = False; self.was_active = False; self.t_toggle = None; self.snap = (0, [])
        self.win = Gtk.Window(title='Nts hızlı'); self.win.add_css_class('nq')
        self.win.set_decorated(False); self.win.set_resizable(False)
        self.win.connect('close-request', lambda *_: (self.hide(), True)[1])
        self.win.connect('notify::is-active', self.on_active)
        self.win.connect('map', self.on_map)
        self.card = card = Gtk.Box(orientation=Gtk.Orientation.VERTICAL); card.add_css_class('card'); card.set_size_request(W, -1)
        row = Gtk.Box(spacing=8); row.add_css_class('row')
        logo = Gtk.Image.new_from_file(os.path.join(HERE, '..', '..', 'icons', 'icon.svg')); logo.set_pixel_size(28); logo.add_css_class('logo'); logo.set_valign(Gtk.Align.START); logo.set_margin_top(8)
        self.mbtn = Gtk.Button(); self.mbtn.add_css_class('mode'); self.mbtn.set_valign(Gtk.Align.START); self.mbtn.set_margin_top(5)
        self.mbtn.set_tooltip_text('Mod (Tab)'); self.mbtn.set_focusable(False); self.mbtn.connect('clicked', lambda *_: self.set_mode(self.mode + 1))
        mb = Gtk.Box(spacing=6); self.micon = Gtk.Image(); self.mlabel = Gtk.Label(); mb.append(self.micon); mb.append(self.mlabel); self.mbtn.set_child(mb)
        self.tv = Gtk.TextView(); self.tv.set_wrap_mode(Gtk.WrapMode.WORD_CHAR); self.tv.set_hexpand(True); self.tv.set_accepts_tab(False)
        self.buf = self.tv.get_buffer(); self.buf.connect('changed', self.on_changed)
        self.ph = Gtk.Label(xalign=0); self.ph.add_css_class('ph'); self.ph.set_can_target(False)
        ov = Gtk.Overlay(); ov.set_child(self.tv); ov.add_overlay(self.ph); ov.set_hexpand(True); self.ph.set_valign(Gtk.Align.START); self.ph.set_margin_top(9); self.ph.set_halign(Gtk.Align.START)
        self.hint = Gtk.Label(); self.hint.add_css_class('hint'); self.hint.set_valign(Gtk.Align.START); self.hint.set_margin_top(14)
        row.append(logo); row.append(self.mbtn); row.append(ov); row.append(self.hint)
        self.chips = Gtk.FlowBox(); self.chips.set_selection_mode(Gtk.SelectionMode.NONE); self.chips.set_visible(False); self.chips.set_max_children_per_line(4)
        self.ans = Gtk.Label(xalign=0, wrap=True, selectable=True); self.ans.add_css_class('ans'); self.ans.set_visible(False); self.ans.set_max_width_chars(70)
        self.sep = Gtk.Box(); self.sep.add_css_class('sep')
        self.head = Gtk.Label(xalign=0); self.head.add_css_class('head')
        self.list = Gtk.ListBox(); self.list.add_css_class('res'); self.list.connect('row-activated', lambda _l, r: self.open_item(self.results[r.get_index()]))
        self.keys = Gtk.Label(xalign=0); self.keys.add_css_class('keys')
        for w in (row, self.chips, self.ans, self.sep, self.head, self.list, self.keys): card.append(w)
        self.win.set_child(card)
        keys = Gtk.EventControllerKey(); keys.set_propagation_phase(Gtk.PropagationPhase.CAPTURE); keys.connect('key-pressed', self.on_key); self.win.add_controller(keys)
        drop = Gtk.DropTarget.new(Gdk.FileList, Gdk.DragAction.COPY); drop.connect('drop', lambda _d, v, *_: (self.add_paths([f.get_path() for f in v.get_files()]), True)[1]); self.win.add_controller(drop)
        self.css = Gtk.CssProvider(); Gtk.StyleContext.add_provider_for_display(Gdk.Display.get_default(), self.css, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION)
        try:
            self.gs = Gio.Settings.new('org.gnome.desktop.interface'); self.gs.connect('changed::color-scheme', lambda *_: self.theme())
        except Exception: self.gs = None
        self.theme(); self.set_mode(0); self.win.realize()  # first open as fast as the next ones
        try:
            with open(DRAFT) as f: self.buf.set_text(f.read())
        except OSError: pass
        if not shot: self.listen()
        GLib.timeout_add_seconds(30, lambda: (self.flush(), True)[1])
        if show: self.show()

    # ---------- look ----------
    def theme(self):
        dark = os.environ.get('NTS_QUICK_THEME') or ('dark' if (self.gs and 'dark' in self.gs.get_string('color-scheme')) else 'light')
        t = THEMES['dark' if dark == 'dark' else 'light']
        self.css.load_from_string(''.join(f'@define-color {k} {v};\n' for k, v in t.items()) + CSS)

    def set_mode(self, n):
        self.mode = n % 3; key, label, icon, ph = MODES[self.mode]
        self.micon.set_from_icon_name(icon); self.mlabel.set_text(label); self.ph.set_text(ph); self.keys.set_text(KEYS[key])
        for k, *_ in MODES: (self.mbtn.add_css_class if k == key else self.mbtn.remove_css_class)(k)
        self.ans.set_visible(False); self.on_changed()

    def text(self): return self.buf.get_text(self.buf.get_start_iter(), self.buf.get_end_iter(), False)

    def on_changed(self, *_):
        t = self.text(); self.ph.set_visible(not t); self.picked = False
        self.hint.set_text(''); self.hint.remove_css_class('ok')
        if getattr(self, '_st', None): GLib.source_remove(self._st)
        def run():
            self._st = None; self.refresh(); return False
        self._st = GLib.timeout_add(60, run) if t.strip() else None
        if not t.strip(): self.refresh()

    def refresh(self):  # what sits under the box: last notes when empty, matches while typing (Not: "Benzer", Ara: results)
        t, mode = self.text().strip(), MODES[self.mode][0]
        if mode == 'ask' and t: return self.show_results([], '')
        if not t: r = self.recent(RECENT); return self.show_results(r, 'SON NOTLAR' if r else '')  # nothing yet: no empty heading
        hits = self.match(t, 6)
        self.show_results(hits, ('BENZER KAYITLAR' if hits else '') if mode == 'note' else (f'{len(hits)} SONUÇ' if hits else 'SONUÇ YOK'), select=mode == 'find')

    # ---------- open / close ----------
    def listen(self):
        if not os.path.exists(FIFO): os.mkfifo(FIFO, 0o600)
        fd = os.open(FIFO, os.O_RDWR | os.O_NONBLOCK)
        with open(PIDF, 'w') as f: f.write(str(os.getpid()))  # RDWR: never sees EOF, writers never block
        def read(_ch, _c):
            for cmd in os.read(fd, 4096).decode(errors='ignore').split('\n'):
                parts = cmd.split()
                if not parts: continue
                if parts[0] == 'toggle':
                    self.t_toggle = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else None
                    if not self.win.get_visible(): self.show()
                    elif self.win.is_active(): self.hide()
                    else: self.win.present(); self.tv.grab_focus()  # up but the mouse took focus away: F7 brings it back
                elif parts[0] == 'show': self.show()
                elif parts[0] == 'quit': self.app_quit()
            return True
        GLib.io_add_watch(GLib.IOChannel.unix_new(fd), GLib.PRIORITY_HIGH, GLib.IOCondition.IN, read)

    def show(self):
        self.was_active = False; self.tries = 0; self.t_show = time.time(); self.theme(); self.refresh(); self.card.add_css_class('in'); self.win.present(); self.tv.grab_focus()
        self.buf.select_range(self.buf.get_end_iter(), self.buf.get_end_iter())
        threading.Thread(target=self.flush, daemon=True).start()

    def on_map(self, *_):  # drawn invisible first: Hyprland centres a new float, place() moves it to the mouse, then it fades in
        fc = self.win.get_frame_clock()
        def painted(*_):
            fc.disconnect(h); self.t_paint = time.time_ns()
            GLib.timeout_add(5, self.place)
        h = fc.connect('after-paint', painted)

    def place(self):  # fallback for when the Hyprland rule (bridge/quick/hypr.conf) is missing: at the mouse, inside the monitor
        try:
            me = json.loads(hypr('j/activewindow') or b'{}')
            if me.get('pid') != os.getpid():
                if self.tries < 20: self.tries += 1; return True  # not mapped/focused yet: next tick
                me = {}
            cur = json.loads(hypr('j/cursorpos')); mons = json.loads(hypr('j/monitors'))
            m = next((m for m in mons if m['x'] <= cur['x'] < m['x'] + m['width'] / m['scale'] and m['y'] <= cur['y'] < m['y'] + m['height'] / m['scale']), mons[0])
            mw, mh = m['width'] / m['scale'], m['height'] / m['scale']; ww = self.win.get_width() or W + 2; wh = self.win.get_height() + 40
            x = int(min(max(cur['x'] - 40, m['x'] + 8), m['x'] + mw - ww - 8)); y = int(min(max(cur['y'] - 24, m['y'] + 8), m['y'] + mh - wh - 8))
            at = me.get('at') or [-999, -999]
            if abs(at[0] - x) > 6 or abs(at[1] - y) > 6:
                r = hypr(f'dispatch movewindowpixel exact {x} {y},pid:{os.getpid()}').strip()
                if r != b'ok': log('place', r)
        except Exception as e: log('place', e)
        if self.t_toggle: log(f'open {(time.time_ns() - self.t_toggle) / 1e6:.0f} ms (painted {(self.t_paint - self.t_toggle) / 1e6:.0f}, tries {self.tries})'); self.t_toggle = None
        self.tries = 0
        return False

    def on_active(self, *_):  # with Hyprland follow_mouse = 1 focus leaves on a mere hover, so leaving is not "clicked outside"
        if self.shot: return
        if self.win.is_active(): self.was_active = True
        elif self.was_active and self.win.get_visible(): GLib.timeout_add(1200 if time.time() - self.t_show > .6 else 120, self.blurred)

    def blurred(self):  # empty box: close; something written: stay up (pinned) and keep it, the mouse coming back resumes typing
        if self.win.is_active() or not self.win.get_visible(): return False
        try: who = json.loads(hypr('j/activewindow') or b'{}').get('class', '?')
        except Exception: who = '?'
        if time.time() - self.t_show < .6:  # focus taken back right at open (seen on the first open after start): take it again
            log('focus taken at open by', who, '→ back'); self.win.present(); self.tv.grab_focus(); return False
        if self.text().strip() or self.files: return False
        log('closed: empty, focus went to', who); self.hide(); return False

    def hide(self):
        t = self.text()
        try:
            if t.strip(): open(DRAFT, 'w').write(t)
            elif os.path.exists(DRAFT): os.remove(DRAFT)
        except OSError: pass
        self.win.set_visible(False); self.card.remove_css_class('in')  # so the next open plays the 120 ms pop again

    def app_quit(self): self.hide(); self.loop.quit()

    # ---------- keys ----------
    def on_key(self, _c, kv, _code, st):
        ctrl, shift = st & Gdk.ModifierType.CONTROL_MASK, st & Gdk.ModifierType.SHIFT_MASK
        if kv == Gdk.KEY_Escape: self.hide(); return True
        if kv in (Gdk.KEY_Tab, Gdk.KEY_ISO_Left_Tab): self.set_mode(self.mode + (-1 if shift or kv == Gdk.KEY_ISO_Left_Tab else 1)); return True
        if kv in (Gdk.KEY_Return, Gdk.KEY_KP_Enter) and not shift: self.submit(); return True
        if kv in (Gdk.KEY_Down, Gdk.KEY_Up) and self.results and not shift:
            if self.text().count('\n') and not self.picked and kv == Gdk.KEY_Up: return False  # moving the caret in a long note
            self.move(1 if kv == Gdk.KEY_Down else -1); return True
        if ctrl and kv in (Gdk.KEY_v, Gdk.KEY_V): return self.paste()
        return False

    def move(self, d):  # ↑ from the first row gives the text back
        r = self.list.get_selected_row(); i = (r.get_index() if r else -1) + d
        if i < 0 and MODES[self.mode][0] != 'find': self.list.unselect_all(); self.picked = False; return
        i = max(0, min(i, len(self.results) - 1)); self.list.select_row(self.list.get_row_at_index(i)); self.picked = True

    def paste(self):
        cb = self.win.get_display().get_clipboard(); fm = cb.get_formats()
        if fm.contain_gtype(Gdk.FileList.__gtype__):
            cb.read_value_async(Gdk.FileList.__gtype__, 0, None, lambda c, r: self.add_paths([f.get_path() for f in c.read_value_finish(r).get_files()])); return True
        if fm.contain_gtype(Gdk.Texture.__gtype__) and not fm.contain_mime_type('text/plain'):
            def got(c, r):
                b = c.read_texture_finish(r).save_to_png_bytes().get_data()
                self.files.append({'name': f'pano-{int(time.time())}.png', 'mime': 'image/png', 'size': len(b), 'data': base64.b64encode(b).decode()}); self.chips_update()
            cb.read_texture_async(None, got); return True
        return False

    def add_paths(self, paths):
        for p in paths:
            if p and os.path.isfile(p) and os.path.getsize(p) < 200e6:
                with open(p, 'rb') as f: b = f.read()
                self.files.append({'name': os.path.basename(p), 'mime': mimetypes.guess_type(p)[0] or 'application/octet-stream', 'size': len(b), 'data': base64.b64encode(b).decode()})
        if self.mode != 0: self.set_mode(0)
        self.chips_update()

    def chips_update(self):
        self.chips.remove_all()
        for n, f in enumerate(self.files):
            b = Gtk.Box(spacing=4); b.add_css_class('chip'); b.append(Gtk.Label(label='📎 ' + (f['name'][:28] + '…' if len(f['name']) > 29 else f['name'])))
            x = Gtk.Button(icon_name='window-close-symbolic'); x.set_tooltip_text('Çıkar'); x.connect('clicked', lambda _b, n=n: (self.files.pop(n), self.chips_update())); b.append(x)
            self.chips.append(b)
        self.chips.set_visible(bool(self.files)); self.ph.set_visible(not self.text())

    # ---------- actions ----------
    def submit(self):
        mode, t = MODES[self.mode][0], self.text().strip()
        r = self.list.get_selected_row()
        if r and self.results and (self.picked or mode == 'find' or (not t and not self.files)): return self.open_item(self.results[r.get_index()])
        if mode == 'note':
            if not t and not self.files: return
            body = {'text': t, 'files': self.files}; self.flash('Kaydediliyor…')
            def go():
                try: bridge('/inbox', body, timeout=15); msg, st = 'Kaydedildi ✓', 'sent'
                except Exception:
                    os.makedirs(CONF_DIR, exist_ok=True)
                    with open(QUEUE, 'a', encoding='utf-8') as f: f.write(json.dumps(body, ensure_ascii=False) + '\n')
                    os.chmod(QUEUE, 0o600); msg, st = 'Köprü kapalı, sırada ✓', 'queued'
                self.remember(body, st)
                GLib.idle_add(self.saved, msg)
            threading.Thread(target=go, daemon=True).start()
        elif mode == 'ask' and t:
            self.ans.set_text('Düşünüyor…'); self.ans.set_visible(True); top = self.match(t, 40) or self.items()[:40]
            def go():
                try: r = bridge('/ask', {'question': f'{t}\nKayıtlarıma bakarak sorunun dilinde en çok 2 kısa cümleyle cevap ver; bilmiyorsan söyle. sources alanına cevabın geldiği kayıtların id\'leri, en iyisi önce.', 'items': top}, timeout=120)
                except Exception as e: r = {'answer': 'Köprü cevap vermedi (' + type(e).__name__ + ').'}
                GLib.idle_add(self.answered, r)
            threading.Thread(target=go, daemon=True).start()

    def answered(self, r):
        self.ans.set_text(r.get('answer') or '—'); by = {i['id']: i for i in self.items()}
        self.show_results([by[s] for s in (r.get('sources') or []) if s in by][:5], 'KAYNAKLAR')

    def flash(self, msg): self.hint.set_text(msg); self.hint.add_css_class('ok')

    def saved(self, msg):
        self.files = []; self.chips_update(); self.refresh(); self.flash(msg)
        def done():
            self.buf.set_text(''); self.hide()
        GLib.timeout_add(650, done)

    def flush(self):  # queued notes from when the bridge was down
        if not os.path.exists(QUEUE): return
        try:
            lines = [l for l in open(QUEUE).read().splitlines() if l.strip()]; left = []
            for l in lines:
                try: bridge('/inbox', json.loads(l), timeout=15); self.remember(json.loads(l), 'sent')
                except Exception: left.append(l)
            if left: open(QUEUE, 'w').write('\n'.join(left) + '\n')
            else: os.remove(QUEUE)
            if len(left) < len(lines): log(f'queue sent {len(lines) - len(left)}')
        except OSError as e: log('flush', e)

    # ---------- recent notes ----------
    def sent(self):
        try: return json.load(open(SENT))
        except (OSError, ValueError): return []

    def remember(self, body, state):  # keep the last 10 sends; a queued one becomes "sent" when the queue goes out
        key = (body.get('text') or '')[:200] + '|' + ','.join(f['name'] for f in body.get('files') or [])
        lst = [e for e in self.sent() if e.get('key') != key]
        old = next((e for e in self.sent() if e.get('key') == key), None)
        lst.insert(0, {'key': key, 'text': (body.get('text') or '')[:400], 'files': [f['name'] for f in body.get('files') or []],
                       'date': (old or {}).get('date') or datetime.now(timezone.utc).isoformat(), 'state': state})
        try:
            os.makedirs(CONF_DIR, exist_ok=True)
            with open(SENT, 'w', encoding='utf-8') as f: json.dump(lst[:10], f, ensure_ascii=False)
            os.chmod(SENT, 0o600)
        except OSError as e: log('sent', e)

    def recent(self, n):  # newest records of the snapshot, with this box's own sends on top until the app has them
        its = sorted(self.items(), key=lambda i: i.get('date') or '', reverse=True)[:n]
        line = lambda x: norm(str(x).strip().split('\n')[0])[:50]  # first line: the app's title can be cut after that
        have = {line(x) for i in self.items()[-400:] for x in (i.get('text'), i.get('title'), i.get('file')) if x}
        mine = []
        for e in self.sent():
            first = line(e['text'] or (e['files'] or [''])[0])
            if first and first not in have:
                mine.append({'id': None, 'type': 'file' if e['files'] and not e['text'] else 'note', 'title': (e['text'].split('\n')[0] or e['files'][0])[:120],
                             'text': ' · '.join(e['files']), 'date': e['date'], 'state': e['state']})
        return (mine + its)[:n]

    # ---------- search ----------
    def items(self):
        f = os.path.join(CONF_DIR, 'snapshot.json')
        try:
            m = os.path.getmtime(f)
            if m != self.snap[0]:
                d = json.load(open(f)); its = d.get('items', [])
                for i in its: i['_h'] = norm(' '.join(str(i.get(k) or '') for k in ('title', 'text', 'url', 'file', 'summary', 'project')) + ' ' + ' '.join(i.get('tags') or []))
                its.sort(key=lambda i: i.get('date') or '')
                self.snap = (m, its); self.app = d.get('app') or APP_URL
        except (OSError, ValueError): pass
        return self.snap[1]

    def match(self, q, n):
        toks = norm(q).split()
        if not toks: return []
        hits = [(i, sum(t in i['_h'] for t in toks)) for i in self.items()]
        hits = [h for h in hits if h[1] == len(toks) or (len(toks) > 2 and h[1] >= len(toks) - 1)]
        hits.sort(key=lambda h: h[0].get('date', ''), reverse=True); hits.sort(key=lambda h: -h[1])  # most words first, newest first
        return [{k: v for k, v in h[0].items() if k != '_h'} for h in hits[:n]]

    def search(self, q): self.buf.set_text(q); self.refresh()  # tests / --shot

    def show_results(self, res, head='', select=False):
        self.results = res; self.list.remove_all()
        for i in res:
            b = Gtk.Box(spacing=10)
            tile = Gtk.Image.new_from_icon_name(TYPE_ICON.get(i.get('type'), 'text-x-generic-symbolic')); tile.add_css_class('ti'); tile.set_valign(Gtk.Align.CENTER)
            col = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=1, hexpand=True, valign=Gtk.Align.CENTER)
            t = Gtk.Label(label=(i.get('title') or '(başlıksız)').replace('\n', ' '), xalign=0, ellipsize=3, max_width_chars=1, hexpand=True); t.add_css_class('rt')
            url = i.get('url') or ''; host = url.split('/')[2].removeprefix('www.') if url.count('/') >= 2 else ''
            body = (i.get('summary') or i.get('text') or '').replace('\n', ' ').strip()
            if body.startswith((i.get('title') or '\0')[:40]): body = body[len(i.get('title') or ''):].strip(' ·—-,;:')
            sub = ' · '.join(x for x in [host, body[:120]] if x)
            col.append(t)
            if sub: s = Gtk.Label(label=sub, xalign=0, ellipsize=3, max_width_chars=1, hexpand=True); s.add_css_class('rs'); col.append(s)
            st = i.get('state'); w = Gtk.Label(label={'queued': 'sırada', 'sent': 'gönderildi'}.get(st) or ago(i.get('date'))); w.add_css_class('rw'); w.set_valign(Gtk.Align.CENTER)
            if st: w.add_css_class('wait'); w.set_tooltip_text('Köprü kapalı: açılınca gider' if st == 'queued' else 'Köprüde; Nts açılınca kayıtlara girer')
            b.append(tile); b.append(col); b.append(w); self.list.append(b)
        if res and select: self.list.select_row(self.list.get_row_at_index(0))
        on = bool(res); self.list.set_visible(on); self.sep.set_visible(on or bool(head)); self.head.set_visible(bool(head)); self.head.set_text(head)

    def open_item(self, i):
        self.items(); url = (getattr(self, 'app', None) or APP_URL) + (('?open=' + i['id']) if i.get('id') else '')
        subprocess.Popen(['xdg-open', url], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); self.hide()

if __name__ == '__main__':
    if '--shot' in sys.argv:  # screenshots/tests: show with given text + mode, never hide on focus loss
        q = Quick(False, shot=True)
        a = sys.argv[sys.argv.index('--shot') + 1:]
        q.set_mode(int(a[0]) if a else 0); q.buf.set_text(a[1] if len(a) > 1 else '')
        if len(a) > 2: GLib.timeout_add(200, lambda: (q.move(int(a[2])), False)[1])
        q.show()
    else: Quick('--show' in sys.argv)
    loop = GLib.MainLoop(); Quick.loop = loop; loop.run()
