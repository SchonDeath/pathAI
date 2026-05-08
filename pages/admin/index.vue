<template>
  <div class="min-h-screen bg-slate-50 flex flex-col">
    <AppHeader />

    <main class="flex-1 pt-24 pb-16 px-4">
      <div class="max-w-5xl mx-auto">
        <header class="mb-8">
          <NuxtLink to="/" class="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Inicio
          </NuxtLink>
          <h1 class="text-3xl font-bold text-slate-900 mt-1">Panel Admin</h1>
          <p class="text-slate-600 mt-1">Gestión de planes e instituciones destacadas</p>
        </header>

        <LoadingSpinner v-if="!authStore.hydrated" label="Verificando acceso..." />

        <div v-else-if="!authStore.isAdmin" class="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-6">
          Acceso restringido. Debes tener rol <code>admin</code> en la tabla <code>users</code>.
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NuxtLink to="/admin/institutions"
            class="block p-6 bg-white rounded-2xl border border-slate-200 hover:border-primary-300 hover:shadow-md transition">
            <div class="mb-2"><Building2 class="w-6 h-6 text-primary-600" /></div>
            <h2 class="text-lg font-bold text-slate-900">Instituciones</h2>
            <p class="text-sm text-slate-600 mt-1">Destacar, asignar planes, priority y vigencia.</p>
          </NuxtLink>

          <NuxtLink to="/admin/plans"
            class="block p-6 bg-white rounded-2xl border border-slate-200 hover:border-primary-300 hover:shadow-md transition">
            <div class="mb-2"><BriefcaseBusiness class="w-6 h-6 text-primary-600" /></div>
            <h2 class="text-lg font-bold text-slate-900">Planes</h2>
            <p class="text-sm text-slate-600 mt-1">Catálogo de planes (Free, Featured, Premium).</p>
          </NuxtLink>

          <NuxtLink to="/admin/ai-usage"
            class="block p-6 bg-white rounded-2xl border border-slate-200 hover:border-primary-300 hover:shadow-md transition">
            <div class="mb-2"><BarChart3 class="w-6 h-6 text-primary-600" /></div>
            <h2 class="text-lg font-bold text-slate-900">Uso IA</h2>
            <p class="text-sm text-slate-600 mt-1">Costo estimado, tokens, cache y usuarios más caros.</p>
          </NuxtLink>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'admin' })
import { BarChart3, BriefcaseBusiness, Building2 } from 'lucide-vue-next'
import { useAuthStore } from '~/stores/auth'
useHead({ title: 'Admin — KoraChile' })
const authStore = useAuthStore()
onMounted(() => authStore.ensureHydrated())
</script>
