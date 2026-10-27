/* Généré depuis schemas/roster.schema.json par « npm run types ». Ne pas modifier à la main. */

/**
 * Identifiant Showdown : minuscules et chiffres.
 */
export type Id = string;
export type Texte = string;
export type TypePokemon =
  | "Acier"
  | "Combat"
  | "Dragon"
  | "Eau"
  | "Électrik"
  | "Fée"
  | "Feu"
  | "Glace"
  | "Insecte"
  | "Normal"
  | "Plante"
  | "Poison"
  | "Psy"
  | "Roche"
  | "Sol"
  | "Spectre"
  | "Ténèbres"
  | "Vol";
export type Archetype =
  | "Hyper offense"
  | "Balance"
  | "Stall"
  | "Volt-Turn"
  | "Distorsion"
  | "Pluie"
  | "Soleil"
  | "Sable"
  | "Neige"
  | "Champ Électrifié"
  | "Champ Psychique"
  | "Champ Brumeux"
  | "Champ Herbu";
export type Stat = number;
export type TexteOuNull = string | null;
export type Categorie = "physique" | "spécial" | "statut";
export type Puissance = number | null;
/**
 * En pourcentage. null : l'attaque ne rate jamais.
 */
export type Precision = number | null;
export type Priorite = number;
export type Nature =
  | "Assuré"
  | "Bizarre"
  | "Brave"
  | "Calme"
  | "Discret"
  | "Docile"
  | "Doux"
  | "Foufou"
  | "Gentil"
  | "Hardi"
  | "Jovial"
  | "Lâche"
  | "Malin"
  | "Malpoli"
  | "Mauvais"
  | "Modeste"
  | "Naïf"
  | "Pressé"
  | "Prudent"
  | "Pudique"
  | "Relax"
  | "Rigide"
  | "Sérieux"
  | "Solo"
  | "Timide";
export type Ids = Id[];
export type Attaque = {
  id: Id;
  nom: Texte;
  nomAnglais: TexteOuNull;
  type: TypePokemon;
  categorie: Categorie;
  puissance: Puissance;
  precision: Precision;
  pp: number | null;
  priorite: Priorite;
  contact: boolean | null;
  son: boolean;
  morsure: boolean | null;
  danse: boolean;
  coupsMultiples: boolean;
  effet: Texte;
  origine: "officielle" | "officielle modifiée" | "signature créée";
  /**
   * Identifiant Showdown : minuscules et chiffres.
   */
  signatureDe?: string;
  effetOfficiel?: Texte;
  officiel?: ValeursOfficielles;
};
/**
 * Valeurs officielles remplacées par PokéDraft.
 */
export type ValeursOfficielles = {
  type?: TypePokemon;
  categorie?: Categorie;
  puissance?: Puissance;
  precision?: Precision;
  priorite?: Priorite;
} | null;

/**
 * Roster d'une saison PokéDraft : les fiches des Pokémon et le dictionnaire des attaques. Une valeur null dans une attaque veut dire « à définir ».
 */
export interface Roster {
  $schema?: string;
  saison: number;
  titre: string;
  regles: string;
  /**
   * @minItems 1
   */
  pokemon: Pokemon[];
  /**
   * Dictionnaire des attaques, indexé par identifiant Showdown.
   */
  attaques: {
    [k: string]: Attaque;
  };
}
export interface Pokemon {
  id: Id;
  nom: Texte;
  generation: number;
  /**
   * @minItems 1
   * @maxItems 2
   */
  types: TypePokemon[];
  /**
   * @minItems 1
   */
  roles: Texte[];
  /**
   * @minItems 1
   */
  archetypes: Archetype[];
  tierSmogonFiche: Texte;
  tierShowdownActuel: Texte;
  stats: Stats;
  statsOfficielles: Stats;
  statsOfficiellesNote: TexteOuNull;
  talent: Talent;
  signature: Signature;
  /**
   * Texte de la fiche. La liste exploitable est ajoutsMovepoolIds.
   */
  ajoutsMovepool: string;
  setParDefaut: SetParDefaut;
  faiblesses: Texte;
  /**
   * Texte de la fiche. La liste exploitable est contresIds.
   */
  contres: string;
  conseilDraft: Texte;
  /**
   * Noms des Pokémon que son talent peut piéger, pour les piégeurs.
   */
  piegeables: Texte[] | null;
  /**
   * Ce qui a changé dans la fiche et pourquoi. Affiché avec le badge « Corrigé ».
   */
  correction: string | null;
  sprite: string;
  /**
   * Pokémon du roster qui le contrent.
   */
  contresIds: Id[];
  /**
   * Pokémon du roster qu'il contre (inverse de contresIds).
   */
  ilContre: Id[];
  signatureId: Id;
  ajoutsMovepoolIds: Ids;
  /**
   * Movepool complet : National Dex, ajouts de la fiche et signature.
   *
   * @minItems 1
   */
  movepool: Id[];
}
/**
 * Stats de base et leur total. Dans stats, le total officiel est réparti autrement.
 */
export interface Stats {
  pv: Stat;
  atq: Stat;
  def: Stat;
  atqSpe: Stat;
  defSpe: Stat;
  vit: Stat;
  total: number;
}
export interface Talent {
  /**
   * Identifiant Showdown : minuscules et chiffres.
   */
  id: string;
  nom: Texte;
  origine: Texte;
  aValider: boolean;
  effet: Texte;
  lore: TexteOuNull;
}
/**
 * L'attaque signature telle qu'écrite dans la fiche. Les valeurs de jeu sont dans le dictionnaire des attaques.
 */
export interface Signature {
  nom: Texte;
  origine: Texte;
  aValider: boolean;
  type: TypePokemon;
  categorie: Categorie;
  puissance: Puissance;
  coups: number | null;
  precision: Precision;
  neRateJamais: boolean;
  priorite: Priorite;
  description: Texte;
  lore: TexteOuNull;
}
export interface SetParDefaut {
  objet: Texte;
  objetId: Id;
  nature: Nature;
  natureId: Id;
  /**
   * Noms tels qu'écrits dans la fiche.
   *
   * @minItems 1
   * @maxItems 4
   */
  attaques: Texte[];
  note: TexteOuNull;
  /**
   * @minItems 1
   * @maxItems 4
   */
  attaquesIds: Id[];
  /**
   * Attaques du set que le Pokémon ne peut pas apprendre : à corriger dans la fiche.
   */
  horsMovepool: Id[];
}
