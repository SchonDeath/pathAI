/**
 * GET /api/tools/rank-institutions
 *   ?metric=acreditacion|matricula|retencion|paes|m2|biblioteca|laboratorios
 *   &order=desc|asc
 *   &tipo_institucion=...&limit=10
 *
 * Ranking TOP N de instituciones por métrica.
 * Uso: "¿Qué universidades tienen más años de acreditación?"
 *      "¿Cuáles tienen mejor infraestructura?"
 */
import { requireAuth } from '~/server/utils/require-auth'
import { requireSupabaseServiceClient } from '~/server/utils/supabase-clients'

const METRIC_MAP: Record<string, string> = {
  acreditacion: 'acreditacion_anos',
  matricula: 'matricula_pregrado_actual',
  titulados: 'titulados_pregrado_actual',
  retencion: 'retencion_1er_ano_pct',
  paes: 'promedio_paes',
  nem: 'promedio_nem',
  duracion_real: 'duracion_real_semestres',
  m2: 'm2_construidos',
  biblioteca: 'volumenes_biblioteca',
  laboratorios: 'laboratorios_talleres',
  computadores: 'computadores',
}

export default defineEventHandler(async (event) => {
  await requireAuth(event, { skipRateLimit: true })
  const q = getQuery(event) as Record<string, string>
  const metric = METRIC_MAP[q.metric ?? 'acreditacion']
  if (!metric) {
    throw createError({
      statusCode: 400,
      statusMessage: `metric inválida. Usa: ${Object.keys(METRIC_MAP).join(', ')}`,
    })
  }
  const order = q.order === 'asc' ? { ascending: true } : { ascending: false }
  const prioritizeFeatured = q.prioritize_featured === '1' || q.prioritize_featured === 'true'
  const limit = Math.min(Math.max(Number(q.limit ?? 10), 1), 25)

  const supabase = requireSupabaseServiceClient({ fallbackToAnon: true })

  let query = supabase
    .from('institutions')
    .select(`institution_code, nombre_institucion, tipo_institucion,
             direccion_sede_central, acreditacion_anos,
             is_featured, priority, ${metric}`)
    .not(metric, 'is', null)
    .order(metric, { ...order, nullsFirst: false })
    .order('nombre_institucion', { ascending: true })
    .limit(limit)

  // Modo opcional para priorizar destacados (monetización) sin sesgar por defecto.
  if (prioritizeFeatured) query = query.order('priority', { ascending: false })

  if (q.tipo_institucion) query = query.eq('tipo_institucion', q.tipo_institucion)

  const { data, error } = await query
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // is_featured/priority son señales internas de monetización: se usan arriba
  // para ordenar, pero no deben viajar al LLM ni sesgar su narrativa.
  const results = (data ?? []).map(({ is_featured, priority, ...row }: any) => row)

  return { metric: q.metric, order: q.order ?? 'desc', count: results.length, results }
})
