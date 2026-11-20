#!/usr/bin/env bash
# Nts PC setup: bridge as a user service, `hn` command, "Send to Nts" in file managers, Tailscale HTTPS for the phone.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
NODE="$(command -v node)"
mkdir -p ~/.local/bin ~/.config/systemd/user ~/.local/share/applications ~/.local/share/kio/servicemenus

ln -sf "$DIR/hn.mjs" ~/.local/bin/hn
ln -sf "$DIR/hn.mjs" ~/.local/bin/nts

cat > ~/.config/systemd/user/hizli-note-bridge.service <<UNIT
[Unit]
Description=Nts Claude bridge
After=network-online.target

[Service]
ExecStart=$NODE $DIR/server.mjs
Restart=on-failure
Environment=PATH=$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin

[Install]
WantedBy=default.target
UNIT
systemctl --user daemon-reload
systemctl --user enable --now hizli-note-bridge.service

# "Open with → Nts'a gönder" in any file manager
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
MimeType=application/octet-stream;text/plain;text/markdown;application/pdf;application/zip;image/jpeg;image/png;image/webp;image/gif;image/heic;video/mp4;video/quicktime;video/webm;audio/mpeg;audio/ogg;audio/mp4;application/msword;application/vnd.openxmlformats-officedocument.wordprocessingml.document;application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;application/vnd.openxmlformats-officedocument.presentationml.presentation;
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

# Phone access over Tailscale (HTTPS, only your own devices)
if command -v tailscale >/dev/null; then tailscale serve --bg --https=8788 http://127.0.0.1:8787 || echo "Tailscale için bir kez: sudo tailscale serve --bg --https=8788 http://127.0.0.1:8787"; tailscale serve status || true; fi

echo
echo "Kuruldu. Token: $(node -p "require('$HOME/.config/hizli-note/bridge.json').token")"
echo "Kısayol için Hyprland binds'e ekle:  bind = SUPER SHIFT, N, exec, hn --clip"
