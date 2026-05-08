import { requireSupabaseServiceClient } from '~/server/utils/supabase-clients'

// GET /api/compare?ids=uuid1,uuid2,uuid3
export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const rawIds = String(query.ids || '').trim()
  if (!rawIds) {
    throw createError({ statusCode: 400, message: 'Se requiere el parámetro ids (separados por coma).' })
  }

  const ids = rawIds.split(',').map(id => id.trim()).filter(Boolean)

  if (ids.length < 2 || ids.length > 4) {
    throw createError({ statusCode: 400, message: 'Debes comparar entre 2 y 4 carreras.' })
  }

  const supabase = requireSupabaseServiceClient({ fallbackToAnon: true })

  const { data: careers, error } = await supabase
    .from('careers')
    .select(`
      id, slug, title, tagline, emoji, category,
      skills, pros, cons,
      salary_junior, salary_mid, salary_senior, job_demand,
      personality_types,
      curricula (
        institution, institution_type, location, program,
        duration_semesters, monthly_cost, total_cost
      )
    `)
    .in('id', ids)

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return { careers: careers ?? [] }
})
