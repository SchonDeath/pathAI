<template>
  <div class="min-h-screen bg-surface-50">
    <AppHeader />

    <main class="pt-24 pb-16 px-4 sm:px-6">
      <div class="max-w-6xl mx-auto space-y-8">
        <!-- Hero -->
        <div class="text-center space-y-3">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-50 border border-accent-100 text-accent-700 text-xs font-semibold uppercase tracking-wider">
            Directorio
          </span>
          <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Instituciones de <span class="gradient-text">Chile</span>
          </h1>
          <p class="text-slate-500 max-w-2xl mx-auto">
            Datos oficiales SIES: acreditación, matrícula, infraestructura e información financiera de universidades, institutos profesionales y CFT.
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
                <InstitutionLogo
                  :logo-url="inst.logo_url"
                  :institution-name="inst.nombre_institucion"
                  :fallback-class="(page - 1) * PAGE_SIZE + localIdx === 0 ? 'text-amber-600'
                    : (page - 1) * PAGE_SIZE + localIdx === 1 ? 'text-slate-500'
                    : (page - 1) * PAGE_SIZE + localIdx === 2 ? 'text-amber-700'
                    : 'text-slate-500'" />
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
                  <span v-if="inst.acreditacion_anos" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold"><Award class="w-3 h-3" />{{ inst.acreditacion_anos }} años</span>
                  <span v-if="inst.matricula_pregrado_actual" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 font-semibold"><Users class="w-3 h-3" />{{ formatNum(inst.matricula_pregrado_actual) }}</span>
                </div>
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
                  <!-- Información general -->
                  <div>
                    <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Información general</h4>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <DataCell label="Retención 1er año" :value="inst.retencion_1er_ano_pct ? `${inst.retencion_1er_ano_pct.toFixed(1)}%` : '—'" />
                    <DataCell label="Promedio PAES" :value="inst.promedio_paes ? Math.round(inst.promedio_paes).toString() : '—'" />
                    <DataCell label="Promedio NEM" :value="inst.promedio_nem ? inst.promedio_nem.toFixed(2) : '—'" />
                    <DataCell label="Titulados/año" :value="inst.titulados_pregrado_actual ? formatNum(inst.titulados_pregrado_actual) : '—'" />
                    <DataCell label="Matrícula pregrado" :value="inst.matricula_pregrado_actual ? formatNum(inst.matricula_pregrado_actual) : '—'" />
                    <DataCell label="Matrícula posgrado" :value="inst.matricula_posgrado_actual ? formatNum(inst.matricula_posgrado_actual) : '—'" />
                    <DataCell label="Duración real" :value="inst.duracion_real_semestres ? `${inst.duracion_real_semestres.toFixed(1)} sem` : '—'" />
                    <DataCell label="Autonomía" :value="inst.autonomia || '—'" />
                    </div>
                  </div>

                  <!-- Infraestructura -->
                  <div v-if="inst.m2_construidos || inst.volumenes_biblioteca || inst.laboratorios_talleres || inst.computadores" class="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/60 border border-blue-100 p-4">
                    <h4 class="text-xs font-bold uppercase tracking-wider text-blue-700 mb-3 flex items-center gap-1.5">
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                      Infraestructura
                    </h4>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <DataCell label="M² construidos" :value="inst.m2_construidos ? formatNum(inst.m2_construidos) : '—'" />
                      <DataCell label="Volúmenes biblioteca" :value="inst.volumenes_biblioteca ? formatNum(inst.volumenes_biblioteca) : '—'" />
                      <DataCell label="Laboratorios/talleres" :value="inst.laboratorios_talleres ? formatNum(inst.laboratorios_talleres) : '—'" />
                      <DataCell label="Computadores" :value="inst.computadores ? formatNum(inst.computadores) : '—'" />
                    </div>
                  </div>

                  <!-- Financiero -->
                  <div v-if="inst.ingresos_operacion_clp || inst.total_activos_clp" class="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/60 border border-emerald-100 p-4">
                    <h4 class="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-3 flex items-center gap-1.5">
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      Información financiera <span class="font-normal normal-case text-emerald-600 ml-1">(miles de pesos)</span>
                    </h4>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <DataCell label="Ingresos operación" :value="inst.ingresos_operacion_clp ? `$${formatNum(inst.ingresos_operacion_clp)}M` : '—'" />
                      <DataCell
                        label="Resultado ejercicio"
                        :value="inst.resultado_ejercicio_clp ? `$${formatNum(Math.abs(inst.resultado_ejercicio_clp))}M` : '—'"
                        :value-class="inst.resultado_ejercicio_clp && inst.resultado_ejercicio_clp < 0 ? 'text-red-600' : 'text-emerald-700'" />
                      <DataCell label="Total activos" :value="inst.total_activos_clp ? `$${formatNum(inst.total_activos_clp)}M` : '—'" />
                      <DataCell label="Patrimonio" :value="inst.patrimonio_total_clp ? `$${formatNum(inst.patrimonio_total_clp)}M` : '—'" />
                    </div>
                  </div>

                  <!-- Acciones -->
                  <div class="flex flex-wrap gap-2 pt-2">
                    <a
                      v-if="inst.pagina_web"
                      :href="normalizeUrl(inst.pagina_web)"
                      @click="trackInstitutionWebsite(inst)"
                      target="_blank"
                      rel="noopener"
                      class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:border-primary-300 transition">
                      <Globe class="w-3.5 h-3.5" /> Sitio web
                    </a>
                    <button
                      @click="addToCompare(inst)"
                      :disabled="isQueued(inst.institution_code)"
                      class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition"
                      :class="isQueued(inst.institution_code)
                        ? 'bg-primary-50 border-primary-200 text-primary-600 cursor-default'
                        : 'bg-primary-600 border-primary-600 text-white hover:bg-primary-700'">
                      <template v-if="isQueued(inst.institution_code)">
                        <Check class="w-3.5 h-3.5" /> En comparador
                      </template>
                      <template v-else>
                        <Scale class="w-3.5 h-3.5" /> Agregar a comparador
                      </template>
                    </button>
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <div v-else class="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div class="mb-3 flex justify-center"><Search class="w-8 h-8 text-slate-400" /></div>
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
          <p class="font-semibold text-slate-800 mb-2 inline-flex items-center gap-1.5"><Info class="w-4 h-4" />Sobre estos datos</p>
          <p>
            Los datos provienen del <strong>Servicio de Información de Educación Superior (SIES)</strong> del MINEDUC.
            Incluyen matrícula, acreditación, infraestructura y estados financieros de las instituciones.
            Esta información es <strong>referencial</strong> y no reemplaza criterios personales como ubicación, costos o vocación.
          </p>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { Award, Check, Globe, Info, Scale, Search, Users } from 'lucide-vue-next'
