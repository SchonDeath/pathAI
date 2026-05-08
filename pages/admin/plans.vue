<template>
  <div class="min-h-screen bg-slate-50 flex flex-col">
    <AppHeader />

    <main class="flex-1 pt-24 pb-16 px-4">
      <div class="max-w-4xl mx-auto">
        <NuxtLink to="/admin" class="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Panel admin
        </NuxtLink>
        <h1 class="text-3xl font-bold text-slate-900 mt-1 mb-6">Planes disponibles</h1>

        <LoadingSpinner v-if="pending" label="Cargando planes..." />

        <div v-else-if="!authStore.isAdmin" class="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-6">
          Requiere rol admin.
        </div>

        <div v-else-if="errorMsg" class="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6">
          {{ errorMsg }}
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div v-for="p in plans" :key="p.slug"
            class="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col hover:shadow-md transition">
            <div class="text-sm text-slate-500 uppercase tracking-wide">{{ p.slug }}</div>
            <h2 class="text-2xl font-bold text-slate-900 mt-1">{{ p.name }}</h2>
            <div class="text-3xl font-bold text-primary-600 my-3">
              {{ p.price_clp ? `$${p.price_clp.toLocaleString('es-CL')}` : 'Gratis' }}
            </div>
            <p class="text-sm text-slate-600 flex-1">{{ p.features?.description }}</p>
            <div class="mt-4 text-xs text-slate-500 border-t border-slate-100 pt-3">
              Priority: <strong class="text-slate-700">{{ p.priority }}</strong>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'admin' })
import { useAuthStore } from '~/stores/auth'

useHead({ title: 'Admin · Planes — KoraChile' })
const supabase = useSupabaseClient()
const authStore = useAuthStore()
const pending = ref(true)
const errorMsg = ref('')
const plans = ref<any[]>([])

async function authHeaders() {
  const { data } = await supabase.auth.getSession()
  return { Authorization: `Bearer ${data.session?.access_token ?? ''}` }
}

onMounted(async () => {
  await authStore.ensureHydrated(true)
  if (!authStore.isAdmin) {
    pending.value = false
    return
  }

  try {
    const headers = await authHeaders()
    const data = await $fetch<any>('/api/admin/plans', { headers })
    plans.value = data?.plans ?? []
  } catch (error: any) {
    errorMsg.value = error?.data?.statusMessage ?? error?.message ?? 'No se pudieron cargar los planes.'
  } finally {
    pending.value = false
  }
})
</script>
