import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export interface PaesSimulatorScores {
  nem: number | null
  ranking: number | null
  cl: number | null
  m1: number | null
  m2: number | null
  historia: number | null
  ciencias: number | null
  [key: string]: number | null
}

export interface PaesSimulatorResults {
  total: number
  programs: any[]
}

interface PersistedPaesSimulatorState {
  scores: PaesSimulatorScores
  selectedAreas: string[]
  results: PaesSimulatorResults | null
  drawerOpen: boolean
  filterText: string
  filterArea: string
  filterRegion: string
  sortBy: string
  page: number
  cachedAt: number
}

const STORAGE_KEY = 'KoraChile:paes-simulator-state:v1'
const TTL_MS = 1000 * 60 * 60 * 12

function defaultScores(): PaesSimulatorScores {
  return {
    nem: null,
    ranking: null,
    cl: null,
    m1: null,
    m2: null,
    historia: null,
    ciencias: null,
  }
}

function normalizeScores(value: any): PaesSimulatorScores {
  const base = defaultScores()
  for (const key of Object.keys(base) as Array<keyof PaesSimulatorScores>) {
    const raw = value?.[key]
    base[key] = typeof raw === 'number' && Number.isFinite(raw) ? raw : null
  }
  return base
}

function normalizeResults(value: any): PaesSimulatorResults | null {
  if (!value || !Array.isArray(value.programs)) return null
  return {
    total: typeof value.total === 'number' && Number.isFinite(value.total)
      ? value.total
      : value.programs.length,
    programs: value.programs,
  }
}

function loadSnapshot(): PersistedPaesSimulatorState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedPaesSimulatorState
    if (!parsed?.cachedAt || Date.now() - parsed.cachedAt > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export const usePaesSimulatorStore = defineStore('paes-simulator', () => {
  const scores = ref<PaesSimulatorScores>(defaultScores())
  const selectedAreas = ref<string[]>([])
  const results = ref<PaesSimulatorResults | null>(null)
  const drawerOpen = ref(false)
  const filterText = ref('')
  const filterArea = ref('')
  const filterRegion = ref('')
  const sortBy = ref('diferencia')
  const page = ref(0)
  const hydrated = ref(false)

  function applySnapshot(snapshot: PersistedPaesSimulatorState | null) {
    scores.value = normalizeScores(snapshot?.scores)
    selectedAreas.value = Array.isArray(snapshot?.selectedAreas)
      ? snapshot!.selectedAreas.filter((item): item is string => typeof item === 'string')
      : []
    results.value = normalizeResults(snapshot?.results)
    drawerOpen.value = !!results.value && !!snapshot?.drawerOpen
    filterText.value = typeof snapshot?.filterText === 'string' ? snapshot.filterText : ''
    filterArea.value = typeof snapshot?.filterArea === 'string' ? snapshot.filterArea : ''
    filterRegion.value = typeof snapshot?.filterRegion === 'string' ? snapshot.filterRegion : ''
    sortBy.value = typeof snapshot?.sortBy === 'string' ? snapshot.sortBy : 'diferencia'
    page.value = typeof snapshot?.page === 'number' && Number.isFinite(snapshot.page)
      ? Math.max(0, snapshot.page)
      : 0
  }

  function persist() {
    if (typeof window === 'undefined') return
    try {
      const snapshot: PersistedPaesSimulatorState = {
        scores: scores.value,
        selectedAreas: selectedAreas.value,
        results: results.value,
        drawerOpen: !!results.value && drawerOpen.value,
        filterText: filterText.value,
        filterArea: filterArea.value,
        filterRegion: filterRegion.value,
        sortBy: sortBy.value,
        page: page.value,
        cachedAt: Date.now(),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
    } catch {
      // quota exceeded or malformed data - ignore gracefully
    }
  }

  function hydrate(force = false) {
    if (hydrated.value && !force) return
    applySnapshot(loadSnapshot())
    hydrated.value = true
  }

  function resetTransientFilters() {
    filterText.value = ''
    filterArea.value = ''
    filterRegion.value = ''
    sortBy.value = 'diferencia'
    page.value = 0
  }

  function setResultsSnapshot(next: PaesSimulatorResults | null) {
    results.value = normalizeResults(next)
    if (!results.value) {
      drawerOpen.value = false
      page.value = 0
    }
  }

  function clearPersistedState() {
    applySnapshot(null)
    hydrated.value = true
    if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY)
  }

  if (import.meta.client) {
    watch(
      [scores, selectedAreas, results, drawerOpen, filterText, filterArea, filterRegion, sortBy, page],
      () => {
        if (!hydrated.value) return
        persist()
      },
      { deep: true },
    )
  }

  return {
    scores,
    selectedAreas,
    results,
    drawerOpen,
    filterText,
    filterArea,
    filterRegion,
    sortBy,
    page,
    hydrated,
    hydrate,
    persist,
    resetTransientFilters,
    setResultsSnapshot,
    clearPersistedState,
  }
})