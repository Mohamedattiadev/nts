#!/usr/bin/env bash
# Two parallel chains (lanes A and B), ONE task per session, to finish faster without long token-heavy sessions.
# Each lane works in its own git worktree (../hizli_note-A, ../hizli_note-B) so the two never mix edits in one tree;
# they meet on origin/main (rebase + push). Claiming a task = pushing "[~A]" in NEXT_SESSION.md (push is the lock).
#   tools/handoff.sh A   → new session for lane A only (a lane session calls this at its end)
#   tools/handoff.sh     → start both lanes (if one is already open, it is not opened twice)
cd "$(dirname "$0")/.." || exit 1
MAIN=$(git worktree list --porcelain | awk 'NR==1{print $2}')
cd "$MAIN" || exit 1
# switch account before the limit if ccx says the active one is nearly used up
if command -v ccx >/dev/null; then ccx status >/dev/null 2>&1 || true; fi

lane() {
  local L=$1 port dir
  port=$([ "$L" = A ] && echo 8791 || echo 8792)
  dir="$(dirname "$MAIN")/hizli_note-$L"
  # a lane session calls "handoff.sh A" from inside its own window, so only the no-argument start checks for an open window
  if [ -z "$ONE" ] && pgrep -f "title nts-$L " >/dev/null; then echo "lane $L already open"; return; fi
  git fetch -q origin
  if [ ! -d "$dir" ]; then git worktree add -q -B "lane-$L" "$dir" origin/main
  elif [ -z "$(git -C "$dir" status --porcelain --untracked-files=no)" ]; then git -C "$dir" checkout -q -B "lane-$L" origin/main
  fi
  kitty --detach -d "$dir" --title "nts-$L" \
    claude --permission-mode auto \
    "Sen Nts'in $L hattısın. Çalışma klasörün $dir (git worktree, dal lane-$L). $dir/NEXT_SESSION.md dosyasını oku, en üstteki 'PARALEL HATLAR' kurallarına göre TEK madde yap (test sunucun: port $port, NTS_URL=http://127.0.0.1:$port/), sonunda tools/handoff.sh $L çalıştır ve dur. Bana Türkçe cevap ver." \
    >/dev/null 2>&1
  echo "lane $L launched in $dir"
}

# The finished session closes itself (owner: "biten session auto kapansın, RAM'den çok kullanmasın"): find the claude
# process that ran this script and end it 60 s later, after it has written its last message; its kitty window closes with it.
close_me() {
  local p=$$ c
  while [ "$p" -gt 1 ]; do
    c=$(ps -o comm= -p "$p" 2>/dev/null)
    if [ "$c" = claude ]; then setsid sh -c "sleep 60; kill -TERM $p 2>/dev/null" >/dev/null 2>&1 < /dev/null & echo "this session closes in 60 s"; return; fi
    p=$(ps -o ppid= -p "$p" 2>/dev/null | tr -d ' '); [ -n "$p" ] || return
  done
}

if [ -n "$1" ]; then ONE=1 lane "$1"; close_me; else lane A; lane B; fi
