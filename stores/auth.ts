/**
 * Store centralizado de autenticación.
 * Persiste en localStorage para evitar peticiones repetidas a Supabase.
 * Se hidrata una sola vez al cargar la app; los componentes leen de aquí.
 */
import { defineStore } from 'pinia'

export interface AuthProfile {
  id: string
  email: string
  name: string
  avatar_url: string | null
  role: 'user' | 'admin' | 'institution'
  phone?: string | null
  gender?: 'masculino' | 'femenino' | 'prefiero_no_decir' | null
  bio?: string | null
  birth_date?: string | null
}

const STORAGE_KEY = 'KoraChile:auth:v1'
const TTL_MS = 1000 * 60 * 30 // 30 min

function loadCached(): { profile: AuthProfile | null; cachedAt: number } {
  if (typeof window === 'undefined') return { profile: null, cachedAt: 0 }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { profile: null, cachedAt: 0 }
    const parsed = JSON.parse(raw)
    return { profile: parsed.profile ?? null, cachedAt: parsed.cachedAt ?? 0 }
  } catch {
    return { profile: null, cachedAt: 0 }
  }
}

function persist(profile: AuthProfile | null) {
  if (typeof window === 'undefined') return
  try {
    if (!profile) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile, cachedAt: Date.now() }))
  } catch { /* quota or blocked */ }
}

export const useAuthStore = defineStore('auth', () => {
  const initial = loadCached()
  const profile = ref<AuthProfile | null>(initial.profile)
  const cachedAt = ref<number>(initial.cachedAt)
  const loading = ref(false)
  // Si hay perfil fresco en localStorage, ya estamos "hydrated" sin esperar Supabase.
  // Esto evita el parpadeo de nav en F5 para usuarios con sesión activa.
  const hydrated = ref(
    initial.profile !== null && (Date.now() - initial.cachedAt < TTL_MS)
  )

  const isAuthenticated = computed(() => !!profile.value)
  const isAdmin = computed(() => profile.value?.role === 'admin')
  const isFresh = computed(() => Date.now() - cachedAt.value < TTL_MS)

  function setProfile(p: AuthProfile | null) {
    profile.value = p
    cachedAt.value = p ? Date.now() : 0
    persist(p)
  }

  /**
   * Asegura que `profile` esté poblado. Si hay cache fresca no hace red.
   * Si `force` = true, fuerza re-fetch desde Supabase.
   */
  async function ensureHydrated(force = false) {
    if (hydrated.value && !force && isFresh.value) return profile.value
    if (loading.value) return profile.value
    loading.value = true
    try {
      const supabase = useSupabaseClient()
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) {
        setProfile(null)
        hydrated.value = true
        return null
      }
      const { data: row } = await supabase
        .from('users')
        .select('id, email, name, avatar_url, role, phone, gender, bio, birth_date')
        .eq('id', authData.user.id)
        .maybeSingle<AuthProfile>()

      const merged: AuthProfile = {
        id: authData.user.id,
        email: row?.email || authData.user.email || '',
        name: row?.name || authData.user.user_metadata?.full_name || authData.user.user_metadata?.name || '',
        avatar_url: row?.avatar_url ?? authData.user.user_metadata?.avatar_url ?? null,
        role: row?.role || 'user',
        phone: row?.phone ?? null,
        gender: row?.gender ?? null,
        bio: row?.bio ?? null,
        birth_date: row?.birth_date ?? null,
      }
      setProfile(merged)
      hydrated.value = true
      return merged
    } finally {
      loading.value = false
    }
  }

  function clear() {
    setProfile(null)
    hydrated.value = true
  }

  async function signOut() {
    const supabase = useSupabaseClient()
    await supabase.auth.signOut()
    clear()
  }

  return {
    profile,
    loading,
    hydrated,
    isAuthenticated,
    isAdmin,
    setProfile,
    ensureHydrated,
    clear,
    signOut,
  }
})
