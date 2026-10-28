<template>
  <ModeSoon
    title="De Kanto à Paldea"
    pitch="Affronte les 8 Champions, le Conseil 4 et le Maître de chaque région, avec des équipes refaites en vrais sets. Ton banc est tiré au hasard dans le Pokédex régional, monte de niveau et évolue au fil des badges. Une défaite fait recommencer la région avec un nouveau tirage."
    :chips="['12 Pokémon tirés, 6 gardés', 'Niveau fixé par badge', 'Évolutions au fil des badges', 'La mécanique de chaque région', 'Chaque région terminée est acquise']"
    steps-title="Une région"
    :steps="STEPS"
  >
    <section class="regions" aria-label="Régions">
      <h2 class="regions__title">Les régions</h2>
      <ol class="regions__list">
        <li v-for="(region, index) in REGIONS" :key="region.name" class="region">
          <span class="region__head"><span class="region__num">{{ String(index + 1).padStart(2, '0') }}</span>{{ region.name }}</span>
          <span class="region__mechanic">{{ region.mechanic }}</span>
        </li>
      </ol>
      <p class="regions__note">Kanto et Johto d'abord, puis une ou deux régions par saison.</p>
    </section>
  </ModeSoon>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'mode' })
useHead({ title: 'Route des Ligues' })

const STEPS = [
  { title: 'Tirage du banc', text: '12 Pokémon de la région à leur premier stade, dont au moins un starter. Tu en gardes 6 pour toute la région.' },
  { title: 'Les arènes', text: 'Les 8 Champions dans l\'ordre officiel. Chaque badge donne un niveau, une récompense et des évolutions.' },
  { title: 'Boutique', text: 'Potions, Rappels, objets tenus et CT avec les Pokédollars gagnés, et deux échanges à l\'aveugle par région.' },
  { title: 'La Ligue', text: 'Le Conseil 4 à la suite, sans soin entre deux combats, puis le Maître. La région est alors validée pour de bon.' },
]
const REGIONS = [
  { name: 'Kanto', mechanic: 'Aucune mécanique : la région tutoriel' },
  { name: 'Johto', mechanic: 'Objets tenus, types Ténèbres et Acier' },
  { name: 'Hoenn', mechanic: 'Météo et talents, un combat en double' },
  { name: 'Sinnoh', mechanic: 'Pièges, séparation physique et spécial' },
  { name: 'Unys', mechanic: 'Talents cachés, un combat triple' },
  { name: 'Kalos', mechanic: 'Méga-Évolution, type Fée' },
  { name: 'Alola', mechanic: 'Capacités Z, épreuves et Doyens' },
  { name: 'Galar', mechanic: 'Dynamax' },
  { name: 'Paldea', mechanic: 'Téracristal' },
]
</script>

<style scoped>
.regions { padding: 14px 16px; border-radius: var(--r); background: var(--pn); box-shadow: var(--pnS); display: flex; flex-direction: column; gap: 10px; }
.regions__title { margin: 0; font: 600 20px 'Pixelify Sans', sans-serif; text-shadow: var(--sh); }
.regions__list { margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)); gap: 8px; }
.region { padding: 10px 12px; border-radius: 10px; background: var(--in); box-shadow: inset 0 0 0 2px var(--chip); display: flex; flex-direction: column; gap: 3px; }
.region:first-child { box-shadow: inset 0 0 0 2px #4cc46a; }
.region__head { display: flex; align-items: baseline; gap: 8px; font: 600 18px 'Pixelify Sans', sans-serif; }
.region__num { font: 700 12px 'Nunito', sans-serif; color: var(--mu); }
.region__mechanic { font: 700 12px/1.4 'Nunito', sans-serif; color: var(--mu); }
.regions__note { margin: 0; font: 700 13px 'Nunito', sans-serif; color: var(--mu); }
</style>
