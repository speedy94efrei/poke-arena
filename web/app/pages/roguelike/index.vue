<template>
  <ModeSoon
    title="Monte le plus haut possible"
    pitch="Tu pars avec un seul Pokémon, tu recrutes en chemin, et tu perds tout quand ton équipe tombe. Runs de 30 à 45 minutes, au niveau 50, avec le roster PokéDraft de la saison : talents et attaques signatures compris."
    :chips="['PV et statuts conservés d\'un combat à l\'autre', 'K.O. = perdu pour la run', '6 Pokémon maximum, sans doublon', 'Niveau 50 fixe', 'Défi de la semaine : la même seed pour tous']"
    steps-title="Une run"
    :steps="STEPS"
  />
</template>

<script setup lang="ts">
definePageMeta({ layout: 'mode' })
useHead({ title: 'Roguelike' })

const STEPS = [
  { title: 'Départ', text: '3 Pokémon tirés au hasard dans le roster : tu en gardes un, et tu choisis son set.' },
  { title: 'Étages', text: 'Un combat par étage contre une équipe de ta taille. Un boss à thème tous les 5 étages, un gros boss avec une règle spéciale tous les 10.' },
  { title: 'Portes', text: 'Entre deux étages, choisis ton chemin : Centre Pokémon, Boutique, Combat d\'élite, Pension ou Événement mystère.' },
  { title: 'Récompenses', text: 'Après chaque victoire, une récompense parmi trois : recruter un Pokémon battu, un objet, une CT ou des jetons.' },
  { title: 'Fin de run', text: 'La run s\'arrête quand ton équipe tombe. Ton meilleur étage compte, et le défi de la semaine a son classement.' },
]
</script>
