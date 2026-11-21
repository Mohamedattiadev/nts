#!/usr/bin/env bash
# Opens a fresh Claude Code session in a new kitty window that continues from NEXT_SESSION.md (saves tokens vs. one long session).
cd "$(dirname "$0")/.." || exit 1
# switch account before the limit if ccx says the active one is nearly used up
if command -v ccx >/dev/null; then ccx status >/dev/null 2>&1 || true; fi
kitty --detach -d "$PWD" --title "nts (next)" \
  claude --permission-mode auto \
  "$PWD/NEXT_SESSION.md dosyasını oku ve aynen uygula. Bana Türkçe cevap ver." \
  >/dev/null 2>&1
echo "new session launched"
