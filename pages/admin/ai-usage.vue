<template>
  <div class="min-h-screen bg-slate-50 flex flex-col">
    <AppHeader />

    <main class="flex-1 pt-24 pb-16 px-4">
      <div class="max-w-6xl mx-auto">
        <header class="mb-6 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <NuxtLink to="/admin" class="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Panel admin
            </NuxtLink>
            <h1 class="text-3xl font-bold text-slate-900 mt-1">Uso y costo IA</h1>
            <p class="text-slate-600 text-sm mt-1">Tokens, tools, cache y costo estimado por usuario.</p>
          </div>

          <div class="flex items-center gap-2">
            <select v-model.number="days" class="px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm">
              <option :value="7">7 días</option>
              <option :value="30">30 días</option>
              <option :value="90">90 días</option>
            </select>
            <button
              @click="loadReport"
              class="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition">
              Actualizar
            </button>
          </div>
        </header>

        <LoadingSpinner v-if="pending" label="Cargando uso IA..." />

        <div v-else-if="!authStore.isAdmin" class="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-6">
          Requiere rol admin.
        </div>

        <div v-else-if="errorMsg" class="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6">
          {{ errorMsg }}
        </div>

        <template v-else-if="report">
          <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div class="bg-white rounded-2xl border border-slate-200 p-5">
              <p class="text-xs uppercase tracking-wider text-slate-500 font-bold">Costo estimado</p>
              <p class="text-3xl font-extrabold text-slate-900 mt-2">{{ formatClp(report.total.estimated_cost_clp) }}</p>
            </div>
            <div class="bg-white rounded-2xl border border-slate-200 p-5">
              <p class="text-xs uppercase tracking-wider text-slate-500 font-bold">Requests IA</p>
              <p class="text-3xl font-extrabold text-slate-900 mt-2">{{ formatInt(report.total.requests) }}</p>
            </div>
            <div class="bg-white rounded-2xl border border-slate-200 p-5">
              <p class="text-xs uppercase tracking-wider text-slate-500 font-bold">Tokens</p>
              <p class="text-3xl font-extrabold text-slate-900 mt-2">{{ formatInt(report.total.total_tokens) }}</p>
            </div>
            <div class="bg-white rounded-2xl border border-slate-200 p-5">
              <p class="text-xs uppercase tracking-wider text-slate-500 font-bold">Cache hit</p>
              <p class="text-3xl font-extrabold text-slate-900 mt-2">{{ cacheRate }}%</p>
            </div>
          </section>

          <section class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div class="px-5 py-4 border-b border-slate-100">
                <h2 class="font-bold text-slate-900">Top usuarios por costo</h2>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead class="bg-slate-50 text-slate-500">
                    <tr>
                      <th class="text-left px-4 py-3">Usuario</th>
                      <th class="text-right px-4 py-3">Costo</th>
                      <th class="text-right px-4 py-3">Req</th>
                      <th class="text-right px-4 py-3">Tools</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in report.byUser" :key="row.key" class="border-t border-slate-100">
                      <td class="px-4 py-3">
                        <div class="font-semibold text-slate-800">{{ row.user?.name || row.user?.email || row.key }}</div>
                        <div class="text-xs text-slate-500">{{ row.user?.email || row.key }}</div>
                      </td>
                      <td class="px-4 py-3 text-right font-bold text-slate-900">{{ formatClp(row.estimated_cost_clp) }}</td>
                      <td class="px-4 py-3 text-right">{{ formatInt(row.requests) }}</td>
                      <td class="px-4 py-3 text-right">{{ formatInt(row.tool_call_count) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div class="px-5 py-4 border-b border-slate-100">
                <h2 class="font-bold text-slate-900">Costo por intención</h2>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead class="bg-slate-50 text-slate-500">
                    <tr>
                      <th class="text-left px-4 py-3">Intención</th>
                      <th class="text-right px-4 py-3">Costo</th>
                      <th class="text-right px-4 py-3">Tokens</th>
                      <th class="text-right px-4 py-3">Req</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in report.byIntent" :key="row.key" class="border-t border-slate-100">
                      <td class="px-4 py-3 font-semibold text-slate-800">{{ row.key }}</td>
                      <td class="px-4 py-3 text-right font-bold text-slate-900">{{ formatClp(row.estimated_cost_clp) }}</td>
                      <td class="px-4 py-3 text-right">{{ formatInt(row.total_tokens) }}</td>
                      <td class="px-4 py-3 text-right">{{ formatInt(row.requests) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section class="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div class="px-5 py-4 border-b border-slate-100">
              <h2 class="font-bold text-slate-900">Eventos recientes</h2>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-slate-50 text-slate-500">
                  <tr>
                    <th class="text-left px-4 py-3">Fecha</th>
                    <th class="text-left px-4 py-3">Usuario</th>
                    <th class="text-left px-4 py-3">Modelo</th>
                    <th class="text-left px-4 py-3">Intención</th>
                    <th class="text-right px-4 py-3">Tokens</th>
                    <th class="text-right px-4 py-3">Costo</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in report.recent" :key="row.id" class="border-t border-slate-100">
                    <td class="px-4 py-3 text-slate-500 whitespace-nowrap">{{ formatDate(row.created_at) }}</td>
                    <td class="px-4 py-3">{{ row.user?.email || row.user_id || 'Anónimo' }}</td>
                    <td class="px-4 py-3 text-slate-600">{{ row.model || 'sin modelo' }}</td>
                    <td class="px-4 py-3">{{ row.intent || '—' }}</td>
                    <td class="px-4 py-3 text-right">{{ formatInt(row.total_tokens) }}</td>
                    <td class="px-4 py-3 text-right font-bold">{{ formatClp(row.estimated_cost_clp) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </template>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'admin' })
import { useAuthStore } from '~/stores/auth'

useHead({ title: 'Admin · Uso IA — KoraChile' })

const supabase = useSupabaseClient()
const authStore = useAuthStore()
const pending = ref(true)
const errorMsg = ref('')
const days = ref(30)
const report = ref<any | null>(null)

const cacheRate = computed(() => {
  const total = report.value?.total
  if (!total?.requests) return 0
  return Math.round((total.cache_hits / total.requests) * 100)
})

async function authHeaders() {
  const { data } = await supabase.auth.getSession()
  return { Authorization: `Bearer ${data.session?.access_token ?? ''}` }
}

async function loadReport() {
  pending.value = true
  errorMsg.value = ''
  try {
    const headers = await authHeaders()
    report.value = await $fetch('/api/admin/ai-usage', {
      headers,
      query: { days: days.value },
    })
  } catch (error: any) {
    errorMsg.value = error?.data?.statusMessage ?? error?.message ?? 'No se pudo cargar el reporte IA.'
  } finally {
    pending.value = false
  }
}

function formatClp(value?: number | null) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}

function formatInt(value?: number | null) {
  return new Intl.NumberFormat('es-CL').format(Number(value) || 0)
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(async () => {
  await authStore.ensureHydrated(true)
  if (!authStore.isAdmin) {
    pending.value = false
    return
  }
  await loadReport()
})
</script>
