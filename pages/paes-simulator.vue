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

          <div class="relative z-10 flex max-w-xl flex-col justify-center space-y-4 px-5 py-8 sm:px-12 sm:py-14">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/25 text-white text-xs font-semibold uppercase tracking-wider w-fit">
              Simulador PAES 2026
            </span>
            <h1 class="text-2xl font-extrabold leading-tight text-white sm:text-4xl">
              ¿A qué carreras puedes entrar<br />
              <span class="text-sky-400"> con tu puntaje?</span>
            </h1>
            <p class="text-sm leading-relaxed text-white/75 sm:text-base">
              Ingresa tus puntajes PAES y NEM y calcula en segundos los programas reales a los que accedes, con datos oficiales MINEDUC.
            </p>
          </div>
        </div>

        <!-- ── Step 1: Selección de áreas ── -->
        <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center gap-3">
            <span class="w-6 h-6 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
            <h2 class="font-semibold text-slate-800 text-sm">¿En qué áreas quieres simular?</h2>
            <span class="ml-auto text-xs text-slate-500">{{ selectedAreas.length === 0 ? 'Todas las áreas' : `${selectedAreas.length} seleccionada${selectedAreas.length > 1 ? 's' : ''}` }}</span>
          </div>
          <div class="p-6">
            <p class="text-xs text-slate-500 mb-4">Elige una o más áreas para acotar los resultados. Si no seleccionas ninguna, se busca en todas.</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="a in AREAS_DISPONIBLES"
                :key="a.value"
                type="button"
                class="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all"
                :class="selectedAreas.includes(a.value)
                  ? 'bg-primary-600 border-primary-600 text-white shadow-sm shadow-primary-200'
                  : 'border-slate-200 text-slate-600 hover:border-primary-300 hover:text-primary-700 bg-white'"
                @click="toggleArea(a.value)"
              >
                <component :is="a.icon" class="w-4 h-4" />
                <span>{{ a.label }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- ── Step 2: Formulario de puntajes ── -->
        <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <!-- Header del form -->
          <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center gap-3">
            <span class="w-6 h-6 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
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
                    @input="clampOnInput(field.key, field.max)"
                    @blur="clampOnBlur(field.key, field.min, field.max)"
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
                    @input="clampOnInput(field.key, field.max)"
                    @blur="clampOnBlur(field.key, field.min, field.max)"
                  />
                  <p class="text-[11px] text-slate-500">100–1000</p>
                </div>
              </div>
            </div>

            <!-- CTA -->
            <div class="flex flex-col gap-1.5">
              <div class="flex flex-wrap gap-3 items-center">
                <button
                  :disabled="loading || !canSimulate"
                  class="px-8 py-3 rounded-2xl font-semibold text-sm text-white transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  :class="(canSimulate && !loading) ? 'bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-200' : 'bg-slate-400'"
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
                <button
                  v-if="results && !drawerOpen"
                  class="flex items-center gap-2 px-5 py-3 rounded-2xl border border-primary-200 bg-primary-50 text-primary-700 font-semibold text-sm hover:bg-primary-100 transition"
                  @click="drawerOpen = true"
                >
                  Ver resultados
                  <span class="bg-primary-100 text-primary-700 text-xs font-bold px-2 py-0.5 rounded-lg">{{ results.total.toLocaleString('es-CL') }}</span>
                </button>
              </div>
              <p v-if="!canSimulate" class="text-xs text-slate-500">
                Completa NEM, Ranking, Comp. Lectora y Matemática M1 para continuar.
              </p>
            </div>
          </div>
        </div>

        <!-- ── Error ── -->
        <div v-if="error" class="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-red-700 text-sm">
          {{ error }}
        </div>

      </div>
    </main>

    <!-- ── Overlay backdrop ── -->
    <Transition name="fade">
      <div
        v-if="results && drawerOpen"
        class="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm"
        @click="drawerOpen = false"
        ></div>
    </Transition>

    <!-- ── Results Drawer ── -->
    <Transition name="slide-right">
      <aside
        v-if="results && drawerOpen"
        class="fixed top-0 right-0 z-[70] h-full w-full sm:w-[520px] lg:w-[560px] flex flex-col bg-white shadow-2xl border-l border-slate-200"
      >
        <!-- Drawer header -->
        <div class="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-primary-600 mb-0.5">Resultados</p>
            <p class="font-bold text-slate-900 text-base leading-tight">
              {{ results.total.toLocaleString('es-CL') }}
              <span class="font-normal text-slate-500 text-sm">programas disponibles</span>
            </p>
            <div class="flex gap-4 mt-1.5">
              <span class="text-xs text-slate-500"><strong class="text-slate-700">{{ uniqueInstitutions }}</strong> inst.</span>
              <span class="text-xs text-slate-500"><strong class="text-slate-700">{{ uniqueAreas }}</strong> áreas</span>
              <span class="text-xs text-slate-500"><strong class="text-slate-700">{{ uniqueRegions }}</strong> regiones</span>
            </div>
          </div>
          <button
            class="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition"
            aria-label="Cerrar panel"
            @click="drawerOpen = false"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Filtros -->
          <div class="space-y-2 border-b border-slate-100 bg-white px-4 py-3 shrink-0">
          <!-- Búsqueda -->
          <div class="relative">
            <svg class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              v-model="filterText"
              type="text"
              placeholder="Filtrar por carrera o institución..."
              class="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
            />
          </div>
          <!-- Selects en fila -->
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <select
              v-model="filterArea"
              class="min-w-0 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 transition focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Todas las áreas</option>
              <option v-for="area in availableAreas" :key="area" :value="area">{{ area }}</option>
            </select>
            <select
              v-model="filterRegion"
              class="min-w-0 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 transition focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Todas las regiones</option>
              <option v-for="r in availableRegions" :key="r" :value="r">{{ REGIONES[r] ?? r }}</option>
            </select>
            <select
              v-model="sortBy"
              class="min-w-0 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 transition focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="diferencia">Mayor holgura</option>
              <option value="corte_desc">Mayor puntaje</option>
              <option value="corte_asc">Menor puntaje</option>
              <option value="nombre">Por nombre</option>
            </select>
          </div>
          <p class="text-[11px] leading-5 text-slate-400">
            Mostrando {{ Math.min(paginatedPrograms.length, filteredPrograms.length) }} de {{ filteredPrograms.length }} programas
          </p>
        </div>

        <!-- Lista (scrollable) -->
        <div class="flex-1 overflow-y-auto px-4 py-3 space-y-3">

          <div v-if="filteredPrograms.length === 0" class="text-center py-12 text-slate-500 text-sm">
            No hay programas que coincidan con los filtros.
          </div>

          <div
            v-for="(p, i) in paginatedPrograms"
            :key="p.program_unique_code || `${p.institution_code}-${p.nombre_carrera}`"
            class="bg-white rounded-2xl border transition-all hover:shadow-md hover:border-slate-300 overflow-hidden"
            :class="getBorderClass(p.diferencia)"
          >
            <div class="p-4 flex flex-col gap-3">

              <!-- Fila superior: logo + info + puntajes -->
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start">

                <div class="flex min-w-0 flex-1 items-start gap-3">

                  <!-- Logo institución -->
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <InstitutionLogo
                      :logo-url="p.institution_code ? logoCache.get(p.institution_code) ?? null : null"
                      :institution-name="p.nombre_institucion"
                      fallback-class="text-slate-400"
                    />
                  </div>

                  <!-- Info texto -->
                  <div class="min-w-0 flex-1">
                    <div class="mb-1 flex flex-wrap items-start gap-1.5">
                      <span
                        class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                        :class="getBadgeClass(p.diferencia)"
                      >
                        {{ getBadgeLabel(p.diferencia) }}
                      </span>
                      <span v-if="p.area_conocimiento" class="text-[10px] font-medium uppercase tracking-wide text-slate-500">{{ p.area_conocimiento }}</span>
                      <span v-if="p.nivel_carrera" class="rounded-md border border-violet-100 bg-violet-50 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">{{ p.nivel_carrera }}</span>
                    </div>
                    <h3 class="text-sm font-semibold leading-snug text-slate-900">{{ p.nombre_carrera }}</h3>
                    <p class="mt-0.5 text-xs text-slate-500">
                      {{ p.nombre_institucion }}
                      <span v-if="p.nombre_sede && p.nombre_sede !== p.nombre_institucion"> · {{ p.nombre_sede }}</span>
                      <span v-if="p.region"> · {{ REGIONES[p.region] ?? p.region }}</span>
                    </p>
                    <div class="mt-1.5 flex flex-wrap gap-2 text-[11px] text-slate-500">
                      <span v-if="p.jornada">{{ p.jornada }}</span>
                      <span v-if="p.duracion_formal_semestres">{{ p.duracion_formal_semestres }} sem.</span>
                      <span v-if="p.arancel_anual">Arancel: <strong class="text-slate-600">{{ formatCLP(p.arancel_anual) }}</strong></span>
                      <span v-if="p.vacantes_semestre_1">{{ p.vacantes_semestre_1 }} vacantes</span>
                    </div>
                    <div class="mt-1.5 flex flex-wrap gap-1">
                      <span v-if="p.pond_nem" class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">NEM {{ p.pond_nem }}%</span>
                      <span v-if="p.pond_ranking" class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">Rank {{ p.pond_ranking }}%</span>
                      <span v-if="p.pond_lenguaje" class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">Leng {{ p.pond_lenguaje }}%</span>
                      <span v-if="p.pond_matematicas" class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">M1 {{ p.pond_matematicas }}%</span>
                      <span v-if="p.pond_matematicas_2" class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">M2 {{ p.pond_matematicas_2 }}%</span>
                      <span v-if="p.pond_historia" class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">Hist {{ p.pond_historia }}%</span>
                      <span v-if="p.pond_ciencias" class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">Cs {{ p.pond_ciencias }}%</span>
                    </div>
                  </div>
                </div>

                <!-- Puntajes -->
                <div class="grid w-full grid-cols-3 gap-2 text-center sm:w-auto sm:min-w-[5.5rem] sm:grid-cols-1 sm:gap-1">
                  <div class="rounded-xl bg-slate-50 px-2 py-2 sm:px-3">
                    <p class="text-[10px] font-semibold uppercase text-slate-500">Tu pts.</p>
                    <p class="text-sm font-bold text-slate-900 sm:text-base">{{ formatScore(p.puntaje_calculado) }}</p>
                  </div>
                  <div class="rounded-xl bg-slate-50 px-2 py-2 sm:px-3">
                    <p class="text-[10px] font-semibold uppercase text-slate-500">Ref.</p>
                    <p class="text-sm font-bold sm:text-base" :class="getScoreClass(p.diferencia)">{{ formatScore(p.puntaje_referencia) }}</p>
                  </div>
                  <div class="rounded-xl bg-slate-50 px-2 py-2 sm:px-3">
                    <p class="text-[10px] font-semibold uppercase text-slate-500">Holgura</p>
                    <p class="text-sm font-bold sm:text-base" :class="getScoreClass(p.diferencia)">{{ formatSignedScore(p.diferencia) }}</p>
                  </div>
                </div>
              </div>

              <!-- Acciones -->
              <div class="flex flex-col gap-2 border-t border-slate-100 pt-1 sm:flex-row sm:items-center">
                <button
                  class="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold transition disabled:cursor-default disabled:opacity-80 sm:w-auto sm:justify-start sm:py-1.5"
                  :class="isInCompare(p.program_unique_code) ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'"
                  :disabled="isInCompare(p.program_unique_code)"
                  @click="queueProgramForCompare(p)"
                >
                  <Scale class="w-3.5 h-3.5" />
                  {{ isInCompare(p.program_unique_code) ? 'En comparar PAES' : 'Guardar en comparar PAES' }}
                </button>
                <NuxtLink
                  :to="`/careers/${p.program_unique_code}`"
                  class="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-2.5 py-2 text-xs font-semibold text-primary-700 transition hover:bg-primary-100 sm:w-auto sm:justify-start sm:py-1.5"
                >
                  Ver detalle →
                </NuxtLink>
              </div>

            </div>
          </div>

          <!-- Paginación -->
          <div v-if="paginatedPrograms.length < filteredPrograms.length" class="flex justify-center pt-2 pb-4">
            <button
              class="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition"
              @click="page++"
            >
              Ver más resultados
            </button>
          </div>

        </div>
      </aside>
    </Transition>

    <!-- ── Botón flotante para reabrir resultados ── -->
    <Transition name="fade">
      <button
        v-if="results && !drawerOpen"
        class="fixed bottom-6 right-6 z-[60] flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm shadow-xl shadow-primary-200 transition-all hover:-translate-y-0.5"
        @click="drawerOpen = true"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        Ver resultados
        <span class="bg-white/25 text-white text-xs font-bold px-2 py-0.5 rounded-lg">{{ results.total.toLocaleString('es-CL') }}</span>
      </button>
    </Transition>

  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Simulador PAES · KoraChile' })

import { storeToRefs } from 'pinia'
import { useInstitutionLogos } from '~/composables/useInstitutionLogos'
import { useProgramDetailStore } from '~/stores/programDetail'
import { usePaesSimulatorStore } from '~/stores/paesSimulator'
import {
  HeartPulse, Monitor, Cog, BookOpen, BarChart3,
  Scale, Paintbrush, Users, BookMarked, Leaf, FlaskConical,
} from 'lucide-vue-next'

const { prefetch: prefetchLogos, logoCache } = useInstitutionLogos()
const programDetailStore = useProgramDetailStore()
const paesSimulatorStore = usePaesSimulatorStore()
const {
  scores,
  selectedAreas,
  results,
  drawerOpen,
  filterText,
  filterArea,
  filterRegion,
  sortBy,
  page,
} = storeToRefs(paesSimulatorStore)
const COMPARE_PAES_PROGRAMS_KEY = 'KoraChile:compare:carrera-paes'
const compareProgramCodes = ref<string[]>([])

onMounted(() => {
  loadCompareProgramCodes()
  paesSimulatorStore.hydrate()

  const codes = (results.value?.programs ?? []).map((program: any) => program.institution_code).filter(Boolean)
  if (codes.length) prefetchLogos(codes)
})

function loadCompareProgramCodes() {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(COMPARE_PAES_PROGRAMS_KEY)
    const arr = raw ? JSON.parse(raw) : []
    compareProgramCodes.value = Array.isArray(arr)
      ? arr.map((item: any) => String(item?.program_unique_code || item?.code || '')).filter(Boolean)
      : []
  } catch {
    compareProgramCodes.value = []
  }
}

