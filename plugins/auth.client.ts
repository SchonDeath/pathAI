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
    if (event === 'SIGNED_OUT' || !session?.user) {
      auth.clear()
      return
    }
    // Forzar re-fetch del perfil (rol puede haber cambiado)
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
