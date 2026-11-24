#!/bin/sh
# Open/close the Nts quick box (PLAN 156). Bound in ~/.config/hypr/binds.conf to CTRL+SPACE and SUPER+SHIFT+S (via ~/.local/bin/nts-quick).
# The box waits in the background (`nts-quick --daemon`, exec-once); if it is not running yet a press starts it already open.
DIR=$(dirname "$(readlink -f "$0")")
RUN="${XDG_RUNTIME_DIR:-/tmp}"
PID=$(cat "$RUN/nts-quick.pid" 2>/dev/null)
if [ -p "$RUN/nts-quick.fifo" ] && [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
  [ "$1" = --daemon ] && exit 0
  timeout 1 sh -c 'printf "toggle %s\n" "$(date +%s%N)" > "$1"' _ "$RUN/nts-quick.fifo" && exit 0
  kill "$PID" 2>/dev/null # alive but not reading: start a fresh one
fi
exec python3 "$DIR/nts-quick.py" $([ "$1" = --daemon ] || echo --show) >/dev/null 2>&1
