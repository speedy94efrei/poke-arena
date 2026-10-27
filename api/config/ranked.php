<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Appels internes
    |--------------------------------------------------------------------------
    |
    | Secret partagé avec le serveur de combat. Le plugin Showdown l'envoie dans
    | l'en-tête X-Arene-Secret pour vérifier un compte et enregistrer un match.
    |
    */

    'internal_secret' => env('ARENE_INTERNAL_SECRET'),

    'showdown_token_minutes' => 5,

    /*
    |--------------------------------------------------------------------------
    | Rangs
    |--------------------------------------------------------------------------
    |
    | Chaque palier compte 3 divisions de 100 PL (III, II, I). Au-delà du dernier
    | palier, le joueur est Master Ball ; le top des Master Ball est Champion.
    |
    */

    'division_points' => 100,

    'divisions' => ['III', 'II', 'I'],

    'tiers' => [
        'poke' => 'Poké Ball',
        'super' => 'Super Ball',
        'hyper' => 'Hyper Ball',
        'honor' => 'Honor Ball',
        'luxe' => 'Luxe Ball',
    ],

    'master' => 'Master Ball',

    'champion' => 'Champion',

    'champion_slots' => 10,

    'placement_games' => 5,

    'placement_base' => 300,

    'placement_per_win' => 120,

    'win_points' => 20,

    'streak_bonus' => 2,

    'streak_bonus_max' => 6,

    'loss_points' => 18,

    'shield_games' => 3,

    'abandon_points' => 5,

    'abandon_limit' => 3,

    'abandon_window_hours' => 24,

    'abandon_cooldown_minutes' => 15,

    'decay_from_tier' => 'luxe',

    'decay_after_days' => 7,

    'decay_points' => 25,

    /*
    |--------------------------------------------------------------------------
    | Bannières
    |--------------------------------------------------------------------------
    |
    | Une bannière se débloque en atteignant un palier (le meilleur rang de la
    | saison compte). « depart » est offerte à l'inscription, « champion » se
    | gagne en finissant une saison Champion.
    |
    */

    'banners' => [
        'depart' => ['name' => 'Départ', 'condition' => "Offerte à l'inscription"],
        'poke' => ['name' => 'Poké Ball', 'condition' => 'Atteins Poké Ball'],
        'super' => ['name' => 'Super Ball', 'condition' => 'Atteins Super Ball'],
        'hyper' => ['name' => 'Hyper Ball', 'condition' => 'Atteins Hyper Ball'],
        'honor' => ['name' => 'Honor Ball', 'condition' => 'Atteins Honor Ball'],
        'luxe' => ['name' => 'Luxe Ball', 'condition' => 'Atteins Luxe Ball'],
        'master' => ['name' => 'Master Ball', 'condition' => 'Atteins Master Ball'],
        'champion' => ['name' => 'Champion', 'condition' => 'Finis une saison dans le top 10'],
    ],

];