import { useIntentTracker } from '~/composables/useIntentTracker'
import { useRankingStore, type RankingInstitution } from '~/stores/ranking'

const rankingStore = useRankingStore()
const { track } = useIntentTracker()

const search = ref('')
const tipo = ref<string | null>('Universidades')
const expanded = ref<number | null>(null)
const page = ref(1)
const PAGE_SIZE = 10

const TIPO_OPTIONS = [
  { value: null, label: 'Todas' },
  { value: 'universidades', label: 'Universidades' },
  { value: 'institutos profesionales', label: 'IP' },
  { value: 'centros de formacion tecnica', label: 'CFT' },
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
        autonomia: inst.autonomia,
        acreditacion_estado: inst.acreditacion_estado,
        acreditacion_anos: inst.acreditacion_anos,
        acreditacion_vigencia_hasta: inst.acreditacion_vigencia_hasta,
        acreditacion_areas: inst.acreditacion_areas,
        retencion_1er_ano_pct: inst.retencion_1er_ano_pct,
        promedio_paes: inst.promedio_paes,
        promedio_nem: inst.promedio_nem,
        matricula_pregrado_actual: inst.matricula_pregrado_actual,
        matricula_posgrado_actual: inst.matricula_posgrado_actual,
        titulados_pregrado_actual: inst.titulados_pregrado_actual,
        titulados_posgrado_actual: inst.titulados_posgrado_actual,
        duracion_real_semestres: inst.duracion_real_semestres,
        m2_construidos: inst.m2_construidos,
        volumenes_biblioteca: inst.volumenes_biblioteca,
        laboratorios_talleres: inst.laboratorios_talleres,
        computadores: inst.computadores,
        ingresos_operacion_clp: inst.ingresos_operacion_clp,
        resultado_ejercicio_clp: inst.resultado_ejercicio_clp,
        total_activos_clp: inst.total_activos_clp,
        patrimonio_total_clp: inst.patrimonio_total_clp,
        pagina_web: inst.pagina_web,
        direccion_sede_central: inst.direccion_sede_central,
        logo_url: inst.logo_url,
        score: inst.score,
      })
      localStorage.setItem(COMPARE_INSTITUTIONS_KEY, JSON.stringify(safe))
      queuedCodes.value = safe.map((x: any) => Number(x.institution_code))
      void track({
        event_name: 'institution_compare_added',
        source: 'ranking',
        institution_code: inst.institution_code,
        metadata: {
          nombre_institucion: inst.nombre_institucion,
          tipo_institucion: inst.tipo_institucion,
          score: inst.score,
        },
      })
    }
  } catch (e) {
    console.warn('[ranking] addToCompare failed:', e)
  }
}

function trackInstitutionWebsite(inst: RankingInstitution) {
  void track({
    event_name: 'institution_website_clicked',
    source: 'ranking',
    institution_code: inst.institution_code,
    metadata: {
      nombre_institucion: inst.nombre_institucion,
      pagina_web: normalizeUrl(inst.pagina_web || ''),
    },
  })
}

onMounted(() => {
  loadQueued()
  window.addEventListener('storage', handleCompareInstitutionsStorage)
})

onBeforeUnmount(() => {
  window.removeEventListener('storage', handleCompareInstitutionsStorage)
})

function handleCompareInstitutionsStorage(e: StorageEvent) {
  if (e.key === COMPARE_INSTITUTIONS_KEY) loadQueued()
}

useHead({
  title: 'Ranking de instituciones · KoraChile',
  meta: [
    { name: 'description', content: 'Ranking de universidades, IP y CFT en Chile con datos oficiales del SIES.' },
  ],
})
</script>
