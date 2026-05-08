export interface ProgramFavorite {
  id?: string
  program_unique_code: string
  institution_code?: number | null
  career_generic_id?: string | null
  nombre_carrera?: string | null
  nombre_institucion?: string | null
  nombre_sede?: string | null
  region?: string | null
  comuna?: string | null
  tipo_institucion?: string | null
  arancel_anual?: number | null
  source?: string | null
  notes?: string | null
  saved_at?: string | null
}

export interface ProgramFavoriteInput {
  program_unique_code: string
  institution_code?: number | null
  career_generic_id?: string | null
  nombre_carrera?: string | null
  nombre_institucion?: string | null
  nombre_sede?: string | null
  region?: string | null
  comuna?: string | null
  tipo_institucion?: string | null
  arancel_anual?: number | null
  source?: string | null
  notes?: string | null
}

export const PROGRAM_FAVORITES_STORAGE_KEY = 'KoraChile:saved:programs'

function toText(value: unknown) {
  return typeof value === 'string' ? value : null
}

function toNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeFavorite(raw: any): ProgramFavorite | null {
  const code = toText(raw?.program_unique_code || raw?.code)
  if (!code) return null

  return {
    id: toText(raw?.id) ?? undefined,
    program_unique_code: code,
    institution_code: toNumber(raw?.institution_code),
    career_generic_id: toText(raw?.career_generic_id),
    nombre_carrera: toText(raw?.nombre_carrera ?? raw?.nombre_carrera_snapshot),
    nombre_institucion: toText(raw?.nombre_institucion ?? raw?.nombre_institucion_snapshot),
    nombre_sede: toText(raw?.nombre_sede ?? raw?.nombre_sede_snapshot),
    region: toText(raw?.region ?? raw?.region_snapshot),
    comuna: toText(raw?.comuna ?? raw?.comuna_snapshot),
    tipo_institucion: toText(raw?.tipo_institucion),
    arancel_anual: toNumber(raw?.arancel_anual),
    source: toText(raw?.source) ?? 'app',
    notes: toText(raw?.notes) ?? '',
    saved_at: toText(raw?.saved_at ?? raw?.created_at) ?? new Date().toISOString(),
  }
}

function mergeFavorites(localItems: ProgramFavorite[], remoteItems: ProgramFavorite[]) {
  const byCode = new Map<string, ProgramFavorite>()
  for (const item of localItems) {
    byCode.set(item.program_unique_code, item)
  }
  for (const item of remoteItems) {
    byCode.set(item.program_unique_code, {
      ...byCode.get(item.program_unique_code),
      ...item,
    })
  }
  return [...byCode.values()].sort((a, b) => {
    const left = new Date(a.saved_at || 0).getTime()
    const right = new Date(b.saved_at || 0).getTime()
    return right - left
  })
}

