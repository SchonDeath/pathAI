/**
 * GET /api/tools/financial-stats?area=...&tipo_institucion=...&nombre_carrera_generica=...
 *
 * Devuelve ingresos + empleabilidad oficiales (MiFuturo/SIES) por carrera genérica.
 * Si no hay match exacto, intenta fallback parcial por area+tipo.
 */
import { requireAuth } from '~/server/utils/require-auth'
import { requireSupabaseServiceClient } from '~/server/utils/supabase-clients'

export default defineEventHandler(async (event) => {
  await requireAuth(event, { skipRateLimit: true })
  const { area, tipo_institucion, nombre_carrera_generica } = getQuery(event) as Record<string, string>

  if (!area || !tipo_institucion) {
    throw createError({ statusCode: 400, statusMessage: 'area y tipo_institucion son requeridos' })
  }

  const supabase = requireSupabaseServiceClient({ fallbackToAnon: true })

  // 1. Match exacto
  if (nombre_carrera_generica) {
    const { data } = await supabase
      .from('career_stats')
      // Columnas explícitas: `select('*')` exponía cualquier columna nueva
      // (ids, timestamps, series JSON) sin que nadie lo notara.
      .select(`
        nombre_carrera_generica,
        area,
        tipo_institucion,
        ingreso_1er_ano_clp,
        ingreso_2do_ano_clp,
        ingreso_4to_ano_clp,
        ingreso_5to_ano_clp,
        empleabilidad_1er_ano_pct,
        empleabilidad_2do_ano_pct,
        retencion_1er_ano_pct,
        duracion_real_semestres,
        duracion_formal_semestres,
        titulados_2024_total,
        matricula_total_2025_total
      `)
      .eq('area', area)
      .eq('tipo_institucion', tipo_institucion)
      .eq('nombre_carrera_generica', nombre_carrera_generica)
      .maybeSingle()
    if (data) return { match: 'exact', stats: data }
  }

  // 2. Fallback: top por area+tipo
  const { data: fallback } = await supabase
    .from('career_stats')
    .select('nombre_carrera_generica, ingreso_promedio, empleabilidad')
    .eq('area', area)
    .eq('tipo_institucion', tipo_institucion)
    .limit(20)

  return {
    match: fallback?.length ? 'partial' : 'none',
    fallback_by_area: fallback ?? [],
  }
})
