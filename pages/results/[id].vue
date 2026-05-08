<template>
  <div class="min-h-screen flex flex-col bg-surface-50">
    <AppHeader />

    <main class="relative flex-1 overflow-hidden pt-24 pb-12 px-4 sm:px-6">
      <div class="pointer-events-none absolute inset-0 -z-10 opacity-70">
        <div class="absolute left-[-8rem] top-8 h-64 w-64 rounded-full bg-emerald-100 blur-3xl"></div>
        <div class="absolute right-[-6rem] top-24 h-72 w-72 rounded-full bg-sky-100 blur-3xl"></div>
        <div class="absolute left-1/3 bottom-0 h-52 w-52 rounded-full bg-amber-100 blur-3xl"></div>
      </div>

      <div class="max-w-[1380px] mx-auto space-y-6">
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

        <div v-else-if="error" class="rounded-[2rem] border border-red-100 bg-white/90 px-6 py-16 text-center shadow-sm backdrop-blur">
          <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50"><TriangleAlert class="w-8 h-8 text-red-500" /></div>
          <h2 class="mt-4 text-xl font-bold text-slate-800">Algo salió mal</h2>
          <p class="mx-auto mt-2 max-w-md text-slate-500">{{ error }}</p>
          <NuxtLink to="/discover" class="btn-primary mt-6 inline-flex">Intentar de nuevo</NuxtLink>
        </div>

        <template v-else-if="result">
          <section class="space-y-6">
            <div class="min-w-0 space-y-6">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <NuxtLink to="/discover" class="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-800 group">
                  <svg class="h-4 w-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  Nueva búsqueda
                </NuxtLink>

                <div class="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                  <span class="rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">{{ result.variations.length }} rutas</span>
                  <span class="rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">Promedio {{ averageMatch }}% match</span>
                </div>
              </div>

              <section class="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/90 shadow-sm backdrop-blur">
                <div class="border-b border-slate-100 px-6 py-5 sm:px-7">
                  <span class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Discover workspace
                  </span>
                  <h1 class="mt-4 max-w-4xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.4rem]">
                    Resultado para “{{ result.query }}”
                  </h1>
                  <p class="mt-4 max-w-3xl text-[15px] leading-7 text-slate-600">
                    {{ result.summary }}
                  </p>
                </div>

                <div class="grid gap-4 px-6 py-5 sm:grid-cols-3 sm:px-7">
                  <div class="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
                    <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Top match</p>
                    <p class="mt-2 text-lg font-semibold text-slate-900">{{ primaryCareer?.title || 'Sin dato' }}</p>
                    <p class="mt-1 text-sm text-slate-500">{{ primaryCareer?.match_score || 0 }}% de afinidad sobre tu perfil.</p>
                  </div>
                  <div class="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
                    <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Cobertura salarial</p>
                    <p class="mt-2 text-lg font-semibold text-slate-900">{{ salaryCoverage }}/{{ result.variations.length }}</p>
                    <p class="mt-1 text-sm text-slate-500">Rutas con ingresos oficiales SIES o MiFuturo.</p>
                  </div>
                  <div class="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
                    <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Señales dominantes</p>
                    <p class="mt-2 text-lg font-semibold text-slate-900">{{ highlightedSkills.slice(0, 2).join(' · ') || 'Exploración vocacional' }}</p>
                    <p class="mt-1 text-sm text-slate-500">Patrones detectados en intereses, habilidades y motivaciones.</p>
                  </div>
                </div>
              </section>

              <section class="rounded-[2rem] border border-slate-100 bg-white px-6 py-6 shadow-card sm:px-7 sm:py-7">
                <div class="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <span class="inline-flex items-center gap-2 rounded-full border border-primary-100 bg-gradient-to-r from-primary-50 to-accent-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-700">
                      Recomendaciones
                    </span>
                    <h2 class="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-[2rem]">Carreras sugeridas para ti</h2>
                  </div>
                  <p class="max-w-md text-sm leading-6 text-slate-500">La misma lectura visual del detalle, pero condensada para que compares las tres rutas antes de abrir cada una.</p>
                </div>

                <div class="mt-6 -mx-2 overflow-x-auto pb-2 lg:overflow-visible">
                  <div class="flex gap-4 px-2 snap-x snap-mandatory lg:flex-wrap lg:justify-center lg:gap-5 lg:px-0">
                    <button
                      v-for="career in result.variations"
                      :key="career.id"
                      type="button"
                      class="group flex min-h-[295px] min-w-[320px] max-w-[340px] snap-start flex-col rounded-[1.9rem] border border-slate-100 bg-white p-5 text-left shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover sm:min-w-[350px] sm:max-w-[360px] lg:min-w-0 lg:flex-[0_1_380px]"
                      @click="openCareer(career)">
                      <div class="flex items-start justify-between gap-3">
                        <div class="flex min-w-0 items-start gap-3">
                          <div
                            class="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl border shadow-sm"
                            :class="careerIconTone(career)">
                            <svg v-if="careerIconKind(career) === 'business'" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M4 20h16" />
                              <path stroke-linecap="round" stroke-linejoin="round" d="M7 16V8m5 8V4m5 12v-6" />
                            </svg>
                            <svg v-else-if="careerIconKind(career) === 'tech'" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 17L6 12l3.75-5" />
                              <path stroke-linecap="round" stroke-linejoin="round" d="M14.25 7L18 12l-3.75 5" />
                            </svg>
                            <svg v-else-if="careerIconKind(career) === 'health'" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14" />
                              <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14" />
                            </svg>
                            <svg v-else-if="careerIconKind(career) === 'education'" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l9-4 9 4-9 4-9-4z" />
                              <path stroke-linecap="round" stroke-linejoin="round" d="M7 10.5v4.25c0 .828 2.239 2.25 5 2.25s5-1.422 5-2.25V10.5" />
                            </svg>
                            <svg v-else class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M4 7h16M7 12h10M9 17h6" />
                            </svg>
                          </div>

                          <div class="min-w-0">
                            <h3 class="text-lg font-bold tracking-tight text-slate-900 line-clamp-2">{{ career.title }}</h3>
                            <p class="mt-1 text-sm font-medium text-slate-500 line-clamp-2">{{ career.tagline }}</p>
                          </div>
                        </div>

                        <span class="shrink-0 rounded-full border border-primary-200 bg-gradient-to-r from-primary-50 to-accent-50 px-3 py-1 text-[11px] font-bold text-primary-700">
                          {{ career.match_score }}%
                        </span>
                      </div>

                      <div class="mt-4 flex items-center justify-between gap-3">
                        <div class="flex items-center gap-3 min-w-0">
                          <div class="h-2.5 w-24 overflow-hidden rounded-full bg-slate-100">
                            <div class="h-full rounded-full bg-gradient-to-r from-primary-600 to-accent-500" :style="{ width: `${career.match_score}%` }"></div>
                          </div>
                          <span class="text-xs font-semibold uppercase tracking-[0.14em] text-primary-600">Match vocacional</span>
                        </div>

                        <span
                          v-if="career.job_demand"
                          class="shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold"
                          :class="jobDemandClass(career.job_demand)">
                          {{ career.job_demand }}
                        </span>
                      </div>

                      <p class="mt-4 text-sm leading-6 text-slate-600 line-clamp-4">
                        {{ career.description || career.tagline }}
                      </p>

                      <div class="mt-4 flex flex-wrap gap-2">
                        <span
                          v-for="highlight in careerHighlights(career).slice(0, 3)"
                          :key="highlight"
                          class="rounded-full border border-primary-100 bg-gradient-to-br from-primary-50 to-accent-50 px-3 py-1.5 text-xs font-medium text-slate-700">
                          {{ highlight }}
                        </span>
                      </div>

                      <div class="mt-auto pt-5 space-y-3">
                        <div class="rounded-[1.4rem] border border-primary-100 bg-gradient-to-br from-primary-50 to-accent-50 px-4 py-3 text-sm text-slate-600">
                          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-700">Ingreso oficial</p>
                          <p class="mt-1.5 text-base font-bold tracking-tight text-slate-900 line-clamp-1">{{ salaryPreview(career) }}</p>
                          <p class="mt-1.5 text-xs leading-5 text-slate-600 line-clamp-2">{{ salarySupportText(career) }}</p>
                        </div>

                        <span class="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 transition-transform group-hover:translate-x-0.5">
                          Ver carrera completa
                          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
              </section>
 
            </div>
          </section>
        </template>
      </div>
    </main>

    <button
      type="button"
      @click="isChatOpen = true"
      class="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-[calc(env(safe-area-inset-right)+1rem)] z-40 inline-flex items-center gap-3 rounded-2xl border border-primary-500/10 bg-gradient-to-r from-primary-600 to-accent-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-200 transition-all duration-200 hover:-translate-y-0.5 hover:from-primary-700 hover:to-accent-500 active:scale-[0.98] sm:bottom-6 sm:right-6"
      aria-label="Abrir chat con Kora sobre estos resultados">
      <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-white/14 ring-1 ring-white/20">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </span>
      <span class="flex flex-col items-start leading-tight">
        <span class="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Kora</span>
        <span>Hablar sobre resultados</span>
      </span>
    </button>

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
        <div class="absolute inset-0 flex items-end justify-end px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pointer-events-none sm:p-6">
          <Transition
            enter-active-class="transition-all duration-220 ease-out"
            enter-from-class="opacity-0 translate-y-2 scale-[0.96]"
            enter-to-class="opacity-100 translate-y-0 scale-100"
            leave-active-class="transition-all duration-160 ease-in"
            leave-from-class="opacity-100 translate-y-0 scale-100"
            leave-to-class="opacity-0 translate-y-2 scale-[0.96]"
            appear>
            <div v-if="isChatOpen" class="pointer-events-auto w-full max-w-[430px]">
              <ResultsChatPanel mode="modal" @close="isChatOpen = false" />
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { TriangleAlert } from 'lucide-vue-next'
import { useCareerStore } from '~/stores/career'
import type { CareerVariation, DiscoveryResult } from '~/stores/career'

