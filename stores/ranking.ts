/**
 * Store de ranking de instituciones con cache TTL.
 * Evita llamadas repetidas a /api/ranking/institutions cuando los datos
 * no han cambiado. Los datos se persisten en localStorage y expiran
 * automáticamente después de TTL_MS.
 *
 * Uso:
 *   const rankingStore = useRankingStore()
 *   await rankingStore.fetch({ tipo: 'Universidades' })
 *   rankingStore.institutions  // RankingInstitution[]
 */
import { defineStore } from 'pinia'

export interface RankingInstitution {
  institution_code: number
  nombre_institucion: string
  tipo_institucion: string | null
  pagina_web: string | null
  direccion_sede_central: string | null
  acreditacion_estado: string | null
  acreditacion_anos: number | null
  acreditacion_areas: string[] | null
  matricula_pregrado_actual: number | null
  titulados_pregrado_actual: number | null
  retencion_1er_ano_pct: number | null
  promedio_paes: number | null
  promedio_nem: number | null
  logo_url: string | null
  score: number
  breakdown: {
    acreditacion: number
    retencion: number
    paes: number
    matricula: number
  }
  breakdown_available?: {
    acreditacion: boolean
    retencion: boolean
    paes: boolean
    matricula: boolean
  }
  score_data_coverage_pct?: number
  score_used_weight?: number
  score_excluded_metrics?: Array<{
    key: 'acreditacion' | 'retencion' | 'paes' | 'matricula'
    label: string
    weight_pct: number
    source_field: string
    raw_value: number | null
    included: boolean
    reason: string
  }>
  score_included_metrics?: Array<{
    key: 'acreditacion' | 'retencion' | 'paes' | 'matricula'
    label: string
    weight_pct: number
    source_field: string
    raw_value: number | null
    included: boolean
    reason: string
  }>
}

export interface RankingParams {
  tipo?: string | null
  search?: string
}

interface CacheEntry {
  institutions: RankingInstitution[]
  total: number
  cachedAt: number
}

const STORAGE_PREFIX = 'KoraChile:ranking:v2:'
const TTL_MS = 1000 * 60 * 10 // 10 minutos

function cacheKey(params: RankingParams): string {
  return STORAGE_PREFIX + (params.tipo || 'all') + ':' + (params.search || '')
}

function loadCached(key: string): CacheEntry | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const entry: CacheEntry = JSON.parse(raw)
    if (Date.now() - entry.cachedAt > TTL_MS) {
      localStorage.removeItem(key)
      return null
    }
    return entry
  } catch {
    return null
  }
}

function persist(key: string, entry: CacheEntry) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(entry))
  } catch { /* quota */ }
}

export const useRankingStore = defineStore('ranking', () => {
  // Estado reactivo en memoria para el tipo/search activo
  const institutions = ref<RankingInstitution[]>([])
  const total = ref(0)
  const loading = ref(false)
  const initialized = ref(false)
  const error = ref<string | null>(null)
  const lastParams = ref<RankingParams>({})

  /**
   * Carga instituciones para los parámetros dados.
   * Si hay cache válido en localStorage lo usa directamente.
   * Si no, llama a la API y cachea el resultado.
   * Con `force: true` ignora el cache y fuerza la petición.
   */
  async function fetch(params: RankingParams = {}, force = false) {
    const key = cacheKey(params)

    // Evitar petición duplicada si ya estamos cargando los mismos params
    if (loading.value) return

    // Intentar cache
    if (!force) {
      const cached = loadCached(key)
      if (cached) {
        institutions.value = cached.institutions
        total.value = cached.total
        lastParams.value = params
        initialized.value = true
        return
      }
    }

    loading.value = true
    error.value = null

    try {
      const query = new URLSearchParams()
      if (params.tipo) query.set('tipo', params.tipo)
      if (params.search) query.set('search', params.search)
      query.set('limit', '200')

      const res = await $fetch<{ institutions: RankingInstitution[]; total: number }>(
        `/api/ranking/institutions?${query.toString()}`
      )

      institutions.value = res.institutions
      total.value = res.total
      lastParams.value = params

      persist(key, {
        institutions: res.institutions,
        total: res.total,
        cachedAt: Date.now(),
      })
    } catch (e: any) {
      error.value = e?.message ?? 'Error al cargar ranking'
    } finally {
      loading.value = false
      initialized.value = true
    }
  }

  /** Invalida todo el cache de ranking en localStorage */
  function invalidate() {
    if (typeof window === 'undefined') return
    const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX))
    keys.forEach(k => localStorage.removeItem(k))
    institutions.value = []
    total.value = 0
  }

  return { institutions, total, loading, initialized, error, lastParams, fetch, invalidate }
})
