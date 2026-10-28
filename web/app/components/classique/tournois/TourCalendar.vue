<template>
  <section class="calendar" aria-label="Calendrier des tournois">
    <header class="calendar__head">
      Calendrier · {{ range }}
      <span class="calendar__legend"><span class="dot dot--regular" />Régulier<span class="dot dot--community" />Communauté</span>
    </header>
    <div class="calendar__grid">
      <span v-for="day in WEEKDAYS" :key="day" class="calendar__weekday">{{ day }}</span>
      <div v-for="day in days" :key="day.key" class="day" :class="{ 'day--today': day.today, 'day--past': day.past }">
        <span class="day__number">{{ day.label }}</span>
        <button
          v-for="event in day.events"
          :key="event.id"
          type="button"
          class="event"
          :class="[event.regular ? 'event--regular' : 'event--community', { 'event--on': event.id === selected, 'event--live': event.status === 'open' || event.status === 'started' }]"
          :title="`${event.name} · ${event.formatName}`"
          @click="emit('select', event.id)"
        >
          <b>{{ time(event.startsAt) }}</b> {{ event.name }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ArenaEvent } from '~/utils/tournaments'

const props = defineProps<{ events: ArenaEvent[], selected: string, now: number }>()
const emit = defineEmits<{ select: [id: string] }>()

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const DAY = 24 * 3600 * 1000

const time = (stamp: number) => {
  const date = new Date(stamp)
  return `${date.getHours()}h${String(date.getMinutes()).padStart(2, '0')}`
}

/** Deux semaines à partir du lundi de cette semaine. */
const start = computed(() => {
  const date = new Date(props.now)
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - (date.getDay() + 6) % 7)
  return date.getTime()
})

const days = computed(() => Array.from({ length: 14 }, (_, index) => {
  const date = new Date(start.value)
  date.setDate(date.getDate() + index)
  const from = date.getTime()
  const to = from + DAY
  return {
    key: from,
    label: date.getDate() === 1 ? date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : String(date.getDate()),
    today: props.now >= from && props.now < to,
    past: to <= props.now,
    events: props.events.filter(event => event.startsAt >= from && event.startsAt < to),
  }
}))

const range = computed(() => {
  const first = new Date(start.value)
  const last = new Date(start.value + 13 * DAY)
  const format = (date: Date) => date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  return `${format(first)} – ${format(last)}`
})
</script>

<style scoped>
.calendar { background: var(--pn); border-radius: var(--r); box-shadow: var(--pnS); overflow: hidden; }

.calendar__head {
  min-height: 32px;
  padding: 0 12px;
  background: var(--hd);
  color: var(--hdTx);
  font: 600 15px 'Pixelify Sans', sans-serif;
  text-shadow: var(--hdSh, none);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 12px;
}

.calendar__legend { margin-left: auto; display: flex; align-items: center; gap: 5px; font: 700 11px 'Nunito', sans-serif; text-shadow: none; }
.dot { width: 10px; height: 10px; border-radius: 3px; margin-left: 6px; }
.dot--regular { background: #3d6fc8; }
.dot--community { background: #8a4ac8; }
.calendar__grid { padding: 8px; display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; }
.calendar__weekday { text-align: center; font: 700 11px 'Nunito', sans-serif; color: var(--mu); }
.day { min-height: 74px; padding: 4px; border-radius: 7px; background: var(--in); box-shadow: inset 0 0 0 2px var(--chip); display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.day--today { box-shadow: inset 0 0 0 2px var(--uA); }
.day--past { opacity: .55; }
.day__number { font: 600 13px 'Pixelify Sans', sans-serif; }

.event {
  border: 0;
  cursor: pointer;
  text-align: left;
  padding: 3px 5px;
  border-radius: 4px;
  color: #fff;
  font: 700 10px/1.25 'Nunito', sans-serif;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.event--regular { background: #3d6fc8; }
.event--community { background: #8a4ac8; }
.event--live { box-shadow: inset 0 0 0 2px #58d080; }
.event--on { box-shadow: inset 0 0 0 2px var(--uA); }

@media (max-width: 640px) {
  .calendar__grid { gap: 2px; padding: 4px; }
  .day { min-height: 56px; padding: 2px; }
  .event { font-size: 9px; padding: 2px 3px; }
}
</style>
