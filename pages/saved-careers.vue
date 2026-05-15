<template>
  <div class="min-h-screen flex flex-col bg-surface-50">
    <AppHeader />

    <main class="page-shell">
      <div class="max-w-6xl mx-auto space-y-8">
        <!-- Header -->
        <div class="space-y-4">
          <NuxtLink to="/" class="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors group">
            <svg class="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Volver al inicio
          </NuxtLink>

          <h1 class="page-title">Mis Carreras Guardadas</h1>
          <p class="text-slate-600">{{ store.savedCareers.length }} carrera{{ store.savedCareers.length !== 1 ? 's' : '' }} guardada{{ store.savedCareers.length !== 1 ? 's' : '' }}</p>
        </div>

        <!-- Empty State -->
        <template v-if="store.savedCareers.length === 0">
          <div class="text-center py-20 space-y-4 bg-white rounded-3xl border border-slate-100 shadow-card">
            <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto"><BookOpen class="w-7 h-7 text-slate-500" /></div>
            <h2 class="text-xl font-bold text-slate-900">No tienes carreras guardadas</h2>
            <p class="text-slate-600">Explora carreras y guarda tus favoritas para revisarlas después</p>
            <NuxtLink to="/" class="btn-primary inline-flex">
              Explorar Carreras
            </NuxtLink>
          </div>
        </template>

        <!-- Saved Careers Grid -->
        <template v-else>
          <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div
              v-for="saved in store.savedCareers"
              :key="saved.id"
              class="bg-white rounded-3xl border border-slate-100 shadow-card hover:shadow-card-hover transition-all">
              <!-- Header -->
              <div class="border-b border-slate-100 p-4 sm:p-6">
                <div class="mb-4 flex items-start justify-between gap-4">
                  <div class="flex min-w-0 items-start gap-3">
                    <div class="w-11 h-11 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center"><BookOpen class="w-6 h-6 text-primary-600" /></div>
                    <div class="min-w-0">
                      <h3 class="text-lg font-bold text-slate-900 sm:text-xl">{{ saved.careerData.title }}</h3>
                      <p class="text-sm text-slate-500 mt-1">{{ saved.careerData.tagline }}</p>
                    </div>
                  </div>
                  <button
                    @click="removeSaved(saved.id)"
                    class="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                    title="Eliminar">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                  </button>
                </div>

                <!-- Match Score -->
                <div class="flex items-center gap-3">
                  <div class="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-primary-600 to-accent-500" :style="{ width: `${saved.careerData.match_score}%` }"></div>
                  </div>
                  <span class="font-bold text-primary-600">{{ saved.careerData.match_score }}%</span>
                </div>
              </div>

              <!-- Content -->
              <div class="space-y-4 p-4 sm:p-6">
                <!-- Quick Stats -->
                <div class="grid grid-cols-1 gap-2 text-center text-sm sm:grid-cols-3">
                  <div class="bg-slate-50 rounded-lg p-3">
                    <p class="text-xs text-slate-500 mb-1">Ingreso SIES</p>
                    <p class="font-bold text-emerald-600">{{ officialIncomeLabel(saved.careerData) }}</p>
                  </div>
                  <div class="bg-slate-50 rounded-lg p-3">
                    <p class="text-xs text-slate-500 mb-1">Demanda</p>
                    <p class="font-bold text-blue-600">{{ saved.careerData.job_demand || 'Sin dato' }}</p>
                  </div>
                  <div class="bg-slate-50 rounded-lg p-3">
                    <p class="text-xs text-slate-500 mb-1">Fuente sueldo</p>
                    <p class="font-bold text-slate-900">{{ saved.careerData.salary_source === 'sies' ? 'SIES' : '—' }}</p>
                  </div>
                </div>

                <!-- Notes -->
                <div class="space-y-2">
                  <label class="text-xs font-medium text-slate-600">Mis notas</label>
                  <textarea
                    :value="saved.notes"
                    @input="updateNotes(saved.id, ($event.target as HTMLTextAreaElement).value)"
                    placeholder="Añade tus notas personales..."
                    class="w-full p-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                    rows="3">
                  </textarea>
                </div>

                <!-- Actions -->
                <div class="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row">
                  <NuxtLink
                    :to="`/results/${store.sessionId}/${saved.careerData.id}`"
                    class="flex-1 rounded-lg bg-primary-50 px-4 py-2 text-center text-sm font-medium text-primary-600 transition-colors hover:bg-primary-100">
                    Ver Completo
                  </NuxtLink>
                  <button
                    @click="exportSinglePDF(saved.careerData)"
                    class="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
                    Exportar PDF
                  </button>
                </div>
              </div>

              <!-- Saved Date -->
              <div class="rounded-b-3xl bg-slate-50 px-4 py-3 text-xs text-slate-500 sm:px-6">
                Guardado el {{ formatDate(saved.savedAt) }}
              </div>
            </div>
          </div>

          <!-- Comparar Carreras -->
          <div v-if="store.savedCareers.length > 1" class="rounded-3xl border border-primary-200 bg-gradient-to-r from-primary-50 to-accent-50 p-5 text-center sm:p-8">
            <h3 class="mb-3 text-xl font-bold text-slate-900 sm:text-2xl">Comparar tus carreras guardadas</h3>
            <p class="text-slate-600 mb-6">Usa nuestro comparador para analizar las diferencias entre tus opciones favoritas</p>
            <button
              @click="showComparator = true"
              class="btn-primary">
              Abrir Comparador
            </button>
          </div>
        </template>
      </div>
    </main>

    <!-- Comparador Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-300"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-all duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0">
        <div
          v-if="showComparator"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          @click="showComparator = false">
          <div
            class="max-h-[90vh] w-full max-w-6xl overflow-auto rounded-3xl bg-white"
            @click.stop>
            <div class="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white p-4 sm:p-6">
              <h2 class="text-xl font-bold text-slate-900 sm:text-2xl">Comparador de Carreras</h2>
              <button
                @click="showComparator = false"
                class="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <svg class="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div class="p-4 sm:p-6">
              <CareerComparator :careers="store.savedCareers.map(c => c.careerData)" />
            </div>
            <div class="sticky bottom-0 flex flex-col gap-3 border-t border-slate-100 bg-slate-50 p-4 sm:flex-row sm:justify-end sm:p-6">
              <button
                @click="showComparator = false"
                class="w-full rounded-lg border border-slate-200 px-6 py-2 font-medium text-slate-700 transition-colors hover:bg-slate-100 sm:w-auto">
                Cerrar
              </button>
              <button
                @click="exportComparison"
                class="w-full rounded-lg bg-primary-600 px-6 py-2 font-medium text-white transition-colors hover:bg-primary-700 sm:w-auto">
                Exportar Comparación PDF
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
import { BookOpen } from 'lucide-vue-next'
import { useCareerStore } from '~/stores/career'
import { exportRoadmapToPDF, exportComparisonToPDF } from '~/utils/exportPDF'

const store = useCareerStore()
const showComparator = ref(false)

function removeSaved(id: string) {
  if (confirm('¿Eliminar esta carrera guardada?')) {
    store.removeSavedCareer(id)
  }
}

function updateNotes(id: string, notes: string) {
  store.updateSavedCareerNotes(id, notes)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatCLP(value?: number | null) {
  if (!value) return 'Sin dato'
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value)
}

function officialIncomeLabel(career: any) {
  if (career?.salary_source !== 'sies') return 'Sin dato oficial'
  return formatCLP(career.salary_range?.senior || career.salary_range?.mid || career.salary_range?.junior)
}

function exportSinglePDF(career: any) {
  exportRoadmapToPDF(career)
}

function exportComparison() {
  const careers = store.savedCareers.map(c => c.careerData)
  exportComparisonToPDF(careers)
  showComparator.value = false
}
</script>
