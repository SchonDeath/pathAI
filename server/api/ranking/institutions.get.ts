/**
 * GET /api/ranking/institutions — Ranking de instituciones chilenas
 *
 * Calcula un score 0-100 combinando:
 *  - Acreditación (años): peso 40%
 *  - Retención 1er año (%): peso 25%
 *  - Promedio PAES: peso 20%
 *  - Matrícula pregrado (log-normalizada): peso 15%
 *
 * Si falta un dato, ese peso se excluye del cálculo (reponderación por
 * cobertura disponible) para no castigar injustamente a la institución.
 *
 * Query params:
 *  - tipo: filtra por tipo_institucion (opcional)
 *  - limit: cantidad máxima (default 50)
 *  - search: texto en nombre (opcional)
 */
import { computeRankingScore } from '~/server/utils/ranking-score'
import { requireSupabaseServiceClient } from '~/server/utils/supabase-clients'

interface InstitutionRow {
  institution_code: number
  nombre_institucion: string
  tipo_institucion: string | null
  pagina_web: string | null
  direccion_sede_central: string | null
  acreditacion_estado: string | null
  acreditacion_anos: number | null
  acreditacion_areas: string[] | null
  matricula_pregrado_actual: number | null
  titulados_pregrado_actual: number | null
  retencion_1er_ano_pct: number | null
  promedio_paes: number | null
  promedio_nem: number | null
  duracion_real_semestres: number | null
  logo_url: string | null
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const tipo = typeof query.tipo === 'string' ? query.tipo : null
  const search = typeof query.search === 'string' ? query.search.trim() : ''
  const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 200)

  const supabase = requireSupabaseServiceClient({ fallbackToAnon: true })

  let q = supabase
    .from('institutions')
    .select(`
      institution_code,
      nombre_institucion,
      tipo_institucion,
      pagina_web,
      direccion_sede_central,
      acreditacion_estado,
      acreditacion_anos,
      acreditacion_areas,
      matricula_pregrado_actual,
      titulados_pregrado_actual,
      retencion_1er_ano_pct,
      promedio_paes,
      promedio_nem,
      duracion_real_semestres,
      logo_url
    `)
    .not('nombre_institucion', 'is', null)

  if (tipo) q = q.eq('tipo_institucion', tipo)
  if (search) q = q.ilike('nombre_institucion', `%${search}%`)

  const { data, error } = await q.limit(500)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const rows = (data ?? []) as InstitutionRow[]

  // Normalización max para matrícula (log) solo con datos presentes.
  // Evita dominio de mega universidades y no penaliza faltantes.
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

    return {
      ...r,
      ...scoreResult,
    }
  })

  scored.sort((a, b) => b.score - a.score)

  return {
    total: scored.length,
    institutions: scored.slice(0, limit),
  }
})
