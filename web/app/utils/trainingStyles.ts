/** Styles d'équipe officiels de Smogon proposés à l'entraînement, avec le mot-clé compris par l'assistant d'équipe. */
export type TrainingStyle = 'rain' | 'sun' | 'sand' | 'snow' | 'trickroom' | 'stall' | 'hyperoffense' | 'balance' | 'voltturn'

export interface StyleLesson {
  label: string
  /** Demande envoyée à l'assistant pour construire une équipe du style. */
  request: string
  /** Tags Smogon qui comptent pour ce style dans la répartition du format. */
  tags: string[]
  summary: string
  play: string[]
  face: string[]
}

const LESSONS: Record<TrainingStyle, StyleLesson> = {
  rain: {
    label: 'Pluie', request: 'une équipe pluie', tags: ['rain', 'rainoffense', 'rainstall'],
    summary: 'Un poseur de pluie et des attaquants Eau ou Glissade qui frappent vite et fort.',
    play: [
      'Garde ton poseur de pluie en vie : chaque fois qu\'il revient, la pluie repart pour 5 tours (8 avec la Roche Humide).',
      'Sous la pluie, les attaques Eau gagnent 50 % de puissance, Fatal-Foudre et Vent Violent ne ratent plus.',
      'Attaque pendant que la pluie est là : chaque changement inutile est un tour de pluie perdu.',
      'Demi-Tour sur ton poseur le fait sortir sans danger pour relancer la pluie plus tard.',
    ],
    face: [
      'Affaiblis le poseur tôt : sans lui, l\'équipe perd sa vitesse et sa puissance.',
      'Les Pokémon Plante, Eau/Dragon ou avec Absorbe-Eau encaissent ses attaques Eau.',
      'Une autre météo (soleil, sable) remplace la pluie : pose la tienne après la sienne.',
      'Compte les tours de pluie et garde tes Pokémon fragiles pour la fin de la pluie.',
    ],
  },
  sun: {
    label: 'Soleil', request: 'une équipe soleil', tags: ['sun', 'sunoffense', 'sunstall'],
    summary: 'Un poseur de soleil, des attaquants Feu et des Pokémon Chlorophylle ou Paléosynthèse.',
    play: [
      'Sous le soleil, les attaques Feu gagnent 50 % et les attaques Eau perdent 50 %.',
      'Chlorophylle double la Vitesse, Paléosynthèse s\'active sans Énergie Booster, Lance-Soleil part en un tour.',
      'Protège ton poseur : c\'est lui qui donne la vitesse à toute l\'équipe.',
    ],
    face: [
      'Les Pokémon Eau et Roche tiennent bien les attaques Feu.',
      'Pose la pluie ou le sable pour éteindre le soleil.',
      'Frappe le poseur en priorité et garde un Pokémon rapide pour la fin du soleil.',
    ],
  },
  sand: {
    label: 'Sable', request: 'une équipe sable', tags: ['sand', 'sandoffense', 'sandstall'],
    summary: 'Un poseur de sable, des Pokémon Roche, Sol et Acier et des attaquants Baigne Sable.',
    play: [
      'Le sable retire 1/16 des PV à chaque tour aux Pokémon qui ne sont ni Roche, ni Sol, ni Acier : il use l\'adversaire.',
      'Les Pokémon Roche gagnent 50 % de Défense Spéciale sous le sable.',
      'Baigne Sable double la Vitesse : garde ces attaquants pour quand le sable est posé.',
    ],
    face: [
      'Les attaques Eau, Plante, Combat et Sol touchent la plupart des Pokémon du sable.',
      'Remplace le sable par une autre météo, ou retarde jusqu\'à sa fin pour couper les Baigne Sable.',
      'Les Restes compensent les dégâts du sable sur tes Pokémon.',
    ],
  },
  snow: {
    label: 'Neige', request: 'une équipe neige', tags: ['hail', 'hailoffense', 'hailstall', 'snow'],
    summary: 'Un poseur de neige, des Pokémon Glace bien protégés et le Voile Aurore.',
    play: [
      'Sous la neige, les Pokémon Glace gagnent 50 % de Défense et Blizzard ne rate plus.',
      'Voile Aurore ne se pose que sous la neige : il divise par deux les dégâts reçus pendant 5 tours.',
      'Chasse-Neige double la Vitesse de tes attaquants tant que la neige tombe.',
    ],
    face: [
      'Les attaques Feu, Combat, Roche et Acier font mal aux Pokémon Glace.',
      'Casse le Voile Aurore (Casse-Brique) ou attends ses 5 tours avant de te lancer.',
      'Une autre météo met fin à la neige.',
    ],
  },
  trickroom: {
    label: 'Distorsion', request: 'une équipe Distorsion', tags: ['trickroom', 'trickrain', 'tricksun'],
    summary: 'Des Pokémon lents et puissants qui frappent d\'abord pendant les 5 tours de Distorsion.',
    play: [
      'Distorsion inverse l\'ordre d\'action pendant 5 tours : les plus lents frappent en premier.',
      'Pose-la avec un Pokémon solide, puis envoie tes attaquants lents pour profiter de chaque tour.',
      'Ne la relance pas tant qu\'elle est active : la relancer l\'annule.',
    ],
    face: [
      'Provoc empêche de poser Distorsion ; un KO sur le poseur fait aussi gagner du temps.',
      'Sous Distorsion, change de Pokémon ou utilise Abri pour faire passer les tours.',
      'Les attaques prioritaires (Mach Punch, Aqua-Jet…) passent toujours devant.',
    ],
  },
  stall: {
    label: 'Stall', request: 'une équipe stall défensive', tags: ['stall', 'semistall'],
    summary: 'Des Pokémon très résistants qui usent l\'adversaire avec les statuts, les pièges et les soins.',
    play: [
      'Ton plan : poser Piège de Roc et Toxik, puis te soigner pendant que l\'adversaire s\'use.',
      'Garde Tour Rapide ou Anti-Brume pour retirer les pièges adverses.',
      'Inconscient ignore les boosts de l\'adversaire : c\'est ta réponse aux Pokémon qui se renforcent.',
    ],
    face: [
      'Provoc empêche les soins et les statuts : c\'est l\'arme principale contre le stall.',
      'Les Pokémon qui se boostent (Danse Lames, Plénitude) cassent les murs si tu les lances au bon moment.',
      'Les attaques très puissantes et les Pokémon immunisés au poison (Acier, Poison) tiennent mieux la durée.',
    ],
  },
  hyperoffense: {
    label: 'Hyper offense', request: 'une équipe hyper offensive', tags: ['hyperoffense', 'offense'],
    summary: 'Six attaquants : pièges en début de combat, boosts, et on frappe avant l\'adversaire.',
    play: [
      'Pose Piège de Roc dès le premier tour, puis enchaîne boosts et attaques.',
      'Chaque tour compte : un Pokémon affaibli peut se sacrifier pour faire entrer un attaquant sans danger.',
      'Garde un Pokémon rapide ou un Mouchoir Choix pour finir les adversaires affaiblis.',
    ],
    face: [
      'Garde un Pokémon rapide ou avec des attaques prioritaires pour ne pas te faire balayer.',
      'Intimidation et Feu Follet freinent les attaquants physiques, Ceinture Force assure un coup.',
      'Retire les pièges : sans Piège de Roc, ses attaquants font moins de KO.',
    ],
  },
  balance: {
    label: 'Balance', request: 'une équipe balance', tags: ['balance'],
    summary: 'Un mélange d\'attaquants et de Pokémon solides, avec des pivots pour garder l\'avantage.',
    play: [
      'Alterne : tes Pokémon solides encaissent, tes attaquants profitent des ouvertures.',
      'Les pivots (Demi-Tour, Change Éclair) font entrer le bon Pokémon sans risque.',
      'Garde ton Pokémon qui gagne le combat en vie jusqu\'à ce que ses contres soient tombés.',
    ],
    face: [
      'Mets la pression : une balance n\'aime pas les attaquants qui se boostent sans arrêt.',
      'Les pièges (Piège de Roc, Picots) punissent ses nombreux changements.',
      'Repère son Pokémon clé et garde de quoi y répondre jusqu\'au bout.',
    ],
  },
  voltturn: {
    label: 'Volt-Turn', request: 'une équipe volt-turn', tags: ['voltturn'],
    summary: 'Des pivots Demi-Tour et Change Éclair qui gardent l\'avantage des changements.',
    play: [
      'Demi-Tour et Change Éclair frappent puis font entrer le Pokémon qui contre l\'adversaire.',
      'Piège de Roc rend chaque changement adverse coûteux : pose-le tôt.',
      'Garde au moins un pivot en vie pour continuer à choisir tes duels.',
    ],
    face: [
      'Les Pokémon Sol sont immunisés à Change Éclair ; Casque Brut punit Demi-Tour.',
      'Pose tes pièges : ils l\'empêchent de pivoter gratuitement.',
      'Un Pokémon qui encaisse ses pivots et contre-attaque casse son rythme.',
    ],
  },
}

export const TRAINING_STYLES = Object.keys(LESSONS) as TrainingStyle[]

export function styleLesson(style: TrainingStyle): StyleLesson {
  return LESSONS[style]
}
