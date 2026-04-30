<template>
  <div
    class="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-primary-200 transition-all duration-300 overflow-hidden group cursor-pointer flex"
    :class="visible ? 'animate-scale-in' : 'opacity-0'"
    ref="cardRef"
    @click="goToRoadmap">

    <!-- Panel izquierdo: imagen / emoji -->
    <div
      class="relative shrink-0 w-40 sm:w-48 flex items-center justify-center transition-transform duration-300 group-hover:scale-[1.02]"
      :style="{ background: iconBg }">
      <span class="text-6xl select-none">{{ career.emoji }}</span>

      <!-- Badge match score -->
      <div class="absolute top-3 left-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5 shadow-sm">
        <span class="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></span>
        <span class="text-xs font-bold text-primary-700">{{ career.match_score }}% Match</span>
      </div>
    </div>

    <!-- Contenido derecho -->
    <div class="flex-1 min-w-0 p-5 flex flex-col justify-between">
      <!-- Cabecera -->
      <div>
        <!-- Demanda -->
        <div class="flex items-center justify-between mb-1.5">
          <span v-if="career.job_demand" class="inline-flex items-center gap-1 text-[11px] font-semibold tracking-wide uppercase"
            :class="{
              'text-emerald-600': career.job_demand === 'Muy Alta',
              'text-blue-600': career.job_demand === 'Alta',
              'text-amber-600': career.job_demand === 'Media',
              'text-slate-500': !['Muy Alta','Alta','Media'].includes(career.job_demand),
            }">
            🔥 Demanda {{ career.job_demand }}
          </span>
        </div>

        <!-- Título -->
        <h3 class="font-bold text-slate-900 text-lg leading-snug">{{ career.title }}</h3>
        <!-- Descripción -->
        <p class="text-sm text-slate-500 mt-1 leading-snug line-clamp-2">{{ career.description || career.tagline }}</p>

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

      <!-- Footer: sueldo + botón -->
      <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
        <div class="flex gap-5">
          <div>
            <p class="text-[10px] font-semibold tracking-widest text-slate-500 uppercase">Sueldo Junior</p>
            <p class="text-sm font-bold text-slate-900 mt-0.5">
              {{ career.salary_range?.junior ? `$${career.salary_range.junior.toLocaleString('es-CL')}` : '—' }}
            </p>
          </div>
          <div v-if="career.salary_range?.senior">
            <p class="text-[10px] font-semibold tracking-widest text-slate-500 uppercase">Sueldo Senior</p>
            <p class="text-sm font-bold text-slate-900 mt-0.5">
              ${{ career.salary_range.senior.toLocaleString('es-CL') }}
            </p>
          </div>
        </div>

        <button class="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 text-white text-xs font-semibold hover:bg-primary-700 transition-colors duration-200 group-hover:shadow-md">
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
