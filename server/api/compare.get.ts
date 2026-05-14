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
      career_generic_id,
      curricula (
        institution, institution_type, location, program,
        duration_semesters, monthly_cost, total_cost
      )
    `)
    .in('id', ids)

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  // Enriquecer con datos SIES reales cuando hay vínculo career_generic_id
  const genericIds = (careers ?? [])
    .map(c => (c as any).career_generic_id)
    .filter(Boolean) as string[]

  let statsMap = new Map<string, { ingreso_promedio: number | null; empleabilidad: number | null }>()

  if (genericIds.length > 0) {
    const { data: stats } = await supabase
      .from('career_stats')
      .select('career_generic_id, ingreso_promedio, empleabilidad')
      .in('career_generic_id', genericIds)

    for (const s of stats ?? []) {
      if (s.career_generic_id) statsMap.set(s.career_generic_id, s)
    }
  }

  const enriched = (careers ?? []).map(c => {
    const genericId = (c as any).career_generic_id as string | null
    const sies = genericId ? statsMap.get(genericId) : null
    return {
      ...c,
      sies_ingreso_promedio: sies?.ingreso_promedio ?? null,
      sies_empleabilidad: sies?.empleabilidad ?? null,
    }
  })

  return { careers: enriched }
})
