import { requireSupabaseServiceClient } from '~/server/utils/supabase-clients'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default defineEventHandler(async (event) => {
  const id = String(getRouterParam(event, 'id') || '').trim()
  if (!UUID_RE.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'id inválido.' })
  }

  const supabase = requireSupabaseServiceClient()
  const { data, error } = await supabase
    .from('discovery_sessions')
    .select('id, query, result')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
  if (!data) {
    throw createError({ statusCode: 404, statusMessage: 'Sesión no encontrada. Es posible que haya expirado.' })
  }

  return { session: data }
})