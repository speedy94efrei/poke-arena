#!/bin/sh
set -e

# config/ est un volume : salons, ladders, sauvegardes du Roguelike et de la Route des Ligues y survivent aux mises à
# jour. La configuration de production, elle, vient de l'image à chaque démarrage.
cp /app/deploy/config.js /app/server/config/config.js
mkdir -p /app/server/logs/chat /app/server/logs/modlog /app/server/logs/repl

# Pas encore de serveur de connexion : n'importe quel pseudo libre est accepté (voir « Déployer » dans le README).
exec node pokemon-showdown start --no-security 8000
