#!/bin/sh
set -e

# La base SQLite vit dans le volume /var/lib/arene ; elle est créée au premier démarrage, puis mise à jour à chaque déploiement.
mkdir -p "$(dirname "$DB_DATABASE")"
[ -f "$DB_DATABASE" ] || touch "$DB_DATABASE"

if [ "${ARENE_MIGRATE:-1}" = "1" ]; then
	php artisan migrate --force
fi
php artisan config:cache
php artisan route:cache

exec "$@"
