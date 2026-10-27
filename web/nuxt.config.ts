import { fileURLToPath } from 'node:url'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,
  css: ['~/assets/css/theme.css'],
  app: {
    head: {
      title: 'Arène',
      htmlAttrs: { lang: 'fr' },
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400;500;600;700&family=Atkinson+Hyperlegible:wght@400;700&display=swap',
        },
      ],
    },
  },
  runtimeConfig: {
    public: {
      showdownUrl: 'ws://localhost:8100/showdown/websocket',
      apiUrl: 'http://localhost:8088/api',
    },
  },
  alias: {
    '#data': fileURLToPath(new URL('../data', import.meta.url)),
  },
})
