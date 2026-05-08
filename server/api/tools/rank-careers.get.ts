/**
 * GET /api/tools/rank-careers
 *   ?metric=ingreso_4to|ingreso_1er|empleabilidad_1er|empleabilidad_2do|retencion|titulados
 *   &order=desc|asc
 *   &tipo_institucion=...&area=...&limit=10
 *
 * Devuelve ranking TOP N de carreras genéricas por una métrica SIES.
 * Uso: "¿Cuáles son las 10 carreras mejor pagadas?"
 *      "¿Qué carreras universitarias tienen peor empleabilidad?"
 */
import { requireAuth } from '~/server/utils/require-auth'
import { requireSupabaseServiceClient } from '~/server/utils/supabase-clients'

const METRIC_MAP: Record<string, string> = {
  ingreso_1er: 'ingreso_1er_ano_clp',
  ingreso_2do: 'ingreso_2do_ano_clp',
  ingreso_4to: 'ingreso_4to_ano_clp',
  ingreso_5to: 'ingreso_5to_ano_clp',
  empleabilidad_1er: 'empleabilidad_1er_ano_pct',
  empleabilidad_2do: 'empleabilidad_2do_ano_pct',
  retencion: 'retencion_1er_ano_pct',
  titulados: 'titulados_2024_total',
  matricula: 'matricula_total_2025_total',
}

export default defineEventHandler(async (event) => {
  await requireAuth(event, { skipRateLimit: true })
  const q = getQuery(event) as Record<string, string>
  const currentYear = new Date().getUTCFullYear()
  const datasetVersion = q.dataset_version || `SIES_${currentYear}`
  const metric = METRIC_MAP[q.metric ?? 'ingreso_4to']
  if (!metric) {
    throw createError({
      statusCode: 400,
      statusMessage: `metric inválida. Usa: ${Object.keys(METRIC_MAP).join(', ')}`,
    })
  }
  const order = q.order === 'asc' ? { ascending: true } : { ascending: false }
  const limit = Math.min(Math.max(Number(q.limit ?? 10), 1), 25)

  const supabase = requireSupabaseServiceClient({ fallbackToAnon: true })

  let query = supabase
    .from('career_stats')
    .select(`area, tipo_institucion, nombre_carrera_generica, ${metric}`)
    .eq('dataset_version', datasetVersion)
    .not(metric, 'is', null)
    .order(metric, { ...order, nullsFirst: false })
    .limit(limit)

  if (q.tipo_institucion) query = query.eq('tipo_institucion', q.tipo_institucion)
  if (q.area)             query = query.eq('area', q.area)

  const { data, error } = await query
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return {
    metric: q.metric,
    order: q.order ?? 'desc',
    dataset_version: datasetVersion,
    count: data?.length ?? 0,
    results: data ?? [],
  }
})