function isInCompare(code: string) {
  return compareProgramCodes.value.includes(code)
}

function queueProgramForCompare(program: any) {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(COMPARE_PAES_PROGRAMS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    const queue = Array.isArray(parsed) ? parsed : []

    if (queue.some((item: any) => String(item?.program_unique_code || item?.code || '') === program.program_unique_code)) {
      loadCompareProgramCodes()
      return
    }

    if (queue.length >= 4) queue.shift()

    const compareProgram = {
      ...program,
      source: 'paes-simulator',
      saved_from: 'carrera-paes',
    }

    queue.push(compareProgram)
    programDetailStore.set(program.program_unique_code, compareProgram)
    if (program.institution_data) programDetailStore.setInstitution(program.program_unique_code, program.institution_data)

    localStorage.setItem(COMPARE_PAES_PROGRAMS_KEY, JSON.stringify(queue))
    compareProgramCodes.value = queue
      .map((item: any) => String(item?.program_unique_code || item?.code || ''))
      .filter(Boolean)
  } catch (error: any) {
    console.warn('[paes-simulator] queue program for compare failed:', error?.message)
  }
}

// ── Regiones ──
const REGIONES: Record<string, string> = {
  'antofagasta':            'Antofagasta',
  'arica y parinacota':     'Arica y Parinacota',
  'atacama':                'Atacama',
  'aysen':                  'Aysén',
  'biobio':                 'Biobío',
  'coquimbo':               'Coquimbo',
  'la araucania':           'La Araucanía',
  "lib. gral. b. o'higgins": "O'Higgins",
  'los lagos':              'Los Lagos',
  'los rios':               'Los Ríos',
  'magallanes':             'Magallanes',
  'maule':                  'Maule',
  'metropolitana':          'Metropolitana',
  'nuble':                  'Ñuble',
  'tarapaca':               'Tarapacá',
  'valparaiso':             'Valparaíso',
}
const selectedRegion = ref('')

