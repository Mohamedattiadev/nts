# PLAN 156/156b: the quick box against a fake bridge — Enter saves, bridge down → queue, back → queue sent; search; files;
# the recent list under the box (newest first, own sends on top until the snapshot has them, ↑↓ + Enter opens, relative times).
#   python3 tools/test/quick.test.py      (needs a Wayland/X display for GTK; no window is shown)
import os, sys, json, tempfile, threading, time, importlib.util
from http.server import HTTPServer, BaseHTTPRequestHandler
tmp = tempfile.mkdtemp(); os.environ['NTS_QUICK_CONF'] = tmp
got = []
class H(BaseHTTPRequestHandler):
    def do_POST(self):
        b = json.loads(self.rfile.read(int(self.headers['content-length']))); got.append((self.path, self.headers['authorization'], b))
        self.send_response(200); self.end_headers(); self.wfile.write(b'{"ok":true}')
    def log_message(self, *a): pass
srv = HTTPServer(('127.0.0.1', 0), H); port = srv.server_address[1]
json.dump({'port': port, 'token': 'tok'}, open(os.path.join(tmp, 'bridge.json'), 'w'))
json.dump({'at': 0, 'app': 'http://x/', 'items': [{'id': 'a1', 'type': 'note', 'date': '2026-01-02', 'title': 'Kümes 3 fanı', 'text': 'Mehmet Usta'},
          {'id': 'b2', 'type': 'link', 'date': '2026-03-01', 'title': 'Yem fiyatları', 'url': 'https://ornek.com/yem', 'tags': ['ISPARTA']}]}, open(os.path.join(tmp, 'snapshot.json'), 'w'))
spec = importlib.util.spec_from_file_location('nq', os.path.join(os.path.dirname(__file__), '..', '..', 'bridge', 'quick', 'nts-quick.py')); nq = importlib.util.module_from_spec(spec); spec.loader.exec_module(nq)
from gi.repository import GLib
ok = 0
def check(c, msg):
    global ok
    if not c: print('FAIL', msg); sys.exit(1)
    ok += 1
def spin(cond, s=3):
    end = time.time() + s
    while time.time() < end and not cond(): GLib.MainContext.default().iteration(False); time.sleep(.01)
q = nq.Quick(False, shot=True)
# search: accents/İ folded, both words must hit, newest first
check([i['id'] for i in q.match('kumes', 6)] == ['a1'], 'kumes → a1')
check([i['id'] for i in q.match('isparta', 6)] == ['b2'], 'tag ISPARTA, i/İ folded')
check(q.match('yem mehmet', 6) == [], 'all words must match')
check(len(q.match('', 6)) == 0, 'empty query')
# Tab cycles modes
q.set_mode(0); q.set_mode(q.mode + 1); check(nq.MODES[q.mode][0] == 'find', 'Tab → Ara'); q.set_mode(q.mode + 2); check(q.mode == 0, 'wraps to Not')
# Enter in Not mode → POST /inbox with the token
threading.Thread(target=srv.serve_forever, daemon=True).start()
q.buf.set_text('deneme notu\nikinci satır'); q.submit(); spin(lambda: got)
check(got and got[0][0] == '/inbox' and got[0][1] == 'Bearer tok' and got[0][2]['text'] == 'deneme notu\nikinci satır', 'saved to /inbox')
spin(lambda: q.text() == '', 2); check(q.text() == '', 'box cleared after save')
# a file rides along
f = os.path.join(tmp, 'a.png'); open(f, 'wb').write(b'\x89PNG fake'); q.add_paths([f]); check(len(q.files) == 1 and q.files[0]['mime'] == 'image/png', 'file attached')
got.clear(); q.submit(); spin(lambda: got); check(got[0][2]['files'][0]['name'] == 'a.png' and got[0][2]['text'] == '', 'file sent'); spin(lambda: not q.files and not q.hint.get_text(), 3)
# bridge down → queued, nothing lost; back → flushed
srv.shutdown(); srv.server_close()
q.buf.set_text('köprü kapalıyken'); t0 = time.time(); q.submit(); spin(lambda: 'kapalıyken' in (open(nq.QUEUE).read() if os.path.exists(nq.QUEUE) else ''), 20)
check(os.path.exists(nq.QUEUE) and 'köprü kapalıyken' in open(nq.QUEUE).read(), 'queued while bridge down'); spin(lambda: q.text() == '', 3)  # let the 650 ms close run
srv = HTTPServer(('127.0.0.1', port), H); threading.Thread(target=srv.serve_forever, daemon=True).start(); got.clear()
q.flush(); check(not os.path.exists(nq.QUEUE) and got and got[0][2]['text'] == 'köprü kapalıyken', 'queue sent when bridge is back')
# draft kept on close
q.buf.set_text('yarım kalan'); q.hide(); check(open(nq.DRAFT).read() == 'yarım kalan', 'draft saved on close')
q.buf.set_text(''); q.hide(); check(not os.path.exists(nq.DRAFT), 'empty box → no draft')
# 156b: recent notes under the box
from datetime import datetime, timezone, timedelta
N = datetime(2026, 11, 24, 15, 0, tzinfo=timezone.utc); A = lambda **k: (N - timedelta(**k)).isoformat()
check([nq.ago(A(seconds=20), N), nq.ago(A(minutes=5), N), nq.ago(A(days=1), N), nq.ago(A(days=3), N), nq.ago('2026-11-02T10:00:00Z', N), nq.ago('2024-03-02T10:00:00Z', N)]
      == ['şimdi', '5 dk önce', 'dün', '3 gün önce', '2 Kas', '2 Mar 2024'], 'relative times')
