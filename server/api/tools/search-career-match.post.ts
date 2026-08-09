/**
 * POST /api/tools/search-career-match
 * Body: {
 *   keywords?: string[],          // ej: ['diseño','tecnología']
 *   area?: string,                // 'Tecnología', 'Salud', etc.
 *   tipo_institucion?: string,    // 'Universidades' | 'Institutos Profesionales' | 'Centros de Formación Técnica'
 *   tipos_institucion?: string[], // permite buscar IP + CFT en una sola llamada
 *   region?: string,
 *   comuna?: string,
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

/**
 * Genera variantes acentuadas de un término normalizado (sin tildes).
 * ILIKE en PostgreSQL NO es accent-insensitive, por lo que "psicologia" no
 * encuentra "Psicología". Buscamos AMBAS formas: la normalizada y la acentuada.
 *
 * Cubre los patrones más comunes en nombres de carreras chilenas:
 *   ia → ía  (Psicología, Enfermería, Biología, Ingeniería, Filosofía)
 *   cion → ción  (Administración, Educación, Nutrición, Comunicación)
 *   sion → sión  (Profesión, Expresión)
 *   on → ón  (Gestión, Administración ya cubierta)
 *   en → én  (Examen, Almacén)
 *   an → án  (Capitán)
 *   in → ín  (Violín)
 *   un → ún  (Común)
 *   os → ós  (Andrés → no aplica, pero cubre algún caso)
 *   as → ás  (Más)
 */
const ACCENT_PATTERNS: Array<[string, string]> = [
  ['ia', 'ía'],
  ['cion', 'ción'],
  ['sion', 'sión'],
  ['on', 'ón'],
  ['en', 'én'],
  ['an', 'án'],
  ['in', 'ín'],
  ['un', 'ún'],
]

function accentVariants(term: string): string[] {
  const variants = new Set<string>()
  for (const [suffix, accented] of ACCENT_PATTERNS) {
    if (term.endsWith(suffix)) {
      variants.add(term.slice(0, -suffix.length) + accented)
    }
  }
  return [...variants]
}

/**
 * Genera variantes del área con y sin tildes para búsqueda en PostgreSQL.
 * Reutiliza accentVariants() para generar automáticamente todas las variantes,
 * sin necesidad de hardcodear áreas específicas.
 */
function areaVariants(area: string): string[] {
  if (!area) return []
  const norm = normalizeText(area)
  const variants = new Set<string>([norm, area.trim()]) // versión normalizada + original
  
  // Genera variantes acentuadas automáticamente para todos los sufijos comunes
  const accented = accentVariants(norm)
  accented.forEach(v => variants.add(v))
  
  return [...variants]
}

function tokenize(input: string) {
  return normalizeText(input)
    .split(/[^a-z0-9]+/g)
    .filter(t => t.length >= 3)
}

