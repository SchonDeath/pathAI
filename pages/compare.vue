<template>
  <div class="min-h-screen flex flex-col bg-surface-50">
    <AppHeader />

    <main class="flex-1 pt-24 pb-16 px-6">
      <div class="max-w-7xl mx-auto space-y-8">

        <!-- Header -->
        <div class="space-y-2">
          <h1 class="text-4xl font-bold text-slate-900">Comparar Carreras</h1>
          <p class="text-slate-500">Selecciona 2 a 4 carreras y compara mallas, salarios e instituciones.</p>
        </div>

        <!-- Comparador desde Chat (programas reales MINEDUC) -->
        <div class="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <h2 class="font-semibold text-slate-800">Programas agregados desde Chat <span class="text-slate-500 font-normal">({{ filteredPrograms.length }}/{{ selectedPrograms.length }})</span></h2>
            <div class="flex gap-2 flex-wrap">
              <button
                @click="reloadProgramDetails"
                :disabled="selectedPrograms.length === 0 || loadingPrograms"
                class="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-40">
                {{ loadingPrograms ? 'Cargando...' : 'Actualizar datos' }}
              </button>
              <NuxtLink to="/chat" class="px-3 py-1.5 rounded-lg border border-primary-200 text-xs font-semibold text-primary-700 hover:bg-primary-50 transition">
                + Agregar desde chat
              </NuxtLink>
              <button
                @click="clearProgramQueue"
                :disabled="selectedPrograms.length === 0"
                class="px-3 py-1.5 rounded-lg border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 transition disabled:opacity-40">
                Limpiar
              </button>
            </div>
          </div>

          <!-- Filtros -->
          <div v-if="selectedPrograms.length > 1" class="flex flex-wrap gap-2 items-center text-xs">
            <span class="text-slate-500 font-medium">Filtrar:</span>
            <select v-model="filterTipo" class="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">Todos los tipos</option>
              <option v-for="t in availableTipos" :key="t" :value="t">{{ t }}</option>
            </select>
            <select v-model="filterRegion" class="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">Todas las regiones</option>
              <option v-for="r in availableRegiones" :key="r" :value="r">{{ r }}</option>
            </select>
            <button v-if="filterTipo || filterRegion" @click="filterTipo = ''; filterRegion = ''" class="text-primary-600 hover:underline">Limpiar filtros</button>
          </div>

          <div v-if="selectedPrograms.length === 0" class="text-sm text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center">
            Aún no agregas programas desde el chat. <NuxtLink to="/chat" class="text-primary-600 font-semibold hover:underline">Ir al chat</NuxtLink> y usa "+ Comparar" en las cards.
          </div>

          <div v-else class="flex flex-wrap gap-2">
            <div
              v-for="p in selectedPrograms"
              :key="p.program_unique_code"
              :title="`${p.nombre_carrera} · ${p.nombre_institucion}${p.region ? ' · ' + p.region : ''}`"
              class="flex items-center gap-2 px-3 py-1.5 bg-primary-50 border border-primary-200 text-primary-800 rounded-full text-sm font-medium cursor-help">
              <span class="font-semibold">{{ p.nombre_carrera }}</span>
              <span class="text-primary-500 text-xs">· {{ p.nombre_institucion }}</span>
              <button @click="removeProgram(p.program_unique_code)" class="ml-1 text-primary-500 hover:text-primary-800 transition">×</button>
            </div>
          </div>

          <!-- Skeleton mientras carga los detalles -->
          <div v-if="loadingPrograms && selectedPrograms.length > 0" class="space-y-3 animate-pulse">
            <!-- Cabecera de tabla skeleton -->
            <div class="overflow-x-auto border border-slate-200 rounded-xl p-5">
              <div class="flex gap-6">
                <div class="w-44 shrink-0">
                  <div class="h-3 bg-slate-200 rounded w-1/2 mb-8"></div>
                  <div v-for="i in 7" :key="i" class="h-3 bg-slate-100 rounded mb-4" :style="`width: ${50 + (i * 9) % 35}%`"></div>
                </div>
                <div v-for="p in selectedPrograms" :key="p.program_unique_code" class="flex-1 min-w-[180px]">
                  <div class="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                  <div class="h-3 bg-slate-100 rounded w-1/2 mb-6"></div>
                  <div v-for="j in 7" :key="j" class="h-3 bg-slate-100 rounded mb-4 w-2/3"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Single program detail card -->
          <div v-if="!loadingPrograms && filteredPrograms.length === 1" class="border border-slate-200 rounded-xl p-5 bg-gradient-to-br from-primary-50/40 to-white">
            <div class="flex items-start justify-between gap-3 flex-wrap">
              <div class="space-y-1">
                <h3 class="text-lg font-bold text-slate-900">{{ filteredPrograms[0].nombre_carrera }}</h3>
                <p class="text-sm text-slate-600">{{ filteredPrograms[0].nombre_institucion }} — {{ filteredPrograms[0].nombre_sede || filteredPrograms[0].region }}</p>
                <div class="flex flex-wrap gap-2 pt-1">
                  <span v-if="gratuidadLabel(filteredPrograms[0])" class="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">✓ {{ gratuidadLabel(filteredPrograms[0]) }}</span>
                  <span v-if="filteredPrograms[0].acreditacion_programa" class="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">Acreditado: {{ filteredPrograms[0].acreditacion_programa }}</span>
                </div>
              </div>
              <div class="flex gap-2">
                <button @click="toggleSaveFavorite(filteredPrograms[0])" class="px-3 py-1.5 rounded-lg border text-xs font-semibold transition" :class="isFavorite(filteredPrograms[0].program_unique_code) ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'">
                  {{ isFavorite(filteredPrograms[0].program_unique_code) ? '★ Guardada' : '☆ Guardar' }}
                </button>
                <NuxtLink to="/chat" class="px-3 py-1.5 rounded-lg border border-primary-200 bg-primary-50 text-primary-700 text-xs font-semibold hover:bg-primary-100 transition">+ Comparar con otra</NuxtLink>
              </div>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div class="text-xs"><div class="text-slate-500">Arancel anual</div><div class="font-semibold text-slate-800">{{ formatMoney(filteredPrograms[0].arancel_anual) }}</div></div>
              <div class="text-xs"><div class="text-slate-500">Duración</div><div class="font-semibold text-slate-800">{{ filteredPrograms[0].duracion_formal_semestres ? filteredPrograms[0].duracion_formal_semestres + ' sem' : '—' }}</div></div>
              <div class="text-xs"><div class="text-slate-500">Jornada</div><div class="font-semibold text-slate-800">{{ filteredPrograms[0].jornada || '—' }}</div></div>
              <div class="text-xs"><div class="text-slate-500">Puntaje corte</div><div class="font-semibold text-slate-800">{{ filteredPrograms[0].puntaje_corte_ultimo ?? '—' }}</div></div>
            </div>
          </div>

          <div v-if="!loadingPrograms && filteredPrograms.length >= 2" class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-slate-200">
                  <th class="text-left py-3 pr-4 font-semibold text-slate-500 w-44">Criterio</th>
                  <th v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4 text-left font-bold text-slate-900 min-w-[240px]">
                    <div class="line-clamp-2">{{ p.nombre_carrera }}</div>
                    <div class="text-xs font-medium text-slate-500 mt-1">{{ p.nombre_institucion }}</div>
                    <div class="flex flex-wrap gap-1 mt-2">
                      <span v-if="gratuidadLabel(p)" class="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">✓ {{ gratuidadLabel(p) }}</span>
                      <span v-if="p.acreditacion_programa" class="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">{{ p.acreditacion_programa }}</span>
                    </div>
                    <button @click="toggleSaveFavorite(p)" class="mt-2 w-full px-2 py-1 rounded-md border text-[11px] font-semibold transition" :class="isFavorite(p.program_unique_code) ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'">
                      {{ isFavorite(p.program_unique_code) ? '★ Guardada' : '☆ Guardar favorita' }}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Arancel anual</td>
                  <td v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4 font-semibold text-slate-800">{{ formatMoney(p.arancel_anual) }}</td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Matrícula anual</td>
                  <td v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4">{{ formatMoney(p.matricula_anual) }}</td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Duración formal</td>
                  <td v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4">{{ p.duracion_formal_semestres ? `${p.duracion_formal_semestres} semestres` : '—' }}</td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Jornada / Modalidad</td>
                  <td v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4">{{ p.jornada || '—' }} <span v-if="p.modalidad" class="text-slate-500">· {{ p.modalidad }}</span></td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Región / Sede</td>
                  <td v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4">{{ p.nombre_sede || '—' }}<div class="text-xs text-slate-500">{{ p.region || '' }}</div></td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Tipo de institución</td>
                  <td v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4">{{ p.tipo_institucion || '—' }}</td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Gratuidad</td>
                  <td v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4">
                    <span v-if="gratuidadLabel(p)" class="text-xs font-semibold text-emerald-700">✓ {{ gratuidadLabel(p) }}</span>
                    <span v-else class="text-xs text-slate-500">No aplica</span>
                  </td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Acreditación programa</td>
                  <td v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4">{{ p.acreditacion_programa || '—' }}</td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Puntaje corte último</td>
                  <td v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4">{{ p.puntaje_corte_ultimo ?? '—' }}</td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Puntaje corte primero</td>
                  <td v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4">{{ p.puntaje_corte_primero ?? '—' }}</td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Ponderaciones PAES</td>
                  <td v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4">
                    <div class="flex flex-wrap gap-1">
                      <span v-if="p.pond_nem" class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">NEM {{ p.pond_nem }}%</span>
                      <span v-if="p.pond_ranking" class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">Rk {{ p.pond_ranking }}%</span>
                      <span v-if="p.pond_lenguaje" class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">Leng {{ p.pond_lenguaje }}%</span>
                      <span v-if="p.pond_matematicas" class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">M1 {{ p.pond_matematicas }}%</span>
                      <span v-if="p.pond_matematicas_2" class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">M2 {{ p.pond_matematicas_2 }}%</span>
                      <span v-if="p.pond_historia" class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">Hist {{ p.pond_historia }}%</span>
                      <span v-if="p.pond_ciencias" class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">Cs {{ p.pond_ciencias }}%</span>
                    </div>
                  </td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Vacantes</td>
                  <td v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4">{{ (p.vacantes_semestre_1 || 0) + (p.vacantes_semestre_2 || 0) || '—' }}</td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Matrícula 1er año 2025</td>
                  <td v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4">{{ p.matricula_primer_ano_2025 ?? '—' }}<span v-if="p.porcentaje_matricula_primer_ano_2025" class="text-xs text-slate-500 ml-1">({{ p.porcentaje_matricula_primer_ano_2025 }}%)</span></td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Titulados 2024</td>
                  <td v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4">{{ p.titulacion_total_2024 ?? '—' }}</td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Empleabilidad 1er/2do año</td>
                  <td v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4">
                    <span v-if="employabilityMap[p.program_unique_code]">
                      {{ employabilityMap[p.program_unique_code].e1 ?? '—' }}% / {{ employabilityMap[p.program_unique_code].e2 ?? '—' }}%
                    </span>
                    <span v-else class="text-slate-500">—</span>
                  </td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Ingreso 1er / 4° año</td>
                  <td v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4">
                    <span v-if="employabilityMap[p.program_unique_code]">
                      {{ formatMoney(employabilityMap[p.program_unique_code].i1) }} / {{ formatMoney(employabilityMap[p.program_unique_code].i4) }}
                    </span>
                    <span v-else class="text-slate-500">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- (Sección legacy eliminada: la comparación ahora trabaja 100% sobre programas reales agregados desde el chat) -->

        <!-- Comparador de instituciones (desde Ranking) -->
        <div class="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <h2 class="font-semibold text-slate-800">
              🏆 Instituciones agregadas desde Ranking
              <span class="text-slate-500 font-normal">({{ selectedInstitutions.length }}/4)</span>
            </h2>
            <div class="flex gap-2 flex-wrap">
              <NuxtLink to="/ranking" class="px-3 py-1.5 rounded-lg border border-accent-200 text-xs font-semibold text-accent-700 hover:bg-accent-50 transition">
                + Agregar desde ranking
              </NuxtLink>
              <button
                @click="clearInstitutionQueue"
                :disabled="selectedInstitutions.length === 0"
                class="px-3 py-1.5 rounded-lg border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 transition disabled:opacity-40">
                Limpiar
              </button>
            </div>
          </div>

          <div v-if="selectedInstitutions.length === 0" class="text-sm text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center">
            Aún no agregas instituciones.
            <NuxtLink to="/ranking" class="text-accent-600 font-semibold hover:underline">Ir al ranking</NuxtLink>
            y usa "⚖️ Agregar a comparador".
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-slate-200">
                  <th class="py-3 text-left font-semibold text-slate-600">Indicador</th>
                  <th
                    v-for="inst in selectedInstitutions"
                    :key="inst.institution_code"
                    class="py-3 px-3 text-left font-semibold text-slate-700 min-w-[180px]">
                    <div class="flex items-start justify-between gap-2">
                      <span class="truncate max-w-[180px]" :title="inst.nombre_institucion">{{ inst.nombre_institucion }}</span>
                      <button @click="removeInstitution(inst.institution_code)" class="text-slate-500 hover:text-red-600 font-bold shrink-0">×</button>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr>
                  <td class="py-3 text-slate-500 font-medium">Score global</td>
                  <td v-for="inst in selectedInstitutions" :key="inst.institution_code" class="py-3 px-3">
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-primary-50 to-accent-50 border border-primary-100 font-bold" :class="instScoreColor(inst.score)">
                      {{ inst.score }}/100
                    </span>
                  </td>
                </tr>
                <tr>
                  <td class="py-3 text-slate-500 font-medium">Tipo</td>
                  <td v-for="inst in selectedInstitutions" :key="inst.institution_code" class="py-3 px-3 text-slate-700">{{ inst.tipo_institucion || '—' }}</td>
                </tr>
                <tr>
                  <td class="py-3 text-slate-500 font-medium">Acreditación</td>
                  <td v-for="inst in selectedInstitutions" :key="inst.institution_code" class="py-3 px-3">
                    <span v-if="inst.acreditacion_anos" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">🏅 {{ inst.acreditacion_anos }} años</span>
                    <span v-else class="text-slate-500">—</span>
                  </td>
                </tr>
                <tr>
                  <td class="py-3 text-slate-500 font-medium">Retención 1er año</td>
                  <td v-for="inst in selectedInstitutions" :key="inst.institution_code" class="py-3 px-3 text-slate-700">
                    {{ inst.retencion_1er_ano_pct ? inst.retencion_1er_ano_pct.toFixed(1) + '%' : '—' }}
                  </td>
                </tr>
                <tr>
                  <td class="py-3 text-slate-500 font-medium">Promedio PAES</td>
                  <td v-for="inst in selectedInstitutions" :key="inst.institution_code" class="py-3 px-3 text-slate-700">
                    {{ inst.promedio_paes ? Math.round(inst.promedio_paes) : '—' }}
                  </td>
                </tr>
                <tr>
                  <td class="py-3 text-slate-500 font-medium">Matrícula pregrado</td>
                  <td v-for="inst in selectedInstitutions" :key="inst.institution_code" class="py-3 px-3 text-slate-700">
                    {{ inst.matricula_pregrado_actual ? new Intl.NumberFormat('es-CL').format(inst.matricula_pregrado_actual) : '—' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Comparar Carreras — KoraChile' })

import { useAuthStore } from '~/stores/auth'

const route = useRoute()
const authStore = useAuthStore()
const supabase = useSupabaseClient()
const COMPARE_PROGRAMS_KEY = 'KoraChile:compare:programs'
const COMPARE_INSTITUTIONS_KEY = 'KoraChile:compare:institutions'

interface CompareInstitution {
  institution_code: number
  nombre_institucion: string
  tipo_institucion: string | null
  acreditacion_anos: number | null
  retencion_1er_ano_pct: number | null
  promedio_paes: number | null
  matricula_pregrado_actual: number | null
  score: number
}

const selectedInstitutions = ref<CompareInstitution[]>([])

function loadInstitutionQueue() {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(COMPARE_INSTITUTIONS_KEY)
    const arr = raw ? JSON.parse(raw) : []
    selectedInstitutions.value = Array.isArray(arr) ? arr.slice(0, 4) : []
  } catch {
    selectedInstitutions.value = []
  }
}

function persistInstitutionQueue() {
  if (typeof window === 'undefined') return
  localStorage.setItem(COMPARE_INSTITUTIONS_KEY, JSON.stringify(selectedInstitutions.value.slice(0, 4)))
}

function removeInstitution(code: number) {
  selectedInstitutions.value = selectedInstitutions.value.filter(i => i.institution_code !== code)
  persistInstitutionQueue()
}

function clearInstitutionQueue() {
  selectedInstitutions.value = []
  if (typeof window !== 'undefined') localStorage.removeItem(COMPARE_INSTITUTIONS_KEY)
}

function instScoreColor(s: number): string {
  if (s >= 80) return 'text-emerald-700'
  if (s >= 65) return 'text-primary-700'
  if (s >= 50) return 'text-amber-700'
  return 'text-slate-600'
}

const selectedPrograms = ref<any[]>([])
const programDetails = ref<any[]>([])
const loadingPrograms = ref(false)
const filterTipo = ref('')
const filterRegion = ref('')
const savedFavorites = ref<any[]>([])
const employabilityMap = ref<Record<string, { e1: number|null; e2: number|null; i1: number|null; i4: number|null }>>({})
const FAVORITES_KEY = 'KoraChile:saved:programs'

const filteredPrograms = computed(() => {
  return programDetails.value.filter(p => {
    if (filterTipo.value && p.tipo_institucion !== filterTipo.value) return false
    if (filterRegion.value && p.region !== filterRegion.value) return false
    return true
  })
})

const availableTipos = computed(() => [...new Set(programDetails.value.map((p: any) => p.tipo_institucion).filter(Boolean))])
const availableRegiones = computed(() => [...new Set(programDetails.value.map((p: any) => p.region).filter(Boolean))])

function gratuidadLabel(p: any) {
  if (!p?.tipo_institucion) return null
  const acr = String(p.acreditacion_programa || '').toLowerCase()
  const tipo = String(p.tipo_institucion).toLowerCase()
  // Heurística: programas acreditados en instituciones CRUCH / adheridas a gratuidad suelen aplicar.
  if (tipo.includes('centros de formación') || tipo.includes('institutos profesionales')) return 'Aplica si la IES está adscrita'
  if (tipo.includes('universidades') && acr && !acr.includes('no ')) return 'Aplica si U. adherida'
  return null
}

function loadFavorites() {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    savedFavorites.value = raw ? JSON.parse(raw) : []
  } catch { savedFavorites.value = [] }
}
function isFavorite(code: string) {
  return savedFavorites.value.some((x: any) => x.program_unique_code === code)
}
async function toggleSaveFavorite(p: any) {
  if (typeof window === 'undefined') return
  const already = isFavorite(p.program_unique_code)
  if (already) {
    savedFavorites.value = savedFavorites.value.filter((x: any) => x.program_unique_code !== p.program_unique_code)
  } else {
    savedFavorites.value.push({
      program_unique_code: p.program_unique_code,
      nombre_carrera: p.nombre_carrera,
      nombre_institucion: p.nombre_institucion,
      tipo_institucion: p.tipo_institucion,
      region: p.region,
      arancel_anual: p.arancel_anual,
      saved_at: new Date().toISOString(),
    })
  }
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(savedFavorites.value))

  // Sync con Supabase si hay sesión (tabla saved)
  const userId = authStore.profile?.id
  if (userId) {
    try {
      if (already) {
        await supabase
          .from('saved')
          .delete()
          .eq('user_id', userId)
          .eq('program_unique_code', p.program_unique_code)
      } else {
        await supabase
          .from('saved')
          .upsert({
            user_id: userId,
            program_unique_code: p.program_unique_code,
            notes: `${p.nombre_carrera} · ${p.nombre_institucion}`,
          }, { onConflict: 'user_id,program_unique_code' })
      }
    } catch (e) {
      // Si la migración no se aplicó aún, queda en localStorage como respaldo
      console.warn('[compare] No se pudo sincronizar favorito:', e)
    }
  }
}

