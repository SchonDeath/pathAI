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
useHead({ title: 'Admin · Planes — KoraChile' })
const { data, pending } = await useFetch<any>('/api/admin/plans')
const plans = computed(() => data.value?.plans ?? [])
</script>
