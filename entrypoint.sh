#!/bin/sh
# Seme le compte admin au tout premier demarrage (si data/admin.json
# n'existe pas encore et qu'un mot de passe a ete fourni), puis lance
# le serveur. Les demarrages suivants ne re-seedent pas (le fichier
# persiste dans le volume monte).
set -e

if [ ! -f /app/data/admin.json ] && [ -n "$ADMIN_PASSWORD" ]; then
  echo "Aucun compte admin trouve : creation initiale..."
  node scripts/create-admin.js
fi

exec node server.js
