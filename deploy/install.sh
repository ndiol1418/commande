#!/usr/bin/env bash
#
# Daaru Minam Cafe — installation complète sur un VPS Ubuntu 22.04 / 24.04
#
#   bash install.sh
#
# Le script demande la clé Resend et l'adresse e-mail si elles ne sont pas
# déjà dans l'environnement. Il peut être relancé sans danger : il met alors
# simplement le site à jour.
#
set -euo pipefail

DOMAINE="${DOMAINE:-daaruminamcafe.com}"
DEPOT="${DEPOT:-https://github.com/ndiol1418/commande.git}"
BRANCHE="${BRANCHE:-claude/site-boutique-motion-design-qdtr3t}"
APP=/opt/daaruminam
WEB=/var/www/daaruminam
UTILISATEUR=daaru

bleu()  { printf '\n\033[1;34m▸ %s\033[0m\n' "$*"; }
vert()  { printf '\033[0;32m  ✓ %s\033[0m\n' "$*"; }
rouge() { printf '\033[0;31m  ✗ %s\033[0m\n' "$*" >&2; }

[ "$(id -u)" -eq 0 ] || { rouge "Lancez ce script en root."; exit 1; }

# ---------------------------------------------------------------- secrets ---
if [ -z "${RESEND_API_KEY:-}" ]; then
  read -rsp "Clé API Resend (re_...) : " RESEND_API_KEY; echo
fi
if [ -z "${OWNER_EMAIL:-}" ]; then
  read -rp  "Adresse e-mail qui reçoit les commandes : " OWNER_EMAIL
fi
MAIL_FROM="${MAIL_FROM:-Daaru Minam Cafe <commandes@${DOMAINE}>}"
EXPORT_TOKEN="${EXPORT_TOKEN:-$(head -c 18 /dev/urandom | base64 | tr -d '/+=' )}"
[ -n "$RESEND_API_KEY" ] || { rouge "Clé Resend vide."; exit 1; }
[ -n "$OWNER_EMAIL" ]    || { rouge "Adresse e-mail vide."; exit 1; }

