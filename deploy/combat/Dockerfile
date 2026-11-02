# Serveur de combat d'Arène (fork de Pokémon Showdown). Construit depuis la racine du dépôt : le serveur lit le roster,
# les régions de la Route des Ligues et les statistiques d'usage dans ../data.
FROM node:22-bookworm-slim

WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY data /app/data
COPY server ./
RUN node build \
	&& mkdir -p /app/deploy \
	&& cp config/config-example.js /app/deploy/config-example.js

COPY deploy/combat/config.js deploy/combat/entrypoint.sh /app/deploy/

EXPOSE 8000
ENTRYPOINT ["sh", "/app/deploy/entrypoint.sh"]
