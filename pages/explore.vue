<template>
  <div class="min-h-screen flex flex-col bg-surface-50">
    <AppHeader />

    <main class="flex-1 pt-24 pb-16 px-6">
      <div class="max-w-7xl mx-auto space-y-8">

        <!-- Header -->
        <div class="space-y-2">
          <h1 class="text-4xl font-bold text-slate-900">Explorar Carreras</h1>
          <p class="text-slate-500">
            Fichas con datos oficiales SIES/Mineduc: salarios, empleabilidad e instituciones que las imparten en Chile.
          </p>
        </div>

        <!-- Filtros -->
        <div class="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
          <div class="flex flex-wrap gap-3 items-center">
            <div class="flex-1 min-w-[200px] max-w-md relative">
              <svg class="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Buscar carrera..."
                class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                @input="debouncedFetch"
              />
            </div>
            <div class="text-xs text-slate-500 flex items-center gap-2">
              <span v-if="!loading && total > 0">
                <strong class="text-slate-700">{{ total }}</strong> carreras encontradas
              </span>
            </div>
          </div>

          <div class="flex gap-2 flex-wrap">
            <button
              v-for="cat in CATEGORIES"
              :key="cat.value"
              @click="selectCategory(cat.value)"
              :class="[
                'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors border',
                selectedCategory === cat.value
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-primary-400 hover:text-primary-600'
              ]">
              <component v-if="cat.icon" :is="cat.icon" class="w-3.5 h-3.5" />
              {{ cat.label }}
            </button>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div v-for="n in 6" :key="n" class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 animate-pulse space-y-3">
            <div class="w-10 h-10 bg-slate-100 rounded-xl"></div>
            <div class="h-4 bg-slate-100 rounded w-2/3"></div>
            <div class="h-3 bg-slate-100 rounded w-full"></div>
            <div class="h-12 bg-slate-100 rounded mt-3"></div>
          </div>
        </div>

        <!-- Empty -->
        <div v-else-if="careers.length === 0" class="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div class="flex justify-center"><Search class="w-12 h-12 text-slate-400" /></div>
          <h2 class="text-xl font-bold text-slate-900">Sin resultados</h2>
          <p class="text-slate-500">Prueba otra búsqueda o categoría.</p>
          <button @click="resetFilters" class="btn-primary">Ver todas</button>
        </div>

        <!-- Grid -->
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <article
            v-for="career in careers"
            :key="career.id"
            class="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all p-6 flex flex-col gap-3 group relative">

            <!-- Save button -->
            <button
              @click.stop="toggleSave(career)"
              :class="[
                'absolute top-4 right-4 p-2 rounded-lg transition-all duration-200 active:scale-90',
                isSaved(career.id) ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' : 'hover:bg-slate-100 text-slate-500'
              ]"
              :title="isSaved(career.id) ? 'Quitar de guardados' : 'Guardar carrera'">
              <svg class="w-5 h-5" :class="isSaved(career.id) ? 'scale-110' : ''" :fill="isSaved(career.id) ? 'currentColor' : 'none'" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 19V5z" />
              </svg>
            </button>

            <!-- Header -->
            <div class="flex items-start gap-3 pr-10">
              <div class="shrink-0 rounded-xl bg-primary-50 border border-primary-100 p-2">
                <component :is="careerCategoryIcon(career.category)" class="w-6 h-6 text-primary-600" />
              </div>
              <div class="min-w-0">
                <h3 class="font-bold text-slate-900 group-hover:text-primary-600 transition-colors leading-tight">
                  {{ career.title }}
                </h3>
                <p class="text-xs text-slate-500 mt-0.5 line-clamp-2">{{ career.tagline }}</p>
              </div>
            </div>

            <!-- Demanda + categoría -->
            <div class="flex items-center gap-2 flex-wrap">
              <span :class="demandClass(career.job_demand)" class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                Demanda {{ career.job_demand || '—' }}
              </span>
              <span v-if="career.category" class="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">
                {{ career.category }}
              </span>
            </div>

            <!-- Skills -->
            <div class="flex flex-wrap gap-1">
              <span v-for="skill in career.skills?.slice(0, 3)" :key="skill"
                class="text-xs bg-slate-50 text-slate-600 border border-slate-100 px-2 py-0.5 rounded-full">
                {{ skill }}
              </span>
              <span v-if="career.skills?.length > 3" class="text-xs bg-slate-50 text-slate-500 border border-slate-100 px-2 py-0.5 rounded-full">
                +{{ career.skills.length - 3 }}
              </span>
            </div>

            <!-- Salary range from DB -->
            <div v-if="career.salary_junior || career.salary_mid || career.salary_senior" class="bg-gradient-to-br from-emerald-50 to-cyan-50 border border-emerald-100 rounded-xl p-3 space-y-2">
              <div class="flex items-center justify-between text-[11px] font-semibold text-emerald-700">
                <span class="inline-flex items-center gap-1"><Wallet class="w-3.5 h-3.5" />Sueldo SIES</span>
                <span class="text-slate-500 font-normal">CLP/mes</span>
              </div>
              <div class="grid grid-cols-3 gap-1.5 text-center">
                <div>
                  <p class="text-[10px] text-slate-500">Junior</p>
                  <p class="text-xs font-bold text-slate-800">{{ formatSalaryShort(career.salary_junior) }}</p>
                </div>
                <div class="border-l border-r border-emerald-100">
                  <p class="text-[10px] text-slate-500">Mid</p>
                  <p class="text-xs font-bold text-slate-800">{{ formatSalaryShort(career.salary_mid) }}</p>
                </div>
                <div>
                  <p class="text-[10px] text-slate-500">Senior</p>
                  <p class="text-xs font-bold text-emerald-700">{{ formatSalaryShort(career.salary_senior) }}</p>
                </div>
              </div>
            </div>

            <!-- CTA -->
            <NuxtLink
              :to="`/careers/${career.slug || career.id}`"
              class="mt-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary-50 text-primary-600 font-medium hover:bg-primary-100 active:scale-[0.98] transition-all duration-200 text-sm">
              <span>Ver ficha completa</span>
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </NuxtLink>
          </article>
        </div>

        <!-- Paginación numerada -->
        <div v-if="!loading && total > limit" class="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p class="text-xs text-slate-500">
            Página <strong>{{ currentPage }}</strong> de <strong>{{ totalPages }}</strong>
            · Mostrando {{ offset + 1 }}–{{ Math.min(offset + limit, total) }} de {{ total }}
          </p>
          <div class="flex items-center gap-1">
            <button
              :disabled="currentPage === 1"
              @click="goToPage(1)"
              class="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition">
              «
            </button>
            <button
              :disabled="currentPage === 1"
              @click="prevPage"
              class="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition">
              ← Anterior
            </button>
            <button
              v-for="p in visiblePages"
              :key="p"
              @click="goToPage(p)"
              :class="[
                'min-w-[36px] px-2.5 py-1.5 rounded-lg text-xs font-medium border transition',
                p === currentPage
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              ]">
              {{ p }}
            </button>
            <button
              :disabled="currentPage === totalPages"
              @click="nextPage"
              class="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition">
              Siguiente →
            </button>
            <button
              :disabled="currentPage === totalPages"
              @click="goToPage(totalPages)"
              class="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition">
              »
            </button>
          </div>
        </div>

      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { BarChart3, BookText, FlaskConical, HeartPulse, Laptop, Palette, Scale, Search, Sparkles, Wallet } from 'lucide-vue-next'
