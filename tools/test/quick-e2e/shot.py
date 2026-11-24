# shot.py <theme> <mode> <text> <move> <out.png> [cursor x,y]  — opens the box in-process, grabs it with grim (shadow included), quits
import sys, os, json, subprocess, importlib.util, time
th, mode, text, mv, out = sys.argv[1:6]; cur = sys.argv[6] if len(sys.argv) > 6 else '300 140'
os.environ['NTS_QUICK_THEME'] = th
subprocess.run(['hyprctl', 'dispatch', 'movecursor', *cur.split()], capture_output=True)
spec = importlib.util.spec_from_file_location('nq', os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'bridge', 'quick', 'nts-quick.py')); nq = importlib.util.module_from_spec(spec); spec.loader.exec_module(nq)
from gi.repository import GLib
q = nq.Quick(False, shot=True); q.set_mode(int(mode)); q.buf.set_text(text); q.show()
if mv: GLib.timeout_add(300, lambda: (q.move(int(mv)), False)[1])
def grab():
    c = [c for c in json.loads(subprocess.run(['hyprctl', 'clients', '-j'], capture_output=True, text=True).stdout) if c['pid'] == os.getpid()][0]
    (x, y), (w, h) = c['at'], c['size']; m = 28
    subprocess.run(['grim', '-g', f'{x-m},{y-m} {w+2*m}x{h+2*m}', out]); print(out, c['at'], c['size']); loop.quit()
GLib.timeout_add(1400, grab); loop = GLib.MainLoop(); loop.run()
