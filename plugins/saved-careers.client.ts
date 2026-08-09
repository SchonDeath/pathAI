import { useCareerStore } from '~/stores/career'
import { useAuthStore } from '~/stores/auth'
import { hasSupabaseConfig } from '~/composables/useSupabaseClient'

export default defineNuxtPlugin(async () => {
  // Sin Supabase configurado no hay sesión que hidratar; salir en silencio
  // evita abortar la inicialización de Nuxt y dejar la pantalla en blanco.
  if (!hasSupabaseConfig()) return

  const authStore = useAuthStore()
  await authStore.ensureHydrated()
  const store = useCareerStore()
  // Carga solo si hay usuario identificado; si no, limpia cualquier dato previo
  store.loadSavedCareers(authStore.profile?.id ?? undefined)
})
