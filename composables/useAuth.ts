/**
 * Composable de acciones de autenticación (signUp/signIn/signOut/OAuth).
 * La sesión y el perfil se mantienen en `useAuthStore` (Pinia, stores/auth.ts)
 * con persistencia en localStorage. Aquí solo disparamos las acciones y luego
 * pedimos al store que re-hidrate (force=true) para refrescar el profile.
 */
import { useAuthStore } from '~/stores/auth'

export function useAuth() {
  const supabase = useSupabaseClient()
  const authStore = useAuthStore()
  const router = useRouter()

  const isLoading = ref(false)
  const error = ref<string | null>(null)

  function getEmailRedirectTo() {
    if (import.meta.client) return `${window.location.origin}/login`
    return undefined
  }

  async function signUp(email: string, password: string, name: string) {
    isLoading.value = true
    error.value = null
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getEmailRedirectTo(),
          data: { name },
        },
      })
      if (signUpError) throw signUpError
      if (data.user) await authStore.ensureHydrated(true)
      return data
    } catch (err: any) {
      error.value = err.message || 'Error al registrarse'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function signIn(email: string, password: string) {
    isLoading.value = true
    error.value = null
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (signInError) throw signInError
      if (data.user) await authStore.ensureHydrated(true)
      return data
    } catch (err: any) {
      error.value = err.message || 'Error al iniciar sesión'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function signOut() {
    isLoading.value = true
    error.value = null
    try {
      await authStore.signOut()
      await router.push('/')
    } catch (err: any) {
      error.value = err.message || 'Error al cerrar sesión'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function loginWithGoogle() {
    isLoading.value = true
    error.value = null
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/profile` },
      })
      if (oauthError) throw oauthError
    } catch (err: any) {
      error.value = err.message || 'Error al iniciar sesión con Google'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function checkAuth() {
    try {
      await authStore.ensureHydrated(true)
    } catch (err: any) {
      console.error('[useAuth] checkAuth failed:', err?.message)
      authStore.clear()
    }
  }

  return {
    isLoading,
    error,
    signUp,
    signIn,
    signOut,
    loginWithGoogle,
    checkAuth,
  }
}
