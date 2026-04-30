<template>
  <div class="w-full max-w-3xl mx-auto">
    <!-- Progress -->
    <div class="mb-8">
      <div class="flex items-center justify-between mb-3">
        <span class="text-sm font-medium text-slate-600">
          <span class="text-primary-700 font-bold">{{ currentIdx + 1 }}</span> / {{ totalQuestions }}
          <span class="hidden sm:inline text-slate-500 ml-2">· {{ currentSection }}</span>
        </span>
        <span class="text-xs text-slate-500">{{ progress }}%</span>
      </div>
      <div class="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div class="h-full bg-gradient-to-r from-primary-600 to-accent-500 transition-all duration-500 rounded-full" :style="{ width: `${progress}%` }"></div>
      </div>
    </div>

    <!-- Question -->
    <div class="mb-8 space-y-6" :key="currentIdx">
      <div class="animate-fade-in space-y-2">
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
          :class="{
            'bg-primary-50 text-primary-700': currentQuestion.kind === 'riasec',
            'bg-accent-50 text-accent-700': currentQuestion.kind === 'mbti',
            'bg-emerald-50 text-emerald-700': currentQuestion.kind === 'free',
          }">
          {{ currentQuestion.kind === 'riasec' ? '🧭 Intereses' : currentQuestion.kind === 'mbti' ? '🧠 Personalidad' : '✍️ Cuéntanos' }}
        </span>
        <h2 class="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">{{ currentQuestion.title }}</h2>
        <p class="text-sm sm:text-base text-slate-600">{{ currentQuestion.description }}</p>
      </div>

      <!-- Options (opción múltiple) -->
      <div v-if="currentQuestion.kind !== 'free'" class="space-y-3">
        <button
          v-for="option in currentQuestion.options"
          :key="option.value"
          @click="selectAndAdvance(option.value)"
          class="w-full p-4 rounded-2xl border-2 transition-[border-color,background-color,transform] duration-200 text-left hover:scale-[1.01] active:scale-[0.99]"
          :class="[
            answers[currentQuestion.id] === option.value
              ? 'border-primary-500 bg-primary-50/60 shadow-sm'
              : 'border-slate-200 hover:border-primary-300 bg-white hover:bg-slate-50'
          ]">
          <div class="flex items-center gap-3">
            <div
              class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-[border-color,background-color] shrink-0"
              :class="answers[currentQuestion.id] === option.value
                ? 'border-primary-500 bg-primary-600'
                : 'border-slate-300'">
              <svg v-if="answers[currentQuestion.id] === option.value" class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-slate-900 text-[15px]">{{ option.label }}</p>
              <p v-if="option.hint" class="text-xs text-slate-500 mt-0.5 leading-relaxed">{{ option.hint }}</p>
            </div>
          </div>
        </button>
      </div>

      <!-- Texto libre (opcional) -->
      <div v-else class="space-y-2">
        <textarea
          v-model="freeText"
          rows="5"
          maxlength="600"
          placeholder="Por ejemplo: me encantan los videojuegos y la música, estudio mecánico en el TP, me gustaría trabajar ayudando a animales, no me va bien en matemáticas pero sí en lenguaje..."
          class="w-full p-4 rounded-2xl border-2 border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-slate-800 text-sm leading-relaxed placeholder:text-slate-500 resize-none outline-none transition-all duration-200 bg-white"
        ></textarea>
        <div class="flex items-center justify-between text-xs">
          <span class="text-slate-500">Opcional · cuéntanos cualquier cosa relevante sobre ti</span>
          <span :class="freeText.length > 550 ? 'text-amber-600 font-semibold' : 'text-slate-500'">{{ freeText.length }}/600</span>
        </div>
      </div>
    </div>

    <!-- Navigation -->
    <div class="flex gap-3 justify-between items-center">
      <button
        v-if="currentIdx > 0"
        @click="previous"
        class="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors">
        ← Anterior
      </button>
      <div v-else></div>

      <button
        v-if="currentIdx < totalQuestions - 1"
        @click="next"
        :disabled="currentQuestion.kind !== 'free' && !answers[currentQuestion.id]"
        class="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
        Siguiente →
      </button>

      <button
        v-else
        @click="submit"
        :disabled="!isComplete"
        class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-accent-500 text-white text-sm font-bold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all">
        Ver mis carreras ✨
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Quiz vocacional basado en:
 *  - RIASEC (Holland): 6 preguntas, una por dimensión (Realista, Investigador, Artístico, Social, Emprendedor, Convencional).
 *    Cada opción otorga puntaje 2/1/0 según afinidad con esa dimensión.
 *    Se calcula el código de 3 letras con las dimensiones de mayor puntaje.
 *  - MBTI (dicotomías): 4 preguntas, una por cada eje (E/I, S/N, T/F, J/P).
 *    La concatenación da el tipo (ej: INTP).
 */

