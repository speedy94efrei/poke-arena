'use strict';

/**
 * Configuration de production du serveur de combat : celle de Showdown, avec ce qui change derrière Caddy.
 * L'entrée du conteneur la copie dans config/config.js à chaque démarrage, le reste de config/ étant un volume.
 */
Object.assign(exports, require('/app/deploy/config-example.js'));

exports.port = 8000;
exports.bindaddress = '0.0.0.0';

/** Caddy est devant le serveur, dans le réseau Docker : l'adresse du joueur est celle qu'il transmet. */
exports.proxyip = ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'];
