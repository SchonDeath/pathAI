<template>
  <div class="w-full space-y-8">
    <!-- Selector de carreras -->
    <div class="space-y-4">
      <label class="block text-sm font-medium text-slate-700">Selecciona hasta 3 carreras para comparar</label>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div v-for="(career, idx) in availableCareers" :key="idx" class="relative">
          <input
            type="checkbox"
            :id="`career-${idx}`"
            :checked="selected.includes(career.id)"
            @change="toggleCareer(career.id)"
            :disabled="selected.length >= 3 && !selected.includes(career.id)"
            class="sr-only"
          />
          <label
            :for="`career-${idx}`"
            class="flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all"
            :class="[
              selected.includes(career.id)
                ? 'border-primary-500 bg-primary-50'
                : 'border-slate-200 hover:border-primary-300 bg-white hover:bg-slate-50'
            ]">
            <div
              class="w-5 h-5 rounded border-2 flex items-center justify-center"
              :class="[
                selected.includes(career.id)
                  ? 'border-primary-500 bg-primary-600'
                  : 'border-slate-300'
              ]">
              <svg v-if="selected.includes(career.id)" class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </div>
            <div>
              <p class="font-medium text-slate-900">{{ career.title }}</p>
              <p class="text-xs text-slate-500">{{ career.tagline }}</p>
            </div>
          </label>
        </div>
      </div>
    </div>

    <!-- Tabla Comparativa -->
    <div v-if="selected.length > 0" class="space-y-6">
      <!-- Desktop Table -->
      <div class="hidden lg:block overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-slate-200">
              <th class="text-left py-4 px-4 font-semibold text-slate-900 bg-slate-50">Criterio</th>
              <th v-for="careerData in selectedCareersData" :key="careerData.id" class="text-center py-4 px-4 font-semibold text-slate-900 bg-slate-50">
                <div class="mb-2 flex justify-center"><GraduationCap class="w-5 h-5 text-primary-600" /></div>
                {{ careerData.title }}
              </th>
            </tr>
          </thead>
          <tbody>
            <!-- Ingreso oficial -->
            <tr class="border-b border-slate-100 hover:bg-slate-50">
              <td class="py-4 px-4 font-medium text-slate-900">Ingreso oficial SIES</td>
              <td v-for="careerData in selectedCareersData" :key="`salary-${careerData.id}`" class="text-center py-4 px-4">
                <p class="font-bold text-emerald-600">{{ officialIncomeLabel(careerData) }}</p>
                <p class="text-xs text-slate-500 mt-1">{{ officialIncomeSource(careerData) }}</p>
              </td>
            </tr>

            <!-- Match Score -->
            <tr class="border-b border-slate-100 hover:bg-slate-50">
              <td class="py-4 px-4 font-medium text-slate-900">Compatibilidad</td>
              <td v-for="careerData in selectedCareersData" :key="`match-${careerData.id}`" class="text-center py-4 px-4">
                <div class="flex items-center justify-center gap-2">
                  <div class="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-primary-600 to-accent-500" :style="{ width: `${careerData.match_score}%` }"></div>
                  </div>
                  <span class="font-bold text-primary-600 w-8">{{ careerData.match_score }}%</span>
                </div>
              </td>
            </tr>

            <!-- Demanda Laboral -->
            <tr class="border-b border-slate-100 hover:bg-slate-50">
              <td class="py-4 px-4 font-medium text-slate-900">Demanda Laboral</td>
              <td v-for="careerData in selectedCareersData" :key="`demand-${careerData.id}`" class="text-center py-4 px-4">
                <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium" :class="demandClass(careerData.job_demand)">
                  {{ careerData.job_demand || 'Sin dato' }}
                </span>
              </td>
            </tr>

            <!-- Duración estimada -->
            <tr class="border-b border-slate-100 hover:bg-slate-50">
              <td class="py-4 px-4 font-medium text-slate-900">Duración Estimada</td>
              <td v-for="careerData in selectedCareersData" :key="`duration-${careerData.id}`" class="text-center py-4 px-4">
                <p class="font-bold text-slate-900">{{ estimatedMonths(careerData) }} meses</p>
              </td>
            </tr>

            <!-- Número de habilidades -->
            <tr class="hover:bg-slate-50">
              <td class="py-4 px-4 font-medium text-slate-900">Habilidades a aprender</td>
              <td v-for="careerData in selectedCareersData" :key="`skills-${careerData.id}`" class="text-center py-4 px-4">
                <p class="font-bold text-slate-900">{{ careerData.skills.length }} skills clave</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile Cards -->
      <div class="lg:hidden space-y-4">
        <div v-for="careerData in selectedCareersData" :key="careerData.id" class="bg-white rounded-3xl p-6 border border-slate-100 space-y-4">
          <div class="flex items-start gap-3">
            <GraduationCap class="w-6 h-6 text-primary-600 shrink-0" />
            <div>
              <h3 class="font-bold text-slate-900">{{ careerData.title }}</h3>
              <p class="text-sm text-slate-500">{{ careerData.tagline }}</p>
            </div>
          </div>

          <div class="space-y-3 border-t border-slate-100 pt-4">
            <div class="flex justify-between items-center">
              <span class="text-sm text-slate-600">Ingreso oficial SIES</span>
              <p class="font-bold text-emerald-600">{{ officialIncomeLabel(careerData) }}</p>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-slate-600">Demanda</span>
              <span class="text-xs font-medium">{{ careerData.job_demand || 'Sin dato' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Recomendación -->
      <div class="bg-gradient-to-r from-primary-50 to-accent-50 rounded-3xl p-6 border border-primary-200">
        <h3 class="font-bold text-slate-900 mb-2 inline-flex items-center gap-1.5"><Lightbulb class="w-4 h-4 text-amber-500" />Recomendación</h3>
        <p class="text-slate-700">
          {{ getBestRecommendation() }}
        </p>
      </div>
    </div>

    <div v-else class="text-center py-12 text-slate-500">
      <p>Selecciona carreras para comenzar la comparación</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { GraduationCap, Lightbulb } from 'lucide-vue-next'
import type { CareerVariation } from '~/stores/career'

interface Props {
  careers: CareerVariation[]
}

const props = defineProps<Props>()

const selected = ref<string[]>([])
const availableCareers = computed(() => props.careers)
const selectedCareersData = computed(() =>
  props.careers.filter(c => selected.value.includes(c.id))
)

function toggleCareer(careerId: string) {
  if (selected.value.includes(careerId)) {
    selected.value = selected.value.filter(id => id !== careerId)
  } else if (selected.value.length < 3) {
    selected.value.push(careerId)
  }
}

function estimatedMonths(career: CareerVariation): number {
  const durations = career.roadmap.map(p => {
    const match = p.duration.match(/(\d+)/)
    return parseInt(match?.[1] || '0')
  })
  return durations.reduce((a, b) => a + b, 0)
}

function formatCLP(value?: number | null): string {
  if (!value) return 'Sin dato'
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value)
}

function officialIncomeLabel(career: CareerVariation): string {
  if (career.salary_source !== 'sies') return 'Sin dato oficial'
  return formatCLP(career.salary_range?.senior || career.salary_range?.mid || career.salary_range?.junior)
}

function officialIncomeSource(career: CareerVariation): string {
  if (career.salary_source !== 'sies') return 'Kora no estima sueldos'
  const year = career.salary_year ? ` ${career.salary_year}` : ''
  return `SIES/MiFuturo${year}`
}

function demandClass(demand?: string) {
  if (demand === 'Muy Alta') return 'bg-emerald-100 text-emerald-700 border border-emerald-200'
  if (demand === 'Alta') return 'bg-blue-100 text-blue-700 border border-blue-200'
  if (demand === 'Media') return 'bg-amber-100 text-amber-700 border border-amber-200'
  return 'bg-slate-100 text-slate-600 border border-slate-200'
}

function getBestRecommendation(): string {
  if (selectedCareersData.value.length === 0) return ''

  const best = selectedCareersData.value.reduce((prev, current) =>
    current.match_score > prev.match_score ? current : prev
  )

  const bestIncome = selectedCareersData.value
    .filter(c => c.salary_source === 'sies')
    .sort((a, b) => {
      const av = a.salary_range?.senior || a.salary_range?.mid || a.salary_range?.junior || 0
      const bv = b.salary_range?.senior || b.salary_range?.mid || b.salary_range?.junior || 0
      return bv - av
    })[0]

  if (!bestIncome) {
    return `${best.title} es tu mejor match (${best.match_score}%). No hay ingresos SIES suficientes para comparar sueldo sin estimar.`
  }

  if (best.id === bestIncome.id) {
    return `${best.title} combina el mayor match (${best.match_score}%) con el mejor ingreso oficial disponible (${officialIncomeLabel(best)}).`
  }

  return `${best.title} es tu mejor match (${best.match_score}%), pero ${bestIncome.title} muestra el mayor ingreso SIES disponible (${officialIncomeLabel(bestIncome)}). Considera compatibilidad y evidencia salarial.`
}
</script>
