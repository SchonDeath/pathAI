import { retrieveContext } from './hybrid-retrieval'

export type SupabaseLike = {
  from: (table: string) => any
}

export interface CatalogCareerMatch {
  career_generic_id: string
  nombre_carrera_generica: string
  area: string | null
  tipo_institucion: string | null
  score: number
  source: 'catalog_id' | 'retrieval' | 'career_generic' | 'program'
}

function normalizeText(input: string) {
  return String(input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

const DISALLOWED_LEVEL_RE = /\b(postgrado|posgrado|magister|magistr|maestria|doctorado|diplomado|postitulo|especialidad|residencia)\b/
const ALLOWED_INSTITUTION_TYPE_RE = /universidad|universidades|instituto profesional|institutos profesionales|centro de formacion tecnica|centros de formacion tecnica|fuerzas armadas|ff\.?aa|escuela matriz/
const PRE_ADMISSION_LEVELS = [
  'Profesional con Licenciatura',
  'Profesional sin Licenciatura',
  'Profesional',
  'Licenciatura no conducente a título',
  'Licenciatura no conducente a titulo',
  'Licenciatura',
  'Bachillerato',
  'Ciclo Inicial',
  'Plan Común',
  'Plan Comun',
  'Técnico de Nivel Superior',
  'Tecnico de Nivel Superior',
]

function isAllowedInstitutionType(value: unknown) {
  const current = normalizeText(String(value || ''))
  return !!current && ALLOWED_INSTITUTION_TYPE_RE.test(current) && !DISALLOWED_LEVEL_RE.test(current)
}

function isAllowedPreAdmissionLevel(value: unknown) {
  const current = normalizeText(String(value || ''))
  if (!current) return false
  if (DISALLOWED_LEVEL_RE.test(current)) return false
  return PRE_ADMISSION_LEVELS.map(normalizeText).some(level => current.includes(level) || level.includes(current))
}

export function isDisallowedCatalogText(value: unknown) {
  return DISALLOWED_LEVEL_RE.test(normalizeText(String(value || '')))
}

function isAllowedCatalogCandidate(row: any) {
  const haystack = normalizeText(`${row?.nombre_carrera_generica || ''} ${row?.normalized_name || ''} ${row?.area || ''} ${row?.tipo_institucion || ''}`)
  return !DISALLOWED_LEVEL_RE.test(haystack) && isAllowedInstitutionType(row?.tipo_institucion)
}

function isAllowedProgramCandidate(row: any) {
  const haystack = normalizeText(`${row?.nombre_carrera || ''} ${row?.nombre_titulo || ''} ${row?.area_carrera_generica || ''} ${row?.area_conocimiento || ''} ${row?.nivel_carrera || ''}`)
  return !DISALLOWED_LEVEL_RE.test(haystack)
    && isAllowedInstitutionType(row?.tipo_institucion)
    && isAllowedPreAdmissionLevel(row?.nivel_carrera)
}

function tokenize(input: string) {
  const stop = new Set(['carrera', 'profesional', 'tecnico', 'tecnica', 'licenciatura', 'mencion'])
  return normalizeText(input)
    .split(/[^a-z0-9]+/g)
    .filter(token => token.length >= 4 && !stop.has(token))
}

function fragments(token: string) {
  const values = new Set<string>([token])
  if (token.length >= 7) values.add(token.slice(0, 7))
  return [...values]
}

const ACCENT_PATTERNS: Array<[string, string]> = [
  ['atica', 'ática'],
  ['atico', 'ático'],
  ['etica', 'ética'],
  ['etico', 'ético'],
  ['istica', 'ística'],
  ['istico', 'ístico'],
  ['logia', 'logía'],
  ['nomia', 'nomía'],
  ['eria', 'ería'],
  ['ia', 'ía'],
  ['cion', 'ción'],
  ['sion', 'sión'],
  ['on', 'ón'],
]

function accentVariants(term: string) {
  const variants = new Set<string>()
  for (const [suffix, accented] of ACCENT_PATTERNS) {
    if (term.endsWith(suffix)) variants.add(term.slice(0, -suffix.length) + accented)
  }
  return [...variants]
}

function sanitizeOrValue(value: string) {
  return value.replace(/[(),]/g, ' ').replace(/\s+/g, ' ').trim()
}

function searchTerms(input: string) {
  const terms = new Set<string>()
  for (const token of tokenize(input)) {
    const variants = [token, ...accentVariants(token)]
    for (const variant of variants) {
      for (const fragment of fragments(variant)) {
        terms.add(fragment)
      }
    }
  }
  return [...terms].map(sanitizeOrValue).filter(Boolean)
}

function lexicalScore(candidateName: string, title: string) {
  const name = normalizeText(candidateName)
  const tokens = tokenize(title)
  let score = 0

  for (const token of tokens) {
    if (name.includes(token)) score += 8
    else if (name.includes(token.slice(0, Math.max(4, token.length - 2)))) score += 4
    else if (token.length >= 7 && name.includes(token.slice(0, 7))) score += 4
  }

  if (tokens.length && tokens.every(token =>
    name.includes(token)
    || name.includes(token.slice(0, Math.max(4, token.length - 2)))
    || (token.length >= 7 && name.includes(token.slice(0, 7)))
  )) {
    score += 6
  }

  return score
}

function mergeCandidate(
  map: Map<string, CatalogCareerMatch>,
  candidate: CatalogCareerMatch,
) {
  const existing = map.get(candidate.career_generic_id)
  if (!existing || candidate.score > existing.score) {
    map.set(candidate.career_generic_id, candidate)
  }
}

export async function getCatalogCareerById(
  supabase: SupabaseLike,
  careerGenericId: string,
): Promise<CatalogCareerMatch | null> {
  const id = String(careerGenericId || '').trim()
  if (!id) return null

  const { data, error } = await supabase
    .from('career_generic')
    .select('id, nombre_carrera_generica, normalized_name, area, tipo_institucion')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  if (!isAllowedCatalogCandidate(data)) return null

  return {
    career_generic_id: String(data.id),
    nombre_carrera_generica: String(data.nombre_carrera_generica || ''),
    area: data.area ?? null,
    tipo_institucion: data.tipo_institucion ?? null,
    score: 100,
    source: 'catalog_id',
  }
}

export async function findCatalogCareerCandidates(
  supabase: SupabaseLike,
  text: string,
  limit = 8,
): Promise<CatalogCareerMatch[]> {
  const normalizedText = normalizeText(text)
  if (!normalizedText) return []

  const candidates = new Map<string, CatalogCareerMatch>()

  try {
    const retrieved = await retrieveContext(text, Math.max(limit, 8), 0.26)
    const careerIds = [...new Set(
      retrieved
        .filter(item => item.kind === 'career' && item.ref_id)
        .map(item => String(item.ref_id)),
    )]

    if (careerIds.length) {
      const { data } = await supabase
        .from('career_generic')
        .select('id, nombre_carrera_generica, normalized_name, area, tipo_institucion')
        .in('id', careerIds)

      const rows = Array.isArray(data) ? data.filter(isAllowedCatalogCandidate) : []
      const byId = new Map(rows.map((row: any) => [String(row.id), row]))
      for (const item of retrieved) {
        const row = byId.get(String(item.ref_id)) as any
        if (!row) continue
        mergeCandidate(candidates, {
          career_generic_id: String(row.id),
          nombre_carrera_generica: String(row.nombre_carrera_generica || ''),
          area: row.area ?? null,
          tipo_institucion: row.tipo_institucion ?? null,
          score: Number(item.score || 0) * 30,
          source: 'retrieval',
        })
      }
    }
  } catch {
    // Retrieval is best-effort; deterministic DB matching continues below.
  }

  const terms = searchTerms(text).slice(0, 12)
  if (terms.length) {
    const careerFilters = terms.flatMap(term => [
      `nombre_carrera_generica.ilike.%${term}%`,
      `normalized_name.ilike.%${term}%`,
      `area.ilike.%${term}%`,
    ])

    const { data: genericRows } = await supabase
      .from('career_generic')
      .select('id, nombre_carrera_generica, normalized_name, area, tipo_institucion')
      .or(careerFilters.join(','))
      .limit(80)

    for (const row of genericRows ?? []) {
      if (!isAllowedCatalogCandidate(row)) continue
      const score = lexicalScore(String(row.nombre_carrera_generica || ''), text)
      if (score < 4) continue
      mergeCandidate(candidates, {
        career_generic_id: String(row.id),
        nombre_carrera_generica: String(row.nombre_carrera_generica || ''),
        area: row.area ?? null,
        tipo_institucion: row.tipo_institucion ?? null,
        score,
        source: 'career_generic',
      })
    }

    const programFilters = terms.flatMap(term => [
      `nombre_carrera.ilike.%${term}%`,
      `area_carrera_generica.ilike.%${term}%`,
      `area_conocimiento.ilike.%${term}%`,
    ])

    const { data: programRows } = await supabase
      .from('programs')
      .select('career_generic_id, nombre_carrera, nombre_titulo, area_carrera_generica, area_conocimiento, tipo_institucion, nivel_carrera')
      .not('career_generic_id', 'is', null)
      .or(programFilters.join(','))
      .limit(120)

    const programScores = new Map<string, number>()
    for (const program of programRows ?? []) {
      if (!isAllowedProgramCandidate(program)) continue
      const genericId = String(program.career_generic_id || '')
      if (!genericId) continue
      const haystack = [program.nombre_carrera, program.area_carrera_generica, program.area_conocimiento]
        .filter(Boolean)
        .join(' ')
      const score = lexicalScore(haystack, text)
      if (score < 4) continue
      programScores.set(genericId, Math.max(programScores.get(genericId) ?? 0, score + 2))
    }

    const programGenericIds = [...programScores.keys()]
    if (programGenericIds.length) {
      const { data: programGenericRows } = await supabase
        .from('career_generic')
        .select('id, nombre_carrera_generica, normalized_name, area, tipo_institucion')
        .in('id', programGenericIds)

      for (const row of programGenericRows ?? []) {
        if (!isAllowedCatalogCandidate(row)) continue
        mergeCandidate(candidates, {
          career_generic_id: String(row.id),
          nombre_carrera_generica: String(row.nombre_carrera_generica || ''),
          area: row.area ?? null,
          tipo_institucion: row.tipo_institucion ?? null,
          score: programScores.get(String(row.id)) ?? 0,
          source: 'program',
        })
      }
    }
  }

  return [...candidates.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

export async function resolveCatalogCareerForTitle(
  supabase: SupabaseLike,
  title: string,
): Promise<CatalogCareerMatch | null> {
  return (await findCatalogCareerCandidates(supabase, title, 1))[0] ?? null
}