os.remove(nq.SENT) if os.path.exists(nq.SENT) else None
q.buf.set_text(''); q.set_mode(0)
check([i['id'] for i in q.results] == ['b2', 'a1'] and q.head.get_text() == 'SON NOTLAR', 'empty box → last notes, newest first')
check(q.list.get_selected_row() is None, 'nothing picked until ↑↓')
q.remember({'text': 'az önce yazdım\nikinci', 'files': []}, 'queued'); q.refresh()
check(q.results[0]['id'] is None and q.results[0]['title'] == 'az önce yazdım' and q.results[0]['state'] == 'queued', 'own send on top, "sırada"')
q.remember({'text': 'az önce yazdım\nikinci', 'files': []}, 'sent'); check(len(q.sent()) == 1 and q.sent()[0]['state'] == 'sent', 'queued → sent, no duplicate')
snap = json.load(open(os.path.join(tmp, 'snapshot.json'))); snap['items'].append({'id': 'c3', 'type': 'note', 'date': '2026-11-24T10:00:00Z', 'title': 'az önce yazdım', 'text': 'az önce yazdım\nikinci'})
json.dump(snap, open(os.path.join(tmp, 'snapshot.json'), 'w')); os.utime(os.path.join(tmp, 'snapshot.json'), (time.time() + 5, time.time() + 5)); q.refresh()
check([i['id'] for i in q.results] == ['c3', 'b2', 'a1'], 'once the app has it, the real record replaces the local row')
opened = []; nq.subprocess.Popen = lambda a, **k: opened.append(a[1])
q.move(1); q.move(1); check(q.list.get_selected_row().get_index() == 1 and q.picked, '↓↓ picks the 2nd row')
q.move(-1); q.move(-1); check(q.list.get_selected_row() is None and not q.picked, '↑ from the first row gives the text back')
q.move(1); q.submit(); check(opened == ['http://x/?open=c3'], 'Enter on a picked row opens it in Nts')
q.buf.set_text('kümes'); spin(lambda: q.head.get_text() == 'BENZER KAYITLAR', 2); check([i['id'] for i in q.results] == ['a1'], 'typing a note filters the list live ' + str([i['id'] for i in q.results]))
got.clear(); q.submit(); spin(lambda: got); check(got and got[0][2]['text'] == 'kümes', 'Enter while typing still saves (no row picked)'); spin(lambda: q.text() == '', 2)
q.set_mode(1); q.buf.set_text('yem'); spin(lambda: q.head.get_text() == '1 SONUÇ', 2); check(q.list.get_selected_row().get_index() == 0, 'Ara: first result picked')
q.buf.set_text('zzzz'); spin(lambda: q.head.get_text() == 'SONUÇ YOK', 2); check(not q.list.get_visible(), 'Ara: no result')
srv.shutdown(); print(f'quick: {ok} ok')