# ---------------------------------------------------------------- paquets ---
bleu "Installation des paquets"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq git curl rsync nginx certbot python3-certbot-nginx ufw >/dev/null
if ! command -v node >/dev/null || [ "$(node -v | cut -c2-3)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
vert "nginx $(nginx -v 2>&1 | grep -o '[0-9.]*') · node $(node -v)"

# ------------------------------------------------------------- utilisateur --
id -u "$UTILISATEUR" >/dev/null 2>&1 || useradd --system --home "$APP" --shell /usr/sbin/nologin "$UTILISATEUR"

# ------------------------------------------------------------------ code ----
bleu "Récupération du code"
if [ -d "$APP/.git" ]; then
  git -C "$APP" remote set-url origin "$DEPOT"
  git -C "$APP" fetch --depth 1 origin "$BRANCHE"
  git -C "$APP" checkout -B deploiement "origin/$BRANCHE"
else
  rm -rf "$APP"
  git clone --depth 1 --branch "$BRANCHE" "$DEPOT" "$APP"
fi
vert "$(git -C "$APP" log -1 --format='%h %s' | cut -c1-70)"

bleu "Dépendances du serveur"
cd "$APP/server"
npm ci --omit=dev --no-audit --no-fund >/dev/null 2>&1 || npm install --omit=dev --no-audit --no-fund >/dev/null
vert "paquets npm installés"

# ----------------------------------------------------------------- config ---
if [ -f "$APP/server/.env" ]; then
  vert ".env déjà présent, on le conserve"
else
  cat > "$APP/server/.env" <<ENVEOF
RESEND_API_KEY=$RESEND_API_KEY
OWNER_EMAIL=$OWNER_EMAIL
MAIL_FROM=$MAIL_FROM
MAIL_REPLY_TO=$OWNER_EMAIL
PORT=8787
EXPORT_TOKEN=$EXPORT_TOKEN
WHATSAPP=221775368231
ENVEOF
  vert ".env créé"
fi
mkdir -p "$APP/server/data"
chown -R "$UTILISATEUR:$UTILISATEUR" "$APP"
chmod 600 "$APP/server/.env"

# -------------------------------------------------------------- site web ----
bleu "Mise en ligne des fichiers du site"
mkdir -p "$WEB"
rsync -a --delete \
  --exclude 'server' --exclude 'deploy' --exclude '.git' --exclude 'apps-script' \
  --exclude 'README.md' --exclude '.gitignore' \
  "$APP/" "$WEB/"
chown -R www-data:www-data "$WEB"
vert "$(find "$WEB" -type f | wc -l) fichiers publiés dans $WEB"

# ---------------------------------------------------------------- service ---
bleu "Service de l'API"
install -m 644 "$APP/deploy/daaru-api.service" /etc/systemd/system/daaru-api.service
systemctl daemon-reload
systemctl enable --now daaru-api >/dev/null
sleep 2
systemctl is-active --quiet daaru-api && vert "daaru-api actif" || { rouge "daaru-api ne démarre pas :"; journalctl -u daaru-api -n 30 --no-pager; exit 1; }

# ------------------------------------------------------------------ nginx ---
bleu "Nginx"
sed "s/daaruminamcafe\.com/$DOMAINE/g" "$APP/deploy/nginx.conf" > /etc/nginx/sites-available/daaruminam
ln -sf /etc/nginx/sites-available/daaruminam /etc/nginx/sites-enabled/daaruminam
rm -f /etc/nginx/sites-enabled/default
nginx -t >/dev/null 2>&1 && systemctl reload nginx && vert "nginx rechargé" || { rouge "configuration nginx invalide"; nginx -t; exit 1; }

# ------------------------------------------------------------------- pare-feu
ufw allow 'Nginx Full' >/dev/null 2>&1 || true
ufw allow OpenSSH      >/dev/null 2>&1 || true

# ---------------------------------------------------------------- contrôles --
bleu "Vérifications"
SANTE=$(curl -fsS http://127.0.0.1:8787/api/sante || echo '{}')
echo "  API  : $SANTE"
IP_SERVEUR=$(curl -fsS -4 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')
IP_DNS=$(getent ahostsv4 "$DOMAINE" | awk 'NR==1{print $1}')
echo "  IP du serveur : ${IP_SERVEUR:-inconnue}"
echo "  IP du domaine : ${IP_DNS:-non résolu}"

# ------------------------------------------------------------------ Resend ---
bleu "Domaine d'envoi Resend"
RESEND_API_KEY="$RESEND_API_KEY" node "$APP/deploy/resend-domaine.mjs" "$DOMAINE" || \
  rouge "Vérification Resend impossible — relancez : RESEND_API_KEY=... node $APP/deploy/resend-domaine.mjs $DOMAINE"

# --------------------------------------------------------------------- TLS ---
if [ -n "${IP_DNS:-}" ] && [ "$IP_DNS" = "$IP_SERVEUR" ]; then
  bleu "Certificat HTTPS"
  certbot --nginx -d "$DOMAINE" -d "www.$DOMAINE" \
    --non-interactive --agree-tos -m "$OWNER_EMAIL" --redirect || \
    rouge "certbot a échoué — relancez : certbot --nginx -d $DOMAINE -d www.$DOMAINE"
else
  rouge "Le domaine ne pointe pas encore sur ce serveur : HTTPS reporté."
  echo  "   Chez votre registrar, créez deux enregistrements A :"
  echo  "       $DOMAINE       →  ${IP_SERVEUR:-<IP du VPS>}"
  echo  "       www.$DOMAINE   →  ${IP_SERVEUR:-<IP du VPS>}"
  echo  "   puis relancez :  certbot --nginx -d $DOMAINE -d www.$DOMAINE --redirect"
fi

printf '\n\033[1;32m═══ Installation terminée ═══\033[0m\n'
echo "  Site        : http://$DOMAINE"
echo "  Fichier xlsx: http://$DOMAINE/api/export?cle=$EXPORT_TOKEN"
echo "  Journal     : journalctl -u daaru-api -f"
echo "  Mise à jour : bash $APP/deploy/update.sh"
printf '\n  \033[1;33mGardez ce jeton d export : %s\033[0m\n\n' "$EXPORT_TOKEN"
