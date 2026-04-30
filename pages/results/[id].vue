<template>
  <div class="min-h-screen flex flex-col bg-surface-50">
    <AppHeader />

    <main class="flex-1 pt-24 pb-16 px-6">
      <div class="max-w-[1400px] mx-auto space-y-8">

        <div v-if="loading" class="space-y-8">
          <div class="text-center space-y-3 pt-4">
            <div class="flex justify-center">
              <div class="dot-loader flex items-center gap-1">
                <span class="w-3 h-3"></span>
                <span class="w-3 h-3"></span>
                <span class="w-3 h-3"></span>
              </div>
            </div>
            <p class="text-slate-500 font-medium">Analizando tus intereses con IA...</p>
          </div>
          <LoadingCards />
        </div>

        <div v-else-if="error" class="text-center py-20 space-y-4">
          <div class="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto text-2xl">⚠️</div>
          <h2 class="text-xl font-bold text-slate-800">Algo salió mal</h2>
          <p class="text-slate-500 max-w-md mx-auto">{{ error }}</p>
          <NuxtLink to="/" class="btn-primary inline-flex">Intentar de nuevo</NuxtLink>
        </div>

        <template v-else-if="result">
          <div class="animate-fade-up space-y-2" style="animation-delay:0ms">
            <div class="flex items-center gap-3">
              <NuxtLink to="/" class="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors group">
                <svg class="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Nueva búsqueda
              </NuxtLink>
            </div>

            <div class="animate-scale-in bg-white rounded-3xl border border-slate-100 shadow-card p-6 sm:p-8" style="animation-delay:80ms">
              <div class="flex items-start gap-4">
                <div class="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden"
                  style="background: linear-gradient(135deg, #1A73E8 0%, #0891b2 100%)">
                  <!-- Brújula KoraChile -->
                  <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <polygon points="12,5 14,12 12,11" fill="currentColor" stroke="none" />
                    <polygon points="12,19 10,12 12,13" fill="currentColor" fill-opacity="0.5" stroke="none" />
                    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
                  </svg>
                </div>
                <div>
                  <p class="text-sm text-slate-500 font-medium mb-1">Basado en tus intereses</p>
                  <p class="text-slate-700 font-medium italic">"{{ result.query }}"</p>
                  <p class="text-slate-600 text-sm mt-2 leading-relaxed">{{ result.summary }}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-6 min-w-0">
              <div class="animate-fade-up" style="animation-delay:160ms">
                <div class="flex items-center justify-between mb-5">
                  <h2 class="text-xl font-bold text-slate-900 tracking-tight">
                    Tus carreras recomendadas
                  </h2>
                  <span class="tag bg-primary-50 text-primary-700 border border-primary-100 text-xs animate-fade-in" style="animation-delay:300ms">
                    {{ result.variations?.length }} carreras posibles
                  </span>
                </div>

                <div class="grid grid-cols-1 gap-4">
                  <div
                    v-for="(career, index) in result.variations"
                    :key="career.id"
                    :style="{ animationDelay: `${200 + index * 120}ms` }">
                    <CareerCard :career="career" />
                  </div>
                </div>
              </div>

              <div class="text-center pt-2 animate-fade-in flex items-center justify-center gap-3 flex-wrap" style="animation-delay:600ms">
                <NuxtLink
                  to="/"
                  class="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 hover:bg-white active:scale-[0.98] transition-all duration-200">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Explorar otro camino profesional
                </NuxtLink>
              </div>
            </div>
        </template>

      </div>
    </main>

    <template v-if="result && !loading && !error">
      <!-- Boton flotante -->
      <button
        @click="isChatOpen = true"
        class="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-[calc(env(safe-area-inset-right)+1rem)] sm:bottom-6 sm:right-6 z-40 inline-flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold text-white shadow-lg bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-700 hover:to-accent-600 active:scale-[0.98] transition-all duration-200">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        Preguntale a la IA
      </button>

      <!-- Modal de chat -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0">
        <div
          v-if="isChatOpen"
          class="fixed inset-0 z-50 bg-slate-900/30"
          @click.self="isChatOpen = false">
          <div class="absolute inset-0 pt-4 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:p-6 flex items-end justify-end pointer-events-none">
            <Transition
              enter-active-class="transition-all duration-220 ease-out"
              enter-from-class="opacity-0 translate-y-2 scale-[0.96]"
              enter-to-class="opacity-100 translate-y-0 scale-100"
              leave-active-class="transition-all duration-160 ease-in"
              leave-from-class="opacity-100 translate-y-0 scale-100"
              leave-to-class="opacity-0 translate-y-2 scale-[0.96]"
              appear>
              <div v-if="isChatOpen" class="pointer-events-auto w-full max-w-[420px]">
                <ResultsChatPanel mode="modal" @close="isChatOpen = false" />
              </div>
            </Transition>
          </div>
        </div>
      </Transition>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useCareerStore } from '~/stores/career'
import type { DiscoveryResult } from '~/stores/career'
import { useSupabaseClient } from '~/composables/useSupabaseClient'

const route = useRoute()
const store = useCareerStore()
const supabase = useSupabaseClient()

const id = route.params.id as string
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isValidUuid = UUID_RE.test(id)

const loading = ref(false)
const error = ref<string | null>(null)
const isChatOpen = ref(false)
const result = computed<DiscoveryResult | null>(() => store.result)
const onKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') isChatOpen.value = false
}

useHead({
  title: computed(() => result.value ? `KoraChile — ${result.value.query}` : 'KoraChile — Resultados'),
})

onMounted(async () => {
  // If id is not a valid UUID (e.g. "local" when DB save failed), use store data
  if (!isValidUuid) {
    if (!store.result) await navigateTo('/')
    return
  }

  if (store.result && store.sessionId === id) return

  loading.value = true
  error.value = null

  try {
    const { data, error: dbError } = await supabase
      .from('discovery_sessions')
      .select('id, query, result')
      .eq('id', id)
      .maybeSingle()

    if (dbError) throw new Error(dbError.message)
    if (!data) throw new Error('Sesión no encontrada. Es posible que haya expirado.')

    const row = data as { id: string; query: string; result: DiscoveryResult }
    store.setResult(row.result, row.id)
  } catch (err: any) {
    error.value = err.message || 'No se pudieron cargar los resultados.'
  } finally {
    loading.value = false
  }
})

onMounted(() => window.addEventListener('keydown', onKeyDown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown))
</script>
