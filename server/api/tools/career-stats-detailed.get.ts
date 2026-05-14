/**
 * GET /api/tools/career-stats-detailed
 *   ?nombre_carrera_generica=...&tipo_institucion=...&area=...
 *
 * Stats detalladas de carrera genérica: ingresos 1°-5° año, empleabilidad,
 * retención, titulados. Consulta career_generic + career_stats.
 */
import { requireAuth } from '~/server/utils/require-auth'
import { requireSupabaseServiceClient } from '~/server/utils/supabase-clients'

export default defineEventHandler(async (event) => {
  await requireAuth(event, { skipRateLimit: true })
  const q = getQuery(event) as Record<string, string>

  if (!q.nombre_carrera_generica) {
    throw createError({ statusCode: 400, statusMessage: 'Se requiere nombre_carrera_generica.' })
  }

  const supabase = requireSupabaseServiceClient({ fallbackToAnon: true })

  // Buscar en career_generic con ILIKE
  let cgQuery = supabase
    .from('career_generic')
    .select('id, nombre_carrera_generica, area, tipo_institucion, slug')
    .ilike('nombre_carrera_generica', `%${q.nombre_carrera_generica}%`)
    .limit(10)

  if (q.tipo_institucion) {
    cgQuery = cgQuery.ilike('tipo_institucion', `%${q.tipo_institucion}%`)
  }
  if (q.area) {
    cgQuery = cgQuery.ilike('area', `%${q.area}%`)
  }

  const { data: careers, error: cgError } = await cgQuery
  if (cgError) throw createError({ statusCode: 500, statusMessage: cgError.message })

  if (!careers || careers.length === 0) {
    return {
      count: 0,
      message: `No se encontraron datos SIES para "${q.nombre_carrera_generica}"${q.tipo_institucion ? ` en ${q.tipo_institucion}` : ''}. NO inventes valores. Sugiere revisar mifuturo.cl.`,
      results: [],
    }
  }

  // Obtener stats para los career_generic encontrados
  const ids = careers.map((c: any) => c.id)
  const { data: stats, error: statsError } = await supabase
    .from('career_stats')
    .select(`
      career_generic_id,
      ingreso_1er_ano_clp,
      ingreso_2do_ano_clp,
      ingreso_3er_ano_clp,
      ingreso_4to_ano_clp,
      ingreso_5to_ano_clp,
      empleabilidad_1er_ano_pct,
      empleabilidad_2do_ano_pct,
      titulados_2024_total,
      matricula_total_2025_total,
      retencion_1er_ano_pct,
      duracion_real_semestres,
      duracion_formal_semestres
    `)
    .in('career_generic_id', ids)

  if (statsError) throw createError({ statusCode: 500, statusMessage: statsError.message })

  // Combinar career_generic con sus stats
  const statsMap = new Map((stats ?? []).map((s: any) => [s.career_generic_id, s]))

  const results = careers.map((c: any) => {
    const s: any = statsMap.get(c.id) ?? {}
    return {
      career_generic_id: c.id,
      nombre_carrera_generica: c.nombre_carrera_generica,
      area: c.area,
      tipo_institucion: c.tipo_institucion,
      ingresos_clp: {
        primer_ano: s.ingreso_1er_ano_clp ?? null,
        segundo_ano: s.ingreso_2do_ano_clp ?? null,
        tercer_ano: s.ingreso_3er_ano_clp ?? null,
        cuarto_ano: s.ingreso_4to_ano_clp ?? null,
        quinto_ano: s.ingreso_5to_ano_clp ?? null,
      },
      empleabilidad_pct: {
        primer_ano: s.empleabilidad_1er_ano_pct ?? null,
        segundo_ano: s.empleabilidad_2do_ano_pct ?? null,
      },
      retencion_1er_ano_pct: s.retencion_1er_ano_pct ?? null,
      duracion_real_semestres: s.duracion_real_semestres ?? null,
      duracion_formal_semestres: s.duracion_formal_semestres ?? null,
      titulados_2024_total: s.titulados_2024_total ?? null,
      matricula_total_2025_total: s.matricula_total_2025_total ?? null,
    }
  })

  return {
    count: results.length,
    results,
    stats: results,
  }
})
 