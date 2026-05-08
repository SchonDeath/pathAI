/**
 * POST /api/tools/search-career-match
 * Body: {
 *   keywords?: string[],          // ej: ['diseño','tecnología']
 *   area?: string,                // 'Tecnología', 'Salud', etc.
 *   tipo_institucion?: string,    // 'Universidades' | 'Institutos Profesionales' | 'Centros de Formación Técnica'
 *   region?: string,
 *   max_arancel?: number,
 *   limit?: number
 * }
 *
 * Busca PROGRAMAS ofertados oficiales (Mineduc) que hagan match y enriquece con stats.
 */
import { requireAuth } from '~/server/utils/require-auth'
import { requireSupabaseServiceClient } from '~/server/utils/supabase-clients'

function normalizeText(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function tokenize(input: string) {
  return normalizeText(input)
    .split(/[^a-z0-9]+/g)
    .filter(t => t.length >= 3)
}

function scoreProgram(program: any, terms: string[]) {
  const title = normalizeText(program?.nombre_carrera || '')
  const area = normalizeText(program?.area_carrera_generica || '')
  const inst = normalizeText(program?.nombre_institucion || '')
  const haystack = `${title} ${area} ${inst}`

  let score = 0
  for (const t of terms) {
    if (title.includes(t)) score += 8
    else if (area.includes(t)) score += 5
    else if (inst.includes(t)) score += 2
    else if (haystack.includes(t.slice(0, Math.max(4, t.length - 2)))) score += 1
  }

  // bonus por prioridad destacada
  score += Number(program?.priority || 0) * 0.2
  return score
}

function expandKeywords(keywords?: string[]) {
  if (!keywords?.length) return { terms: [] as string[], strictStems: [] as string[] }

  const baseTokens = keywords
    .flatMap(k => String(k).split(/[\s,;/|]+/g))
    .map(k => normalizeText(k))
    .filter(k => k.length >= 3)

  const normalizedPhrase = normalizeText(keywords.join(' '))
  const expansions = new Set<string>(baseTokens)
  const strictStems = new Set<string>()

  // Mapeo semántico mínimo para consultas frecuentes de orientación.
  if (normalizedPhrase.includes('terapia deportiva') || normalizedPhrase.includes('deporte')) {
    ;['kinesiologia', 'fisioterapia', 'deporte', 'deportiva', 'rehabilitacion', 'actividad fisica']
      .forEach(t => expansions.add(t))
    ;['kinesiolog', 'fisioterap', 'deport', 'rehabilit', 'actividad fisica']
      .forEach(s => strictStems.add(s))
  }

  if (normalizedPhrase.includes('psicologia deportiva')) {
    ;['psicologia', 'deporte', 'deportiva', 'rendimiento']
      .forEach(t => expansions.add(t))
    ;['psicolog', 'deport', 'rendim']
      .forEach(s => strictStems.add(s))
  }

  if (normalizedPhrase.includes('nutricion deportiva')) {
    ;['nutricion', 'deporte', 'deportiva', 'alimentacion']
      .forEach(t => expansions.add(t))
    ;['nutric', 'deport', 'aliment']
      .forEach(s => strictStems.add(s))
  }

  return {
    terms: [...expansions],
    strictStems: [...strictStems],
  }
}

function matchesInstitutionType(programType: unknown, requestedType: string) {
  const current = normalizeText(String(programType || ''))
  const requested = normalizeText(requestedType || '')
  if (!requested) return true
  if (!current) return false
  return current === requested || current.includes(requested) || requested.includes(current)
}

async function hydrateInstitutionTypes(programs: any[], supabase: any) {
  if (!programs.length) return programs

  const missingCodes = [...new Set(
    programs
      .filter((p) => !p?.tipo_institucion && Number.isFinite(Number(p?.institution_code)))
      .map((p) => Number(p.institution_code)),
  )]

  if (!missingCodes.length) return programs

  const { data: institutions, error } = await supabase
    .from('institutions')
    .select('institution_code, tipo_institucion')
    .in('institution_code', missingCodes)

  if (error || !institutions?.length) return programs

  const byCode = new Map<number, string | null>(
    institutions
      .map((i: any) => [Number(i.institution_code), i.tipo_institucion ?? null] as [number, string | null]),
  )

  return programs.map((p) => ({
    ...p,
    tipo_institucion: p?.tipo_institucion ?? byCode.get(Number(p?.institution_code)) ?? null,
  }))
}

export default defineEventHandler(async (event) => {
  await requireAuth(event, { skipRateLimit: true })
  const body = await readBody<{
    keywords?: string[]
    institution?: string
    area?: string
    tipo_institucion?: string
    region?: string
    max_arancel?: number
    limit?: number
  }>(event) || {}

  const limit = Math.min(Math.max(body.limit ?? 10, 1), 25)
  // Pedimos una ventana mayor para luego mezclar por institución
  // y evitar que una sola domine el top N.
  const fetchLimit = Math.min(Math.max(limit * 8, limit), 200)

  const supabase = requireSupabaseServiceClient({ fallbackToAnon: true })

  let q = supabase
    .from('programs')
    .select(`
      program_unique_code, nombre_carrera, nombre_titulo, nombre_institucion, institution_code,
      tipo_institucion, tipo_institucion_detalle,
      region, nombre_sede, jornada, modalidad, area_carrera_generica, area_conocimiento,
      duracion_formal_semestres,
      arancel_anual, matricula_anual, arancel_referencia_becas, arancel_referencia_creditos,
      brecha_arancel_becas, brecha_arancel_creditos,
      vacantes_semestre_1, vacantes_semestre_2, career_generic_id,
      nivel_carrera, titulacion_total_2024,
      matricula_total_2025, matricula_primer_ano_2025,
      acreditacion_programa,
      rango_percentil_paes, puntaje_promedio_matriculados, anio_puntajes,
      pond_nem, pond_ranking, pond_lenguaje, pond_matematicas, pond_matematicas_2,
      pond_historia, pond_ciencias, pond_otros,
      is_featured, priority
    `)
    .order('priority', { ascending: false })
    .order('nombre_institucion', { ascending: true })
    .limit(fetchLimit)

  if (body.area)             q = q.ilike('area_carrera_generica', `%${body.area}%`)
  if (body.region)           q = q.eq('region', body.region)
  if (body.max_arancel)      q = q.lte('arancel_anual', body.max_arancel)

  // Si se especifica institución, filtramos por nombre en la BD directamente.
  const institutionFilter = body.institution ? normalizeText(body.institution) : null
  if (institutionFilter) {
    q = q.ilike('nombre_institucion', `%${body.institution}%`)
  }

  const expanded = expandKeywords(body.keywords)
  if (expanded.terms.length) {
    // Al filtrar por institución, buscamos solo en nombre_carrera y area para no
    // contaminar con programas de otras instituciones que tengan keywords en su nombre.
    const or = institutionFilter
      ? expanded.terms
          .map(k => `nombre_carrera.ilike.%${k}%,area_carrera_generica.ilike.%${k}%`)
          .join(',')
      : expanded.terms
          .map(k => `nombre_carrera.ilike.%${k}%,area_carrera_generica.ilike.%${k}%,nombre_institucion.ilike.%${k}%`)
          .join(',')
    q = q.or(or)
  }

  const { data: programs, error } = await q
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // Tokens base para búsqueda fuzzy en misma institución
  const baseTokens = tokenize((body.keywords ?? []).join(' '))

  // Si se buscó por institución pero no hay resultados exactos, intentar:
  // 1. Buscar programas RELACIONADOS en la misma institución (sin keywords exactos, solo institución)
  // 2. Si tampoco hay, búsqueda amplia sin filtro de institución (broad fallback)
  let institutionFound = !institutionFilter ? null : (programs ?? []).length > 0
  let relatedInInstitution: any[] = []
  let broadFallback = false

  if (institutionFilter && !institutionFound) {
    // Paso 1: buscar cualquier programa de esa institución con tokens similares (más amplio)
    const { data: sameInstData } = await supabase
      .from('programs')
      .select(`
        program_unique_code, nombre_carrera, nombre_titulo, nombre_institucion, institution_code,
        tipo_institucion, tipo_institucion_detalle,
        region, nombre_sede, jornada, modalidad, area_carrera_generica, area_conocimiento,
        duracion_formal_semestres,
        arancel_anual, matricula_anual, arancel_referencia_becas, arancel_referencia_creditos,
        brecha_arancel_becas, brecha_arancel_creditos,
        vacantes_semestre_1, vacantes_semestre_2, career_generic_id,
        nivel_carrera, titulacion_total_2024,
        matricula_total_2025, matricula_primer_ano_2025,
        acreditacion_programa,
        rango_percentil_paes, puntaje_promedio_matriculados, anio_puntajes,
        pond_nem, pond_ranking, pond_lenguaje, pond_matematicas, pond_matematicas_2,
        pond_historia, pond_ciencias, pond_otros,
        is_featured, priority
      `)
      .ilike('nombre_institucion', `%${body.institution}%`)
      .order('priority', { ascending: false })
      .limit(200)

    if (sameInstData?.length) {
      // Rankear por similitud de tokens con los keywords pedidos
      relatedInInstitution = sameInstData
        .map(p => ({ p, score: scoreProgram(p, baseTokens) }))
        .filter(x => x.score >= 2)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(x => x.p)
    }

    // Paso 2: broad fallback a otras instituciones
    broadFallback = true
    let qBroad = supabase
      .from('programs')
      .select(`
        program_unique_code, nombre_carrera, nombre_institucion, institution_code, tipo_institucion,
        tipo_institucion_detalle,
        region, sede:nombre_sede, jornada, area_carrera_generica, duracion_formal_semestres,
        arancel_anual, arancel_referencia_becas, arancel_referencia_creditos,
        brecha_arancel_becas, brecha_arancel_creditos,
        vacantes_semestre_1, career_generic_id,
        nivel_carrera, titulacion_total_2024,
        rango_percentil_paes, puntaje_promedio_matriculados, anio_puntajes,
        pond_nem, pond_ranking, pond_lenguaje, pond_matematicas, pond_matematicas_2,
        pond_historia, pond_ciencias, pond_otros,
        is_featured, priority
      `)
      .order('priority', { ascending: false })
      .order('nombre_institucion', { ascending: true })
      .limit(fetchLimit)
    if (expanded.terms.length) {
      const or = expanded.terms
        .map(k => `nombre_carrera.ilike.%${k}%,area_carrera_generica.ilike.%${k}%`)
        .join(',')
      qBroad = qBroad.or(or)
    }
    const { data: broadData } = await qBroad
    ;(programs as any[]).splice(0, (programs as any[]).length, ...(broadData ?? []))
  }

  const preFiltered = await hydrateInstitutionTypes(programs ?? [], supabase)
  const byType = body.tipo_institucion
    ? preFiltered.filter((p) => matchesInstitutionType(p?.tipo_institucion, body.tipo_institucion!))
    : preFiltered

  let allPrograms = expanded.strictStems.length
    ? byType.filter((p) => {
        const haystack = normalizeText(`${p.nombre_carrera || ''} ${p.area_carrera_generica || ''}`)
        return expanded.strictStems.some(stem => haystack.includes(stem))
      })
    : byType

  // Fallback semántico/fuzzy: si no hubo match directo, hacemos una pasada amplia
  // y rankeamos por coincidencia de tokens para rescatar variaciones de nombre.
  if (!allPrograms.length && expanded.terms.length) {
    const { data: broadPrograms } = await supabase
      .from('programs')
      .select(`
        program_unique_code, nombre_carrera, nombre_titulo, nombre_institucion, institution_code,
        tipo_institucion, tipo_institucion_detalle,
        region, nombre_sede, jornada, modalidad, area_carrera_generica, area_conocimiento,
        duracion_formal_semestres,
        arancel_anual, matricula_anual, arancel_referencia_becas, arancel_referencia_creditos,
        brecha_arancel_becas, brecha_arancel_creditos,
        vacantes_semestre_1, vacantes_semestre_2, career_generic_id,
        nivel_carrera, titulacion_total_2024,
        matricula_total_2025, matricula_primer_ano_2025,
        acreditacion_programa,
        rango_percentil_paes, puntaje_promedio_matriculados, anio_puntajes,
        pond_nem, pond_ranking, pond_lenguaje, pond_matematicas, pond_matematicas_2,
        pond_historia, pond_ciencias, pond_otros,
        is_featured, priority
      `)
      .order('priority', { ascending: false })
      .limit(500)

    const broadHydrated = await hydrateInstitutionTypes(broadPrograms ?? [], supabase)
    const broadByType = body.tipo_institucion
      ? broadHydrated.filter((p) => matchesInstitutionType(p?.tipo_institucion, body.tipo_institucion!))
      : broadHydrated

    const baseTerms = tokenize((body.keywords ?? []).join(' '))
    const rescored = broadByType
      .map((p) => ({ p, score: scoreProgram(p, baseTerms) }))
      .filter((x) => x.score >= 4)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.p)

    allPrograms = rescored
  }

  // Deduplicar por carrera+institución+sede: si hay varias versiones del mismo programa,
  // preferir la que tenga puntaje_promedio_matriculados no nulo.
  const dedupMap = new Map<string, (typeof allPrograms)[0]>()
  for (const p of allPrograms) {
    const key = `${p.nombre_carrera}||${p.nombre_institucion}||${p.sede}`
    const existing = dedupMap.get(key)
    if (!existing) {
      dedupMap.set(key, p)
    } else if (p.puntaje_promedio_matriculados != null && existing.puntaje_promedio_matriculados == null) {
      dedupMap.set(key, p)
    }
  }
  allPrograms = Array.from(dedupMap.values())

  // Mezcla por institución (round-robin) para diversidad en resultados.
  const buckets = new Map<string, typeof allPrograms>()
  for (const p of allPrograms) {
    const key = (p.nombre_institucion || 'Sin institución').trim()
    const arr = buckets.get(key)
    if (arr) arr.push(p)
    else buckets.set(key, [p])
  }

  const selected: typeof allPrograms = []
  let addedInRound = true
  while (selected.length < limit && addedInRound) {
    addedInRound = false
    for (const arr of buckets.values()) {
      if (!arr.length) continue
      selected.push(arr.shift()!)
      addedInRound = true
      if (selected.length >= limit) break
    }
  }

  // enriquecer con stats agregadas (career_stats) para que el LLM tenga
  // ingreso 4to año + empleabilidad + retención en un solo payload.
  const genericIds = [...new Set(selected.map(p => p.career_generic_id).filter(Boolean))]
  const { data: stats } = genericIds.length
    ? await supabase
        .from('career_stats')
        .select(`
          career_generic_id,
          ingreso_4to_ano_clp,
          empleabilidad_1er_ano_pct,
          empleabilidad_2do_ano_pct,
          retencion_1er_ano_pct,
          duracion_real_semestres
        `)
        .in('career_generic_id', genericIds as string[])
    : { data: [] as any[] }
  const byId = new Map((stats ?? []).map(s => [s.career_generic_id, s]))

  function summarizeRelated(p: any) {
    return {
      program_unique_code: p.program_unique_code,
      nombre_carrera: p.nombre_carrera,
      nombre_institucion: p.nombre_institucion,
      region: p.region,
      sede: p.sede,
      nivel_carrera: p.nivel_carrera,
      arancel_anual: p.arancel_anual,
      puntaje_promedio_matriculados: p.puntaje_promedio_matriculados,
    }
  }

  return {
    count: selected.length,
    source_count: allPrograms.length,
    institutions_count: buckets.size,
    // Programas relacionados en la misma institución (cuando no hay match exacto)
    related_in_institution: relatedInInstitution.length
      ? relatedInInstitution.slice(0, 5).map(summarizeRelated)
      : [],
    // Metadata para que el LLM sepa si se buscó en institución específica y si la encontró
    institution_filter: institutionFilter
      ? {
          searched: body.institution,
          found_in_institution: institutionFound,
          related_count: relatedInInstitution.length,
          broad_fallback: broadFallback,
          note: broadFallback
            ? `No se encontró "${body.keywords?.join(' ')}" en "${body.institution}". Ver related_in_institution para opciones similares en esa institución, y results para alternativas en otras instituciones.`
            : null,
        }
      : null,
    results: selected.map(p => {
      const s = p.career_generic_id ? byId.get(p.career_generic_id) : null
      return {
        ...p,
        stats: s
          ? {
              ingreso_4to_ano_clp: s.ingreso_4to_ano_clp,
              empleabilidad_1er_ano_pct: s.empleabilidad_1er_ano_pct,
              empleabilidad_2do_ano_pct: s.empleabilidad_2do_ano_pct,
              retencion_1er_ano_pct: s.retencion_1er_ano_pct,
              duracion_real_semestres: s.duracion_real_semestres,
            }
          : null,
      }
    }),
  }
})