import { useCareerStore } from '~/stores/career'
import { useCareerCatalogStore } from '~/stores/careerCatalog'

useHead({ title: 'Explorar Carreras — KoraChile' })

const CATEGORIES = [
  { label: 'Todas', value: '', icon: null },
  { label: 'Tecnología', value: 'tecnologia', icon: Laptop },
  { label: 'Salud', value: 'salud', icon: HeartPulse },
  { label: 'Negocios', value: 'negocios', icon: BarChart3 },
  { label: 'Arte y Diseño', value: 'arte', icon: Palette },
  { label: 'Ciencias', value: 'ciencias', icon: FlaskConical },
  { label: 'Derecho', value: 'derecho', icon: Scale },
  { label: 'Educación', value: 'educacion', icon: BookText },
]

const CATEGORY_ICON_MAP: Record<string, Component> = {
  tecnologia: Laptop,
  salud: HeartPulse,
  negocios: BarChart3,
  arte: Palette,
  ciencias: FlaskConical,
  derecho: Scale,
  educacion: BookText,
}

const store = useCareerStore()
const catalogStore = useCareerCatalogStore()

const searchQuery = ref('')
const selectedCategory = ref('')
const careers = ref<any[]>([])
const total = ref(0)
const loading = ref(true)
const limit = 9
const offset = ref(0)