// ── Áreas disponibles (valores exactos de la BD: minúsculas sin tildes) ──
const AREAS_DISPONIBLES = [
  { value: 'salud',                     icon: HeartPulse,   label: 'Salud' },
  { value: 'tecnologia',                icon: Monitor,      label: 'Tecnología' },
  { value: 'educacion',                 icon: BookOpen,     label: 'Educación' },
  { value: 'administracion y comercio', icon: BarChart3,    label: 'Administración' },
  { value: 'derecho',                   icon: Scale,        label: 'Derecho' },
  { value: 'arte y arquitectura',       icon: Paintbrush,   label: 'Arte y Arq.' },
  { value: 'ciencias sociales',         icon: Users,        label: 'Cs. Sociales' },
  { value: 'humanidades',               icon: BookMarked,   label: 'Humanidades' },
  { value: 'agropecuaria',              icon: Leaf,         label: 'Agropecuaria' },
  { value: 'ciencias basicas',          icon: FlaskConical, label: 'Cs. Básicas' },
]

function toggleArea(area: string) {
  const idx = selectedAreas.value.indexOf(area)
  if (idx >= 0) selectedAreas.value.splice(idx, 1)
  else selectedAreas.value.push(area)
}

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

const canSimulate = computed(() =>
  scores.value.nem != null && scores.value.ranking != null && scores.value.cl != null && scores.value.m1 != null,
)

