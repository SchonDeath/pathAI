<template>
  <Transition
    enter-active-class="transition duration-250 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-180 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="visible"
      class="fixed inset-0 z-[90] bg-slate-950/45 backdrop-blur-[3px] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Simulando puntajes PAES"
    >
      <div class="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl">
        <div class="absolute -top-20 -left-16 h-48 w-48 rounded-full bg-sky-200/50 blur-3xl"></div>
        <div class="absolute -bottom-20 -right-14 h-48 w-48 rounded-full bg-emerald-200/45 blur-3xl"></div>

        <div class="relative px-6 py-8 sm:px-10 sm:py-10">
          <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Simulador PAES</p>
          <h2 class="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
            Calculando tus opciones
            <span class="block text-primary-600">con datos oficiales</span>
          </h2>
          <p class="mt-2 text-sm text-slate-600">
            Estamos cruzando puntajes, ponderaciones y vacantes para mostrarte programas reales.
          </p>

          <div class="relative mt-8 h-44 sm:h-48">
            <div
              v-for="(item, idx) in floatingIcons"
              :key="item.key"
              class="icon-float absolute"
              :style="iconStyle(item, idx)"
            >
              <div
                class="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl border border-white/70 shadow-lg grid place-items-center"
                :class="item.tone"
              >
                <component :is="item.icon" class="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
            </div>

            <div class="absolute inset-x-0 bottom-2 sm:bottom-0">
              <div class="h-2.5 rounded-full bg-slate-200/80 overflow-hidden">
                <div class="progress-shimmer h-full w-1/2 rounded-full bg-gradient-to-r from-primary-500 via-sky-400 to-emerald-400"></div>
              </div>
              <div class="mt-3 flex items-center gap-2 text-sm font-medium text-slate-700">
                <span class="w-2.5 h-2.5 rounded-full bg-primary-500 pulse-dot"></span>
                <span>{{ loadingText }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { BookOpenCheck, Building2, Calculator, ChartNoAxesCombined, Target } from 'lucide-vue-next'

const props = defineProps<{
  visible: boolean
}>()

const loadingLines = [
  'Revisando ponderaciones por carrera... ',
  'Comparando tus puntajes con corte histórico... ',
  'Ordenando mejores alternativas para ti... ',
]

const loadingText = ref(loadingLines[0])
let ticker: ReturnType<typeof setInterval> | null = null

const floatingIcons = [
  { key: 'target', icon: Target, tone: 'bg-primary-50 text-primary-600', x: 8, y: 12 },
  { key: 'calc', icon: Calculator, tone: 'bg-sky-50 text-sky-700', x: 32, y: 2 },
  { key: 'book', icon: BookOpenCheck, tone: 'bg-emerald-50 text-emerald-700', x: 60, y: 16 },
  { key: 'chart', icon: ChartNoAxesCombined, tone: 'bg-amber-50 text-amber-700', x: 24, y: 38 },
  { key: 'building', icon: Building2, tone: 'bg-violet-50 text-violet-700', x: 68, y: 34 },
] as const

function iconStyle(item: (typeof floatingIcons)[number], idx: number) {
  return {
    left: `${item.x}%`,
    top: `${item.y}%`,
    animationDelay: `${idx * 120}ms`,
  }
}

watch(
  () => props.visible,
  (isVisible) => {
    if (isVisible) {
      let idx = 0
      loadingText.value = loadingLines[0]
      ticker = setInterval(() => {
        idx = (idx + 1) % loadingLines.length
        loadingText.value = loadingLines[idx]!
      }, 1200)
      return
    }

    if (ticker) {
      clearInterval(ticker)
      ticker = null
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  if (ticker) clearInterval(ticker)
})
</script>

<style scoped>
.icon-float {
  animation: icon-float 1800ms ease-in-out infinite;
}

@keyframes icon-float {
  0% { transform: translateY(0px) scale(1); }
  50% { transform: translateY(-10px) scale(1.02); }
  100% { transform: translateY(0px) scale(1); }
}

.progress-shimmer {
  animation: progress-shimmer 1.3s ease-in-out infinite;
}

@keyframes progress-shimmer {
  0% { transform: translateX(-70%); }
  100% { transform: translateX(190%); }
}

.pulse-dot {
  animation: pulse-dot 1.1s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 0.4; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1.05); }
}
</style>
