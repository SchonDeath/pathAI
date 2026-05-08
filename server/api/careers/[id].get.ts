import { requireSupabaseServiceClient } from '~/server/utils/supabase-clients'

// GET /api/careers/:id  (acepta uuid o slug)
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''

  if (!id) {
    throw createError({ statusCode: 400, message: 'ID de carrera requerido.' })
  }

  const supabase = requireSupabaseServiceClient({ fallbackToAnon: true })

  // Intenta por uuid primero, luego por slug
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

  const { data: career, error } = await supabase
    .from('careers')
    .select(`
      *,
      curricula (
        id, institution, institution_type, location, program,
        duration_semesters, monthly_cost, total_cost, subjects
      )
    `)
    .eq(isUuid ? 'id' : 'slug', id)
    .single()

  if (error || !career) {
    throw createError({ statusCode: 404, message: 'Carrera no encontrada.' })
  }

  return career
})
