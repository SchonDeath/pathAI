import { fileURLToPath } from 'node:url'

const appManifestShimPath = fileURLToPath(new URL('./server/utils/empty-app-manifest.ts', import.meta.url))

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
  tailwindcss: {
    cssPath: '~/assets/css/main.css',
  },
  vite: {
    optimizeDeps: {
      // Evita que Vite prebundlee librerias pesadas de ML en `nuxt dev`.
      // En Windows esto puede disparar loops de resolucion/memoria y OOM.
      exclude: ['@xenova/transformers', 'onnxruntime-node', 'sharp'],
    },
    ssr: {
      // Mantenerlas externas tambien en SSR evita que vite-node intente
      // analizarlas/transpilarlas durante el dev server.
      external: ['@xenova/transformers', 'onnxruntime-node', 'sharp'],
    },
    resolve: {
      alias: {
        '#app-manifest': appManifestShimPath,
      },
    },
  },
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
    aiEmbeddingsEnabled: process.env.AI_EMBEDDINGS_ENABLED
      ? ['1', 'true', 'yes', 'on'].includes(process.env.AI_EMBEDDINGS_ENABLED.toLowerCase())
      : process.env.NODE_ENV !== 'development',
    githubToken: process.env.APY_GIT || process.env.API_GIT || process.env.GITHUB_TOKEN || '',
    groqApiKey: process.env.GROQ || process.env.GROQ_API_KEY || '',
    ollamaUrl: process.env.OLLAMA_URL || '',
    ollamaModel: process.env.OLLAMA_MODEL || 'llama3.2',
    aiUsdToClp: Number(process.env.AI_USD_TO_CLP || 950),
    aiMonthlyBudgetClp: Number(process.env.AI_MONTHLY_BUDGET_CLP || 0),
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '',
    public: {
      supabaseUrl: process.env.VITE_SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
      supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
    },
  },
})
