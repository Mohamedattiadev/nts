#!/usr/bin/env bash
# Nts — one-command PC setup:
#   curl -fsSL https://raw.githubusercontent.com/Mohamedattiadev/nts/main/install.sh | bash
#   or, from a clone:  ./install.sh
# Sets up: the Claude bridge (user service), the `nts` command, "Send to Nts" in file managers,
# the Nts MCP server for Claude Code; the phone reaches Claude through your Google sign-in (no Tailscale needed).
set -euo pipefail
say() { printf '\033[1;33m›\033[0m %s\n' "$*"; }
ok() { printf '\033[1;32m✓\033[0m %s\n' "$*"; }
warn() { printf '\033[1;31m!\033[0m %s\n' "$*"; }

# 1. code: use this folder if run from a clone, otherwise clone to ~/.local/share/nts
if [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "$(dirname "${BASH_SOURCE[0]}")/bridge/server.mjs" ]; then
  DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
else
  DIR="$HOME/.local/share/nts"
  if [ -d "$DIR/.git" ]; then say "Güncelleniyor: $DIR"; git -C "$DIR" pull --ff-only -q
  else say "İndiriliyor: $DIR"; git clone -q https://github.com/Mohamedattiadev/nts.git "$DIR"; fi
fi

# 2. needs
command -v node >/dev/null || { warn "Node.js gerekli (20+): https://nodejs.org"; exit 1; }
command -v claude >/dev/null || warn "Claude Code (claude) bulunamadı. Claude özellikleri için kur: https://claude.com/claude-code"

# 3. bridge service, nts/hn command, file manager entries
bash "$DIR/bridge/install.sh" >/dev/null
ok "Köprü servisi çalışıyor (systemctl --user status hizli-note-bridge)"
ok "nts komutu: nts \"not\" · nts dosya.pdf · nts --clip"

# 4. MCP for Claude Code: "geçen hafta ne kaydettim?"
if command -v claude >/dev/null; then
  if claude mcp list 2>/dev/null | grep -q '^nts:'; then ok "Claude Code MCP zaten kayıtlı (nts)"
  else claude mcp add --scope user nts -- node "$DIR/bridge/mcp.mjs" >/dev/null && ok "Claude Code MCP kaydedildi (nts)"; fi
fi

# 5. phone: through Supabase Realtime once you sign in with Google on both (sealed with the bridge key, nothing stored);
#    a Tailscale address is used too when you already have one, but it is not needed
if command -v tailscale >/dev/null && tailscale serve status --json 2>/dev/null | grep -q '127.0.0.1:8787'; then ok "Telefon erişimi: Tailscale + Google hesabı"
else ok "Telefon erişimi: iki cihazda aynı Google hesabıyla gir (Tailscale gerekmez)"; fi

echo
ok "Bitti. Uygulamayı aç: http://localhost:8787  (Google ile gir; telefon aynı hesapla girince Claude kendiliğinden bağlanır)"
