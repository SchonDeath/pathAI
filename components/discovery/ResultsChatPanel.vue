<template>
  <aside
    class="bg-white/95 border border-slate-200 shadow-sm flex flex-col overflow-hidden transition-all duration-300"
    :class="mode === 'modal' ? 'rounded-3xl h-[min(78vh,700px)]' : 'rounded-3xl h-[calc(100vh-7rem)] lg:sticky lg:top-24'">

    <!-- Header -->
    <div class="px-5 py-4 border-b border-slate-100 bg-white/90 flex items-center justify-between gap-3">
      <div>
        <h2 class="text-base font-bold text-slate-900 leading-tight">Habla con Kora</h2>
        <p class="text-xs text-slate-500 mt-0.5">
          Contexto: <strong class="text-slate-700">{{ careerTitles.length }} carreras recomendadas</strong>
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="resetChat"
          class="px-3 py-1.5 rounded-full text-xs font-semibold border border-primary-200 text-primary-700 hover:bg-primary-50 transition">
          Nuevo chat
        </button>
        <button
          v-if="mode === 'modal'"
          @click="emit('close')"
          class="w-7 h-7 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition flex items-center justify-center"
          aria-label="Cerrar chat">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Messages -->
    <div ref="messagesEl" @scroll="handleScroll" class="relative flex-1 overflow-y-auto px-4 pt-4 pb-3 space-y-4">

      <!-- Bienvenida -->
      <div v-if="messages.length === 0" class="flex gap-3 msg-enter">
        <div class="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 shadow-sm ring-2 ring-white">
          <MascotIcon />
        </div>
        <div class="bg-white border border-slate-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] space-y-3">
          <p class="text-sm text-slate-800 leading-relaxed">
            ¡Hola{{ userFirstName ? `, ${userFirstName}` : '' }}! Vi que exploraste carreras relacionadas con
            <strong>{{ userQuery }}</strong>. ??<br><br>
            Te sugerí <strong>{{ careerTitles.join(', ') }}</strong>.
            ¿Quieres profundizar en alguna, comparar opciones o preguntar algo específico?
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="chip in quickPrompts"
              :key="chip"
              :disabled="loading"
              @click="sendPreset(chip)"
              class="px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
              {{ chip }}
            </button>
          </div>
        </div>
      </div>

      <!-- Mensajes -->
      <TransitionGroup name="msg" tag="div" class="space-y-4">
        <div
          v-for="(msg, i) in messages"
          :key="msg.id"
          class="flex gap-3 items-start"
          :class="msg.role === 'user' ? 'flex-row-reverse' : ''">
          <div class="flex-shrink-0">
            <UserAvatar
              v-if="msg.role === 'user'"
              :avatar="userAvatar"
              :name="userName"
              size="sm" />
            <div v-else class="w-9 h-9 rounded-full overflow-hidden shadow-sm ring-2 ring-white">
              <MascotIcon />
            </div>
          </div>
          <div :class="[
            'rounded-2xl max-w-[85%] px-4 py-3 text-sm leading-relaxed',
            msg.role === 'user'
              ? 'bg-primary-600 text-white rounded-tr-sm'
              : 'bg-white border border-slate-100 shadow-sm text-slate-800 rounded-tl-sm'
          ]">
            <div
              v-if="msg.role === 'assistant'"
              class="chat-markdown"
              v-html="displayContent(msg)" />
            <span
              v-if="msg.role === 'assistant' && msg.id === typingMsgId"
              class="inline-block w-1.5 h-4 align-[-2px] bg-primary-400 ml-0.5 animate-pulse rounded-sm" />
            <div v-else-if="msg.role === 'user'" class="whitespace-pre-wrap">{{ msg.content }}</div>
          </div>
        </div>
      </TransitionGroup>

      <!-- Typing indicator -->
      <div v-if="loading" class="flex gap-3 msg-enter">
        <div class="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 shadow-sm ring-2 ring-white">
          <MascotIcon />
        </div>
        <div class="bg-white border border-slate-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3">
          <div class="flex gap-1 items-center h-5">
            <span class="typing-dot"></span>
            <span class="typing-dot" style="animation-delay: 150ms"></span>
            <span class="typing-dot" style="animation-delay: 300ms"></span>
          </div>
        </div>
      </div>

      <!-- Ir al final -->
      <Transition name="msg">
        <button
          v-if="!isNearBottom"
          @click="scrollToBottom"
          class="absolute right-4 bottom-4 z-10 px-3 py-1.5 rounded-full bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold shadow-lg flex items-center gap-1.5">
          Ir al final ?
        </button>
      </Transition>
    </div>

    <!-- Error -->
    <div v-if="error" class="mx-4 mb-2 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
      {{ error }}
    </div>

    <!-- Input -->
    <div class="px-4 pt-1 pb-4 border-t border-slate-100 bg-white">
      <div class="bg-white border border-slate-200 rounded-2xl shadow-sm flex items-end gap-2 p-2">
        <textarea
          v-model="input"
          ref="inputEl"
          placeholder="Escribe tu mensaje..."
          rows="1"
          class="flex-1 resize-none px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none bg-transparent max-h-32 overflow-y-auto"
          @keydown.enter.exact.prevent="send"
          @input="autoResize" />
        <button
          @click="send"
          :disabled="loading || !input.trim()"
          class="flex-shrink-0 w-10 h-10 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </div>
      <p class="text-xs text-slate-500 text-center mt-2">Enter para enviar · Shift+Enter para nueva línea</p>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { marked } from 'marked'
