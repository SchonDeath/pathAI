<template>
  <div class="min-h-screen bg-surface-50">
    <AppHeader />

    <main class="pt-24 pb-16 px-4 sm:px-6">
      <div class="max-w-6xl mx-auto space-y-8">
        <!-- Hero -->
        <div class="text-center space-y-3">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-50 border border-accent-100 text-accent-700 text-xs font-semibold uppercase tracking-wider">
            Ranking
          </span>
          <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Ranking de <span class="gradient-text">instituciones chilenas</span>
          </h1>
          <p class="text-slate-500 max-w-2xl mx-auto">
            Puntaje calculado con datos oficiales SIES: acreditación, retención de alumnos, PAES y tamaño de la matrícula.
          </p>
        </div>

        <!-- Filtros -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
          <div class="relative flex-1">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input
              v-model="search"
              type="text"
              placeholder="Busca por nombre (ej: Católica, USACH, DUOC...)"
              class="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm placeholder:text-slate-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-[border-color,box-shadow]">
          </div>
          <div class="flex gap-2 overflow-x-auto">
            <button
              v-for="opt in TIPO_OPTIONS"
              :key="opt.value ?? 'all'"
              @click="tipo = opt.value"
              class="px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-[background-color,border-color,color] border"
              :class="tipo === opt.value
                ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:border-primary-300'">
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- Loading: animate-pulse en el contenedor padre, no en cada hijo -->
        <div v-if="pending" class="space-y-3 animate-pulse">
          <div v-for="i in 6" :key="i" class="bg-white rounded-2xl p-4 border border-slate-200">
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 rounded-full bg-slate-200 shrink-0"></div>
              <div class="flex-1 space-y-2">
                <div class="h-4 bg-slate-200 rounded w-1/2"></div>
                <div class="h-3 bg-slate-100 rounded w-1/3"></div>
              </div>
              <div class="w-16 h-8 bg-slate-200 rounded-lg"></div>
            </div>
          </div>
        </div>

        <!-- Lista -->
        <div v-else-if="institutions.length" class="space-y-3">
          <div
            v-for="(inst, localIdx) in paginatedInstitutions"
            :key="inst.institution_code"
            class="bg-white rounded-2xl border border-slate-200 hover:border-primary-300 hover:shadow-md transition-[border-color,box-shadow] duration-200 overflow-hidden">
            <!-- Cabecera -->
            <button
              class="w-full p-4 sm:p-5 flex items-center gap-4 text-left"
              @click="expanded = expanded === inst.institution_code ? null : inst.institution_code">
              <!-- Rank badge: logo si tiene, ícono si no -->
              <div
                class="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shrink-0 overflow-hidden border-2"
                :class="(page - 1) * PAGE_SIZE + localIdx === 0 ? 'border-amber-400 bg-amber-50'
                      : (page - 1) * PAGE_SIZE + localIdx === 1 ? 'border-slate-300 bg-slate-50'
                      : (page - 1) * PAGE_SIZE + localIdx === 2 ? 'border-amber-600 bg-amber-50'
                      : 'border-slate-200 bg-white'">
                <img
                  v-if="inst.logo_url && !brokenLogos.has(inst.institution_code)"
                  :src="inst.logo_url"
                  :alt="inst.nombre_institucion"
                  class="w-full h-full object-contain p-1"
                  loading="lazy"
                  @error="brokenLogos.add(inst.institution_code)">
                <!-- Fallback: ícono según tipo (universidad / IP / CFT) -->
                <svg v-else
                  class="w-7 h-7"
                  :class="(page - 1) * PAGE_SIZE + localIdx === 0 ? 'text-amber-600'
                        : (page - 1) * PAGE_SIZE + localIdx === 1 ? 'text-slate-500'
                        : (page - 1) * PAGE_SIZE + localIdx === 2 ? 'text-amber-700'
                        : 'text-slate-500'"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                  <!-- Edificio académico (graduación / institución) -->
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 3 2 8l10 5 10-5-10-5Z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 10v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/>
                  <path stroke-linecap="round" stroke-linejoin="round" d="M22 8v5"/>
                </svg>
              </div>
              <!-- Número de posición sobre el badge (siempre visible) -->
              <div class="relative -ml-5 self-end mb-0.5 z-10">
                <span class="text-[10px] font-black px-1 py-0.5 rounded-md shadow-sm"
                  :class="(page - 1) * PAGE_SIZE + localIdx === 0 ? 'bg-amber-400 text-white'
                        : (page - 1) * PAGE_SIZE + localIdx === 1 ? 'bg-slate-400 text-white'
                        : (page - 1) * PAGE_SIZE + localIdx === 2 ? 'bg-amber-700 text-white'
                        : 'bg-slate-200 text-slate-600'">
                  {{ (page - 1) * PAGE_SIZE + localIdx + 1 }}
                </span>
              </div>
              <!-- Info -->
              <div class="flex-1 min-w-0">
                <div class="font-bold text-slate-900 text-sm sm:text-base truncate">{{ inst.nombre_institucion }}</div>
                <div class="flex items-center gap-1.5 mt-1 text-xs text-slate-500 flex-wrap">
                  <span v-if="inst.tipo_institucion" class="px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 font-semibold truncate max-w-[180px]">{{ shortTipo(inst.tipo_institucion) }}</span>
                  <span v-if="inst.acreditacion_anos" class="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">🏅 {{ inst.acreditacion_anos }} años</span>
                  <span v-if="inst.matricula_pregrado_actual" class="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 font-semibold">👥 {{ formatNum(inst.matricula_pregrado_actual) }}</span>
                </div>
              </div>
              <!-- Score -->
              <div class="shrink-0 text-right">
                <div class="text-2xl sm:text-3xl font-extrabold" :class="scoreColor(inst.score)">{{ inst.score }}</div>
                <div class="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Score</div>
              </div>
              <svg
                class="w-5 h-5 text-slate-500 transition-transform duration-200 shrink-0"
                :class="expanded === inst.institution_code ? 'rotate-180' : ''"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            <!-- Expandible: desglose -->
            <Transition
              enter-active-class="transition-[opacity,transform] duration-250 ease-out"
              enter-from-class="opacity-0 -translate-y-1"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition-[opacity,transform] duration-150 ease-in"
              leave-from-class="opacity-100 translate-y-0"
              leave-to-class="opacity-0 -translate-y-1">
              <div v-if="expanded === inst.institution_code" class="overflow-hidden">
                <div class="border-t border-slate-100 p-4 sm:p-6 bg-slate-50/60 space-y-5">
                  <!-- Desglose del score -->
                  <div>
                    <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">¿Cómo se calcula el score?</h4>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <ScoreBar label="Acreditación" :value="inst.breakdown.acreditacion" weight="40%" color="emerald" />
                      <ScoreBar label="Retención" :value="inst.breakdown.retencion" weight="25%" color="blue" />
                      <ScoreBar label="PAES" :value="inst.breakdown.paes" weight="20%" color="violet" />
                      <ScoreBar label="Matrícula" :value="inst.breakdown.matricula" weight="15%" color="amber" />
                    </div>
                  </div>

                  <!-- Datos detallados -->
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <DataCell label="Retención 1er año" :value="inst.retencion_1er_ano_pct ? `${inst.retencion_1er_ano_pct.toFixed(1)}%` : '—'" />
                    <DataCell label="Promedio PAES" :value="inst.promedio_paes ? Math.round(inst.promedio_paes).toString() : '—'" />
                    <DataCell label="Promedio NEM" :value="inst.promedio_nem ? inst.promedio_nem.toFixed(2) : '—'" />
                    <DataCell label="Titulados/año" :value="inst.titulados_pregrado_actual ? formatNum(inst.titulados_pregrado_actual) : '—'" />
                  </div>

                  <!-- Áreas acreditadas -->
                  <div v-if="inst.acreditacion_areas?.length">
                    <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Áreas acreditadas</h4>
                    <div class="flex flex-wrap gap-1.5">
                      <span
                        v-for="area in inst.acreditacion_areas"
                        :key="area"
                        class="px-2.5 py-1 rounded-full text-xs font-medium bg-white border border-slate-200 text-slate-700">
                        {{ area }}
                      </span>
                    </div>
                  </div>

                  <!-- Acciones -->
                  <div class="flex flex-wrap gap-2 pt-2">
                    <a
                      v-if="inst.pagina_web"
                      :href="normalizeUrl(inst.pagina_web)"
                      target="_blank"
                      rel="noopener"
                      class="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:border-primary-300 transition">
                      🌐 Sitio web
                    </a>
                    <button
                      @click="addToCompare(inst)"
                      :disabled="isQueued(inst.institution_code)"
                      class="px-3 py-2 rounded-xl text-xs font-semibold border transition"
                      :class="isQueued(inst.institution_code)
                        ? 'bg-primary-50 border-primary-200 text-primary-600 cursor-default'
                        : 'bg-primary-600 border-primary-600 text-white hover:bg-primary-700'">
                      {{ isQueued(inst.institution_code) ? '✓ En comparador' : '⚖️ Agregar a comparador' }}
                    </button>
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <div v-else class="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div class="text-4xl mb-3">🔍</div>
          <p class="text-slate-500">Sin resultados. Prueba con otro filtro o búsqueda.</p>
        </div>

        <!-- Paginador -->
        <div v-if="!pending && totalPages > 1" class="flex items-center justify-center gap-2">
          <button
            @click="goToPage(page - 1)"
            :disabled="page <= 1"
            class="px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:border-primary-300 disabled:opacity-30 disabled:cursor-not-allowed transition-[border-color,color]">
            ← Anterior
          </button>
          <div class="flex gap-1">
            <button
              v-for="p in totalPages"
              :key="p"
              @click="goToPage(p)"
              class="w-9 h-9 rounded-xl text-sm font-bold transition-[background-color,border-color,color]"
              :class="p === page
                ? 'bg-primary-600 text-white shadow-sm'
                : 'border border-slate-200 text-slate-600 hover:border-primary-300'">
              {{ p }}
            </button>
          </div>
          <button
            @click="goToPage(page + 1)"
            :disabled="page >= totalPages"
            class="px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:border-primary-300 disabled:opacity-30 disabled:cursor-not-allowed transition-[border-color,color]">
            Siguiente →
          </button>
        </div>
        <div v-if="!pending && institutions.length" class="text-center text-xs text-slate-500">
          Mostrando {{ (page - 1) * PAGE_SIZE + 1 }}–{{ Math.min(page * PAGE_SIZE, institutions.length) }} de {{ institutions.length }} instituciones
        </div>

        <!-- Footer info -->
        <div class="bg-blue-50/60 border border-blue-100 rounded-2xl p-5 text-sm text-slate-600 leading-relaxed">
          <p class="font-semibold text-slate-800 mb-2">ℹ️ Sobre este ranking</p>
          <p>
            Los datos provienen del <strong>Servicio de Información de Educación Superior (SIES)</strong> del MINEDUC.
            El puntaje combina indicadores oficiales con pesos balanceados para evitar sesgos por tamaño.
            Este ranking es <strong>referencial</strong> y no reemplaza criterios personales como ubicación, costos o vocación.
          </p>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRankingStore, type RankingInstitution } from '~/stores/ranking'

