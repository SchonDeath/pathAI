/**
 * GET /api/ranking/institutions — Ranking de instituciones chilenas
 *
 * Fuente: tabla `institutions` (datos SIES normalizados, columnas escalares).
 *
 * Score 0-100:
 *  - Acreditación (años): peso 40%
 *  - Retención 1er año (%): peso 25%
 *  - Promedio PAES: peso 20%
 *  - Matrícula pregrado (log-normalizada): peso 15%
 *
 * Query params:
 *  - tipo:   filtra por tipo_institucion (ilike, case-insensitive)
 *  - search: filtra por nombre_institucion (ilike)
 *  - limit:  máximo resultados (default 50, max 200)
 */
import { computeRankingScore } from '~/server/utils/ranking-score'
import { requireSupabaseServiceClient } from '~/server/utils/supabase-clients'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const tipo = typeof query.tipo === 'string' ? query.tipo.trim() : null
  const search = typeof query.search === 'string' ? query.search.trim() : ''
  const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 200)

  const supabase = requireSupabaseServiceClient({ fallbackToAnon: true })

  let q = supabase
    .from('institutions')
    .select(`
      institution_code,
      nombre_institucion,
      tipo_institucion,
      autonomia,
      direccion_sede_central,
      pagina_web,
      rut,
      acreditacion_estado,
      acreditacion_anos,
      acreditacion_vigencia_hasta,
      acreditacion_areas,
      matricula_pregrado_actual,
      matricula_posgrado_actual,
      titulados_pregrado_actual,
      titulados_posgrado_actual,
      retencion_1er_ano_pct,
      duracion_formal_semestres,
      duracion_real_semestres,
      promedio_nem,
      promedio_paes,
      total_jce,
      m2_construidos,
      volumenes_biblioteca,
      laboratorios_talleres,
      computadores,
      ingresos_operacion_clp,
      resultado_ejercicio_clp,
      total_activos_clp,
      patrimonio_total_clp,
      matricula_pregrado_por_ano,
      matricula_pct_por_area,
      jce_por_nivel_academico,
      logo_url
    `)
    .not('nombre_institucion', 'is', null)

  // Filtro case-insensitive para evitar mismatches por capitalización
  if (tipo) q = q.ilike('tipo_institucion', `%${tipo}%`)
  if (search) q = q.ilike('nombre_institucion', `%${search}%`)

  const { data, error } = await q.limit(500)
  if (error) throw createError({ statusCode: 500, message: error.message })

  const rows = (data ?? []) as any[]

  // Normalización log-matrícula para score
  const logMatricula = rows
    .map(r => (r.matricula_pregrado_actual && r.matricula_pregrado_actual > 0)
      ? Math.log(r.matricula_pregrado_actual)
      : null)
    .filter((v): v is number => v !== null)
  const maxLogMat = Math.max(...logMatricula, 1)

  const scored = rows.map((r) => {
    const scoreResult = computeRankingScore(
      {
        acreditacion_anos: r.acreditacion_anos,
        retencion_1er_ano_pct: r.retencion_1er_ano_pct,
        promedio_paes: r.promedio_paes,
        matricula_pregrado_actual: r.matricula_pregrado_actual,
      },
      maxLogMat,
    )
    return { ...r, ...scoreResult }
  })

  scored.sort((a, b) => b.score - a.score)

  return {
    total: scored.length,
    institutions: scored.slice(0, limit),
  }
})
