#!/usr/bin/env bash
# Nts PC setup: bridge as a user service, `hn` command, "Send to Nts" in file managers, the phone through Supabase (Google sign-in).
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
# run from a lane worktree (../hizli_note-A/B) it must still point at the MAIN folder: lanes are reset to main and would break the links (156b)
MAIN="$(git -C "$DIR" worktree list --porcelain 2>/dev/null | awk 'NR==1{print $2}')"
[ -n "$MAIN" ] && [ -d "$MAIN/bridge" ] && DIR="$MAIN/bridge"
NODE="$(command -v node)"
mkdir -p ~/.local/bin ~/.config/systemd/user ~/.local/share/applications ~/.local/share/kio/servicemenus

ln -sf "$DIR/hn.mjs" ~/.local/bin/hn
ln -sf "$DIR/hn.mjs" ~/.local/bin/nts
ln -sf "$DIR/quick/nts-quick.sh" ~/.local/bin/nts-quick # 156: quick box at the mouse (GTK4, python-gobject)

cat > ~/.config/systemd/user/hizli-note-bridge.service <<UNIT
[Unit]
Description=Nts Claude bridge
After=network-online.target

[Service]
ExecStart=$NODE $DIR/server.mjs
Restart=always
RestartSec=3
Environment=PATH=$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin

[Install]
WantedBy=default.target
UNIT
systemctl --user daemon-reload
systemctl --user enable --now hizli-note-bridge.service

# "Nts'a gönder" in the app launcher (no file types: it must never become the default app for a file)
cat > ~/.local/share/applications/hizli-note-send.desktop <<APP
[Desktop Entry]
Type=Application
Name=Nts'a gönder
Comment=Dosyayı ya da metni Nts'a gönder
Exec=$HOME/.local/bin/hn %F
Icon=document-send
Terminal=false
NoDisplay=false
Categories=Utility;
# no MimeType: listing file types here made Nts the default app for PDFs, images, videos and text (double click sent them to Nts).
# Sending is the right-click "Nts'a gönder" below (Dolphin) and `hn <file>` / `nts` from a terminal.
APP
# Dolphin right-click menu
cat > ~/.local/share/kio/servicemenus/hizli-note.desktop <<SVC
[Desktop Entry]
Type=Service
MimeType=all/allfiles;
Actions=send
X-KDE-Priority=TopLevel

[Desktop Action send]
Name=Nts'a gönder
Icon=document-send
Exec=$HOME/.local/bin/hn %F
SVC
chmod +x ~/.local/share/kio/servicemenus/hizli-note.desktop
update-desktop-database ~/.local/share/applications 2>/dev/null || true

# 156/156b: Hyprland rules for the quick box; an older copy (from "# Nts quick box" to its last nts-quick line) is replaced
R=~/.config/hypr/rules.conf
if [ -f "$R" ]; then
  python3 - "$R" "$DIR/quick/hypr.conf" <<'PY'
import sys
r, new = sys.argv[1], open(sys.argv[2]).read()
L = open(r).read().split('\n')
s = next((k for k, l in enumerate(L) if l.startswith('# Nts quick box')), None)
if s is not None:
    e = max(k for k, l in enumerate(L) if 'nts-quick' in l)
    L = L[:s] + L[e + 1:]
open(r, 'w').write('\n'.join(L).rstrip('\n') + '\n\n' + new)
PY
fi
echo "Köprü kuruldu. Kısayol için Hyprland binds'e ekle:  bind = SUPER SHIFT, N, exec, nts --clip"
echo "Hızlı kutu:  bind = , F7, exec, ~/.local/bin/nts-quick   ve autostart'a  exec-once = ~/.local/bin/nts-quick --daemon"
