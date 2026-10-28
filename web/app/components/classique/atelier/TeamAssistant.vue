<template>
  <section class="assistant" aria-label="Assistant d'équipe">
    <header class="assistant__head"><span class="assistant__badge">IA</span>Assistant d'équipe</header>
    <div ref="thread" class="thread" aria-live="polite">
      <div v-for="(message, index) in messages" :key="index" class="message" :class="`message--${message.from}`">
        <p class="message__text">{{ message.text }}</p>
        <template v-if="message.team">
          <span class="message__team">
            <span v-for="id in message.team" :key="id" class="message__mon" :title="dex?.pokemon[id]?.nom ?? id" :style="{ backgroundImage: `url(${sprite(id)})` }" />
          </span>
          <button type="button" class="btn btn--primary btn--small" @click="apply(message.team)">Utiliser cette équipe</button>
        </template>
      </div>
    </div>
    <div class="ideas">
      <button v-for="idea in ideas" :key="idea" type="button" class="idea" @click="ask(idea)">{{ idea }}</button>
    </div>
    <form class="ask" @submit.prevent="ask(text)">
      <input v-model="text" class="field ask__input" :placeholder="`Ex. « ${ideas[0]} »`" aria-label="Message à l'assistant">
      <button type="submit" class="btn btn--primary" :disabled="!text.trim()">Envoyer</button>
    </form>
  </section>
</template>

<script setup lang="ts">
import type { UsageData } from '~/utils/usage'

interface Message {
  from: 'bot' | 'me'
  text: string
  team?: string[]
}

const props = defineProps<{ usage: UsageData | null, formatName: string, hasPokemon: boolean }>()
const emit = defineEmits<{ apply: [team: string[]] }>()
const { dex, sprite } = usePokedex()

const text = ref('')
const thread = ref<HTMLElement | null>(null)
const messages = ref<Message[]>([{
  from: 'bot',
  text: "Salut ! Dis-moi un Pokémon avec lequel tu veux jouer, ou un style (pluie, stall, offensif…) : je te propose une équipe complète d'après les statistiques Smogon du format.",
}])

const name = (index: number, fallback: string) => {
  const id = props.usage?.pokemon[index]?.id
  return (id && dex.value?.pokemon[id]?.nom) || fallback
}

const ideas = computed(() => [
  `Je veux jouer avec ${name(0, 'Dracolosse')}`,
  'Une équipe pluie agressive',
  `Construis autour de ${name(3, 'Scalpereur')}`,
  'Plutôt défensive',
])

const ask = async (question: string) => {
  if (!question.trim()) return
  const reply = assistantReply(question, props.usage, dex.value, props.formatName)
  messages.value.push({ from: 'me', text: question.trim() }, { from: 'bot', ...reply })
  text.value = ''
  await nextTick()
  thread.value?.scrollTo({ top: thread.value.scrollHeight, behavior: 'smooth' })
}

const apply = (team: string[]) => {
  emit('apply', team)
  messages.value.push({ from: 'bot', text: props.hasPokemon ? "C'est fait : l'équipe ouverte est remplacée, avec le set le plus joué de chaque Pokémon. Ajuste ce que tu veux." : "C'est fait : chaque Pokémon a son set le plus joué. Ajuste ce que tu veux." })
}

defineExpose({ ask })
</script>

<style scoped>
.assistant { background: var(--pn); border-radius: var(--r); box-shadow: var(--pnS); overflow: hidden; display: flex; flex-direction: column; }

.assistant__head {
  min-height: 34px;
  padding: 0 12px;
  background: var(--hd);
  color: var(--hdTx);
  font: 600 15px 'Pixelify Sans', sans-serif;
  text-shadow: var(--hdSh, none);
  display: flex;
  align-items: center;
  gap: 8px;
}

.assistant__badge {
  height: 20px;
  padding: 0 5px;
  border-radius: 4px;
  background: var(--uA);
  color: var(--uAtx);
  text-shadow: none;
  font: 700 11px 'Atkinson Hyperlegible', sans-serif;
  display: flex;
  align-items: center;
}

.thread { height: 280px; overflow: auto; padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; }
.message { max-width: 92%; padding: 8px 10px; border-radius: 9px; display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
.message--bot { align-self: flex-start; background: var(--in); box-shadow: inset 0 0 0 2px var(--chip); }
.message--me { align-self: flex-end; background: var(--hd); color: var(--hdTx); }
.message__text { margin: 0; font: 700 13px/1.45 'Atkinson Hyperlegible', sans-serif; }
.message__team { display: flex; gap: 1px; flex-wrap: wrap; }
.message__mon { width: 36px; height: 30px; background: center / 36px no-repeat; image-rendering: pixelated; }
.ideas { display: flex; flex-wrap: wrap; gap: 5px; padding: 0 12px; }

.idea {
  border: 0;
  cursor: pointer;
  height: 26px;
  padding: 0 9px;
  border-radius: 13px;
  background: var(--chip);
  color: var(--tx);
  font: 700 11px 'Atkinson Hyperlegible', sans-serif;
}

.ask { display: flex; gap: 6px; padding: 10px 12px 12px; }
.ask__input { flex: 1; }
</style>
