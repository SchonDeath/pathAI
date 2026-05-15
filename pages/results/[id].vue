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
                  <!-- Top match -->
                  <div class="bg-white rounded-3xl border border-slate-100 shadow-card px-5 py-5">
                    <div class="flex items-center justify-between mb-3">
                      <div class="flex items-center gap-2">
                        <span class="w-8 h-8 rounded-xl bg-primary-50 border border-primary-100 text-primary-600 flex items-center justify-center">
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3l2.755 5.583 6.16.895-4.457 4.344 1.052 6.134L12 17.063 6.49 19.956l1.052-6.134L3.085 9.478l6.16-.895L12 3z"/></svg>
                        </span>
                        <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Top match</p>
                      </div>
                      <span class="text-xs px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 border border-primary-100 font-semibold">{{ primaryCareer?.match_score || 0 }}%</span>
                    </div>
                    <p class="text-base font-bold text-slate-900 leading-tight">{{ primaryCareer?.title || 'Sin dato' }}</p>
                    <p class="mt-1 text-xs text-slate-500">Carrera con mayor afinidad según tu perfil.</p>
                  </div>

                  <!-- Cobertura salarial -->
                  <div class="bg-white rounded-3xl border border-slate-100 shadow-card px-5 py-5">
                    <div class="flex items-center justify-between mb-3">
                      <div class="flex items-center gap-2">
                        <span class="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l5-5 4 4 7-7M14 8h6v6"/></svg>
                        </span>
                        <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Cobertura</p>
                      </div>
                      <span class="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium">Datos SIES</span>
                    </div>
                    <p class="text-base font-bold text-slate-900">{{ salaryCoverage }}<span class="text-slate-400 font-normal text-sm"> / {{ result.variations.length }} rutas</span></p>
                    <p class="mt-1 text-xs text-slate-500">Con ingresos oficiales SIES o MiFuturo.</p>
                  </div>

                  <!-- Señales dominantes -->
                  <div class="bg-white rounded-3xl border border-slate-100 shadow-card px-5 py-5">
                    <div class="flex items-center gap-2 mb-3">
                      <span class="w-8 h-8 rounded-xl bg-violet-50 border border-violet-100 text-violet-600 flex items-center justify-center">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                      </span>
                      <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Señales dominantes</p>
                    </div>
                    <p class="text-base font-bold text-slate-900 leading-tight">{{ highlightedSkills.slice(0, 2).join(' · ') || 'Exploración vocacional' }}</p>
                    <p class="mt-1 text-xs text-slate-500">Patrones en intereses, habilidades y motivaciones.</p>
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

                <div class="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-primary-100 bg-primary-50/70 px-3 py-2.5 text-xs font-medium text-primary-700 lg:hidden">
                  <span class="inline-flex items-center gap-1.5">
                    <ArrowLeft class="h-3.5 w-3.5" />
                    Desliza para ver más carreras
                    <ArrowRight class="h-3.5 w-3.5" />
                  </span>
                  <span class="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-500">Swipe</span>
                </div>

                <div class="mt-4 -mx-2 overflow-x-auto pb-2 lg:overflow-visible">
                  <div class="flex gap-4 px-2 snap-x snap-mandatory lg:flex-wrap lg:justify-center lg:gap-5 lg:px-0">
                    <button
                      v-for="career in result.variations"
                      :key="career.id"
                      type="button"
                      class="group flex min-h-[295px] w-[84vw] min-w-[84vw] max-w-[84vw] snap-start flex-col rounded-[1.9rem] border border-slate-100 bg-white p-5 text-left shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover sm:min-w-[350px] sm:max-w-[360px] sm:w-auto lg:min-w-0 lg:flex-[0_1_380px]"
                      @click="openCareer(career)">
                      <div class="flex items-start justify-between gap-3">
                        <div class="flex min-w-0 items-start gap-3">
                          <div
                            class="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl border shadow-sm"
                            :class="careerIconTone(career)">
                            <TrendingUp v-if="careerIconKind(career) === 'business'" class="h-5 w-5" />
                            <Code2 v-else-if="careerIconKind(career) === 'tech'" class="h-5 w-5" />
                            <HeartPulse v-else-if="careerIconKind(career) === 'health'" class="h-5 w-5" />
                            <GraduationCap v-else-if="careerIconKind(career) === 'education'" class="h-5 w-5" />
                            <Wrench v-else-if="careerIconKind(career) === 'engineering'" class="h-5 w-5" />
                            <Scale v-else-if="careerIconKind(career) === 'law'" class="h-5 w-5" />
                            <Palette v-else-if="careerIconKind(career) === 'arts'" class="h-5 w-5" />
                            <FlaskConical v-else-if="careerIconKind(career) === 'science'" class="h-5 w-5" />
                            <Building2 v-else-if="careerIconKind(career) === 'architecture'" class="h-5 w-5" />
                            <Leaf v-else-if="careerIconKind(career) === 'agro'" class="h-5 w-5" />
                            <Users v-else-if="careerIconKind(career) === 'social'" class="h-5 w-5" />
                            <Cpu v-else-if="careerIconKind(career) === 'electronics'" class="h-5 w-5" />
                            <Truck v-else-if="careerIconKind(career) === 'logistics'" class="h-5 w-5" />
                            <Megaphone v-else-if="careerIconKind(career) === 'communication'" class="h-5 w-5" />
                            <ChefHat v-else-if="careerIconKind(career) === 'gastronomy'" class="h-5 w-5" />
                            <Shield v-else-if="careerIconKind(career) === 'security'" class="h-5 w-5" />
                            <Plane v-else-if="careerIconKind(career) === 'aviation'" class="h-5 w-5" />
                            <BookOpen v-else class="h-5 w-5" />
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
                        <div class="bg-white rounded-2xl border border-slate-100 shadow-card px-4 py-3">
                          <div class="flex items-center justify-between mb-2">
                            <div class="flex items-center gap-1.5">
                              <span class="w-5 h-5 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l5-5 4 4 7-7M14 8h6v6"/></svg>
                              </span>
                              <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Ingreso oficial</p>
                            </div>
                            <span v-if="career.salary_source === 'sies'" class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium">SIES</span>
                          </div>
                          <p class="text-sm font-bold tracking-tight text-slate-900 line-clamp-1">{{ salaryPreview(career) }}</p>
                          <p class="mt-1 text-[11px] leading-4 text-slate-500 line-clamp-2">{{ salarySupportText(career) }}</p>
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

     
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, ArrowRight, TriangleAlert, Code2, TrendingUp, HeartPulse, GraduationCap, Wrench, Scale, Palette, FlaskConical, Building2, Leaf, Users, BookOpen, Cpu, Truck, Megaphone, ChefHat, Shield, Plane } from 'lucide-vue-next'
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

  if (/(derecho|ley|legal|jurídic|abogad|notari|justicia)/.test(haystack)) return 'law'
  if (/(arquitectura|urbanismo|diseño urbano|construcción|inmobiliar)/.test(haystack)) return 'architecture'
  if (/(salud|médic|clínic|enfermer|terapia|psicolog|nutri|kinesi|farmac|odontolog|veterinar|fonoaud|obstetr)/.test(haystack)) return 'health'
  if (/(software|datos|informática|program|digital|ia |inteligencia artificial|machine learning|web|desarrollo|ciberseguridad)/.test(haystack)) return 'tech'
  if (/(electrónica|eléctric|telecomunicacion|electromecán|automatizac|robótic|mecatrónic)/.test(haystack)) return 'electronics'
  if (/(ingeniería|mecánic|industrial|civil|minas|metalurgi|petróleo|estructur|procesos)/.test(haystack)) return 'engineering'
  if (/(comercial|negocio|finanza|marketing|ventas|gestión|administración|econom|mercado|audit|contabil|analista)/.test(haystack)) return 'business'
  if (/(pedagog|educación|docencia|aprendizaje|párvulo|básica|media|especial)/.test(haystack)) return 'education'
  if (/(diseño|arte|música|teatro|cine|fotografía|animación|moda|creatividad)/.test(haystack)) return 'arts'
  if (/(química|biología|física|laboratorio|ciencias|biotecnolog|genética|ambiental|geología)/.test(haystack)) return 'science'
  if (/(agronomía|agro|forestal|silvicultura|pesca|veterinar|medioambiente|sustentabilidad)/.test(haystack)) return 'agro'
  if (/(trabajo social|sociología|antropología|geografía|historia|filosofía|relaciones internacionales|ciencia política)/.test(haystack)) return 'social'
  if (/(logística|transporte|cadena de suministro|comercio exterior|aduana)/.test(haystack)) return 'logistics'
  if (/(comunicación|periodismo|publicidad|relaciones públicas|medios)/.test(haystack)) return 'communication'
  if (/(gastronomía|chef|cocina|hotelería|turismo|enología)/.test(haystack)) return 'gastronomy'
  if (/(seguridad|detective|policía|bombero|defensa|militar)/.test(haystack)) return 'security'
  if (/(aviación|aeronáutica|piloto|aerolínea)/.test(haystack)) return 'aviation'
  return 'general'
}

