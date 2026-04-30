<template>
  <div class="min-h-screen flex flex-col">
    <DiscoveringModal :visible="store.isLoading" />
    <AppHeader />

    <main class="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pt-24 pb-16 overflow-hidden">
      <!-- Botón volver -->
      <div class="w-full max-w-3xl mx-auto mb-6">
        <NuxtLink to="/" class="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
          Volver al inicio
        </NuxtLink>
      </div>
      <div class="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full opacity-20 blur-2xl"
          style="background: radial-gradient(ellipse at center, #bfdbfe 0%, #a5f3fc 50%, transparent 70%)"></div>
      </div>

      <div class="w-full max-w-3xl mx-auto text-center space-y-6">
        <div class="space-y-3">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 border border-primary-100 text-primary-700 text-xs font-semibold uppercase tracking-wider">
            Orientación vocacional con IA
          </span>
          <h1 class="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Descubre tu
            <span class="gradient-text"> carrera perfecta</span>
          </h1>
          <p class="text-base sm:text-lg text-slate-500 max-w-xl mx-auto leading-relaxed">
            Cuéntanos sobre tus intereses y pasiones. La IA analizará tu perfil y te recomendará las carreras que más encajan contigo en Chile.
          </p>
        </div>

        <div v-if="!showQuiz" class="space-y-4">
          <SearchBar
            :loading="store.isLoading"
            :error="store.error"
            @submit="handleDiscover" />
          <div class="text-center">
            <button
              @click="showQuiz = true"
              class="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors">
              ¿Prefieres responder un quiz? →
            </button>
          </div>
        </div>

        <div v-else class="space-y-4">
          <QuizFlow @complete="handleQuizComplete" />
          <div class="text-center">
            <button
              @click="showQuiz = false"
              class="text-sm text-slate-600 hover:text-slate-700 font-medium transition-colors">
              ← Volver a búsqueda libre
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useCareerStore } from '~/stores/career'

useHead({
  title: 'Descubrir carrera · KoraChile',
  meta: [
    { name: 'description', content: 'Describe tus intereses y obtén recomendaciones de carrera personalizadas para el mercado chileno, con roadmap, sueldos reales y más.' }
  ]
})

const router = useRouter()
const store = useCareerStore()

const SearchBar = defineAsyncComponent(() => import('~/components/discovery/SearchBar.vue'))
const QuizFlow = defineAsyncComponent(() => import('~/components/discovery/QuizFlow.vue'))
const DiscoveringModal = defineAsyncComponent(() => import('~/components/discovery/DiscoveringModal.vue'))

const showQuiz = ref(false)

async function handleDiscover(query: string) {
  const cached = store.getFromCache(query)
  if (cached) {
    store.setResult(cached.result, cached.sessionId)
    await router.push(`/results/${cached.sessionId}`)
    return
  }

  store.setLoading(true)
  store.setError(null)

  try {
    const data = await $fetch<{ sessionId: string; result: any }>('/api/discover', {
      method: 'POST',
      body: { query },
    })
    store.setResult(data.result, data.sessionId)
    await router.push(`/results/${data.sessionId ?? 'local'}`)
  } catch (err: any) {
    const message = err?.data?.message || err?.message || 'Algo salió mal. Por favor intenta de nuevo.'
    store.setError(message)
  } finally {
    store.setLoading(false)
  }
}

function handleQuizComplete(result: {
  answers: Record<string, string>
  riasec_scores: Record<string, number>
  holland_code: string
  holland_profile: string[]
  mbti_type: string
  free_text?: string
}) {
  store.setQuizAnswers(result.answers)

  const topScores = Object.entries(result.riasec_scores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([letter, score]) => `${letter}=${score}`)
    .join(', ')

  const freeBlock = result.free_text
    ? `\n\nAdemás, la persona cuenta sobre sí:\n"${result.free_text}"\n`
    : ''

  const query = `Perfil vocacional detectado mediante quiz RIASEC + MBTI:

- Código Holland (RIASEC): ${result.holland_code} (${result.holland_profile.join(', ')}).
- Puntajes RIASEC: ${topScores} (escala 0-2 por dimensión).
- Tipo MBTI: ${result.mbti_type}.${freeBlock}

En base a este perfil, recomiéndame 3 carreras u oficios que encajen naturalmente con esta combinación de intereses y personalidad. Prioriza opciones realistas y disponibles en Chile. Considera cómo el código Holland ${result.holland_code} y el tipo ${result.mbti_type} se complementan en cada carrera sugerida${result.free_text ? ', e integra los detalles personales que compartió' : ''}.`

  handleDiscover(query)
}
</script>
