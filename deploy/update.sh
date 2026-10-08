#!/usr/bin/env bash
# Met le site à jour depuis GitHub, sans toucher à .env ni aux commandes déjà reçues.
set -euo pipefail
APP=/opt/daaruminam
WEB=/var/www/daaruminam
BRANCHE="${BRANCHE:-main}"

[ "$(id -u)" -eq 0 ] || { echo "Lancez ce script en root."; exit 1; }

git -C "$APP" fetch --depth 1 origin "$BRANCHE"
git -C "$APP" checkout -B deploiement "origin/$BRANCHE"
cd "$APP/server" && npm ci --omit=dev --no-audit --no-fund >/dev/null 2>&1 || npm install --omit=dev >/dev/null
chown -R daaru:daaru "$APP"; chmod 600 "$APP/server/.env"

rsync -a --delete --exclude 'server' --exclude 'deploy' --exclude '.git' \
  --exclude 'apps-script' --exclude 'README.md' --exclude '.gitignore' "$APP/" "$WEB/"
chown -R www-data:www-data "$WEB"

systemctl restart daaru-api
sleep 2
systemctl is-active --quiet daaru-api && echo "✓ à jour : $(git -C "$APP" log -1 --format='%h %s')" \
  || { echo "✗ l'API ne redémarre pas"; journalctl -u daaru-api -n 20 --no-pager; exit 1; }
