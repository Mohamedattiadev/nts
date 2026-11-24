# quick-box side of the 156b end-to-end: e2eq.py <phase> — real Quick code, temp CONF (NTS_QUICK_CONF)
import sys, os, json, importlib.util, time
spec = importlib.util.spec_from_file_location('nq', os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'bridge', 'quick', 'nts-quick.py')); nq = importlib.util.module_from_spec(spec); spec.loader.exec_module(nq)
from gi.repository import GLib
def spin(cond, s=20):
    end = time.time() + s
    while time.time() < end and not cond(): GLib.MainContext.default().iteration(False); time.sleep(.01)
    return cond()
q = nq.Quick(False, shot=True); ph = sys.argv[1]; TEXT = sys.argv[2]
if ph == 'down':  # Enter with the bridge off → local queue, the row says "sırada"
    q.buf.set_text(TEXT); q.submit(); ok = spin(lambda: os.path.exists(nq.QUEUE) and os.path.exists(nq.SENT))
    q.buf.set_text(''); q.refresh(); top = q.results[0]  # as on the next open
    print('queued:', ok, '| top row:', top['title'], '·', top.get('state'))
elif ph == 'flush':  # bridge back → the queue goes out (the box does this on every open and every 30 s)
    q.flush(); q.refresh(); top = q.results[0]
    print('queue empty:', not os.path.exists(nq.QUEUE), '| top row:', top['title'], '·', top['state'])
elif ph == 'after':  # the app pulled it and wrote the snapshot → the row is the real record and opens it
    q.refresh(); top = q.results[0]; opened = []; nq.subprocess.Popen = lambda a, **k: opened.append(a[1])
    q.move(1); q.submit(); print('top row:', top['title'], '· id', top['id'], '| opens', opened)
