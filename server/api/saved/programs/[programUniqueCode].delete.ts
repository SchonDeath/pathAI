import { requireAuth } from '~/server/utils/require-auth'
import { requireSupabaseServiceClient } from '~/server/utils/supabase-clients'

export default defineEventHandler(async (event) => {
  const { userId } = await requireAuth(event)
  const programUniqueCode = decodeURIComponent(getRouterParam(event, 'programUniqueCode') || '').trim()

  if (!programUniqueCode) {
    throw createError({ statusCode: 400, statusMessage: 'programUniqueCode es obligatorio.' })
  }

  const supabase = requireSupabaseServiceClient()
  const { error } = await supabase
    .from('saved')
    .delete()
    .eq('user_id', userId)
    .eq('program_unique_code', programUniqueCode)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { ok: true }
})