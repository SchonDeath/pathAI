<template>
  <div
    class="bg-white rounded-[1.75rem] border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-0.5 hover:border-slate-300 transition-all duration-300 overflow-hidden group cursor-pointer flex flex-col sm:flex-row"
    :class="visible ? 'animate-scale-in' : 'opacity-0'"
    ref="cardRef"
    @click="goToRoadmap">

    <!-- Panel izquierdo: imagen / emoji -->
    <div
      class="relative shrink-0 min-h-36 sm:w-48 flex items-center justify-center transition-transform duration-300 group-hover:scale-[1.02]"
      :style="{ background: iconBg }">
      <div class="absolute inset-0 opacity-50 bg-[radial-gradient(circle_at_20%_20%,white_0,transparent_34%),radial-gradient(circle_at_80%_70%,white_0,transparent_30%)]"></div>
      <GraduationCap class="relative w-14 h-14 text-primary-700 drop-shadow-sm" />

      <!-- Badge match score -->
      <div class="absolute top-3 left-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-sm border border-white/70">
        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span class="text-xs font-extrabold text-slate-800">{{ career.match_score }}% match</span>
      </div>
    </div>

    <!-- Contenido derecho -->
    <div class="flex-1 min-w-0 p-4 sm:p-5 flex flex-col justify-between">
      <!-- Cabecera -->
      <div>
        <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span v-if="career.job_demand" class="inline-flex items-center gap-1 text-[11px] font-semibold tracking-wide uppercase"
            :class="{
              'text-emerald-600': career.job_demand === 'Muy Alta',
              'text-blue-600': career.job_demand === 'Alta',
              'text-amber-600': career.job_demand === 'Media',
              'text-slate-500': !['Muy Alta','Alta','Media'].includes(career.job_demand),
            }">
            <Flame class="w-3 h-3" /> Demanda {{ career.job_demand }}
          </span>
          <span class="text-[11px] uppercase tracking-[0.18em] text-slate-400 font-bold">Ruta recomendada</span>
        </div>

        <!-- Título -->
        <h3 class="text-lg font-extrabold leading-tight tracking-tight text-slate-950 sm:text-xl">{{ career.title }}</h3>
        <!-- Descripción -->
        <p class="text-sm text-slate-600 mt-2 leading-relaxed line-clamp-2">{{ career.description || career.tagline }}</p>

        <!-- Skills -->
        <div class="mt-3 flex flex-wrap gap-1.5">
          <SkillPill
            v-for="(skill, i) in career.skills.slice(0, 3)"
            :key="skill"
            :skill="skill"
            class="animate-fade-in"
            :style="{ animationDelay: `${i * 50}ms` }" />
          <span v-if="career.skills.length > 3" class="tag bg-slate-50 text-slate-500 border border-slate-200 text-xs">+{{ career.skills.length - 3 }}</span>
        </div>
      </div>

      <!-- Footer: sueldo oficial + botón -->
      <div class="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div v-if="hasOfficialSalary" class="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
          <div class="rounded-2xl bg-emerald-50 border border-emerald-100 px-3 py-2">
            <p class="text-[10px] font-bold tracking-widest text-emerald-700 uppercase">Ingreso 1° año</p>
            <p class="text-sm font-extrabold text-slate-900 mt-0.5">{{ formatCLP(officialSalary?.junior) }}</p>
          </div>
          <div class="rounded-2xl bg-cyan-50 border border-cyan-100 px-3 py-2">
            <p class="text-[10px] font-bold tracking-widest text-cyan-700 uppercase">Ingreso 5° año</p>
            <p class="text-sm font-extrabold text-slate-900 mt-0.5">{{ formatCLP(officialSalary?.senior || officialSalary?.mid) }}</p>
          </div>
          <p class="col-span-2 text-[11px] text-slate-500">
            Fuente: {{ salarySourceLabel }}. No usamos estimaciones de IA para sueldos.
          </p>
        </div>
        <div v-else class="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p class="text-[10px] font-bold tracking-widest text-slate-500 uppercase">Sueldo oficial</p>
          <p class="text-sm font-semibold text-slate-700 mt-0.5">Sin dato SIES para esta recomendación</p>
        </div>

        <button class="flex w-full shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2 text-xs font-semibold text-white transition-colors duration-200 group-hover:shadow-md hover:bg-primary-700 sm:w-auto">
          Ver carrera
          <svg class="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Flame, GraduationCap } from 'lucide-vue-next'
import { useCareerStore } from '~/stores/career'
import type { CareerVariation } from '~/stores/career'

const props = defineProps<{ career: CareerVariation }>()
const router = useRouter()
const store = useCareerStore()

const cardRef = ref<HTMLElement | null>(null)
const visible = ref(false)

const iconBg = computed(() => {
  const palettes = [
    'linear-gradient(135deg, #eff6ff 0%, #ecfeff 100%)',
    'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
    'linear-gradient(135deg, #fdf4ff 0%, #fce7f3 100%)',
    'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
    'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
  ]
  const idx = props.career.id ? parseInt(props.career.id, 10) % palettes.length : 0
  return palettes[isNaN(idx) ? 0 : idx]
})

const officialSalary = computed(() =>
  props.career.salary_source === 'sies' ? props.career.salary_range : null
)

const hasOfficialSalary = computed(() => {
  const salary = officialSalary.value
  return !!salary && [salary.junior, salary.mid, salary.senior].some(v => typeof v === 'number' && v > 0)
})

const salarySourceLabel = computed(() => {
  const year = props.career.salary_year ? ` ${props.career.salary_year}` : ''
  return `SIES/MiFuturo${year}`
})

function formatCLP(value?: number | null) {
  if (!value) return 'Sin dato'
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value)
}

onMounted(() => {
  const observer = new IntersectionObserver(
    ([entry]) => { if (entry.isIntersecting) { visible.value = true; observer.disconnect() } },
    { threshold: 0.1 }
  )
  if (cardRef.value) observer.observe(cardRef.value)
})

const isSaved = computed(() =>
  store.savedCareers.some(c => c.careerData.id === props.career.id)
)

function goToRoadmap() {
  store.setSelectedCareer(props.career)
  router.push(`/results/${store.sessionId}/${props.career.id}`)
}
</script>
