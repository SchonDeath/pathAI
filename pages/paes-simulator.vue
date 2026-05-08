<template>
  <div class="min-h-screen flex flex-col bg-white">
    <AppHeader />

    <PaesSimulatingModal :visible="loading" />

    <main class="flex-1 pt-24 pb-20 px-4 sm:px-6">
      <div class="max-w-5xl mx-auto space-y-10">

        <!-- ── Hero ── -->
        <div
          class="relative rounded-3xl overflow-hidden"
          style="background: url('/simularPaes.png') center center / cover no-repeat; min-height: 320px;"
        >
          <!-- overlay solo en la mitad izquierda -->
          <div class="absolute inset-0" style="background: linear-gradient(to right, rgba(15,23,42,0.82) 0%, rgba(15,23,42,0.60) 55%, transparent 100%);"></div>

          <div class="relative z-10 flex flex-col justify-center px-8 sm:px-12 py-12 sm:py-14 max-w-xl space-y-4">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/25 text-white text-xs font-semibold uppercase tracking-wider w-fit">
              Simulador PAES 2026
            </span>
            <h1 class="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
              ¿A qué carreras puedes entrar<br />
              <span class="text-sky-400"> con tu puntaje?</span>
            </h1>
            <p class="text-white/75 text-sm sm:text-base leading-relaxed">
              Ingresa tus puntajes PAES y NEM y calcula en segundos los programas reales a los que accedes, con datos oficiales MINEDUC.
            </p>
          </div>
        </div>

        <!-- ── Formulario ── -->
        <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <!-- Header del form -->
          <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/60">
            <h2 class="font-semibold text-slate-800 text-sm">Ingresa tus puntajes</h2>
          </div>

          <div class="p-6 space-y-6">

            <!-- Obligatorios -->
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Requeridos</p>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div v-for="field in requiredFields" :key="field.key" class="space-y-1.5">
                  <label class="text-xs font-medium text-slate-600">{{ field.label }}</label>
                  <input
                    v-model.number="scores[field.key]"
                    type="number"
                    :min="field.min"
                    :max="field.max"
                    :placeholder="field.placeholder"
                    class="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                  />
                  <p class="text-[11px] text-slate-500">{{ field.min }}–{{ field.max }}</p>
                </div>
              </div>
            </div>

            <!-- Opcionales -->
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Opcionales</p>
              <p class="text-[11px] text-slate-500 mb-3">Déjalos en blanco si no los rendiste. Solo se usarán en programas que los ponderan.</p>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div v-for="field in optionalFields" :key="field.key" class="space-y-1.5">
                  <label class="text-xs font-medium text-slate-600">{{ field.label }}</label>
                  <input
                    v-model.number="scores[field.key]"
                    type="number"
                    :min="field.min"
                    :max="field.max"
                    :placeholder="field.placeholder"
                    class="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                  />
                  <p class="text-[11px] text-slate-500">100–1000</p>
                </div>
              </div>
            </div>

            <!-- CTA -->
            <button
              :disabled="loading"
              class="w-full sm:w-auto px-8 py-3 rounded-2xl font-semibold text-sm text-white transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              :class="!loading ? 'bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-200' : 'bg-slate-300'"
              @click="simulate"
            >
              <span v-if="loading" class="flex items-center gap-2">
                <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Calculando...
              </span>
              <span v-else>Simular mis puntajes →</span>
            </button>
          </div>
        </div>

        <!-- ── Error ── -->
        <div v-if="error" class="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-red-700 text-sm">
          {{ error }}
        </div>

        <!-- ── Resultados ── -->
        <template v-if="results">

          <!-- Summary bar -->
          <div class="bg-slate-900 rounded-3xl px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div class="flex-1">
              <p class="text-white font-bold text-xl">
                {{ results.total.toLocaleString('es-CL') }}
                <span class="text-slate-300 font-normal text-base">programas disponibles para ti</span>
              </p>
              <p class="text-slate-500 text-xs mt-0.5">Con puntaje ponderado calculado en base a datos OFE MINEDUC 2026</p>
            </div>
            <div class="flex gap-6 text-center">
              <div>
                <p class="text-white font-bold text-lg">{{ uniqueInstitutions }}</p>
                <p class="text-slate-500 text-xs">Instituciones</p>
              </div>
              <div>
                <p class="text-white font-bold text-lg">{{ uniqueAreas }}</p>
                <p class="text-slate-500 text-xs">Áreas</p>
              </div>
              <div>
                <p class="text-white font-bold text-lg">{{ uniqueRegions }}</p>
                <p class="text-slate-500 text-xs">Regiones</p>
              </div>
            </div>
          </div>

          <!-- Filtros -->
          <div class="flex flex-wrap gap-3 items-center">
            <!-- Búsqueda -->
            <div class="relative flex-1 min-w-[200px] max-w-sm">
              <svg class="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                v-model="filterText"
                type="text"
                placeholder="Filtrar por carrera o institución..."
                class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
              />
            </div>

            <!-- Área -->
            <select
              v-model="filterArea"
              class="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
            >
              <option value="">Todas las áreas</option>
              <option v-for="area in availableAreas" :key="area" :value="area">{{ area }}</option>
            </select>

            <!-- Ordenar -->
            <select
              v-model="sortBy"
              class="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
            >
              <option value="diferencia">Mayor holgura primero</option>
              <option value="corte_desc">Mayor puntaje de corte</option>
              <option value="corte_asc">Menor puntaje de corte</option>
              <option value="nombre">Por nombre</option>
            </select>
          </div>

          <!-- Lista -->
          <div v-if="filteredPrograms.length === 0" class="text-center py-12 text-slate-500">
            No hay programas que coincidan con los filtros.
          </div>

          <div v-else class="space-y-3">
            <!-- Header -->
            <p class="text-xs text-slate-500">
              Mostrando {{ filteredPrograms.length }} de {{ results.total }} programas
            </p>

            <!-- Cards -->
            <div
              v-for="(p, i) in paginatedPrograms"
              :key="i"
              class="bg-white rounded-2xl border transition-all hover:shadow-md hover:border-slate-300 overflow-hidden"
              :class="getBorderClass(p.diferencia)"
            >
              <div class="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">

                <!-- Info -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-start gap-2 mb-1">
                    <span
                      class="shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                      :class="getBadgeClass(p.diferencia)"
                    >
                      {{ getBadgeLabel(p.diferencia) }}
                    </span>
                    <span v-if="p.area_conocimiento" class="text-[10px] text-slate-500 font-medium uppercase tracking-wide truncate">
                      {{ p.area_conocimiento }}
                    </span>
                  </div>
                  <h3 class="font-semibold text-slate-900 text-sm leading-snug truncate">{{ p.nombre_carrera }}</h3>
                  <p class="text-xs text-slate-500 mt-0.5 truncate">
                    {{ p.nombre_institucion }}
                    <span v-if="p.nombre_sede && p.nombre_sede !== p.nombre_institucion"> · {{ p.nombre_sede }}</span>
                    <span v-if="p.region"> · {{ p.region }}</span>
                  </p>
                  <div class="flex flex-wrap gap-3 mt-2 text-[11px] text-slate-500">
                    <span v-if="p.jornada">{{ p.jornada }}</span>
                    <span v-if="p.grado_academico">{{ p.grado_academico }}</span>
                    <span v-if="p.arancel_anual">Arancel: <strong class="text-slate-600">{{ formatCLP(p.arancel_anual) }}</strong></span>
                    <span v-if="p.vacantes_semestre_1">{{ p.vacantes_semestre_1 }} vacantes</span>
                  </div>
                </div>

                <!-- Puntajes -->
                <div class="flex gap-6 shrink-0 text-center">
                  <div>
                    <p class="text-slate-500 text-[10px] uppercase font-semibold mb-0.5">Tu puntaje</p>
                    <p class="text-lg font-bold text-slate-900">{{ p.puntaje_calculado }}</p>
                  </div>
                  <div>
                    <p class="text-slate-500 text-[10px] uppercase font-semibold mb-0.5">Puntaje corte</p>
                    <p class="text-lg font-bold" :class="getScoreClass(p.diferencia)">{{ p.puntaje_corte_ultimo }}</p>
                  </div>
                  <div>
                    <p class="text-slate-500 text-[10px] uppercase font-semibold mb-0.5">Diferencia</p>
                    <p class="text-lg font-bold" :class="getScoreClass(p.diferencia)">
                      +{{ p.diferencia }}
                    </p>
                  </div>
                </div>

              </div>
            </div>

            <!-- Paginación -->
            <div v-if="filteredPrograms.length > pageSize" class="flex justify-center pt-4">
              <button
                class="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition"
                @click="page++"
              >
                Ver más resultados
              </button>
            </div>
          </div>
        </template>

        <!-- ── Estado vacío inicial ── -->
        <div v-if="!results && !loading" class="text-center py-16 space-y-3">
          <div class="w-16 h-16 mx-auto rounded-2xl bg-primary-50 flex items-center justify-center">
            <svg class="w-8 h-8 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p class="text-slate-500 text-sm">Completa tus puntajes y presiona <strong>Simular</strong> para ver los resultados.</p>
        </div>

      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Simulador PAES · KoraChile' })