let debounce: ReturnType<typeof setTimeout>

function formatSalary(n: number | null) {
  if (!n) return '—'
  return new Intl.NumberFormat('es-CL').format(n)
}
function demandClass(d: string) {
  const m: Record<string, string> = { 'Muy Alta': 'bg-emerald-100 text-emerald-700', 'Alta': 'bg-blue-100 text-blue-700', 'Media': 'bg-amber-100 text-amber-700', 'Baja': 'bg-red-100 text-red-700' }
  return m[d] ?? 'bg-slate-100 text-slate-600'
}

function loadProgramQueue() {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(COMPARE_PROGRAMS_KEY)
    if (!raw) {
      selectedPrograms.value = []
      return
    }
    const arr = JSON.parse(raw)
    selectedPrograms.value = Array.isArray(arr) ? arr.slice(0, 4) : []
  } catch {
    selectedPrograms.value = []
  }
}

function persistProgramQueue() {
  if (typeof window === 'undefined') return
  localStorage.setItem(COMPARE_PROGRAMS_KEY, JSON.stringify(selectedPrograms.value.slice(0, 4)))
}

function removeProgram(code: string) {
  selectedPrograms.value = selectedPrograms.value.filter(p => p.program_unique_code !== code)
  programDetails.value = programDetails.value.filter(p => p.program_unique_code !== code)
  persistProgramQueue()
}