const rankingStore = useRankingStore()

const search = ref('')
const tipo = ref<string | null>('Universidades')
const expanded = ref<number | null>(null)
const page = ref(1)
const PAGE_SIZE = 10
// Tracking de logos rotos (404, CORS, etc.) para mostrar fallback de ícono
const brokenLogos = reactive(new Set<number>())

const TIPO_OPTIONS = [
  { value: null, label: 'Todas' },
  { value: 'Universidades', label: 'Universidades' },
  { value: 'Institutos Profesionales', label: 'IP' },
  { value: 'Centros de Formación Técnica', label: 'CFT' },
]

// Debounce search
const debouncedSearch = ref('')
let searchTimer: any = null
watch(search, (v) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    debouncedSearch.value = v
  }, 350)
})

// Resetear página al cambiar filtro o búsqueda
watch([tipo, debouncedSearch], () => {
  page.value = 1
  rankingStore.fetch({ tipo: tipo.value, search: debouncedSearch.value || undefined })
})

function goToPage(p: number) {
  page.value = p
  if (typeof window !== 'undefined')
    window.scrollTo({ top: 260, behavior: 'smooth' })
}

// Cargar al montar (usa cache si está disponible)
onMounted(() => {
  rankingStore.fetch({ tipo: tipo.value })
})

