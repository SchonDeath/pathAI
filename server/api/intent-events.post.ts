import { getSupabaseAnonClient, requireSupabaseServiceClient } from '~/server/utils/supabase-clients'

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().replace(/[\u0000-\u001F\u007F]+/g, '')
  return trimmed ? trimmed.slice(0, maxLength) : null
}

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()

  let userId: string | null = null
  if (token) {
    const anon = getSupabaseAnonClient()
    if (anon) {
      const { data } = await anon.auth.getUser(token)
      userId = data?.user?.id ?? null
    }
  }

  const body = await readBody<Record<string, unknown>>(event)
  const eventName = cleanText(body?.event_name, 64)
  if (!eventName || !/^[a-z0-9_]{3,64}$/.test(eventName)) {
    throw createError({ statusCode: 400, statusMessage: 'event_name inválido.' })
  }

  const institutionCode = Number(body?.institution_code)
  const metadata = (body?.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata))
    ? body.metadata
    : {}

  const payload = {
    user_id: userId,
    session_id: cleanText(body?.session_id, 120),
    event_name: eventName,
    source: cleanText(body?.source, 40) ?? 'app',
    program_unique_code: cleanText(body?.program_unique_code, 120),
    institution_code: Number.isFinite(institutionCode) ? institutionCode : null,
    career_generic_id: cleanText(body?.career_generic_id, 64),
    metadata,
  }

  const supabase = requireSupabaseServiceClient()
  const { error } = await supabase.from('intent_events').insert(payload)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { ok: true }
})