function careerIconTone(career: CareerVariation) {
  const kind = careerIconKind(career)
  if (kind === 'business') return 'border-amber-200 bg-amber-50 text-amber-700'
  if (kind === 'tech') return 'border-sky-200 bg-sky-50 text-sky-700'
  if (kind === 'health') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (kind === 'education') return 'border-violet-200 bg-violet-50 text-violet-700'
  if (kind === 'engineering') return 'border-orange-200 bg-orange-50 text-orange-700'
  if (kind === 'law') return 'border-blue-200 bg-blue-50 text-blue-700'
  if (kind === 'arts') return 'border-pink-200 bg-pink-50 text-pink-700'
  if (kind === 'science') return 'border-teal-200 bg-teal-50 text-teal-700'
  if (kind === 'architecture') return 'border-stone-200 bg-stone-50 text-stone-700'
  if (kind === 'agro') return 'border-lime-200 bg-lime-50 text-lime-700'
  if (kind === 'social') return 'border-indigo-200 bg-indigo-50 text-indigo-700'
  if (kind === 'electronics') return 'border-cyan-200 bg-cyan-50 text-cyan-700'
  if (kind === 'logistics') return 'border-yellow-200 bg-yellow-50 text-yellow-700'
  if (kind === 'communication') return 'border-rose-200 bg-rose-50 text-rose-700'
  if (kind === 'gastronomy') return 'border-red-200 bg-red-50 text-red-700'
  if (kind === 'security') return 'border-gray-200 bg-gray-50 text-gray-700'
  if (kind === 'aviation') return 'border-blue-200 bg-blue-50 text-blue-600'
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
