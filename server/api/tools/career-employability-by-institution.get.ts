/**
 * GET /api/tools/career-employability-by-institution
 *   ?nombre_carrera=...&career_generic_id=...&nombre_institucion=...&institution_code=...&area=...&limit=15
 *
 * Datos de empleabilidad e ingresos a nivel carrera genérica POR INSTITUCIÓN.
 *
 * Estrategia:
 *  1. Si viene `institution_code` -> consulta por FK numérica (preferido).
 *  2. Si viene `nombre_institucion` -> se resuelve al code via resolver
 *     central (server/utils/institution-resolver) y luego se consulta por FK.
 *  3. Fallback a ILIKE si el resolver no encuentra match.
 */
import { resolveInstitution } from '~/server/utils/institution-resolver'
import { requireAuth } from '~/server/utils/require-auth'
import { requireSupabaseServiceClient } from '~/server/utils/supabase-clients'

function normalizeText(input: unknown) {
  return String(input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function careerTerms(input: unknown) {
  const stop = new Set([
    'tecnico', 'tecnica', 'nivel', 'superior', 'profesional', 'licenciatura',
    'civil', 'ejecucion', 'mencion', 'plan', 'comun', 'carrera', 'programa',
    'en', 'de', 'del', 'la', 'el', 'las', 'los', 'y', 'e', 'con',
  ])
  return normalizeText(input)
    .split(/\s+/g)
    .filter(term => term.length >= 5 && !stop.has(term))
}

export default defineEventHandler(async (event) => {
  await requireAuth(event, { skipRateLimit: true })
  const q = getQuery(event) as Record<string, string>
  const limit = Math.min(Math.max(Number(q.limit ?? 15), 1), 30)

  if (!q.nombre_carrera && !q.career_generic_id && !q.nombre_institucion && !q.institution_code && !q.area) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Entrega al menos `nombre_carrera`, `nombre_institucion`, `institution_code` o `area`.',
    })
  }

  const supabase = requireSupabaseServiceClient({ fallbackToAnon: true })

  const selectCols = `
    institution_code, nombre_institucion, tipo_institucion,
    area, career_generic_id, nombre_carrera_generica,
    continuidad_estudios_pct, retencion_1_ano_pct,
    empleabilidad_1_ano_pct, empleabilidad_2_ano_pct,
    ingreso_label, ingreso_promedio_4to_ano_clp
  `

  let resolvedCode: number | null = q.institution_code ? Number(q.institution_code) : null
  let resolvedNombre: string | null = null
  let resolutionVia: string | null = q.institution_code ? 'explicit-code' : null

  if (!resolvedCode && q.nombre_institucion) {
    const r = await resolveInstitution(supabase, q.nombre_institucion)
    if (r) {
      resolvedCode = r.institution_code
      resolvedNombre = r.nombre_oficial
      resolutionVia = r.via
    }
  }

  async function runQueryByCode(code: number) {
    let query = supabase.from('career_employability').select(selectCols)
      .eq('institution_code', code)
      .order('empleabilidad_1_ano_pct', { ascending: false, nullsFirst: false })
      .limit(limit)
    if (q.career_generic_id) query = query.eq('career_generic_id', q.career_generic_id)
    else if (q.nombre_carrera) query = query.ilike('nombre_carrera_generica', `%${q.nombre_carrera}%`)
    if (q.area) query = query.eq('area', q.area)
    const { data, error } = await query
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return data ?? []
  }

  async function runQueryByName(name: string | null) {
    let query = supabase.from('career_employability').select(selectCols)
      .order('empleabilidad_1_ano_pct', { ascending: false, nullsFirst: false })
      .limit(limit)
    if (name) query = query.ilike('nombre_institucion', `%${name}%`)
    if (q.career_generic_id) query = query.eq('career_generic_id', q.career_generic_id)
    else if (q.nombre_carrera) query = query.ilike('nombre_carrera_generica', `%${q.nombre_carrera}%`)
    if (q.area) query = query.eq('area', q.area)
    const { data, error } = await query
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return data ?? []
  }

  async function findCareerGenericIdsByName(nombreCarrera: string) {
    const terms = careerTerms(nombreCarrera).slice(0, 6)
    if (!terms.length) return [] as string[]

    const filters = terms.flatMap(term => [
      `normalized_name.ilike.%${term}%`,
      `nombre_carrera_generica.ilike.%${term}%`,
    ])

    const { data, error } = await supabase
      .from('career_generic')
      .select('id, nombre_carrera_generica, normalized_name')
      .or(filters.join(','))
      .limit(20)

    if (error || !Array.isArray(data)) return []

    const scored = data
      .map((row: any) => {
        const haystack = normalizeText(`${row.nombre_carrera_generica || ''} ${row.normalized_name || ''}`)
        const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0)
        return { id: String(row.id), score }
      })
      .filter(row => row.score > 0)
      .sort((a, b) => b.score - a.score)

    return [...new Set(scored.map(row => row.id))]
  }

  async function runQueryByCareerNameWithinScope() {
    if (!q.nombre_carrera) return []
    const ids = await findCareerGenericIdsByName(q.nombre_carrera)
    if (!ids.length) return []

    let query = supabase.from('career_employability').select(selectCols)
      .in('career_generic_id', ids)
      .order('ingreso_promedio_4to_ano_clp', { ascending: false, nullsFirst: false })
      .order('empleabilidad_1_ano_pct', { ascending: false, nullsFirst: false })
      .limit(limit)

    if (resolvedCode) query = query.eq('institution_code', resolvedCode)
    else if (q.nombre_institucion) query = query.ilike('nombre_institucion', `%${q.nombre_institucion}%`)
    if (q.area) query = query.eq('area', q.area)

    const { data, error } = await query
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return data ?? []
  }

  let data: any[] = []
  let searchMode = 'none'

  if (resolvedCode) {
    data = await runQueryByCode(resolvedCode)
    searchMode = `by-code:${resolvedCode}`
  }

  // Fallback importante: si el career_generic_id exacto no tiene fila SIES,
  // buscar por nombre normalizado dentro de la misma institución.
  // Ej: "técnico en fisioterapia" puede tener dato oficial bajo "fisioterapia".
  if (data.length === 0 && q.nombre_carrera) {
    data = await runQueryByCareerNameWithinScope()
    if (data.length > 0) searchMode = resolvedCode
      ? `by-code-name-fallback:${resolvedCode}`
      : 'by-name-scope-fallback'
  }

  // Fallback: si el code no devolvió resultados y había nombre, intenta ILIKE
  if (data.length === 0 && q.nombre_institucion) {
    data = await runQueryByName(q.nombre_institucion)
    if (data.length > 0) searchMode = 'by-name-fallback'
  }

  // Caso sin institución: solo carrera/area
  if (data.length === 0 && !resolvedCode && !q.nombre_institucion) {
    data = await runQueryByName(null)
    searchMode = 'by-carrera-area'
  }

  if (data.length === 0) {
    return {
      count: 0,
      resolution: {
        nombre_input: q.nombre_institucion ?? null,
        institution_code: resolvedCode,
        nombre_oficial: resolvedNombre,
        via: resolutionVia,
        search_mode: searchMode,
      },
      message: `No se encontraron datos SIES (carrera="${q.nombre_carrera ?? ''}", institucion="${q.nombre_institucion ?? ''}", code=${resolvedCode ?? 'n/a'}). NO inventes valores. Di al usuario que no hay datos y sugiere mifuturo.cl.`,
      results: [],
    }
  }

  return {
    count: data.length,
    resolution: {
      nombre_input: q.nombre_institucion ?? null,
      institution_code: resolvedCode,
      nombre_oficial: resolvedNombre,
      via: resolutionVia,
      search_mode: searchMode,
    },
    results: data,
  }
})