export function useProgramFavorites() {
  const authStore = useAuthStore()
  const supabase = useSupabaseClient()
  const { track } = useIntentTracker()

  const items = useState<ProgramFavorite[]>('program-favorites:items', () => [])
  const syncedUserId = useState<string | null>('program-favorites:user-id', () => null)
  const loading = useState<boolean>('program-favorites:loading', () => false)
  const hydrated = useState<boolean>('program-favorites:hydrated', () => false)

  function persistLocal() {
    if (typeof window === 'undefined') return
    localStorage.setItem(PROGRAM_FAVORITES_STORAGE_KEY, JSON.stringify(items.value))
  }

  function loadLocal() {
    if (typeof window === 'undefined') return items.value
    try {
      const raw = localStorage.getItem(PROGRAM_FAVORITES_STORAGE_KEY)
      const parsed = raw ? JSON.parse(raw) : []
      const normalized = Array.isArray(parsed)
        ? parsed.map(normalizeFavorite).filter(Boolean) as ProgramFavorite[]
        : []
      items.value = normalized
    } catch {
      items.value = []
    }
    hydrated.value = true
    return items.value
  }

  async function authHeaders() {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : undefined
  }

  async function fetchRemote() {
    const headers = await authHeaders()
    if (!headers) return [] as ProgramFavorite[]
    const res = await $fetch<{ items: any[] }>('/api/saved/programs', {
      method: 'GET',
      headers,
    })
    return (res.items ?? []).map(normalizeFavorite).filter(Boolean) as ProgramFavorite[]
  }

  async function saveRemote(input: ProgramFavoriteInput) {
    const headers = await authHeaders()
    if (!headers) return null
    const res = await $fetch<{ item: any }>('/api/saved/programs', {
      method: 'POST',
      headers,
      body: input,
    })
    return normalizeFavorite(res.item)
  }

  async function removeRemote(programUniqueCode: string) {
    const headers = await authHeaders()
    if (!headers) return
    await $fetch(`/api/saved/programs/${encodeURIComponent(programUniqueCode)}`, {
      method: 'DELETE',
      headers,
    })
  }

  async function hydrate(force = false) {
    loadLocal()
    await authStore.ensureHydrated()

    const userId = authStore.profile?.id ?? null
    if (!userId) {
      syncedUserId.value = null
      return items.value
    }

    if (!force && syncedUserId.value === userId) {
      return items.value
    }

    loading.value = true
    try {
      const remoteItems = await fetchRemote()
      const remoteCodes = new Set(remoteItems.map(item => item.program_unique_code))
      const merged = mergeFavorites(items.value, remoteItems)
      items.value = merged
      persistLocal()

      const missingLocal = merged.filter(item => !remoteCodes.has(item.program_unique_code))
      if (missingLocal.length) {
        await Promise.allSettled(missingLocal.map(item => saveRemote(item)))
      }

      syncedUserId.value = userId
    } catch (error) {
      console.warn('[program-favorites] No se pudieron sincronizar favoritos:', error)
    } finally {
      loading.value = false
    }

    return items.value
  }

  function isFavorite(programUniqueCode: string) {
    return items.value.some(item => item.program_unique_code === programUniqueCode)
  }

  async function toggle(input: ProgramFavoriteInput) {
    const normalized = normalizeFavorite(input)
    if (!normalized) return false

    const exists = isFavorite(normalized.program_unique_code)
    if (exists) {
      items.value = items.value.filter(item => item.program_unique_code !== normalized.program_unique_code)
      persistLocal()
      if (authStore.profile?.id) {
        await removeRemote(normalized.program_unique_code)
      }
      void track({
        event_name: 'program_unsaved',
        source: normalized.source ?? 'app',
        program_unique_code: normalized.program_unique_code,
        institution_code: normalized.institution_code ?? null,
        career_generic_id: normalized.career_generic_id ?? null,
        metadata: {
          nombre_carrera: normalized.nombre_carrera,
          nombre_institucion: normalized.nombre_institucion,
          nombre_sede: normalized.nombre_sede,
        },
      })
      return false
    }

    items.value = mergeFavorites(items.value, [{
      ...normalized,
      saved_at: normalized.saved_at ?? new Date().toISOString(),
    }])
    persistLocal()

    if (authStore.profile?.id) {
      const remote = await saveRemote(normalized)
      if (remote) {
        items.value = mergeFavorites(items.value, [remote])
        persistLocal()
      }
    }

    void track({
      event_name: 'program_saved',
      source: normalized.source ?? 'app',
      program_unique_code: normalized.program_unique_code,
      institution_code: normalized.institution_code ?? null,
      career_generic_id: normalized.career_generic_id ?? null,
      metadata: {
        nombre_carrera: normalized.nombre_carrera,
        nombre_institucion: normalized.nombre_institucion,
        nombre_sede: normalized.nombre_sede,
      },
    })

    return true
  }

  return {
    items,
    loading,
    hydrated,
    hydrate,
    loadLocal,
    isFavorite,
    toggle,
  }
}