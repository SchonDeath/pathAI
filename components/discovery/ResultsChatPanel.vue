<template>
  <aside
    class="results-chat-shell relative flex flex-col overflow-hidden transition-all duration-300"
    :class="mode === 'modal' ? 'rounded-[1.75rem] h-[min(78vh,700px)]' : 'results-chat-sidebar rounded-[2rem] h-[min(78vh,820px)] xl:h-[calc(100vh-7rem)]'">

    <div class="results-chat-header flex items-center justify-between gap-3 border-b border-slate-200/70 px-5 py-4">
      <div>
        <div class="inline-flex items-center gap-2 rounded-full border border-primary-100 bg-gradient-to-r from-primary-50 to-accent-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-700 shadow-sm">
          Kora chat
        </div>
        <h2 class="mt-2 text-base font-semibold leading-tight text-slate-900">Habla con Kora sobre tus resultados</h2>
        <p class="mt-0.5 text-xs text-slate-500">
          Contexto cargado: <strong class="text-slate-700">{{ careerTitles.length }} rutas</strong>
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="resetChat"
          class="rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-white">
          Nuevo chat
        </button>
        <button
          v-if="mode === 'modal'"
          @click="emit('close')"
          class="flex h-7 w-7 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Cerrar chat">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <div class="px-4 pt-3 pb-2 border-b border-slate-200/60 bg-white/70">
      <div class="rounded-2xl border border-slate-200/80 bg-white/90 px-3.5 py-2.5 flex items-center justify-between">
        <div class="flex items-center gap-3 min-w-0">
          <div class="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-cyan-50 ring-2 ring-cyan-100">
            <MascotIcon />
          </div>
          <div class="min-w-0">
            <p class="font-semibold leading-tight text-slate-900">Kora</p>
            <p class="inline-flex items-center gap-1.5 text-xs text-emerald-600">
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              en línea
            </p>
          </div>
        </div>
        <div class="inline-flex items-center gap-1.5" aria-label="Indicador de actividad">
          <span class="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
          <span class="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
          <span class="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
        </div>
      </div>
    </div>

    <div ref="messagesEl" @scroll="handleScroll" class="results-chat-body relative flex-1 space-y-4 overflow-y-auto px-4 pt-4 pb-3">

      <div v-if="messages.length === 0" class="flex gap-3 msg-enter">
        <div class="h-9 w-9 shrink-0 overflow-hidden rounded-full shadow-sm ring-2 ring-white">
          <MascotIcon />
        </div>
        <div class="max-w-[88%] space-y-3 rounded-[1.4rem] rounded-tl-sm border border-slate-200/80 bg-white/95 px-4 py-4 shadow-sm">
          <div class="flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-500">
            <span class="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">Contexto</span>
            <span class="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">{{ careerTitles.length }} rutas</span>
          </div>
          <p class="text-sm leading-relaxed text-slate-800">
            Hola{{ userFirstName ? `, ${userFirstName}` : '' }}. Ya tengo a la vista tu búsqueda sobre
            <strong>{{ userQuery }}</strong> y las rutas <strong>{{ careerTitles.join(', ') }}</strong>.
            Si quieres, puedo compararlas, aterrizarlas a universidades chilenas o ayudarte a decidir cuál priorizar.
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="chip in quickPrompts"
              :key="chip"
              :disabled="loading"
              @click="sendPreset(chip)"
              class="rounded-full border border-slate-200 bg-slate-50/90 px-3 py-1.5 text-xs font-medium text-slate-700 transition-all duration-200 hover:border-primary-200 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50">
              {{ chip }}
            </button>
          </div>
        </div>
      </div>

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
            <div v-else class="h-9 w-9 overflow-hidden rounded-full shadow-sm ring-2 ring-white">
              <MascotIcon />
            </div>
          </div>
          <div :class="[
            'max-w-[88%] rounded-[1.35rem] px-4 py-3 text-sm leading-relaxed',
            msg.role === 'user'
              ? 'rounded-tr-sm bg-slate-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.14)]'
              : 'rounded-tl-sm border border-slate-200/80 bg-white/95 shadow-sm text-slate-800'
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

      <div v-if="loading" class="flex gap-3 msg-enter">
        <div class="h-9 w-9 shrink-0 overflow-hidden rounded-full shadow-sm ring-2 ring-white">
          <MascotIcon />
        </div>
        <div class="rounded-[1.35rem] rounded-tl-sm border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div class="flex gap-1 items-center h-5">
            <span class="typing-dot"></span>
            <span class="typing-dot" style="animation-delay: 150ms"></span>
            <span class="typing-dot" style="animation-delay: 300ms"></span>
          </div>
        </div>
      </div>

      <Transition name="msg">
        <button
          v-if="!isNearBottom"
          @click="scrollToBottom"
          class="absolute right-4 bottom-4 z-10 flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-lg transition hover:bg-slate-800">
          Ir al final ↓
        </button>
      </Transition>
    </div>

    <div v-if="error" class="mx-4 mb-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ error }}
    </div>

    <div class="results-chat-footer border-t border-slate-200/70 px-4 pt-2 pb-4">
      <div class="flex items-end gap-2 rounded-[1.5rem] border border-slate-200 bg-white/95 p-2 shadow-sm">
        <textarea
          v-model="input"
          ref="inputEl"
          placeholder="Escribe tu mensaje..."
          rows="1"
          class="max-h-32 flex-1 resize-none overflow-y-auto bg-transparent px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none"
          @keydown.enter.exact.prevent="send"
          @input="autoResize" />
        <button
          @click="send"
          :disabled="loading || !input.trim()"
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </div>
      <p class="mt-2 text-center text-xs text-slate-500">Enter para enviar · Shift+Enter para nueva línea</p>
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
const supabase = useSupabaseClient()