const pending = computed(() => rankingStore.loading || !rankingStore.initialized)
const institutions = computed(() => rankingStore.institutions)
const totalPages = computed(() => Math.ceil(institutions.value.length / PAGE_SIZE))
const paginatedInstitutions = computed(() =>
  institutions.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE)
)

function shortTipo(t: string): string {
  if (!t) return ''
  if (t.includes('Universidades')) return 'Universidad'
  if (t.includes('Institutos Profesionales')) return 'Instituto Profesional'
  if (t.includes('Centros de Formación Técnica')) return 'CFT'
  return t
}

function formatNum(n: number): string {
  return new Intl.NumberFormat('es-CL').format(n)
}

function scoreColor(s: number): string {
  if (s >= 80) return 'text-emerald-600'
  if (s >= 65) return 'text-primary-600'
  if (s >= 50) return 'text-amber-600'
  return 'text-slate-500'
}

function normalizeUrl(url: string): string {
  if (!url) return '#'
  if (url.startsWith('http')) return url
  return `https://${url}`
}

// Comparador: reusa el localStorage que usa el resto de la app
const COMPARE_INSTITUTIONS_KEY = 'KoraChile:compare:institutions'
const queuedCodes = ref<number[]>([])

function loadQueued() {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(COMPARE_INSTITUTIONS_KEY)
    const arr = raw ? JSON.parse(raw) : []
    queuedCodes.value = Array.isArray(arr)
      ? arr.map((x: any) => Number(x?.institution_code)).filter(Boolean)
      : []
  } catch {
    queuedCodes.value = []
  }
}

