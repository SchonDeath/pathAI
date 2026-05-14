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

  // Enriquecer con datos SIES reales si hay vínculo
  const genericId = (career as any).career_generic_id as string | null
  let siesStats: { ingreso_promedio: number | null; empleabilidad: number | null } | null = null

  if (genericId) {
    const { data: stats } = await supabase
      .from('career_stats')
      .select('ingreso_promedio, empleabilidad')
      .eq('career_generic_id', genericId)
      .limit(1)
      .single()
    if (stats) siesStats = stats
  }

  return {
    ...career,
    sies_ingreso_promedio: siesStats?.ingreso_promedio ?? null,
    sies_empleabilidad: siesStats?.empleabilidad ?? null,
  }
})
