export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: false },
  components: [
    { path: '~/components', pathPrefix: false },
  ],
  app: {
    head: {
      htmlAttrs: { lang: 'es' },
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
          media: 'print',
          onload: "this.media='all'",
        },
      ],
    },
  },
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@vueuse/nuxt',
  ],
  css: ['~/assets/css/main.css'],
  nitro: {
    preset: 'vercel',
    // @xenova/transformers usa onnxruntime-node (binarios) y sharp: deben
    // quedar como external para que Nitro no intente bundlearlos.
    externals: {
      inline: [],
      external: ['@xenova/transformers', 'onnxruntime-node', 'sharp'],
    },
  },
  runtimeConfig: {
    githubToken: process.env.APY_GIT || '',
    groqApiKey: process.env.GROQ || '',
    ollamaUrl: process.env.OLLAMA_URL || '',
    ollamaModel: process.env.OLLAMA_MODEL || 'llama3.2',
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    public: {
      supabaseUrl: process.env.VITE_SUPABASE_URL || '',
      supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || '',
    },
  },
})
