import { fileURLToPath } from 'node:url'

const appManifestShimPath = fileURLToPath(new URL('./server/utils/empty-app-manifest.ts', import.meta.url))

const ML_LIBS = ['@xenova/transformers', 'onnxruntime-node', 'sharp']

export default defineNuxtConfig({
  compatibilityDate: '2025-05-09',
  devtools: { enabled: false },

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

  components: [
    { path: '~/components', pathPrefix: false },
  ],

  vite: {
    optimizeDeps: {
      include: ['lucide-vue-next', '@supabase/supabase-js'],
      exclude: ML_LIBS,
    },
    ssr: { external: ML_LIBS },
    resolve: {
      alias: { '#app-manifest': appManifestShimPath },
    },
  },

  nitro: {
    preset: 'vercel',
    externals: { external: ML_LIBS },
  },

  runtimeConfig: {
    aiEmbeddingsEnabled: process.env.AI_EMBEDDINGS_ENABLED
      ? ['1', 'true', 'yes', 'on'].includes(process.env.AI_EMBEDDINGS_ENABLED.toLowerCase())
      : process.env.NODE_ENV !== 'development',
    githubToken: process.env.API_GIT || process.env.GITHUB_TOKEN || '',
    groqApiKey: process.env.GROQ || process.env.GROQ_API_KEY || '',
    ollamaUrl: process.env.OLLAMA_URL || '',
    ollamaModel: process.env.OLLAMA_MODEL || 'llama3.2',
    aiUsdToClp: Number(process.env.AI_USD_TO_CLP || 950),
    aiMonthlyBudgetClp: Number(process.env.AI_MONTHLY_BUDGET_CLP || 0),
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '',
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
    },
  },
})