import { useCareerStore } from '~/stores/career'
import { useAuthStore } from '~/stores/auth'

marked.setOptions({ breaks: true, gfm: true })

withDefaults(defineProps<{ mode?: 'sidebar' | 'modal' }>(), { mode: 'sidebar' })
const emit = defineEmits<{ close: [] }>()

interface Message { id: string; role: 'user' | 'assistant'; content: string }

const store = useCareerStore()
const authStore = useAuthStore()

const messages = ref<Message[]>([])
const input = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const messagesEl = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLTextAreaElement | null>(null)

const userAvatar = computed(() => authStore.profile?.avatar_url || null)
const userName = computed(() => authStore.profile?.name || authStore.profile?.email || 'Tú')
const userFirstName = computed(() => authStore.profile?.name?.split(' ')[0] || '')

const userQuery = computed(() => store.result?.query ?? '')
const careerTitles = computed(() => store.result?.variations?.map(v => v.title) ?? [])

const careersContext = computed(() => {
  if (!store.result?.variations?.length) return null
  return {
    query: store.result.query,
    careers: store.result.variations.map(v => ({
      title: v.title,
      description: v.description,
      skills: v.skills,
      salary_range: v.salary_range,
      pros: v.pros,
      cons: v.cons,
      match_score: v.match_score,
      job_demand: v.job_demand,
    })),
  }
})

const quickPrompts = [
  '¿Cuál tiene mejor sueldo?',
  'Compara pros y contras',
  'Universidades reales en Chile',
  '¿Cuál encaja más conmigo?',
]

const typingMsgId = ref<string | null>(null)
const typingWords = ref(0)
let typingTimer: ReturnType<typeof setInterval> | null = null

function makeId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function startTypingAnimation(id: string, fullText: string) {
  if (typingTimer) clearInterval(typingTimer)
  const tokens = fullText.split(/(\s+)/)
  typingMsgId.value = id
  typingWords.value = 0
  const delay = tokens.length > 200 ? 18 : tokens.length > 80 ? 25 : 35
  typingTimer = setInterval(() => {
    typingWords.value = Math.min(typingWords.value + 1, tokens.length)
    if (isNearBottom.value) scrollToBottom()
    if (typingWords.value >= tokens.length) {
      clearInterval(typingTimer!)
      typingTimer = null
      typingMsgId.value = null
    }
  }, delay)
}

function renderMarkdown(text: string): string {
  return text ? (marked.parse(text) as string) : ''
}

