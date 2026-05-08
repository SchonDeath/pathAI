import { requireAuth } from '~/server/utils/require-auth'
import { requireSupabaseServiceClient } from '~/server/utils/supabase-clients'

export default defineEventHandler(async (event) => {
  const { userId } = await requireAuth(event, { skipRateLimit: true })
  const supabase = requireSupabaseServiceClient()

  const { data, error } = await supabase
    .from('saved')
    .select(`
      id,
      program_unique_code,
      institution_code,
      career_generic_id,
      nombre_carrera_snapshot,
      nombre_institucion_snapshot,
      nombre_sede_snapshot,
      region_snapshot,
      comuna_snapshot,
      source,
      notes,
      created_at
    `)
    .eq('user_id', userId)
    .not('program_unique_code', 'is', null)
    .order('created_at', { ascending: false })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { items: data ?? [] }
})