function scoreProgram(program: any, terms: string[]) {
  const title = normalizeText(program?.nombre_carrera || '')
  const area = normalizeText(program?.area_carrera_generica || '')
  const knowledgeArea = normalizeText(program?.area_conocimiento || '')
  const inst = normalizeText(program?.nombre_institucion || '')
  const comuna = normalizeText(program?.comuna || '')
  const region = normalizeText(program?.region || '')
  const haystack = `${title} ${area} ${knowledgeArea} ${inst} ${comuna} ${region}`

  let score = 0
  for (const t of terms) {
    if (title.includes(t)) score += 8
    else if (area.includes(t) || knowledgeArea.includes(t)) score += 5
    else if (inst.includes(t)) score += 2
    else if (t.length >= 8 && (title.includes(t.slice(0, 7)) || area.includes(t.slice(0, 7)) || knowledgeArea.includes(t.slice(0, 7)))) score += 4
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

  if (/^ip$|instituto profesional|institutos profesionales/.test(requested)) {
    return /instituto profesional|institutos profesionales/.test(current)
  }
  if (/^cft$|centro de formacion tecnica|centros de formacion tecnica/.test(requested)) {
    return /centro de formacion tecnica|centros de formacion tecnica/.test(current)
  }
  if (/^u$|universidad|universidades/.test(requested)) {
    return /universidad|universidades/.test(current)
  }

  return current === requested || current.includes(requested) || requested.includes(current)
}

function requestedInstitutionTypes(tipo?: string, tipos?: string[]) {
  const raw = [tipo, ...(Array.isArray(tipos) ? tipos : [])]
    .filter(Boolean)
    .flatMap(value => String(value).split(/[,;/|]+/g))
    .map(value => value.trim())
    .filter(Boolean)

  return [...new Set(raw)]
}

function matchesArea(program: any, requestedArea?: string) {
  const requested = normalizeText(String(requestedArea || ''))
  if (!requested) return true
  const current = normalizeText(`${program?.area_carrera_generica || ''} ${program?.area_conocimiento || ''}`)
  return current.includes(requested) || requested.includes(current)
}

function sanitizeOrValue(value: string) {
  return value.replace(/[(),]/g, ' ').replace(/\s+/g, ' ').trim()
}

function locationVariants(value?: string) {
  const normalized = normalizeText(String(value || ''))
  if (!normalized) return []

  const variants = new Set<string>([String(value).trim(), normalized])
  accentVariants(normalized).forEach(v => variants.add(v))

  if (/santiago|stgo|metropolitana/.test(normalized)) {
    variants.add('Metropolitana')
    variants.add('Region Metropolitana')
    variants.add('Región Metropolitana')
    variants.add('Santiago')
  }
  if (/valparaiso/.test(normalized)) variants.add('Valparaíso')
  if (/biobio|bio bio|bio-bio/.test(normalized)) {
    variants.add('Biobío')
    variants.add('Bio Bio')
    variants.add('Bío Bío')
  }

  return [...variants].map(sanitizeOrValue).filter(Boolean)
}

function applyLocationFilter(query: any, region?: string, comuna?: string) {
  const filters: string[] = []
  for (const value of locationVariants(region)) {
    filters.push(`region.ilike.%${value}%`)
    filters.push(`provincia.ilike.%${value}%`)
    filters.push(`comuna.ilike.%${value}%`)
  }
  for (const value of locationVariants(comuna)) {
    filters.push(`comuna.ilike.%${value}%`)
  }
  return filters.length ? query.or(filters.join(',')) : query
}

function matchesLocation(program: any, region?: string, comuna?: string) {
  const regionTerms = locationVariants(region).map(normalizeText)
  const comunaTerms = locationVariants(comuna).map(normalizeText)
  if (!regionTerms.length && !comunaTerms.length) return true

  const haystack = normalizeText(`${program?.region || ''} ${program?.provincia || ''} ${program?.comuna || ''}`)
  const regionOk = !regionTerms.length || regionTerms.some(term => haystack.includes(term))
  const comunaOk = !comunaTerms.length || comunaTerms.some(term => haystack.includes(term))
  return regionOk && comunaOk
}

function matchesInstitutionFilter(program: any, institutionCode?: number | null, institutionName?: string | null) {
  if (Number.isFinite(Number(institutionCode)) && Number(program?.institution_code) === Number(institutionCode)) return true
  const requested = normalizeText(String(institutionName || ''))
  if (!requested) return true
  const current = normalizeText(String(program?.nombre_institucion || ''))
  return !!current && (current.includes(requested) || requested.includes(current))
}

const DEFAULT_PRE_ADMISSION_LEVELS = [
  'Profesional con Licenciatura',
  'Profesional sin Licenciatura',
  'Profesional',
  'Licenciatura no conducente a título',
  'Licenciatura',
  'Bachillerato',
  'Ciclo Inicial',
  'Plan Común',
  'Plan Comun',
  'Técnico de Nivel Superior',
  'Tecnico de Nivel Superior',
]

function defaultLevelVariants() {
  return DEFAULT_PRE_ADMISSION_LEVELS.map(sanitizeOrValue).filter(Boolean)
}

function isDefaultPreAdmissionLevel(programLevel: unknown) {
  const current = normalizeText(String(programLevel || ''))
  if (!current) return false
  const variants = defaultLevelVariants().map(normalizeText)
  return variants.some(v => current.includes(v) || v.includes(current))
}

function levelVariants(input?: string) {
  const normalized = normalizeText(String(input || ''))
  if (!normalized) return []

  const variants = new Set<string>([String(input).trim()])
  const asksProfessionalWithoutDegree = /profesional/.test(normalized) && /sin\s+licenciatura|sin\s+grado|ip\b|instituto profesional/.test(normalized)
  const asksProfessionalWithDegree = /profesional/.test(normalized) && /con\s+licenciatura|licenciado/.test(normalized) && !asksProfessionalWithoutDegree
  const asksStandaloneLicenciatura = /licenciatura\s+no\s+conducente|solo\s+el\s+grado|sin\s+titulo\s+profesional|sin\s+t[ií]tulo\s+profesional/.test(normalized)

  if (/tecnico|tecnica|nivel superior/.test(normalized)) {
    variants.add('Técnico de Nivel Superior')
    variants.add('Tecnico de Nivel Superior')
    variants.add('Técnico')
    variants.add('Tecnico')
  }
  if (asksProfessionalWithoutDegree) {
    variants.add('Profesional sin Licenciatura')
    variants.add('Profesional')
  } else if (asksProfessionalWithDegree) {
    variants.add('Profesional con Licenciatura')
  } else if (/profesional/.test(normalized)) {
    variants.add('Profesional')
    variants.add('Profesional con Licenciatura')
    variants.add('Profesional sin Licenciatura')
  }
  if (asksStandaloneLicenciatura) {
    variants.add('Licenciatura no conducente a título')
    variants.add('Licenciatura no conducente a titulo')
    variants.add('Licenciatura')
  } else if (/licenciatura|licenciado/.test(normalized) && !/profesional/.test(normalized)) {
    variants.add('Licenciatura')
  }
  if (/bachillerato|ciclo\s+inicial|plan\s+comun|plan\s+com[uú]n/.test(normalized)) {
    variants.add('Bachillerato')
    variants.add('Ciclo Inicial')
    variants.add('Plan Común')
    variants.add('Plan Comun')
  }
  if (/magister|magistr|maestria/.test(normalized)) {
    variants.add('Magíster')
    variants.add('Magister')
  }
  if (/doctorado/.test(normalized)) variants.add('Doctorado')
  if (/diplomado/.test(normalized)) variants.add('Diplomado')
  if (/especialidad|residencia|medic[ao]|odontolog/.test(normalized) && /especialidad|residencia/.test(normalized)) {
    variants.add('Especialidad Médica u Odontológica')
    variants.add('Especialidad Medica u Odontologica')
  }
  if (/postitulo|postitulo/.test(normalized)) {
    variants.add('Postítulo')
    variants.add('Postitulo')
  }
  if (/postgrado|posgrado/.test(normalized)) {
    variants.add('Postgrado')
    variants.add('Magíster')
    variants.add('Magister')
    variants.add('Doctorado')
    variants.add('Diplomado')
    variants.add('Postítulo')
    variants.add('Postitulo')
  }

  return [...variants].map(sanitizeOrValue).filter(Boolean)
}

function applyDefaultLevelFilter(query: any) {
  const variants = defaultLevelVariants()
  return query.or(variants.map(v => `nivel_carrera.ilike.%${v}%`).join(','))
}

function applyLevelFilter(query: any, nivel?: string) {
  const variants = levelVariants(nivel)
  if (!variants.length) return applyDefaultLevelFilter(query)
  return query.or(variants.map(v => `nivel_carrera.ilike.%${v}%`).join(','))
}

function matchesRequestedLevel(programLevel: unknown, requestedLevel?: string) {
  const variants = levelVariants(requestedLevel).map(normalizeText)
  const current = normalizeText(String(programLevel || ''))
  if (!variants.length) return isDefaultPreAdmissionLevel(current)
  if (!current) return false
  return variants.some(v => current.includes(v) || v.includes(current))
}

function shuffled<T>(items: T[]) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy
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
    career_generic_id?: string
    institution?: string
    institution_code?: number
    area?: string
    tipo_institucion?: string
    tipos_institucion?: string[]
    region?: string
    comuna?: string
    nivel_carrera?: string
    strict_institution?: boolean
    allow_broad_fallback?: boolean
    max_arancel?: number
    randomize?: boolean
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
      region, region_code, provincia, comuna, comuna_code, nombre_sede, jornada, modalidad, area_carrera_generica, area_conocimiento,
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

  const careerGenericIdFilter = String(body.career_generic_id || '').trim() || null
  if (careerGenericIdFilter) q = q.eq('career_generic_id', careerGenericIdFilter)

  if (body.area) {
    const areaTerms = areaVariants(body.area)
    if (areaTerms.length) {
      const areaFilters = areaTerms.flatMap(area => [
        `area_carrera_generica.ilike.%${sanitizeOrValue(area)}%`,
        `area_conocimiento.ilike.%${sanitizeOrValue(area)}%`
      ])
      q = q.or(areaFilters.join(','))
    }
  }
  q = applyLocationFilter(q, body.region, body.comuna)
  if (body.max_arancel)      q = q.lte('arancel_anual', body.max_arancel)
  // Por defecto excluir postgrado y diplomados (Magister/Doctorado/Especialización/Diplomado) salvo que se pida explícitamente
  q = applyLevelFilter(q, body.nivel_carrera)

  // Si se especifica institución, filtramos por nombre en la BD directamente.
  const institutionFilter = body.institution ? normalizeText(body.institution) : null
  const institutionCodeFilter = Number.isFinite(Number(body.institution_code))
    ? Number(body.institution_code)
    : null
  if (institutionCodeFilter) {
    q = q.eq('institution_code', institutionCodeFilter)
  } else if (institutionFilter) {
    q = q.ilike('nombre_institucion', `%${body.institution}%`)
  }

  const expanded = careerGenericIdFilter ? { terms: [] as string[], strictStems: [] as string[] } : expandKeywords(body.keywords)
  if (expanded.terms.length) {
    // Usamos unaccent() en la BD para comparación sin tildes en ambos lados.
    // Esto requiere que exista la función unaccent_immutable() en Supabase.
    // Fallback: también incluimos variantes acentuadas via accentVariants() por si acaso.
    const termFilters = expanded.terms.flatMap((k) => {
      const variants = [k, ...accentVariants(k)]
      const stem7 = k.length >= 8 ? k.slice(0, 7) : null
      if (institutionFilter) {
        return [
          // unaccent en ambos lados (usa índice funcional si existe)
          `nombre_carrera.ilike.%${k}%`,
          `area_carrera_generica.ilike.%${k}%`,
          // stem de 7 chars para morfología española (comunicador → comunica → comunicacion)
          ...(stem7 ? [
            `nombre_carrera.ilike.%${stem7}%`,
            `area_carrera_generica.ilike.%${stem7}%`,
          ] : []),
          // variantes acentuadas directas (fallback si no hay unaccent en BD)
          ...variants.slice(1).flatMap(v => [
            `nombre_carrera.ilike.%${v}%`,
            `area_carrera_generica.ilike.%${v}%`,
          ]),
        ]
      } else {
        return [
          `nombre_carrera.ilike.%${k}%`,
          `area_carrera_generica.ilike.%${k}%`,
          `nombre_institucion.ilike.%${k}%`,
          // stem de 7 chars para morfología española (comunicador → comunica → comunicacion)
          ...(stem7 ? [
            `nombre_carrera.ilike.%${stem7}%`,
            `area_carrera_generica.ilike.%${stem7}%`,
          ] : []),
          ...variants.slice(1).flatMap(v => [
            `nombre_carrera.ilike.%${v}%`,
            `area_carrera_generica.ilike.%${v}%`,
          ]),
        ]
      }
    })
    q = q.or(termFilters.join(','))
  }

  const { data: programs, error } = await q
  if (error) throw createError({ statusCode: 500, message: error.message })

  // Tokens base para búsqueda fuzzy en misma institución
  const baseTokens = tokenize((body.keywords ?? []).join(' '))

  // Si se buscó por institución pero no hay resultados exactos, intentar:
  // 1. Buscar programas RELACIONADOS en la misma institución (sin keywords exactos, solo institución)
  // 2. Si tampoco hay, búsqueda amplia sin filtro de institución (broad fallback)
  const hasInstitutionFilter = !!institutionFilter || !!institutionCodeFilter
  const allowBroadFallback = body.allow_broad_fallback === true && body.strict_institution !== true
  let institutionFound = !hasInstitutionFilter ? null : (programs ?? []).length > 0
  let relatedInInstitution: any[] = []
  let broadFallback = false

  if (hasInstitutionFilter && !institutionFound) {
    // Paso 1: buscar cualquier programa de esa institución con tokens similares (más amplio)
    let sameInstQuery = supabase
      .from('programs')
      .select(`
        program_unique_code, nombre_carrera, nombre_titulo, nombre_institucion, institution_code,
        tipo_institucion, tipo_institucion_detalle,
        region, region_code, provincia, comuna, comuna_code, nombre_sede, jornada, modalidad, area_carrera_generica, area_conocimiento,
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
      .limit(200)
    sameInstQuery = institutionCodeFilter
      ? sameInstQuery.eq('institution_code', institutionCodeFilter)
      : sameInstQuery.ilike('nombre_institucion', `%${body.institution}%`)
    sameInstQuery = applyLevelFilter(sameInstQuery, body.nivel_carrera)
    sameInstQuery = applyLocationFilter(sameInstQuery, body.region, body.comuna)

    const { data: sameInstData } = await sameInstQuery

    if (sameInstData?.length) {
      // Rankear por similitud de tokens con los keywords pedidos
      relatedInInstitution = sameInstData
        .map(p => ({ p, score: scoreProgram(p, baseTokens) }))
        .filter(x => x.score >= 2)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(x => x.p)
    }

    if (relatedInInstitution.length) {
      institutionFound = true
      ;(programs as any[]).splice(0, (programs as any[]).length, ...relatedInInstitution)
    } else if (allowBroadFallback) {
      // Paso 2: broad fallback a otras instituciones solo si no hubo nada útil dentro de la institución
      broadFallback = true
      let qBroad = supabase
        .from('programs')
        .select(`
          program_unique_code, nombre_carrera, nombre_titulo, nombre_institucion, institution_code,
          tipo_institucion, tipo_institucion_detalle,
          region, region_code, provincia, comuna, comuna_code, nombre_sede, jornada, modalidad, area_carrera_generica, area_conocimiento,
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
      qBroad = applyLevelFilter(qBroad, body.nivel_carrera)
      qBroad = applyLocationFilter(qBroad, body.region, body.comuna)
      if (body.area) {
        const areaTerms = areaVariants(body.area)
        if (areaTerms.length) {
          const areaFilters = areaTerms.flatMap(area => [
            `area_carrera_generica.ilike.%${sanitizeOrValue(area)}%`,
            `area_conocimiento.ilike.%${sanitizeOrValue(area)}%`
          ])
          qBroad = qBroad.or(areaFilters.join(','))
        }
      }
      if (expanded.terms.length) {
        const broadFilters = expanded.terms.flatMap((k) => {
          const variants = [k, ...accentVariants(k)]
          return variants.flatMap(v => [
            `nombre_carrera.ilike.%${v}%`,
            `area_carrera_generica.ilike.%${v}%`,
          ])
        })
        qBroad = qBroad.or(broadFilters.join(','))
      }
      const { data: broadData } = await qBroad
      ;(programs as any[]).splice(0, (programs as any[]).length, ...(broadData ?? []))
    } else {
      ;(programs as any[]).splice(0, (programs as any[]).length)
    }
  }

  const requestedTypes = requestedInstitutionTypes(body.tipo_institucion, body.tipos_institucion)
  const preFiltered = await hydrateInstitutionTypes(programs ?? [], supabase)
  const byType = requestedTypes.length
    ? preFiltered.filter((p) => requestedTypes.some(type => matchesInstitutionType(p?.tipo_institucion, type)))
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
        region, region_code, provincia, comuna, comuna_code, nombre_sede, jornada, modalidad, area_carrera_generica, area_conocimiento,
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
    const broadByType = requestedTypes.length
      ? broadHydrated.filter((p) => requestedTypes.some(type => matchesInstitutionType(p?.tipo_institucion, type)))
      : broadHydrated

    const baseTerms = tokenize((body.keywords ?? []).join(' '))
    const rescored = broadByType
      .filter((p) => !hasInstitutionFilter || matchesInstitutionFilter(p, institutionCodeFilter, body.institution))
      .filter((p) => matchesLocation(p, body.region, body.comuna))
      .filter((p) => matchesArea(p, body.area))
      .filter((p) => matchesRequestedLevel(p?.nivel_carrera, body.nivel_carrera))
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
    const key = `${p.nombre_carrera}||${p.nombre_institucion}||${p.nombre_sede || p.sede || ''}`
    const existing = dedupMap.get(key)
    if (!existing) {
      dedupMap.set(key, p)
    } else if (p.puntaje_promedio_matriculados != null && existing.puntaje_promedio_matriculados == null) {
      dedupMap.set(key, p)
    }
  }
  allPrograms = Array.from(dedupMap.values())
  if (body.randomize) allPrograms = shuffled(allPrograms)

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

  // enriquecer con datos de instituciones (acreditación, infraestructura, etc.)
  const institutionCodes = [...new Set(selected.map(p => p.institution_code).filter(Boolean))] as number[]
  const { data: institutionsData } = institutionCodes.length
    ? await supabase
        .from('institutions')
        .select(`
          institution_code,
          nombre_institucion,
          tipo_institucion,
          acreditacion_estado,
          acreditacion_anos,
          acreditacion_vigencia_desde,
          acreditacion_vigencia_hasta,
          acreditacion_areas,
          matricula_pregrado_actual,
          retencion_1er_ano_pct,
          duracion_formal_semestres,
          promedio_nem,
          promedio_paes,
          m2_construidos,
          volumenes_biblioteca,
          laboratorios_talleres,
          computadores,
          logo_url,
          pagina_web,
          is_featured,
          priority
        `)
        .in('institution_code', institutionCodes)
    : { data: [] as any[] }
  const byInstCode = new Map((institutionsData ?? []).map((i: any) => [Number(i.institution_code), i]))

  function summarizeRelated(p: any) {
    return {
      program_unique_code: p.program_unique_code,
      nombre_carrera: p.nombre_carrera,
      nombre_institucion: p.nombre_institucion,
      region: p.region,
      sede: p.nombre_sede ?? p.sede ?? null,
      nivel_carrera: p.nivel_carrera,
      arancel_anual: p.arancel_anual,
      puntaje_promedio_matriculados: p.puntaje_promedio_matriculados,
    }
  }

  // Sin resultados: orienta al agente sobre qué aflojar. Un `count: 0` mudo lo
  // deja reintentando a ciegas o inventando programas.
  const emptyMessage = selected.length === 0
    ? (() => {
        const applied: string[] = []
        if (body.keywords?.length) applied.push(`keywords="${body.keywords.join(', ')}"`)
        if (body.region) applied.push(`region="${body.region}"`)
        if (body.comuna) applied.push(`comuna="${body.comuna}"`)
        if (body.nivel_carrera) applied.push(`nivel_carrera="${body.nivel_carrera}"`)
        if (body.tipo_institucion) applied.push(`tipo_institucion="${body.tipo_institucion}"`)
        if (body.max_arancel) applied.push(`max_arancel=${body.max_arancel}`)
        return `No hay programas con estos filtros (${applied.join(', ') || 'sin filtros'}). Reintenta quitando el filtro más restrictivo (región o arancel suelen serlo), o usa get_filters_catalog para confirmar que los valores de área, región y nivel existen. NO inventes programas.`
      })()
    : null

  return {
    count: selected.length,
    source_count: allPrograms.length,
    institutions_count: buckets.size,
    ...(emptyMessage ? { message: emptyMessage } : {}),
    // Programas relacionados en la misma institución (cuando no hay match exacto)
    related_in_institution: relatedInInstitution.length
      ? relatedInInstitution.slice(0, 5).map(summarizeRelated)
      : [],
    // Metadata para que el LLM sepa si se buscó en institución específica y si la encontró
    institution_filter: hasInstitutionFilter
      ? {
          searched: body.institution ?? String(body.institution_code ?? ''),
          institution_code: institutionCodeFilter,
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
      const inst = p.institution_code ? byInstCode.get(Number(p.institution_code)) : null
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
        institution_data: inst
          ? {
              acreditacion_estado: inst.acreditacion_estado,
              acreditacion_anos: inst.acreditacion_anos,
              acreditacion_vigencia_desde: inst.acreditacion_vigencia_desde,
              acreditacion_vigencia_hasta: inst.acreditacion_vigencia_hasta,
              acreditacion_areas: inst.acreditacion_areas,
              matricula_pregrado_actual: inst.matricula_pregrado_actual,
              retencion_1er_ano_pct: inst.retencion_1er_ano_pct,
              promedio_nem: inst.promedio_nem,
              promedio_paes: inst.promedio_paes,
              m2_construidos: inst.m2_construidos,
              volumenes_biblioteca: inst.volumenes_biblioteca,
              laboratorios_talleres: inst.laboratorios_talleres,
              computadores: inst.computadores,
              logo_url: inst.logo_url,
              pagina_web: inst.pagina_web,
            }
          : null,
      }
    }),
  }
})
