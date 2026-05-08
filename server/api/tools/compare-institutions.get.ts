/**
 * GET /api/tools/compare-institutions?nombres=UDP,U. de Chile
 *   o ?institution_codes=3,11
 *
 * Compara lado a lado hasta 4 instituciones en métricas clave:
 * acreditación, matrícula actual y por año, retención, duración real,
 * infraestructura (m2, laboratorios, biblioteca, computadores),
 * NEM/PAES promedio, titulados.
 *
 * Uso típico: "¿Cuál tiene mejor infraestructura, UDP o la U. Central?"
 *             "¿Cuál tiene más años de acreditación?"
 */
import { resolveInstitution } from '~/server/utils/institution-resolver'
import { requireAuth } from '~/server/utils/require-auth'
import { requireSupabaseServiceClient } from '~/server/utils/supabase-clients'

function normalizeText(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function scoreInstitutionName(input: string, candidate: string) {
  const a = normalizeText(input)
  const b = normalizeText(candidate)
  if (!a || !b) return 0
  if (a === b) return 100
  if (b.startsWith(a)) return 80
  if (b.includes(a)) return 65

  const aTokens = a.split(' ').filter(t => t.length >= 3)
  const bTokens = new Set(b.split(' ').filter(t => t.length >= 3))
  let overlap = 0
  for (const t of aTokens) {
    if (bTokens.has(t)) overlap += 1
  }
  return overlap * 10
}

export default defineEventHandler(async (event) => {
  await requireAuth(event, { skipRateLimit: true })
  const { nombres, institution_codes, nombre_carrera } = getQuery(event) as Record<string, string>

  if (!nombres && !institution_codes) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Entrega `nombres` (CSV) o `institution_codes` (CSV).',
    })
  }

  const supabase = requireSupabaseServiceClient({ fallbackToAnon: true })

  const cols = `
    institution_code, nombre_institucion, tipo_institucion,
    direccion_sede_central, pagina_web,
    acreditacion_estado, acreditacion_anos, acreditacion_vigencia_hasta,
    matricula_pregrado_actual, matricula_posgrado_actual,
    titulados_pregrado_actual, retencion_1er_ano_pct,
    duracion_formal_semestres, duracion_real_semestres,
    promedio_nem, promedio_paes, total_jce,
    m2_construidos, volumenes_biblioteca,
    laboratorios_talleres, computadores,
    matricula_pregrado_por_ano
  `

  let rows: any[] = []

  if (institution_codes) {
    const codes = institution_codes.split(',').map(s => Number(s.trim())).filter(Boolean).slice(0, 4)
    const { data, error } = await supabase
      .from('institutions')
      .select(cols)
      .in('institution_code', codes)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    rows = data ?? []
  } else {
    if (!nombres) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Entrega `nombres` (CSV) cuando no envías `institution_codes`.',
      })
    }
    const names = nombres.split(',').map(s => s.trim()).filter(Boolean).slice(0, 4)
    const selectedCodes: number[] = []
    const seenCodes = new Set<number>()

    for (const n of names) {
      const resolved = await resolveInstitution(supabase, n)
      if (resolved?.institution_code && !seenCodes.has(resolved.institution_code)) {
        selectedCodes.push(resolved.institution_code)
        seenCodes.add(resolved.institution_code)
        continue
      }

      const { data: candidates, error } = await supabase
        .from('institutions')
        .select('institution_code, nombre_institucion')
        .ilike('nombre_institucion', `%${n}%`)
        .limit(8)

      if (error) throw createError({ statusCode: 500, statusMessage: error.message })
      if (!candidates?.length) continue

      const best = [...candidates]
        .sort((a, b) => scoreInstitutionName(n, b.nombre_institucion) - scoreInstitutionName(n, a.nombre_institucion))[0]

      if (best?.institution_code && !seenCodes.has(best.institution_code)) {
        selectedCodes.push(best.institution_code)
        seenCodes.add(best.institution_code)
      }
    }

    if (selectedCodes.length) {
      const { data, error } = await supabase
        .from('institutions')
        .select(cols)
        .in('institution_code', selectedCodes)

      if (error) throw createError({ statusCode: 500, statusMessage: error.message })
      const byCode = new Map((data ?? []).map(r => [r.institution_code, r]))
      rows = selectedCodes.map(code => byCode.get(code)).filter(Boolean)
    }
  }

  if (!rows.length) return { match: 'none', institutions: [] }

  // Calcular "ganador" por métrica para que la IA tenga ranking listo
  const metrics = [
    ['acreditacion_anos', 'desc'],
    ['matricula_pregrado_actual', 'desc'],
    ['retencion_1er_ano_pct', 'desc'],
    ['duracion_real_semestres', 'asc'], // menor es mejor
    ['promedio_paes', 'desc'],
    ['m2_construidos', 'desc'],
    ['volumenes_biblioteca', 'desc'],
    ['laboratorios_talleres', 'desc'],
    ['computadores', 'desc'],
  ] as const

  const rankings: Record<string, string | null> = {}
  for (const [key, order] of metrics) {
    const sorted = [...rows].filter(r => r[key] != null)
      .sort((a, b) => order === 'desc' ? b[key] - a[key] : a[key] - b[key])
    rankings[key] = sorted[0]?.nombre_institucion ?? null
  }

  let employability_by_career: any[] = []
  if (nombre_carrera) {
    const institutionCodes = rows
      .map(r => Number(r.institution_code))
      .filter((code) => Number.isFinite(code))

    if (institutionCodes.length) {
      const { data: empRows, error: empError } = await supabase
        .from('career_employability')
        .select(`
          institution_code,
          nombre_institucion,
          nombre_carrera_generica,
          empleabilidad_1_ano_pct,
          empleabilidad_2_ano_pct,
          ingreso_label,
          ingreso_promedio_4to_ano_clp
        `)
        .ilike('nombre_carrera_generica', `%${nombre_carrera}%`)
        .in('institution_code', institutionCodes)
        .limit(40)

      if (empError) throw createError({ statusCode: 500, statusMessage: empError.message })

      employability_by_career = empRows ?? []
    }
  }

  return {
    count: rows.length,
    institutions: rows,
    rankings,
    employability_by_career,
    note: 'rankings indica la institución líder en cada métrica (duracion_real: menor es mejor).',
  }
})
