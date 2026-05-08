/**
 * GET /api/tools/career-stats-detailed
 *   ?nombre_carrera_generica=...&tipo_institucion=...&area=...
 *
 * Versión expandida de financial-stats. Devuelve TODO lo de career_stats:
 * ingresos por año (1ro a 5to), empleabilidad 1er/2do año, evolución histórica,
 * retención, titulados, matrícula, duración real vs formal.
 *
 * Uso típico: "¿Cuánto gana un asistente ejecutivo en 2do año?
 *              ¿Cuántos egresan al año? ¿Cuál es la empleabilidad?"
 */
import { requireAuth } from '~/server/utils/require-auth'
import { requireSupabaseServiceClient } from '~/server/utils/supabase-clients'

export default defineEventHandler(async (event) => {
  await requireAuth(event, { skipRateLimit: true })
  const { nombre_carrera_generica, tipo_institucion, area } =
    getQuery(event) as Record<string, string>

  if (!nombre_carrera_generica) {
    throw createError({
      statusCode: 400,
      statusMessage: '`nombre_carrera_generica` es requerido.',
    })
  }

  const supabase = requireSupabaseServiceClient({ fallbackToAnon: true })

  let q = supabase
    .from('career_stats')
    .select('*')
    .ilike('nombre_carrera_generica', `%${nombre_carrera_generica}%`)
    .limit(10)

  if (tipo_institucion) q = q.eq('tipo_institucion', tipo_institucion)
  if (area)             q = q.eq('area', area)

  const { data, error } = await q
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  if (!data?.length) {
    // Fallback: buscar por área o primer token significativo para dar contexto al AI
    let fallbackData: any[] = []
    if (tipo_institucion && area) {
      const { data: fb } = await supabase
        .from('career_stats')
        .select('nombre_carrera_generica, tipo_institucion, area, ingreso_4to_ano_clp, empleabilidad_1er_ano_pct')
        .eq('tipo_institucion', tipo_institucion)
        .eq('area', area)
        .order('empleabilidad_1er_ano_pct', { ascending: false })
        .limit(5)
      fallbackData = fb ?? []
    } else if (tipo_institucion) {
      const { data: fb } = await supabase
        .from('career_stats')
        .select('nombre_carrera_generica, tipo_institucion, area, ingreso_4to_ano_clp, empleabilidad_1er_ano_pct')
        .eq('tipo_institucion', tipo_institucion)
        .limit(3)
      fallbackData = fb ?? []
    }
    return {
      match: 'none',
      message: `No se encontraron datos SIES para "${nombre_carrera_generica}" en tipo_institucion="${tipo_institucion ?? 'no especificado'}". La carrera puede no estar en el dataset o tener otro nombre genérico. NO inventes ni estimes valores. Di al usuario que no hay datos y sugiere mifuturo.cl.`,
      carreras_similares_disponibles: fallbackData.map(f => f.nombre_carrera_generica),
      stats: [],
    }
  }

  // Compactar: la IA no necesita ids/uuids
  const stats = data.map(s => ({
    area: s.area,
    tipo_institucion: s.tipo_institucion,
    nombre_carrera_generica: s.nombre_carrera_generica,
    ingresos_clp: {
      primer_ano:  s.ingreso_1er_ano_clp,
      segundo_ano: s.ingreso_2do_ano_clp,
      tercer_ano:  s.ingreso_3er_ano_clp,
      cuarto_ano:  s.ingreso_4to_ano_clp,
      quinto_ano:  s.ingreso_5to_ano_clp,
    },
    empleabilidad_pct: {
      primer_ano:  s.empleabilidad_1er_ano_pct,
      segundo_ano: s.empleabilidad_2do_ano_pct,
    },
    retencion_1er_ano_pct: s.retencion_1er_ano_pct,
    duracion_semestres: {
      formal: s.duracion_formal_semestres,
      real:   s.duracion_real_semestres,
    },
    titulados_2024: s.titulados_2024_total,
    matricula_2025: {
      primer_ano: s.matricula_primer_ano_2025_total,
      total:      s.matricula_total_2025_total,
    },
    evolucion_ingreso_4to: s.evolucion_ingreso_4,
    evolucion_empleabilidad_1er: s.evolucion_empleabilidad_1,
    evolucion_empleabilidad_2do: s.evolucion_empleabilidad_2,
  }))

  return {
    match: stats.length === 1 ? 'exact' : 'multiple',
    count: stats.length,
    stats,
  }
})