export interface QuizResult {
  answers: Record<string, string>
  riasec_scores: Record<'R' | 'I' | 'A' | 'S' | 'E' | 'C', number>
  holland_code: string
  holland_profile: string[]
  mbti_type: string
  free_text?: string
}

const emit = defineEmits<{
  complete: [result: QuizResult]
}>()

type RiasecLetter = 'R' | 'I' | 'A' | 'S' | 'E' | 'C'

interface QuizOption {
  value: string
  label: string
  hint?: string
  score?: number
  mbti?: 'E' | 'I' | 'S' | 'N' | 'T' | 'F' | 'J' | 'P'
}

interface QuizQuestion {
  id: string
  kind: 'riasec' | 'mbti' | 'free'
  dimension?: RiasecLetter | string
  title: string
  description: string
  options: QuizOption[]
}

const RIASEC_LABELS: Record<RiasecLetter, string> = {
  R: 'Realista',
  I: 'Investigador',
  A: 'Artístico',
  S: 'Social',
  E: 'Emprendedor',
  C: 'Convencional',
}

// Escala común para RIASEC: me encanta / neutral / no es lo mío
const SCALE: QuizOption[] = [
  { value: 'high', label: 'Me encanta, lo disfrutaría mucho', score: 2 },
  { value: 'mid',  label: 'Me parece interesante, pero no me apasiona', score: 1 },
  { value: 'low',  label: 'No es lo mío, me aburriría', score: 0 },
]

const questions: QuizQuestion[] = [
  // ── RIASEC ──
  {
    id: 'r_realistic',
    kind: 'riasec',
    dimension: 'R',
    title: 'Trabajar con tus manos, herramientas o máquinas',
    description: 'Construir, reparar, operar equipos, trabajar al aire libre, con plantas o animales.',
    options: SCALE,
  },
  {
    id: 'r_investigative',
    kind: 'riasec',
    dimension: 'I',
    title: 'Investigar, analizar y resolver problemas complejos',
    description: 'Hacer experimentos, analizar datos, estudiar cómo funcionan las cosas, buscar explicaciones.',
    options: SCALE,
  },
  {
    id: 'r_artistic',
    kind: 'riasec',
    dimension: 'A',
    title: 'Crear, expresarte artísticamente o diseñar',
    description: 'Dibujar, escribir, componer música, actuar, diseñar interfaces, expresar ideas de forma original.',
    options: SCALE,
  },
  {
    id: 'r_social',
    kind: 'riasec',
    dimension: 'S',
    title: 'Ayudar, enseñar o cuidar a otras personas',
    description: 'Acompañar, orientar, educar, trabajar en salud, acompañar en procesos emocionales o sociales.',
    options: SCALE,
  },
  {
    id: 'r_enterprising',
    kind: 'riasec',
    dimension: 'E',
    title: 'Liderar, vender o emprender',
    description: 'Dirigir equipos, convencer a otros, gestionar un negocio, negociar, influir con ideas.',
    options: SCALE,
  },
  {
    id: 'r_conventional',
    kind: 'riasec',
    dimension: 'C',
    title: 'Trabajar con datos ordenados, registros y procedimientos',
    description: 'Llevar cuentas, organizar información, seguir protocolos, manejar sistemas contables o administrativos.',
    options: SCALE,
  },

  // ── MBTI ──
  {
    id: 'm_ei',
    kind: 'mbti',
    dimension: 'E/I',
    title: '¿De dónde sacas tu energía?',
    description: 'Piensa en un día ideal después del trabajo o del estudio.',
    options: [
      { value: 'E', label: 'Rodeándome de gente', hint: 'Salir, conversar, hacer planes con amigos me recarga.', mbti: 'E' },
      { value: 'I', label: 'Teniendo tiempo a solas', hint: 'Estar tranquilo en mi espacio, con pocos estímulos, me repone.', mbti: 'I' },
    ],
  },
  {
    id: 'm_sn',
    kind: 'mbti',
    dimension: 'S/N',
    title: '¿Cómo procesas la información?',
    description: 'Cuando enfrentas algo nuevo, a qué le prestas más atención.',
    options: [
      { value: 'S', label: 'A los hechos concretos y detalles', hint: 'Prefiero datos tangibles, ejemplos reales, lo que puedo ver y medir.', mbti: 'S' },
      { value: 'N', label: 'A patrones, ideas y posibilidades', hint: 'Me atraen las conexiones, el "qué tal si...", la teoría y el panorama general.', mbti: 'N' },
    ],
  },
  {
    id: 'm_tf',
    kind: 'mbti',
    dimension: 'T/F',
    title: '¿Cómo tomas decisiones difíciles?',
    description: 'Cuando tienes que elegir entre opciones parecidas.',
    options: [
      { value: 'T', label: 'Analizando lógicamente', hint: 'Busco la opción más justa, eficiente o coherente según los criterios.', mbti: 'T' },
      { value: 'F', label: 'Priorizando a las personas', hint: 'Considero cómo afecta a los demás y lo que siento al respecto.', mbti: 'F' },
    ],
  },
  {
    id: 'm_jp',
    kind: 'mbti',
    dimension: 'J/P',
    title: '¿Cómo te organizas?',
    description: 'Tu forma natural de enfrentar un proyecto o el día a día.',
    options: [
      { value: 'J', label: 'Planifico y cierro decisiones pronto', hint: 'Me gusta tener el plan claro, fechas definidas y tachar cosas de la lista.', mbti: 'J' },
      { value: 'P', label: 'Improviso y dejo opciones abiertas', hint: 'Prefiero la flexibilidad, ajustar sobre la marcha y no cerrarme tan rápido.', mbti: 'P' },
    ],
  },

  // ── Texto libre (opcional) ──
  {
    id: 'free_about',
    kind: 'free',
    title: 'Cuéntanos de ti (opcional)',
    description: 'Agrega cualquier cosa que creas que ayuda: gustos, hobbies, materias que te van bien, contexto familiar, lo que odias, lo que sueñas. Mientras más nos cuentes, mejores carreras te recomendamos.',
    options: [],
  },
]

