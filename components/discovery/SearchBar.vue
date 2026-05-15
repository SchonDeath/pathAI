<template>
  <div class="w-full max-w-2xl mx-auto">
    <div
      class="relative rounded-3xl transition-all duration-300 bg-white border border-slate-200"
      :class="focused ? 'shadow-search border-primary-300' : 'shadow-card'">
      <textarea
        ref="textareaRef"
        v-model="inputValue"
        :placeholder="placeholder"
        :disabled="loading"
        rows="1"
        aria-label="Describe tu idea o intereses para descubrir carreras"
        maxlength="500"
        class="w-full resize-none rounded-3xl bg-transparent px-4 pb-3 pt-4 text-sm font-medium leading-relaxed text-slate-900 placeholder:text-slate-500 outline-none sm:px-6 sm:pb-4 sm:pt-5 sm:text-base"
        :style="{ minHeight: '88px', maxHeight: '180px' }"
        @focus="focused = true"
        @blur="focused = false"
        @keydown.enter.prevent="handleSubmit"
        @input="autoResize"
      />

      <div class="flex flex-col gap-3 px-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-500">{{ inputValue.length }}/500</span>
          <template v-if="!loading && inputValue.length > 0">
            <button
              type="button"
              class="text-xs text-slate-500 hover:text-slate-600 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100"
              @click="inputValue = ''">
              Limpiar
            </button>
          </template>
        </div>

        <button
          :disabled="!canSubmit"
          class="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 sm:w-auto"
          :class="loading ? 'animate-pulse-subtle' : ''"
          @click="handleSubmit">
          <template v-if="loading">
            <div class="dot-loader flex items-center gap-0.5">
              <span></span><span></span><span></span>
            </div>
            <span class="transition-all duration-500">{{ currentLoadingStep }}</span>
          </template>
          <template v-else>
            <!-- Brujula KoraChile -->
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="9" />
              <polygon points="12,5 14,12 12,11" fill="currentColor" stroke="none" />
              <polygon points="12,19 10,12 12,13" fill="currentColor" fill-opacity="0.5" stroke="none" />
              <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
            </svg>
            <span>Descubrir</span>
          </template>
        </button>
      </div>
    </div>

    <p v-if="error" class="mt-3 text-sm text-red-500 text-center animate-fade-in">
      {{ error }}
    </p>

    <div class="mt-4 flex flex-wrap justify-center gap-2">
      <button
        v-for="suggestion in rotatedSuggestions"
        :key="suggestion"
        class="px-3 py-1.5 rounded-full border border-slate-200 bg-slate-100 text-[11px] font-medium text-slate-600 transition-all duration-200 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 sm:px-3.5 sm:text-xs"
        @click="useSuggestion(suggestion)">
        {{ suggestion }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  submit: [query: string]
}>()

const props = defineProps<{
  loading?: boolean
  error?: string | null
}>()

const inputValue = ref('')
const focused = ref(false)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

const placeholder = 'Describe tus intereses, habilidades y qué te emociona...\nEj: "Me encanta el diseño, la tecnología y ayudar a resolver problemas"'

const suggestions = [
  'Me encanta la creatividad y la tecnología',
  'Apasionado por datos y patrones',
  'Enfoque en personas y pensamiento estratégico',
  'Construir cosas con código',
  'Ciencia y resolver problemas complejos',
  'Disfruto ayudar a otros a sentirse mejor',
  'Me atraen los negocios y la estrategia',
  'Me fascina la naturaleza y el medio ambiente',
  'Me interesa el diseño y la experiencia visual',
  'Me motiva investigar y descubrir cosas nuevas',
  'Me gusta liderar y coordinar equipos',
  'Me inspira comunicar y contar historias',
  'Me gustan las máquinas y entender cómo funcionan',
  'Amo los números, la lógica y resolver puzzles',
  'Quiero emprender algo propio algún día',
]

// Sugerencias visibles — se asignan en onMounted para evitar hydration mismatch.
// En SSR siempre se muestran las 5 primeras (fijas); en cliente se mezclan.
const rotatedSuggestions = ref<string[]>(suggestions.slice(0, 5))

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const canSubmit = computed(() => !props.loading && inputValue.value.trim().length >= 5)

onMounted(() => {
  rotatedSuggestions.value = shuffle(suggestions).slice(0, 5)
})

const loadingSteps = [
  'Analizando tus intereses...',
  'Explorando el mercado laboral...',
  'Generando rutas de carrera...',
  'Preparando tu hoja de ruta...',
]
const loadingStepIndex = ref(0)
let loadingInterval: ReturnType<typeof setInterval> | null = null
const currentLoadingStep = computed(() => loadingSteps[loadingStepIndex.value])

watch(() => props.loading, (val) => {
  if (val) {
    loadingStepIndex.value = 0
    loadingInterval = setInterval(() => {
      loadingStepIndex.value = (loadingStepIndex.value + 1) % loadingSteps.length
    }, 1800)
  } else {
    if (loadingInterval) {
      clearInterval(loadingInterval)
      loadingInterval = null
    }
  }
})

onUnmounted(() => {
  if (loadingInterval) clearInterval(loadingInterval)
})

function autoResize() {
  if (!textareaRef.value) return
  textareaRef.value.style.height = 'auto'
  textareaRef.value.style.height = `${Math.min(textareaRef.value.scrollHeight, 180)}px`
}

function useSuggestion(s: string) {
  inputValue.value = s
  nextTick(() => autoResize())
  textareaRef.value?.focus()
}

function handleSubmit() {
  if (!canSubmit.value) return
  emit('submit', inputValue.value.trim())
}
</script>
