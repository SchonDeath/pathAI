/**
 * Plugin cliente: hidrata el store de auth una sola vez al cargar la app
 * y escucha cambios de sesión de Supabase para mantenerlo sincronizado.
 */
import { useAuthStore } from '~/stores/auth'

export default defineNuxtPlugin(async () => {
  const auth = useAuthStore()
  const supabase = useSupabaseClient()

  // Hidratar al arranque
  await auth.ensureHydrated()

  // Mantener sincronizado con cambios de sesión de Supabase
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    // getUser() ya validó la sesión en ensureHydrated(); INITIAL_SESSION no debe
    // forzar otro viaje a Supabase al cargar/F5.
    if (event === 'INITIAL_SESSION') return

    if (event === 'SIGNED_OUT') {
      auth.clear()
      return
    }

    if (!session?.user) return

    // Forzar re-fetch solo ante cambios reales de sesión/perfil.
    if (auth.profile?.id === session.user.id && auth.hydrated && !auth.loading) return
    void auth.ensureHydrated(true).catch((error) => {
      console.warn('[auth] no se pudo refrescar el perfil:', error?.message)
    })
  })

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      subscription.unsubscribe()
    })
  }
})
