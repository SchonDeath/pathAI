<template>
  <div class="min-h-screen bg-slate-50 flex flex-col">
    <AppHeader />

    <main class="flex-1 pt-24 pb-16 px-4">
      <div class="max-w-6xl mx-auto">
        <header class="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <NuxtLink to="/admin" class="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Panel admin
            </NuxtLink>
            <h1 class="text-3xl font-bold text-slate-900">Instituciones</h1>
            <p class="text-slate-600 text-sm mt-1">{{ count }} totales — asigna planes y prioridad.</p>
          </div>
          <input v-model="search" type="text" placeholder="Buscar por nombre..."
            class="px-4 py-2 rounded-xl border border-slate-300 bg-white text-sm w-full md:w-72" />
        </header>

        <LoadingSpinner v-if="!authStore.hydrated || (loading && results.length === 0)" label="Cargando instituciones..." />

        <div v-else-if="!authStore.isAdmin" class="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-6">
          Requiere rol admin.
        </div>

        <template v-else>
          <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden relative">
            <div v-if="loading" class="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex items-center justify-center">
              <LoadingSpinner label="Actualizando..." />
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-slate-50 text-slate-600">
                  <tr>
                    <th class="text-left px-4 py-3">Institución</th>
                    <th class="text-left px-4 py-3">Tipo</th>
                    <th class="text-center px-4 py-3">Destacada</th>
                    <th class="text-center px-4 py-3">Plan</th>
                    <th class="text-center px-4 py-3">Priority</th>
                    <th class="text-center px-4 py-3">Vigencia</th>
                    <th class="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="inst in results" :key="inst.institution_code" class="border-t border-slate-100 hover:bg-slate-50/50 transition">
                    <td class="px-4 py-3 font-medium text-slate-900">{{ inst.nombre_institucion }}</td>
                    <td class="px-4 py-3 text-slate-600 text-xs">{{ inst.tipo_institucion }}</td>
                    <td class="px-4 py-3 text-center">
                      <span v-if="inst.is_featured" class="inline-flex px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">Sí</span>
                      <span v-else class="text-slate-500 text-xs">No</span>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <select v-model="edits[inst.institution_code].plan_slug"
                        class="px-2 py-1 rounded-lg border border-slate-300 bg-white text-xs">
                        <option v-for="p in plans" :key="p.slug" :value="p.slug">{{ p.name }}</option>
                      </select>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <input v-model.number="edits[inst.institution_code].priority" type="number"
                        class="w-20 px-2 py-1 rounded-lg border border-slate-300 text-xs text-center" />
                    </td>
                    <td class="px-4 py-3 text-center">
                      <input v-model="edits[inst.institution_code].featured_until" type="date"
                        class="px-2 py-1 rounded-lg border border-slate-300 text-xs" />
                    </td>
                    <td class="px-4 py-3 text-right">
                      <button @click="save(inst)" :disabled="savingId === inst.institution_code"
                        class="px-3 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-semibold hover:bg-primary-700 transition disabled:opacity-60">
                        {{ savingId === inst.institution_code ? 'Guardando...' : 'Guardar' }}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="mt-4 flex items-center justify-between text-sm text-slate-600 flex-wrap gap-3">
            <div>
              Mostrando <strong>{{ count === 0 ? 0 : offset + 1 }}–{{ Math.min(offset + limit, count) }}</strong> de <strong>{{ count }}</strong>
            </div>
            <div class="flex items-center gap-2">
              <button :disabled="offset === 0" @click="prev"
                class="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition">
                ← Anterior
              </button>
              <span class="px-3">Página {{ page }} / {{ totalPages }}</span>
              <button :disabled="offset + limit >= count" @click="next"
                class="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition">
                Siguiente →
              </button>
            </div>
          </div>
        </template>

        <Transition name="fade">
          <div v-if="statusMsg" class="fixed bottom-6 right-6 bg-slate-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">
            {{ statusMsg }}
          </div>
        </Transition>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'admin' })
import { useAuthStore } from '~/stores/auth'
useHead({ title: 'Admin · Instituciones — KoraChile' })

const supabase = useSupabaseClient()
const authStore = useAuthStore()

const loading = ref(true)
const savingId = ref<number | null>(null)
const results = ref<any[]>([])
const plans = ref<any[]>([])
const edits = ref<Record<number, { plan_slug: string; priority: number; featured_until: string | null }>>({})
const search = ref('')
const count = ref(0)
const limit = 25
const offset = ref(0)
const statusMsg = ref('')
let searchTimer: any = null

const page = computed(() => Math.floor(offset.value / limit) + 1)
const totalPages = computed(() => Math.max(1, Math.ceil(count.value / limit)))

async function authHeaders() {
  const { data } = await supabase.auth.getSession()
  return { Authorization: `Bearer ${data.session?.access_token ?? ''}` }
}

async function fetchAll() {
  if (!authStore.isAdmin) return
  loading.value = true
  try {
    const headers = await authHeaders()
    const qs = new URLSearchParams()
    if (search.value) qs.set('search', search.value)
    qs.set('limit', String(limit))
    qs.set('offset', String(offset.value))

    const [instRes, plansRes] = await Promise.all([
      $fetch<any>(`/api/admin/institutions?${qs.toString()}`, { headers }),
      plans.value.length ? Promise.resolve({ plans: plans.value }) : $fetch<any>('/api/admin/plans', { headers }),
    ])
    results.value = instRes.results
    count.value = instRes.count
    plans.value = plansRes.plans
    edits.value = Object.fromEntries(instRes.results.map((i: any) => [i.institution_code, {
      plan_slug: derivePlan(i.priority, plansRes.plans),
      priority: i.priority ?? 0,
      featured_until: i.featured_until ? i.featured_until.slice(0, 10) : null,
    }]))
  } finally {
    loading.value = false
  }
}

function derivePlan(priority: number, plansList: any[]) {
  return plansList.find(p => p.priority === priority)?.slug ?? 'free'
}

async function save(inst: any) {
  savingId.value = inst.institution_code
  try {
    const headers = await authHeaders()
    const edit = edits.value[inst.institution_code]
    const res = await $fetch<any>(`/api/admin/institutions/${inst.institution_code}`, {
      method: 'PATCH',
      headers,
      body: {
        plan_slug: edit.plan_slug,
        priority: edit.priority ?? 0,
        featured_until: edit.featured_until || null,
        is_featured: (edit.priority ?? 0) > 0,
      },
    })
    const idx = results.value.findIndex(r => r.institution_code === inst.institution_code)
    if (idx >= 0) results.value[idx] = { ...results.value[idx], ...res.institution }
    showStatus(`Listo: ${inst.nombre_institucion} actualizada`)
  } catch (e: any) {
    showStatus(`Error: ${e?.data?.statusMessage ?? e.message}`)
  } finally {
    savingId.value = null
  }
}

function showStatus(msg: string) {
  statusMsg.value = msg
  setTimeout(() => { statusMsg.value = '' }, 3500)
}

function prev() { if (offset.value > 0) { offset.value -= limit; fetchAll() } }
function next() { if (offset.value + limit < count.value) { offset.value += limit; fetchAll() } }

watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { offset.value = 0; fetchAll() }, 300)
})

onMounted(async () => {
  await authStore.ensureHydrated()
  if (authStore.isAdmin) await fetchAll()
  else loading.value = false
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(6px); }
</style>
