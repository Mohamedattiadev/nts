#!/usr/bin/env bash
# What is left in the NEXT_SESSION.md queue: [x] done, [ ] next, [~] taken by another session, [?] waiting for the owner. -w refreshes every 30 s.
cd "$(dirname "$0")/.." || exit 1
show() { local f=NEXT_SESSION.md; local d=$(grep -c '^- \[x\]' $f) t=$(grep -cE '^- \[(x| |~[AB]?|\?)\]' $f)
  echo "Nts sırası: $d / $t bitti"; grep -E '^- \[(x| |~[AB]?|\?)\]' $f | sed 's/^- \[x\]/  ✓/; s/^- \[ \]/  ·/; s/^- \[~[AB]\?\]/  ~/; s/^- \[?\]/  ?/'; }
if [ "$1" = "-w" ]; then while true; do clear; show; sleep 30; done; else show; fi
