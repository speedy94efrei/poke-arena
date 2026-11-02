# API d'Arène (Laravel) servie par FrankenPHP. Construite depuis la racine du dépôt ; Caddy, devant, fait le HTTPS.
FROM dunglas/frankenphp:1-php8.4-bookworm

RUN install-php-extensions pdo_sqlite intl zip opcache pcntl bcmath
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY api/composer.json api/composer.lock ./
RUN composer install --no-dev --no-interaction --prefer-dist --no-scripts --no-autoloader

COPY api ./
RUN mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
	&& composer dump-autoload --optimize --no-dev \
	&& php artisan package:discover --ansi

COPY deploy/api/entrypoint.sh /usr/local/bin/arene-api
ENV DB_CONNECTION=sqlite DB_DATABASE=/var/lib/arene/database.sqlite

EXPOSE 80
ENTRYPOINT ["sh", "/usr/local/bin/arene-api"]
CMD ["frankenphp", "php-server", "--listen", ":80", "--root", "public/"]
