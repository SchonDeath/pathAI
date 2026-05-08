export interface IntentEventInput {
  event_name: string
  source?: string
  session_id?: string
  program_unique_code?: string | null
  institution_code?: number | null
  career_generic_id?: string | null
  metadata?: Record<string, unknown>
}

const INTENT_SESSION_KEY = 'KoraChile:intent:session'

function makeSessionId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function getIntentSessionId() {
  if (typeof window === 'undefined') return 'server'
  const existing = localStorage.getItem(INTENT_SESSION_KEY)
  if (existing) return existing
  const created = makeSessionId()
  localStorage.setItem(INTENT_SESSION_KEY, created)
  return created
}

export function useIntentTracker() {
  const supabase = useSupabaseClient()

  async function authHeaders() {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : undefined
  }

  async function track(input: IntentEventInput) {
    try {
      await $fetch('/api/intent-events', {
        method: 'POST',
        headers: await authHeaders(),
        body: {
          ...input,
          session_id: input.session_id ?? getIntentSessionId(),
        },
      })
    } catch (error) {
      console.warn('[intent-events] No se pudo registrar evento:', error)
    }
  }

  return { track }
}