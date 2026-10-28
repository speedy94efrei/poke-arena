<template>
  <section class="thread" :aria-label="title">
    <header class="thread__head"><span class="thread__title">{{ title }}</span><span v-if="subtitle" class="thread__sub">{{ subtitle }}</span></header>
    <div ref="scroller" class="thread__lines" aria-live="polite">
      <p v-if="!lines.length" class="thread__empty">{{ empty }}</p>
      <div v-for="line in lines" :key="line.id" class="line" :class="`line--${line.kind}`">
        <template v-if="line.kind === 'chat'">
          <span class="line__avatar" :style="{ background: colorOf(line.user) }">{{ line.user.charAt(0).toUpperCase() }}</span>
          <div class="line__body">
            <span class="line__meta"><b :style="{ color: colorOf(line.user) }">{{ line.user }}</b><time>{{ clock(line.at) }}</time></span>
            <span class="line__text" :class="{ 'line__text--action': action(line.text) }">{{ display(line) }}</span>
          </div>
        </template>
        <span v-else-if="line.kind === 'join'" class="line__info">{{ line.user }} a rejoint le salon</span>
        <span v-else class="line__info">{{ line.text }}</span>
      </div>
    </div>
    <form class="thread__form" @submit.prevent="submit">
      <input v-model="text" class="field thread__input" maxlength="300" :placeholder="placeholder" :aria-label="placeholder" :disabled="disabled">
      <button type="submit" class="btn btn--primary" :disabled="disabled || !text.trim()">Envoyer</button>
    </form>
  </section>
</template>

<script setup lang="ts">
import type { ChatLine } from '~/utils/chatRooms'

const props = defineProps<{ title: string, subtitle?: string, lines: ChatLine[], placeholder: string, empty: string, disabled?: boolean }>()
const emit = defineEmits<{ send: [text: string] }>()

const text = ref('')
const scroller = ref<HTMLElement | null>(null)

const clock = (at: number) => {
  const date = new Date(at)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}
const pad = (value: number) => String(value).padStart(2, '0')
const action = (message: string) => message.startsWith('/me ')

/** Texte affiché : les annonces HTML du serveur deviennent du texte, « /me » une action. */
const display = (line: ChatLine) => {
  if (line.text.startsWith('/raw ') || line.text.startsWith('/html ')) return htmlText(line.text.replace(/^\/(raw|html) /, ''))
  if (action(line.text)) return `${line.user} ${line.text.slice(4)}`
  return line.text
}

/** Couleur stable par pseudo. */
const colorOf = (name: string) => `hsl(${[...toId(name)].reduce((hash, char) => hash * 31 + char.charCodeAt(0), 7) % 360}, 55%, 58%)`

const submit = () => {
  if (!text.value.trim()) return
  emit('send', text.value.trim())
  text.value = ''
}

watch(() => props.lines.length, async () => {
  await nextTick()
  scroller.value?.scrollTo({ top: scroller.value.scrollHeight })
}, { immediate: true })
</script>

<style scoped>
.thread { background: var(--pn); border-radius: var(--r); box-shadow: var(--pnS); overflow: hidden; display: flex; flex-direction: column; min-height: 0; height: 100%; }

.thread__head {
  min-height: 34px;
  padding: 0 12px;
  background: var(--hd);
  color: var(--hdTx);
  display: flex;
  align-items: center;
  gap: 10px;
}

.thread__title { font: 600 15px 'Pixelify Sans', sans-serif; text-shadow: var(--hdSh, none); }
.thread__sub { font: 700 11px 'Nunito', sans-serif; opacity: .85; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.thread__lines { flex: 1; min-height: 0; overflow: auto; padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; }
.thread__empty { margin: auto; font: 700 13px 'Nunito', sans-serif; color: var(--mu); text-align: center; }
.line { display: flex; gap: 8px; align-items: flex-start; }

.line__avatar {
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  color: #111;
  font: 600 14px 'Pixelify Sans', sans-serif;
  display: grid;
  place-items: center;
}

.line__body { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.line__meta { display: flex; gap: 8px; align-items: baseline; font: 700 12px 'Nunito', sans-serif; }
.line__meta time { font-size: 10px; color: var(--mu); }
.line__text { font: 400 13px/1.45 'Nunito', sans-serif; overflow-wrap: anywhere; }
.line__text--action { font-style: italic; color: var(--mu); }
.line__info { font: italic 400 12px/1.4 'Nunito', sans-serif; color: var(--mu); }
.thread__form { display: flex; gap: 6px; padding: 10px 12px; border-top: 2px solid var(--chip); }
.thread__input { flex: 1; }
</style>