// ── Campos del formulario ──
const requiredFields = [
  { key: 'nem',     label: 'NEM',     min: 400, max: 850,  placeholder: 'ej. 650' },
  { key: 'ranking', label: 'Ranking', min: 400, max: 850,  placeholder: 'ej. 620' },
  { key: 'cl',      label: 'Comp. Lectora', min: 100, max: 1000, placeholder: 'ej. 700' },
  { key: 'm1',      label: 'Matemática M1', min: 100, max: 1000, placeholder: 'ej. 680' },
]

const optionalFields = [
  { key: 'm2',       label: 'Matemática M2', min: 100, max: 1000, placeholder: 'opcional' },
  { key: 'historia', label: 'Historia',      min: 100, max: 1000, placeholder: 'opcional' },
  { key: 'ciencias', label: 'Ciencias',      min: 100, max: 1000, placeholder: 'opcional' },
]

interface Scores {
  nem: number | null
  ranking: number | null
  cl: number | null
  m1: number | null
  m2: number | null
  historia: number | null
  ciencias: number | null
  [key: string]: number | null
}

const scores = reactive<Scores>({
  nem: null, ranking: null, cl: null, m1: null,
  m2: null, historia: null, ciencias: null,
})

const canSimulate = computed(() =>
  scores.nem != null && scores.ranking != null && scores.cl != null && scores.m1 != null,
)

