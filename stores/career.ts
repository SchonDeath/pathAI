import { defineStore } from 'pinia'

export interface CareerRoadmapPhase {
  phase: string
  duration: string
  milestones: string[]
  theory?: string[]
}

export interface SalaryRange {
  junior: number | null
  mid: number | null
  senior: number | null
  currency: string
}

export interface CareerBook {
  title: string
  author: string
  description: string
  emoji: string
}

export interface NotablePerson {
  name: string
  role: string
  country: string
  contribution: string
  emoji: string
}

export interface CurriculumSemester {
  semester: number
  subjects: string[]
}

export interface CareerVariation {
  id: string
  title: string
  tagline: string
  description: string
  emoji: string
  match_score: number
  pros: string[]
  cons: string[]
  skills: string[]
  roadmap: CareerRoadmapPhase[]
  salary_range?: SalaryRange
  salary_source?: 'sies' | 'none'
  salary_label?: string
  salary_year?: number
  matched_career?: string
  personality_types?: string[]
  books?: CareerBook[]
  fun_facts?: string[]
  job_demand?: string
  universities?: { name: string; type: string; location: string; program: string }[]
  notable_people?: NotablePerson[]
  curriculum?: CurriculumSemester[]
}

export interface DiscoveryResult {
  query: string
  summary: string
  variations: CareerVariation[]
}

export interface SavedCareer {
  id: string
  careerId: string
  careerData: CareerVariation
  savedAt: string
  notes: string
}

export interface User {
  id: string
  email: string
  name: string
}

export const useCareerStore = defineStore('career', () => {
  const result = ref<DiscoveryResult | null>(null)
  const sessionId = ref<string | null>(null)
  const selectedCareer = ref<CareerVariation | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const cache = ref<Map<string, { result: DiscoveryResult; sessionId: string }>>(new Map())

  // Carreras guardadas
  const savedCareers = ref<SavedCareer[]>([])

  // Quiz
  const quizAnswers = ref<Record<string, string>>({})

  function setResult(data: DiscoveryResult, id: string) {
    result.value = data
    sessionId.value = id
    const normalized = data.query.toLowerCase().trim()
    cache.value.set(normalized, { result: data, sessionId: id })
  }

  function getFromCache(query: string) {
    const normalized = query.toLowerCase().trim()
    return cache.value.get(normalized)
  }

  function setSelectedCareer(career: CareerVariation) {
    selectedCareer.value = career
  }

  function setLoading(val: boolean) {
    isLoading.value = val
  }

  function setError(msg: string | null) {
    error.value = msg
  }

  function setQuizAnswers(answers: Record<string, string>) {
    quizAnswers.value = answers
  }

  // ── Persistencia local de carreras guardadas ──
  const SAVED_KEY = 'KoraChile:saved-careers'

  function persistSavedCareers() {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(savedCareers.value))
    } catch { /* quota exceeded */ }
  }

  function loadSavedCareers() {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem(SAVED_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) savedCareers.value = parsed
    } catch { /* corrupt data */ }
  }

  function addSavedCareer(career: CareerVariation, notes: string = '') {
    const saved: SavedCareer = {
      id: crypto.randomUUID(),
      careerId: career.id,
      careerData: career,
      savedAt: new Date().toISOString(),
      notes,
    }
    savedCareers.value.push(saved)
    persistSavedCareers()
    return saved
  }

  function removeSavedCareer(id: string) {
    savedCareers.value = savedCareers.value.filter(c => c.id !== id)
    persistSavedCareers()
  }

  function updateSavedCareerNotes(id: string, notes: string) {
    const career = savedCareers.value.find(c => c.id === id)
    if (career) {
      career.notes = notes
      persistSavedCareers()
    }
  }

  function clear() {
    result.value = null
    sessionId.value = null
    selectedCareer.value = null
    error.value = null
  }

  return {
    result,
    sessionId,
    selectedCareer,
    isLoading,
    error,
    cache,
    savedCareers,
    quizAnswers,
    setResult,
    getFromCache,
    setSelectedCareer,
    setLoading,
    setError,
    setQuizAnswers,
    addSavedCareer,
    removeSavedCareer,
    updateSavedCareerNotes,
    loadSavedCareers,
    clear,
  }
})