const messages = ref<Message[]>([])
const input = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const activeSessionId = ref<string>('')
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
      salary_range: v.salary_source === 'sies' ? v.salary_range : undefined,
      salary_source: v.salary_source,
      salary_label: v.salary_label,
      pros: v.pros,
      cons: v.cons,
      match_score: v.match_score,
      job_demand: v.job_demand,
    })),
  }
})

const quickPrompts = [
  '¿Cuál tiene mejor sueldo con datos SIES?',
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

function ensureSessionId() {
  if (activeSessionId.value) return
  activeSessionId.value = store.sessionId || makeId()
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

  await authStore.ensureHydrated()
  if (!authStore.isAuthenticated) {
    error.value = 'Inicia sesión para conversar con Kora sobre tus resultados.'
    return
  }

  error.value = null
  ensureSessionId()
  const userMsg: Message = { id: makeId(), role: 'user', content: text }
  messages.value.push(userMsg)
  input.value = ''
  await nextTick()
  autoResize()
  scrollToBottom()
  loading.value = true
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) {
      error.value = 'Tu sesión expiró. Vuelve a iniciar sesión para conversar con Kora.'
      messages.value.pop()
      loading.value = false
      return
    }

    const data = await $fetch('/api/chat', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: {
        sessionId: activeSessionId.value,
        messages: messages.value.map(m => ({ role: m.role, content: m.content })),
        careersContext: careersContext.value,
      },
    }) as { reply: string; sessionId?: string }

    if (data.sessionId) {
      activeSessionId.value = data.sessionId
    }

    const aiMsg: Message = { id: makeId(), role: 'assistant', content: data.reply }
    messages.value.push(aiMsg)
    await nextTick()
    if (isNearBottom.value) scrollToBottom()
    startTypingAnimation(aiMsg.id, aiMsg.content)
    inputEl.value?.focus({ preventScroll: true })
  } catch (e: any) {
    error.value =
      e?.data?.message ||
      e?.data?.statusMessage ||
      e?.statusMessage ||
      e?.message ||
      'Error al conectar con la IA. Intenta de nuevo.'
    messages.value.pop()
  } finally {
    loading.value = false
  }
}

function resetChat() {
  messages.value = []
  error.value = null
  input.value = ''
  activeSessionId.value = makeId()
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
.results-chat-shell {
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(226, 232, 240, 0.95);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.5) inset,
    0 12px 30px rgba(59, 130, 246, 0.06),
    0 2px 12px rgba(0, 0, 0, 0.04);
}

.results-chat-shell::before {
  content: '';
  position: absolute;
  top: -1px;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(26,115,232,0.55), rgba(6,182,212,0.4), transparent);
  border-radius: 0 0 4px 4px;
  pointer-events: none;
  z-index: 1;
}

.results-chat-sidebar {
  background:
    radial-gradient(ellipse at 20% 0%, rgba(219, 234, 254, 0.9) 0%, transparent 52%),
    radial-gradient(ellipse at 80% 10%, rgba(224, 231, 255, 0.7) 0%, transparent 45%),
    radial-gradient(ellipse at 50% 100%, rgba(207, 250, 254, 0.45) 0%, transparent 60%),
    linear-gradient(160deg, #f0f4ff 0%, #f8faff 42%, #eef6ff 74%, #f5f7ff 100%);
}

.results-chat-header {
  background: rgba(255, 255, 255, 0.8);
}

.results-chat-body {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.45) 100%);
}

.results-chat-footer {
  background: rgba(255, 255, 255, 0.82);
}

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