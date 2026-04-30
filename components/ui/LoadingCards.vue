<template>
  <div class="space-y-8">
    <!-- Análisis en progreso -->
    <div class="space-y-4">
      <div class="text-center space-y-2">
        <div class="flex justify-center gap-1.5">
          <div v-for="i in 3" :key="i" class="w-2.5 h-2.5 rounded-full bg-primary-500 animate-pulse" :style="`animation-delay: ${i * 200}ms`"></div>
        </div>
        <p class="text-slate-600 font-medium">{{ analysisPhase }}</p>
      </div>

      <div class="max-w-lg mx-auto space-y-2">
        <div v-for="(phase, index) in phases" :key="phase" class="flex items-center gap-3">
          <div
            v-if="index < currentPhaseIndex"
            class="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
            <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </div>
          <div
            v-else-if="index === currentPhaseIndex"
            class="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center shrink-0 animate-pulse">
            <div class="w-2 h-2 rounded-full bg-white"></div>
          </div>
          <div v-else class="w-5 h-5 rounded-full border-2 border-slate-300 shrink-0"></div>
          <span :class="index <= currentPhaseIndex ? 'text-slate-700 font-medium' : 'text-slate-500'">{{ phase }}</span>
        </div>
      </div>
    </div>

    <!-- Skeleton cards -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div v-for="i in 3" :key="i" class="card p-6 space-y-4 animate-pulse">
        <div class="flex items-start gap-3">
          <div class="w-12 h-12 rounded-2xl shimmer-bg shrink-0"></div>
          <div class="flex-1 space-y-2">
            <div class="h-5 shimmer-bg rounded-full w-3/4"></div>
            <div class="h-3 shimmer-bg rounded-full w-full"></div>
          </div>
        </div>
        <div class="h-3 shimmer-bg rounded-full w-1/3"></div>
        <div class="space-y-2">
          <div class="h-3 shimmer-bg rounded-full w-full"></div>
          <div class="h-3 shimmer-bg rounded-full w-5/6"></div>
          <div class="h-3 shimmer-bg rounded-full w-4/5"></div>
        </div>
        <div class="flex flex-wrap gap-2 pt-1">
          <div v-for="j in 4" :key="j" class="h-6 w-16 shimmer-bg rounded-full"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const phases = [
  'Analizando tu perfil',
  'Generando opciones',
  'Compilando roadmaps',
]

const currentPhaseIndex = ref(0)

const analysisMessages = [
  'Procesando tus intereses...',
  'Evaluando habilidades...',
  'Buscando coincidencias...',
  'Creando roadmaps personalizados...',
]

const analysisPhase = ref('Procesando tus intereses...')

let phaseTimer: ReturnType<typeof setInterval>
let msgTimer: ReturnType<typeof setInterval>

onMounted(() => {
  // Cambiar fase cada 1.5s
  phaseTimer = setInterval(() => {
    currentPhaseIndex.value = (currentPhaseIndex.value + 1) % phases.length
  }, 1500)

  // Cambiar mensaje cada 1s
  msgTimer = setInterval(() => {
    analysisPhase.value = analysisMessages[Math.floor(Math.random() * analysisMessages.length)]
  }, 1000)
})

onUnmounted(() => {
  clearInterval(phaseTimer)
  clearInterval(msgTimer)
})
</script>