// ── Estado ──
const loading  = ref(false)
const error    = ref<string | null>(null)
const results  = ref<{ total: number; programs: any[] } | null>(null)

// Filtros y ordenamiento
const filterText = ref('')
const filterArea = ref('')
const sortBy     = ref('diferencia')
const page       = ref(0)
const pageSize   = 30

// ── Simular ──
async function simulate() {
  if (!canSimulate.value) {
    // Modo demo temporal: permite ver el modal sin llamar al backend.
    loading.value = true
    error.value = null
    await new Promise(resolve => setTimeout(resolve, 2200))
    loading.value = false
    return
  }
  loading.value = true
  error.value   = null
  results.value = null
  page.value    = 0

  try {
    const data = await $fetch('/api/paes-simulator', {
      method: 'POST',
      body: {
        nem:      scores.nem,
        ranking:  scores.ranking,
        cl:       scores.cl,
        m1:       scores.m1,
        m2:       scores.m2 ?? undefined,
        historia: scores.historia ?? undefined,
        ciencias: scores.ciencias ?? undefined,
      },
    })
    results.value = data as any
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Error al simular. Intenta de nuevo.'
  } finally {
    loading.value = false
  }
}

// ── Computed ──
const availableAreas = computed(() => {
  if (!results.value) return []
  return [...new Set(
    results.value.programs
      .map((p) => p.area_conocimiento)
      .filter(Boolean),
  )].sort()
})

const filteredPrograms = computed(() => {
  if (!results.value) return []
  let list = [...results.value.programs]

  if (filterText.value.trim()) {
    const q = filterText.value.toLowerCase()
    list = list.filter(
      (p) =>
        p.nombre_carrera?.toLowerCase().includes(q) ||
        p.nombre_institucion?.toLowerCase().includes(q),
    )
  }

  if (filterArea.value) {
    list = list.filter((p) => p.area_conocimiento === filterArea.value)
  }

  if (sortBy.value === 'diferencia') {
    list.sort((a, b) => b.diferencia - a.diferencia)
  } else if (sortBy.value === 'corte_desc') {
    list.sort((a, b) => b.puntaje_corte_ultimo - a.puntaje_corte_ultimo)
  } else if (sortBy.value === 'corte_asc') {
    list.sort((a, b) => a.puntaje_corte_ultimo - b.puntaje_corte_ultimo)
  } else if (sortBy.value === 'nombre') {
    list.sort((a, b) => a.nombre_carrera.localeCompare(b.nombre_carrera, 'es'))
  }

  return list
})

const paginatedPrograms = computed(() =>
  filteredPrograms.value.slice(0, (page.value + 1) * pageSize),
)

const uniqueInstitutions = computed(() =>
  new Set(results.value?.programs.map((p) => p.nombre_institucion)).size,
)
const uniqueAreas = computed(() =>
  new Set(results.value?.programs.map((p) => p.area_conocimiento).filter(Boolean)).size,
)
const uniqueRegions = computed(() =>
  new Set(results.value?.programs.map((p) => p.region).filter(Boolean)).size,
)

// Resetear paginación al cambiar filtros
watch([filterText, filterArea, sortBy], () => { page.value = 0 })

// ── Helpers visuales ──
function getBorderClass(diff: number) {
  if (diff >= 50) return 'border-emerald-200'
  if (diff >= 20) return 'border-blue-200'
  return 'border-amber-200'
}

function getBadgeClass(diff: number) {
  if (diff >= 50) return 'bg-emerald-50 text-emerald-700'
  if (diff >= 20) return 'bg-blue-50 text-blue-700'
  return 'bg-amber-50 text-amber-700'
}

function getBadgeLabel(diff: number) {
  if (diff >= 50) return 'Holgado'
  if (diff >= 20) return 'Bien'
  return 'Ajustado'
}

function getScoreClass(diff: number) {
  if (diff >= 50) return 'text-emerald-600'
  if (diff >= 20) return 'text-blue-600'
  return 'text-amber-600'
}

function formatCLP(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value)
}
</script>
