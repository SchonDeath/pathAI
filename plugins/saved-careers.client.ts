import { useCareerStore } from '~/stores/career'
import { useAuthStore } from '~/stores/auth'

export default defineNuxtPlugin(async () => {
  const authStore = useAuthStore()
  await authStore.ensureHydrated()
  const store = useCareerStore()
  // Carga solo si hay usuario identificado; si no, limpia cualquier dato previo
  store.loadSavedCareers(authStore.profile?.id ?? undefined)
})