// ── Estado ──
const loading    = ref(false)
const error      = ref<string | null>(null)
const pageSize   = 30

const supabase = useSupabaseClient()

// ── Clamping de inputs ──
function clampOnInput(key: string, max: number) {
  const v = scores.value[key]
  if (v === null || v === undefined) return
  if (v < 0) scores.value[key] = 0
  if (v > max) scores.value[key] = max
}

function clampOnBlur(key: string, min: number, max: number) {
  const v = scores.value[key]
  if (v === null || v === undefined) return
  if (v < min) scores.value[key] = min
  if (v > max) scores.value[key] = max
}

// ── Simular ──
async function simulate() {
  if (!canSimulate.value) return
  loading.value = true
  error.value   = null

  try {
    const { data: { session } } = await supabase.auth.getSession()
    const data = await $fetch('/api/paes-simulator', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      body: {
        nem:      scores.value.nem,
        ranking:  scores.value.ranking,
        cl:       scores.value.cl,
        m1:       scores.value.m1,
        m2:       scores.value.m2 ?? undefined,
        historia: scores.value.historia ?? undefined,
        ciencias: scores.value.ciencias ?? undefined,
        areas:    selectedAreas.value.length ? selectedAreas.value : undefined,
      },
    })
    paesSimulatorStore.resetTransientFilters()
    paesSimulatorStore.setResultsSnapshot(data as any)
    drawerOpen.value = true
    // Pre-cargar logos de las instituciones devueltas
    const codes = (results.value?.programs ?? []).map((p: any) => p.institution_code).filter(Boolean)
    if (codes.length) prefetchLogos(codes)
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

const availableRegions = computed(() => {
  if (!results.value) return []
  return [...new Set(
    results.value.programs
      .map((p) => p.region)
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

  if (filterRegion.value) {
    list = list.filter((p) => p.region === filterRegion.value)
  }

  if (sortBy.value === 'diferencia') {
    list.sort((a, b) => b.diferencia - a.diferencia)
  } else if (sortBy.value === 'corte_desc') {
    list.sort((a, b) => b.puntaje_referencia - a.puntaje_referencia)
  } else if (sortBy.value === 'corte_asc') {
    list.sort((a, b) => a.puntaje_referencia - b.puntaje_referencia)
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
watch([filterText, filterArea, filterRegion, sortBy], () => { page.value = 0 })

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

function formatScore(value: number) {
  const truncatedValue = Math.trunc(value * 10) / 10
  return new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 }).format(truncatedValue)
}

function formatSignedScore(value: number) {
  const prefix = value > 0 ? '+' : ''
  return `${prefix}${formatScore(value)}`
}
</script>

<style scoped>
/* Drawer slide-in desde la derecha */
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.32s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
}

/* Fade overlay */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
