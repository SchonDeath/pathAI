import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async (to) => {
  // La sesión vive en localStorage (client-only). En SSR no hay sesión
  // disponible, así que se deja pasar y el cliente valida tras hidratarse.
  if (import.meta.server) return

  const auth = useAuthStore()
  await auth.ensureHydrated()

  if (!auth.isAuthenticated) {
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath },
    })
  }
})