function displayContent(msg: Message): string {
  if (msg.id !== typingMsgId.value) return renderMarkdown(msg.content)
  const tokens = msg.content.split(/(\s+)/)
  return renderMarkdown(tokens.slice(0, typingWords.value).join(''))
}

const isNearBottom = ref(true)

function handleScroll() {
  const el = messagesEl.value
  if (!el) return
  isNearBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 120
}

function scrollToBottom() {
  if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight
}

function sendPreset(text: string) {
  input.value = text
  send()
}

async function send() {
  const text = input.value.trim()
  if (!text || loading.value) return
  error.value = null
  const userMsg: Message = { id: makeId(), role: 'user', content: text }
  messages.value.push(userMsg)
  input.value = ''
  await nextTick()
  autoResize()
  scrollToBottom()
  loading.value = true
  try {
    const data = await $fetch('/api/chat', {
      method: 'POST',
      body: {
        messages: messages.value.map(m => ({ role: m.role, content: m.content })),
        careersContext: careersContext.value,
      },
    }) as { reply: string }
    const aiMsg: Message = { id: makeId(), role: 'assistant', content: data.reply }
    messages.value.push(aiMsg)
    await nextTick()
    if (isNearBottom.value) scrollToBottom()
    startTypingAnimation(aiMsg.id, aiMsg.content)
    inputEl.value?.focus({ preventScroll: true })
  } catch (e: any) {
    error.value = e?.data?.message || 'Error al conectar con la IA. Intenta de nuevo.'
    messages.value.pop()
  } finally {
    loading.value = false
  }
}

function resetChat() {
  messages.value = []
  error.value = null
  input.value = ''
  nextTick(() => autoResize())
}

function autoResize() {
  if (inputEl.value) {
    inputEl.value.style.height = 'auto'
    inputEl.value.style.height = Math.min(inputEl.value.scrollHeight, 128) + 'px'
  }
}

onBeforeUnmount(() => { if (typingTimer) clearInterval(typingTimer) })
</script>

<style scoped>
.msg-enter { animation: msgFadeUp 0.2s ease both; }
@keyframes msgFadeUp {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.msg-enter-active { animation: msgFadeUp 0.2s ease both; }
.msg-leave-active { transition: opacity 0.1s; }
.msg-leave-to { opacity: 0; }

.chat-markdown :deep(p) { margin: 0 0 0.5em; line-height: 1.6; }
.chat-markdown :deep(p:last-child) { margin-bottom: 0; }
.chat-markdown :deep(strong) { font-weight: 700; color: #1e293b; }
.chat-markdown :deep(em) { font-style: italic; }
.chat-markdown :deep(ul),
.chat-markdown :deep(ol) { margin: 0.4em 0 0.6em 1.2em; padding: 0; }
.chat-markdown :deep(li) { margin-bottom: 0.25em; line-height: 1.5; }
.chat-markdown :deep(h1),
.chat-markdown :deep(h2),
.chat-markdown :deep(h3) { font-weight: 700; margin: 0.6em 0 0.3em; color: #0f172a; }
.chat-markdown :deep(h1) { font-size: 1.1em; }
.chat-markdown :deep(h2) { font-size: 1.05em; }
.chat-markdown :deep(h3) { font-size: 1em; }
.chat-markdown :deep(code) {
  background: #f1f5f9; border-radius: 4px; padding: 0.1em 0.35em;
  font-size: 0.85em; font-family: ui-monospace, monospace; color: #334155;
}
.chat-markdown :deep(pre) {
  background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
  padding: 0.75em 1em; overflow-x: auto; margin: 0.5em 0;
}
.chat-markdown :deep(pre code) { background: none; padding: 0; }
.chat-markdown :deep(blockquote) {
  border-left: 3px solid #cbd5e1; padding-left: 0.75em; margin: 0.5em 0; color: #64748b;
}
.chat-markdown :deep(hr) { border: none; border-top: 1px solid #e2e8f0; margin: 0.5em 0; }
.chat-markdown :deep(a) { color: #2563eb; text-decoration: underline; }
</style>