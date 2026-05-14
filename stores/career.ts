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
  career_generic_id?: string | null
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
  const quizProfile = ref<{ holland_code: string; mbti_type: string; holland_profile: string[] } | null>(null)

  // ── MBTI descriptions (hardcoded, fuente única) ──
  const mbtiDescriptions: Record<string, { label: string; description: string }> = {
    INTJ: { label: 'Estratega', description: 'Pensamiento independiente y determinación para convertir ideas en realidad. Visión de largo plazo, exigente consigo mismo.' },
    INTP: { label: 'Lógico', description: 'Pensador innovador con sed de conocimiento y análisis profundo. Disfruta resolver problemas complejos y cuestionar supuestos.' },
    ENTJ: { label: 'Comandante', description: 'Liderazgo audaz, voluntad fuerte y gran capacidad estratégica. Nació para dirigir proyectos y equipos.' },
    ENTP: { label: 'Innovador', description: 'Mente ágil que disfruta los desafíos intelectuales y el debate. Genera ideas constantemente y cuestiona el statu quo.' },
    INFJ: { label: 'Consejero', description: 'Visionario con principios firmes e ideal para generar impacto social. Profundamente empático e intuitivo.' },
    INFP: { label: 'Mediador', description: 'Idealista con valores profundos y creatividad artística. Busca significado y autenticidad en todo lo que hace.' },
    ENFJ: { label: 'Protagonista', description: 'Carismático y empático, inspira y motiva a otros. Natural para roles de liderazgo orientados a las personas.' },
    ENFP: { label: 'Activista', description: 'Entusiasta, creativo y siempre buscando nuevas conexiones. Apasionado por las ideas y el potencial humano.' },
    ISTJ: { label: 'Inspector', description: 'Confiable, práctico y dedicado a mantener el orden. Cumple sus compromisos con rigor y constancia.' },
    ISFJ: { label: 'Defensor', description: 'Cálido, cuidadoso y muy dedicado a las personas importantes. Trabaja en silencio para apoyar a quienes lo rodean.' },
    ESTJ: { label: 'Ejecutivo', description: 'Organizado, decidido y gran gestor de personas y proyectos. Impone estructura y claridad en cualquier entorno.' },
    ESFJ: { label: 'Cónsul', description: 'Sociable y atento, siempre pendiente del bienestar del grupo. Construye comunidad y armonía a su alrededor.' },
    ISTP: { label: 'Artesano', description: 'Observador audaz que experimenta con flexibilidad y pragmatismo. Excelente para trabajos técnicos y mecánicos.' },
    ISFP: { label: 'Aventurero', description: 'Artista sensible y flexible que vive el momento presente. Expresa su identidad a través de acciones y creaciones.' },
    ESTP: { label: 'Emprendedor', description: 'Perspicaz, energético y le encanta vivir al límite. Actúa rápido, aprende sobre la marcha y resuelve crisis.' },
    ESFP: { label: 'Animador', description: 'Espontáneo, enérgico y disfruta hacer que otros se diviertan. Trae vida a cualquier ambiente con su entusiasmo.' },
  }

  // ── Cache de programas BD por careerId (en memoria, evita re-fetch al volver) ──
  const dbProgramsCache = ref<Map<string, unknown[]>>(new Map())

  function getCachedPrograms(careerId: string): unknown[] | undefined {
    return dbProgramsCache.value.get(careerId)
  }

  function setCachedPrograms(careerId: string, programs: unknown[]) {
    dbProgramsCache.value.set(careerId, programs)
  }

  // ── Cache de salario oficial por careerId (en memoria) ──
  const dbSalaryCache = ref<Map<string, unknown>>(new Map())

  function getCachedSalary(careerId: string): unknown | undefined {
    return dbSalaryCache.value.get(careerId)
  }

  function setCachedSalary(careerId: string, salary: unknown) {
    dbSalaryCache.value.set(careerId, salary)
  }

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

  function setQuizProfile(profile: { holland_code: string; mbti_type: string; holland_profile: string[] } | null) {
    quizProfile.value = profile
  }

  // ── Persistencia local de carreras guardadas (por usuario) ──
  const _currentUserId = ref<string | null>(null)

  function _savedKey() {
    return _currentUserId.value
      ? `KoraChile:saved-careers:${_currentUserId.value}`
      : null
  }

  function persistSavedCareers() {
    if (typeof window === 'undefined') return
    const key = _savedKey()
    if (!key) return
    try {
      localStorage.setItem(key, JSON.stringify(savedCareers.value))
    } catch { /* quota exceeded */ }
  }

  function loadSavedCareers(userId?: string) {
    if (userId) _currentUserId.value = userId
    if (typeof window === 'undefined') return
    const key = _savedKey()
    if (!key) { savedCareers.value = []; return }
    try {
      const raw = localStorage.getItem(key)
      if (!raw) { savedCareers.value = []; return }
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) savedCareers.value = parsed
    } catch { savedCareers.value = [] }
  }

  function clearSavedCareers() {
    savedCareers.value = []
    _currentUserId.value = null
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
    quizProfile,
    mbtiDescriptions,
    setResult,
    getFromCache,
    setSelectedCareer,
    setLoading,
    setError,
    setQuizAnswers,
    setQuizProfile,
    addSavedCareer,
    removeSavedCareer,
    updateSavedCareerNotes,
    loadSavedCareers,
    clearSavedCareers,
    dbProgramsCache,
    getCachedPrograms,
    setCachedPrograms,
    dbSalaryCache,
    getCachedSalary,
    setCachedSalary,
    clear,
  }
})
