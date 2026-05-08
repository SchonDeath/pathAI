import { defineStore } from 'pinia'

export interface FeaturedInstitution {
  institution_code: number
  nombre_institucion: string
  pagina_web: string | null
  logo_url: string | null
}

interface CacheEntry {
  items: FeaturedInstitution[]
  cachedAt: number
}

const STORAGE_KEY = 'KoraChile:featured-institutions:v2'
const TTL_MS = 1000 * 60 * 10 // 10 minutos

function loadCached(): CacheEntry | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const entry: CacheEntry = JSON.parse(raw)
    if (Date.now() - entry.cachedAt > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return entry
  } catch {
    return null
  }
}

function persist(entry: CacheEntry) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry))
  } catch {
    // ignore quota/localStorage errors
  }
}

export const useFeaturedInstitutionsStore = defineStore('featured-institutions', () => {
  const items = ref<FeaturedInstitution[]>([])
  const loading = ref(false)
  const initialized = ref(false)
  const error = ref<string | null>(null)

  async function fetch(force = false) {
    if (loading.value) return

    if (!force) {
      const cached = loadCached()
      if (cached && cached.items.length) {
        items.value = cached.items
        initialized.value = true
        return
      }

      if (cached && !cached.items.length && typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY)
      }

      if (initialized.value && items.value.length) return
    }

    loading.value = true
    error.value = null

    try {
      const response = await $fetch<{ institutions: FeaturedInstitution[] }>('/api/ranking/institutions', {
        query: { tipo: 'Universidades', limit: 24 },
      })

      let institutions = response.institutions ?? []

      // Algunas cargas del dataset no usan exactamente el tipo "Universidades".
      // Si no hay resultados, usamos ranking general para no caer en fallback sin logos.
      if (!institutions.length) {
        const genericResponse = await $fetch<{ institutions: FeaturedInstitution[] }>('/api/ranking/institutions', {
          query: { limit: 24 },
        })
        institutions = genericResponse.institutions ?? []
      }

      items.value = institutions
      persist({
        items: items.value,
        cachedAt: Date.now(),
      })
    } catch (e: any) {
      error.value = e?.message ?? 'Error al cargar instituciones destacadas'
    } finally {
      loading.value = false
      initialized.value = true
    }
  }

  function invalidate() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
    items.value = []
    initialized.value = false
  }

  return { items, loading, initialized, error, fetch, invalidate }
})