function clearProgramQueue() {
  selectedPrograms.value = []
  programDetails.value = []
  if (typeof window !== 'undefined') localStorage.removeItem(COMPARE_PROGRAMS_KEY)
}

async function reloadProgramDetails() {
  if (!selectedPrograms.value.length) {
    programDetails.value = []
    return
  }
  loadingPrograms.value = true
  try {
    const details = await Promise.all(selectedPrograms.value.map(async (p) => {
      try {
        const res = await $fetch('/api/tools/get-program-detail', {
          method: 'GET',
          query: { program_unique_code: p.program_unique_code },
        }) as any
        if (res?.match === 'exact' && res.program) return res.program
        // Fallback: mostrar lo que tenemos del queue si el detalle falla
        return {
          program_unique_code: p.program_unique_code,
          nombre_carrera: p.nombre_carrera,
          nombre_institucion: p.nombre_institucion,
          tipo_institucion: p.tipo_institucion,
          region: p.region,
          arancel_anual: p.arancel_anual,
          duracion_formal_semestres: p.duracion_formal_semestres,
        }
      } catch {
        return {
          program_unique_code: p.program_unique_code,
          nombre_carrera: p.nombre_carrera,
          nombre_institucion: p.nombre_institucion,
          tipo_institucion: p.tipo_institucion,
          region: p.region,
          arancel_anual: p.arancel_anual,
          duracion_formal_semestres: p.duracion_formal_semestres,
        }
      }
    }))

    programDetails.value = details.filter(Boolean)
    // Empleabilidad por carrera genérica (si hay)
    await Promise.all(programDetails.value.map(async (p: any) => {
      if (!p?.area_carrera_generica || !p?.tipo_institucion) return
      try {
        const stats = await $fetch('/api/tools/career-stats-detailed', {
          method: 'GET',
          query: {
            nombre_carrera_generica: p.area_carrera_generica,
            tipo_institucion: p.tipo_institucion,
          },
        }) as any
        const s = Array.isArray(stats?.stats) ? stats.stats[0] : null
        if (s) {
          employabilityMap.value[p.program_unique_code] = {
            e1: s.empleabilidad_pct?.primer_ano ?? null,
            e2: s.empleabilidad_pct?.segundo_ano ?? null,
            i1: s.ingresos_clp?.primer_ano ?? null,
            i4: s.ingresos_clp?.cuarto_ano ?? null,
          }
        }
      } catch {
        // silencio
      }
    }))
  } finally {
    loadingPrograms.value = false
  }
}

function formatMoney(v?: number | null) {
  if (!v) return '—'
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(v)
}

onMounted(async () => {
  loadProgramQueue()
  loadFavorites()
  loadInstitutionQueue()
  if (selectedPrograms.value.length) {
    await reloadProgramDetails()
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage)
    document.addEventListener('visibilitychange', onVisibility)
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('storage', onStorage)
    document.removeEventListener('visibilitychange', onVisibility)
  }
})

function onStorage(e: StorageEvent) {
  if (e.key === COMPARE_PROGRAMS_KEY) {
    loadProgramQueue()
    reloadProgramDetails()
  } else if (e.key === FAVORITES_KEY) {
    loadFavorites()
  } else if (e.key === COMPARE_INSTITUTIONS_KEY) {
    loadInstitutionQueue()
  }
}
async function onVisibility() {
  if (document.visibilityState === 'visible') {
    const prevCount = selectedPrograms.value.length
    loadProgramQueue()
    if (selectedPrograms.value.length !== prevCount) {
      await reloadProgramDetails()
    }
  }
}
</script>