const route = useRoute()
const router = useRouter()
const store = useCareerStore()

const id = route.params.id as string
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isValidUuid = UUID_RE.test(id)

const loading = ref(false)
const error = ref<string | null>(null)
const isChatOpen = ref(false)
const result = computed<DiscoveryResult | null>(() => store.result)
const primaryCareer = computed(() => result.value?.variations?.[0] ?? null)
const averageMatch = computed(() => {
  const variations = result.value?.variations ?? []
  if (!variations.length) return 0
  const total = variations.reduce((sum, career) => sum + career.match_score, 0)
  return Math.round(total / variations.length)
})

const salaryCoverage = computed(() => {
  return result.value?.variations.filter(career => career.salary_source === 'sies' && hasOfficialSalary(career)).length ?? 0
})

const highlightedSkills = computed(() => {
  const counts = new Map<string, number>()
  for (const career of result.value?.variations ?? []) {
    for (const skill of career.skills ?? []) {
      counts.set(skill, (counts.get(skill) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([skill]) => skill)
})

useHead({
  title: computed(() => result.value ? `KoraChile — ${result.value.query}` : 'KoraChile — Resultados'),
})

onMounted(async () => {
  if (import.meta.client) {
    window.addEventListener('keydown', onKeyDown)
  }

  // If id is not a valid UUID (e.g. "local" when DB save failed), use store data
  if (!isValidUuid) {
    if (!store.result) await navigateTo('/')
    return
  }

  if (store.result && store.sessionId === id) return

  loading.value = true
  error.value = null

  try {
    const response = await $fetch<{ session: { id: string; query: string; result: DiscoveryResult } }>(`/api/discover/${id}`)
    const row = response.session
    store.setResult(row.result, row.id)
  } catch (err: any) {
    error.value = err.message || 'No se pudieron cargar los resultados.'
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  if (import.meta.client) {
    window.removeEventListener('keydown', onKeyDown)
  }
})

function hasOfficialSalary(career: CareerVariation) {
  const salary = career.salary_range
  return !!salary && [salary.junior, salary.mid, salary.senior].some(value => typeof value === 'number' && value > 0)
}

function formatCLP(value?: number | null) {
  if (!value) return 'Sin dato oficial'
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value)
}

function salaryPreview(career: CareerVariation) {
  if (career.salary_source !== 'sies' || !hasOfficialSalary(career)) {
    return 'Sin ingreso oficial asociado'
  }
  return formatCLP(career.salary_range?.senior || career.salary_range?.mid || career.salary_range?.junior)
}

function salarySupportText(career: CareerVariation) {
  if (career.salary_source !== 'sies' || !hasOfficialSalary(career)) {
    return 'Puedes contrastar esta ruta por malla, empleabilidad e instituciones disponibles.'
  }

  const year = career.salary_year ? ` ${career.salary_year}` : ''
  return `Fuente: SIES/MiFuturo${year}. Mostramos el mejor dato disponible entre 1°, 3°/4° y 5° año.`
}

function careerHighlights(career: CareerVariation) {
  if (career.fun_facts?.length) {
    return career.fun_facts.slice(0, 3)
  }

  return career.skills.slice(0, 4)
}

function careerIconKind(career: CareerVariation) {
  const haystack = `${career.title} ${career.tagline} ${career.description} ${(career.skills || []).join(' ')}`.toLowerCase()

  if (/(comercial|negocio|finanza|marketing|ventas|gesti[oó]n|administraci[oó]n|econom|mercado|invest|estadistic|analista)/.test(haystack)) return 'business'
  if (/(software|datos|inform[aá]tica|program|digital|sistemas|ia|tecnolog)/.test(haystack)) return 'tech'
  if (/(salud|m[eé]dic|cl[ií]nic|enfermer|terapia|psicolog|nutri)/.test(haystack)) return 'health'
  if (/(pedagog|educaci[oó]n|docencia|aprendizaje|formaci[oó]n)/.test(haystack)) return 'education'
  return 'general'
}

function careerIconTone(career: CareerVariation) {
  const kind = careerIconKind(career)
  if (kind === 'business') return 'border-amber-200 bg-amber-50 text-amber-700'
  if (kind === 'tech') return 'border-sky-200 bg-sky-50 text-sky-700'
  if (kind === 'health') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (kind === 'education') return 'border-violet-200 bg-violet-50 text-violet-700'
  return 'border-slate-200 bg-slate-50 text-slate-700'
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    isChatOpen.value = false
  }
}

function jobDemandClass(jobDemand: string) {
  if (jobDemand === 'Muy Alta') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (jobDemand === 'Alta') return 'border-sky-200 bg-sky-50 text-sky-700'
  if (jobDemand === 'Media') return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-slate-200 bg-slate-100 text-slate-600'
}

function openCareer(career: CareerVariation) {
  store.setSelectedCareer(career)
  router.push(`/results/${id}/${career.id}`)
}
</script>