function isQueued(code: number): boolean {
  return queuedCodes.value.includes(code)
}

function addToCompare(inst: RankingInstitution) {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(COMPARE_INSTITUTIONS_KEY)
    const arr = raw ? JSON.parse(raw) : []
    const safe = Array.isArray(arr) ? arr : []
    if (!safe.some((x: any) => Number(x?.institution_code) === inst.institution_code)) {
      if (safe.length >= 4) safe.shift()
      safe.push({
        institution_code: inst.institution_code,
        nombre_institucion: inst.nombre_institucion,
        tipo_institucion: inst.tipo_institucion,
        acreditacion_anos: inst.acreditacion_anos,
        retencion_1er_ano_pct: inst.retencion_1er_ano_pct,
        promedio_paes: inst.promedio_paes,
        matricula_pregrado_actual: inst.matricula_pregrado_actual,
        score: inst.score,
      })
      localStorage.setItem(COMPARE_INSTITUTIONS_KEY, JSON.stringify(safe))
      queuedCodes.value = safe.map((x: any) => Number(x.institution_code))
    }
  } catch (e) {
    console.warn('[ranking] addToCompare failed:', e)
  }
}

onMounted(() => {
  loadQueued()
  window.addEventListener('storage', (e) => {
    if (e.key === COMPARE_INSTITUTIONS_KEY) loadQueued()
  })
})

useHead({
  title: 'Ranking de instituciones · KoraChile',
  meta: [
    { name: 'description', content: 'Ranking de universidades, IP y CFT en Chile con datos oficiales del SIES.' },
  ],
})
</script>