const currentPage = computed(() => Math.floor(offset.value / limit) + 1)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit)))

// Páginas visibles tipo: [1, 2, 3, 4, 5] centradas en current
const visiblePages = computed<number[]>(() => {
  const total_ = totalPages.value
  const cur = currentPage.value
  const max = 5
  if (total_ <= max) return Array.from({ length: total_ }, (_, i) => i + 1)
  let start = Math.max(1, cur - 2)
  let end = start + max - 1
  if (end > total_) {
    end = total_
    start = Math.max(1, end - max + 1)
  }
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})

async function fetchCareers() {
  loading.value = true
  const result = await catalogStore.fetch({
    q: searchQuery.value || undefined,
    category: selectedCategory.value || undefined,
    limit,
    offset: offset.value,
  })
  careers.value = result.careers
  total.value = result.total
  loading.value = false
}

let debounceTimer: ReturnType<typeof setTimeout>
function debouncedFetch() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    offset.value = 0
    fetchCareers()
  }, 300)
}

function selectCategory(cat: string) {
  selectedCategory.value = cat
  offset.value = 0
  fetchCareers()
}

function resetFilters() {
  searchQuery.value = ''
  selectedCategory.value = ''
  offset.value = 0
  fetchCareers()
}

function careerCategoryIcon(category?: string | null): Component {
  return CATEGORY_ICON_MAP[category || ''] || Sparkles
}

function goToPage(p: number) {
  offset.value = (p - 1) * limit
  fetchCareers()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function nextPage() {
  if (currentPage.value < totalPages.value) goToPage(currentPage.value + 1)
}

function prevPage() {
  if (currentPage.value > 1) goToPage(currentPage.value - 1)
}

function formatSalaryShort(n: number | null | undefined): string {
  if (!n) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`
  return `$${n}`
}

function demandClass(demand: string | null | undefined) {
  const map: Record<string, string> = {
    'Muy Alta': 'bg-emerald-100 text-emerald-700',
    'Alta': 'bg-blue-100 text-blue-700',
    'Media': 'bg-amber-100 text-amber-700',
    'Baja': 'bg-red-100 text-red-700',
  }
  return map[demand || ''] ?? 'bg-slate-100 text-slate-600'
}

// ── Saved careers ──
function isSaved(careerId: string) {
  return store.savedCareers.some(c => c.careerData.id === careerId)
}

function toggleSave(career: any) {
  const existing = store.savedCareers.find(c => c.careerData.id === career.id)
  if (existing) {
    store.removeSavedCareer(existing.id)
  } else {
    // Adapta la fila DB a la forma CareerVariation que espera el store
    store.addSavedCareer({
      id: career.id,
      title: career.title,
      tagline: career.tagline,
      description: career.description ?? career.tagline ?? '',
      emoji: career.emoji,
      match_score: 100,
      skills: career.skills ?? [],
      pros: career.pros ?? [],
      cons: career.cons ?? [],
      salary_range: {
        junior: career.salary_junior ?? 0,
        mid: career.salary_mid ?? 0,
        senior: career.salary_senior ?? 0,
        currency: 'CLP',
      },
      job_demand: career.job_demand ?? 'Media',
      personality_types: career.personality_types ?? [],
      fun_facts: career.fun_facts ?? [],
      roadmap: career.roadmap ?? [],
      books: career.books ?? [],
      notable_people: career.notable_people ?? [],
      universities: [],
      curriculum: [],
    } as any)
  }
}

onMounted(fetchCareers)
</script>
