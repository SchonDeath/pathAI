<template>
  <div class="min-h-screen flex flex-col bg-surface-50">
    <AppHeader />

    <main class="flex-1 pt-24 pb-16 px-4 sm:px-6">
      <div class="max-w-5xl mx-auto">
        <NuxtLink
          to="/explore"
          class="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary-600 transition-colors mb-6"
        >
          <span>←</span>
          <span>Volver a explorar</span>
        </NuxtLink>

        <div v-if="loading" class="space-y-4">
          <div class="h-10 w-2/3 bg-slate-100 rounded-xl animate-pulse" />
          <div class="h-5 w-1/3 bg-slate-100 rounded-lg animate-pulse" />
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div v-for="n in 3" :key="n" class="h-24 rounded-2xl border border-slate-100 bg-white shadow-sm animate-pulse" />
          </div>
        </div>

        <div
          v-else-if="error"
          class="rounded-2xl border border-red-200 bg-red-50 text-red-700 p-6"
        >
          {{ error }}
        </div>

        <div v-else-if="career" class="space-y-8">
          <section class="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div class="space-y-2">
                <div class="flex items-center gap-3">
                  <span class="text-4xl">{{ career.emoji || '🎯' }}</span>
                  <h1 class="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
                    {{ career.title }}
                  </h1>
                </div>
                <p class="text-slate-500">
                  {{ career.tagline || 'Explora esta carrera y sus detalles clave para Chile.' }}
                </p>
              </div>

              <span
                v-if="career.job_demand"
                :class="demandClass(career.job_demand)"
                class="text-xs font-semibold px-3 py-1.5 rounded-full"
              >
                Demanda: {{ career.job_demand }}
              </span>
            </div>

            <p v-if="career.description" class="mt-5 text-slate-700 leading-relaxed">
              {{ career.description }}
            </p>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
              <div class="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p class="text-xs uppercase tracking-wide text-slate-500 font-semibold">Sueldo Junior</p>
                <p class="text-lg font-bold text-slate-900 mt-1">{{ formatSalary(career.salary_junior) }}</p>
              </div>
              <div class="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p class="text-xs uppercase tracking-wide text-slate-500 font-semibold">Sueldo Promedio</p>
                <p class="text-lg font-bold text-slate-900 mt-1">{{ formatSalary(career.salary_mid) }}</p>
              </div>
              <div class="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p class="text-xs uppercase tracking-wide text-slate-500 font-semibold">Sueldo Senior</p>
                <p class="text-lg font-bold text-slate-900 mt-1">{{ formatSalary(career.salary_senior) }}</p>
              </div>
            </div>
          </section>

          <section v-if="career.skills?.length" class="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8">
            <h2 class="text-xl font-bold text-slate-900">Habilidades clave</h2>
            <div class="flex flex-wrap gap-2 mt-4">
              <span
                v-for="skill in career.skills"
                :key="skill"
                class="px-3 py-1 rounded-full text-sm bg-slate-100 text-slate-700 border border-slate-200"
              >
                {{ skill }}
              </span>
            </div>
          </section>

          <section v-if="career.curricula?.length" class="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8">
            <h2 class="text-xl font-bold text-slate-900">Dónde estudiar</h2>
            <p class="text-sm text-slate-500 mt-1">Programas e instituciones asociados en Chile.</p>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
              <article
                v-for="curr in career.curricula"
                :key="curr.id"
                class="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2"
              >
                <h3 class="font-semibold text-slate-900">{{ curr.program || career.title }}</h3>
                <p class="text-sm text-slate-600">
                  {{ curr.institution }} · {{ curr.location || 'Chile' }}
                </p>
                <p class="text-xs text-slate-500">
                  {{ curr.institution_type || 'Institución' }}
                  <span v-if="curr.duration_semesters"> · {{ curr.duration_semesters }} semestres</span>
                </p>
                <p class="text-sm font-medium text-slate-700">
                  Costo mensual: {{ formatSalary(curr.monthly_cost) }}
                </p>
              </article>
            </div>
          </section>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Detalle de Carrera — KoraChile' })

const route = useRoute()

const loading = ref(true)
const error = ref<string | null>(null)
const career = ref<any>(null)

function formatSalary(n?: number | null): string {
  if (!n) return 'No disponible'
  return `$${new Intl.NumberFormat('es-CL').format(n)} CLP`
}

function demandClass(demand: string) {
  const map: Record<string, string> = {
    'Muy Alta': 'bg-emerald-100 text-emerald-700',
    'Alta': 'bg-blue-100 text-blue-700',
    'Media': 'bg-amber-100 text-amber-700',
    'Baja': 'bg-red-100 text-red-700',
  }
  return map[demand] ?? 'bg-slate-100 text-slate-600'
}

async function fetchCareer() {
  loading.value = true
  error.value = null

  try {
    const id = String(route.params.id || '')
    if (!id) {
      error.value = 'ID de carrera inválido.'
      career.value = null
      return
    }

    const data = await $fetch(`/api/careers/${id}`)
    career.value = data
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'No se pudo cargar la carrera.'
    career.value = null
  } finally {
    loading.value = false
  }
}

watch(() => route.params.id, fetchCareer)
onMounted(fetchCareer)
</script>