const answers = ref<Record<string, string>>({})
const freeText = ref('')
const currentIdx = ref(0)

const totalQuestions = questions.length
const currentQuestion = computed(() => questions[currentIdx.value])
const currentSection = computed(() => {
  switch (currentQuestion.value.kind) {
    case 'riasec': return 'Intereses (RIASEC)'
    case 'mbti': return 'Personalidad (MBTI)'
    case 'free': return 'Sobre ti'
  }
})
const progress = computed(() => Math.round(((currentIdx.value + 1) / totalQuestions) * 100))
// El quiz se puede completar sin responder la pregunta de texto libre (es opcional)
const isComplete = computed(() => questions.every(q => q.kind === 'free' || answers.value[q.id]))

function selectAndAdvance(value: string) {
  answers.value[currentQuestion.value.id] = value
  // Auto-avance suave tras seleccionar (mejor UX)
  if (currentIdx.value < totalQuestions - 1) {
    setTimeout(() => {
      if (currentIdx.value < totalQuestions - 1 && answers.value[currentQuestion.value.id] === value) {
        currentIdx.value++
      }
    }, 280)
  }
}

function next() {
  if (currentIdx.value < totalQuestions - 1) currentIdx.value++
}

function previous() {
  if (currentIdx.value > 0) currentIdx.value--
}

function computeResult(): QuizResult {
  // RIASEC: sumar scores por dimensión
  const scores: Record<RiasecLetter, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 }
  for (const q of questions) {
    if (q.kind !== 'riasec') continue
    const dim = q.dimension as RiasecLetter
    const selected = q.options.find(o => o.value === answers.value[q.id])
    scores[dim] += selected?.score ?? 0
  }
  // Top 3 letras (desempate por orden canónico RIASEC)
  const canonicalOrder: RiasecLetter[] = ['R', 'I', 'A', 'S', 'E', 'C']
  const sortedLetters = canonicalOrder
    .slice()
    .sort((a, b) => scores[b] - scores[a] || canonicalOrder.indexOf(a) - canonicalOrder.indexOf(b))
  const topThree = sortedLetters.slice(0, 3)
  const hollandCode = topThree.join('')
  const hollandProfile = topThree.map(l => RIASEC_LABELS[l])

  // MBTI: concatenar respuestas en orden E/I, S/N, T/F, J/P
  const mbtiQs = ['m_ei', 'm_sn', 'm_tf', 'm_jp']
  const mbtiType = mbtiQs.map(id => answers.value[id] || '?').join('')

  return {
    answers: { ...answers.value },
    riasec_scores: scores,
    holland_code: hollandCode,
    holland_profile: hollandProfile,
    mbti_type: mbtiType,
    free_text: freeText.value.trim() || undefined,
  }
}

function submit() {
  if (!isComplete.value) return
  emit('complete', computeResult())
}
</script>
