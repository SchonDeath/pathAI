import { getSupabaseServiceClient } from '../supabase-clients'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function normalizeSessionId(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return UUID_RE.test(trimmed) ? trimmed : null
}

export async function persistChatTurn(input: {
  userId: string
  sessionId: string | null
  userContent: string
  assistantContent: string
}) {
  if (!input.sessionId) return

  const service = getSupabaseServiceClient()
  if (!service) return

  const rows = [
    {
      user_id: input.userId,
      session_id: input.sessionId,
      role: 'user',
      content: input.userContent,
    },
    {
      user_id: input.userId,
      session_id: input.sessionId,
      role: 'assistant',
      content: input.assistantContent,
    },
  ]

  const { error } = await service.from('chat_messages').insert(rows as any)
  if (error) console.warn('[chat] backend persistence failed:', error.message)
}
