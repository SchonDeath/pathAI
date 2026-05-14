import { findCatalogCareerCandidates, getCatalogCareerById, isDisallowedCatalogText, type CatalogCareerMatch, type SupabaseLike } from './career-catalog'

export interface OfficialSalaryResult {
  career_generic_id: string | null
  salary_range: {
    junior: number | null
    mid: number | null
    senior: number | null
    currency: 'CLP'
  }
  salary_source: 'sies'
  salary_label: string
  salary_year: number
  matched_career: string
  tipo_institucion: string | null
  area: string | null
  ingresos_clp: {
    primer_ano: number | null
    tercer_o_cuarto_ano: number | null
    quinto_ano: number | null
  }
  empleabilidad_pct: {
    primer_ano: number | null
    segundo_ano: number | null
  }
}

function normalizeText(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function tokenize(input: string) {
  const stop = new Set(['carrera', 'profesional', 'tecnico', 'tecnica', 'licenciatura', 'mencion'])
  return normalizeText(input)
    .split(/[^a-z0-9]+/g)
    .filter(t => t.length >= 4 && !stop.has(t))
}

function scoreRow(row: any, tokens: string[]) {
  const name = normalizeText(row?.nombre_carrera_generica || '')
  const area = normalizeText(row?.area || '')
  let score = 0

  for (const token of tokens) {
    if (name.includes(token)) score += 8
    else if (name.includes(token.slice(0, Math.max(4, token.length - 2)))) score += 4
    // Morphology fallback: Spanish words mutate suffixes (comunicador→comunicacion, periodista→periodismo)
    // Use a 7-char stem to bridge these variations
    else if (token.length >= 7 && name.includes(token.slice(0, 7))) score += 4
    else if (area.includes(token)) score += 1
  }

  if (tokens.length && tokens.every(t =>
    name.includes(t) ||
    name.includes(t.slice(0, Math.max(4, t.length - 2))) ||
    (t.length >= 7 && name.includes(t.slice(0, 7)))
  )) {
    score += 6
  }

  return score
}

function toOfficialSalary(row: any): OfficialSalaryResult {
  const primer = row.ingreso_1er_ano_clp ?? null
  const medio = row.ingreso_3er_ano_clp ?? row.ingreso_4to_ano_clp ?? null
  const senior = row.ingreso_5to_ano_clp ?? row.ingreso_4to_ano_clp ?? null

  return {
    career_generic_id: row.career_generic_id ?? null,
    salary_range: {
      junior: primer,
      mid: medio,
      senior,
      currency: 'CLP',
    },
    salary_source: 'sies',
    salary_label: 'Ingresos promedio brutos mensuales SIES/MiFuturo por año post-titulación',
    salary_year: 2025,
    matched_career: row.nombre_carrera_generica,
    tipo_institucion: row.tipo_institucion ?? null,
    area: row.area ?? null,
    ingresos_clp: {
      primer_ano: primer,
      tercer_o_cuarto_ano: medio,
      quinto_ano: senior,
    },
    empleabilidad_pct: {
      primer_ano: row.empleabilidad_1er_ano_pct ?? null,
      segundo_ano: row.empleabilidad_2do_ano_pct ?? null,
    },
  }
}

export async function findOfficialSalaryForCareerGenericId(
  supabase: SupabaseLike,
  careerGenericId: string,
): Promise<OfficialSalaryResult | null> {
  const id = String(careerGenericId || '').trim()
  if (!id) return null

  const { data, error } = await supabase
    .from('career_stats')
    .select(`
      career_generic_id,
      area,
      tipo_institucion,
      nombre_carrera_generica,
      ingreso_1er_ano_clp,
      ingreso_3er_ano_clp,
      ingreso_4to_ano_clp,
      ingreso_5to_ano_clp,
      empleabilidad_1er_ano_pct,
      empleabilidad_2do_ano_pct
    `)
    .eq('career_generic_id', id)
    .limit(10)

  if (error || !data?.length) return null

  return (data as any[])
    .map(toOfficialSalary)
    .filter(salary => Object.values(salary.ingresos_clp).some(v => typeof v === 'number' && v > 0))
    .sort((a, b) =>
      (b.salary_range.senior ?? b.salary_range.mid ?? b.salary_range.junior ?? 0)
      - (a.salary_range.senior ?? a.salary_range.mid ?? a.salary_range.junior ?? 0)
    )[0] ?? null
}

async function findOfficialSalaryForCandidates(
  supabase: SupabaseLike,
  candidates: Array<CatalogCareerMatch | null | undefined>,
) {
  const seen = new Set<string>()
  for (const candidate of candidates) {
    const id = candidate?.career_generic_id
    if (!id || seen.has(id)) continue
    seen.add(id)

    const salary = await findOfficialSalaryForCareerGenericId(supabase, id)
    if (!salary) continue

    return {
      salary: {
        ...salary,
        career_generic_id: id,
        matched_career: candidate.nombre_carrera_generica || salary.matched_career,
        tipo_institucion: candidate.tipo_institucion ?? salary.tipo_institucion,
        area: candidate.area ?? salary.area,
      },
      candidate,
    }
  }
  return null
}

export async function findOfficialSalaryForTitle(supabase: SupabaseLike, title: string): Promise<OfficialSalaryResult | null> {
  const candidates = await findCatalogCareerCandidates(supabase, title, 8)
  const candidateSalary = await findOfficialSalaryForCandidates(supabase, candidates)
  if (candidateSalary) {
    return candidateSalary.salary
  }

  const tokens = tokenize(title)
  if (!tokens.length) return null

  // Build ilike filters using both full token and 7-char stem so that
  // Spanish morphology variations are caught at DB level:
  // "periodista" → also queries "%periodis%" → finds "Periodismo"
  // "comunicador" → also queries "%comunica%" → finds "Comunicación*"
  const or = tokens
    .slice(0, 5)
    .flatMap(t => {
      const filters = [`nombre_carrera_generica.ilike.%${t}%`]
      if (t.length >= 7) filters.push(`nombre_carrera_generica.ilike.%${t.slice(0, 7)}%`)
      return filters
    })
    .join(',')

  const { data, error } = await supabase
    .from('career_stats')
    .select(`
      career_generic_id,
      area,
      tipo_institucion,
      nombre_carrera_generica,
      ingreso_1er_ano_clp,
      ingreso_3er_ano_clp,
      ingreso_4to_ano_clp,
      ingreso_5to_ano_clp,
      empleabilidad_1er_ano_pct,
      empleabilidad_2do_ano_pct
    `)
    .or(or)
    .limit(25)

  if (error || !data?.length) return null

  const best = data
    .map((row: any) => ({ row, score: scoreRow(row, tokens) }))
    .filter((item: any) => item.score >= 4)
    .sort((a: any, b: any) => b.score - a.score)[0]

  if (!best) return null

  const salary = toOfficialSalary(best.row)
  const hasAnyIncome = Object.values(salary.ingresos_clp).some(v => typeof v === 'number' && v > 0)
  return hasAnyIncome ? salary : null
}

export async function enrichDiscoverResultWithOfficialSalaries<T extends { variations?: any[] }>(
  result: T,
  supabase: SupabaseLike,
): Promise<T> {
  if (!Array.isArray(result.variations)) return result

  const enriched = await Promise.all(result.variations.map(async (career) => {
    const searchText = [
      career?.title,
      career?.matched_career,
      career?.tagline,
      career?.description,
      Array.isArray(career?.skills) ? career.skills.join(' ') : '',
    ].filter(Boolean).join(' ')
    const resolvedById = career?.career_generic_id
      ? await getCatalogCareerById(supabase, String(career.career_generic_id))
      : null
    const candidates = [
      resolvedById,
      ...(await findCatalogCareerCandidates(supabase, searchText || String(career?.title || ''), 8)),
    ]
    const resolved = candidates.find(Boolean) ?? null
    const officialMatch = await findOfficialSalaryForCandidates(supabase, candidates)
    const official = officialMatch?.salary ?? null
    const officialCandidate = officialMatch?.candidate ?? resolved

    if (!official) {
      const { salary_range: _discarded, ...withoutSalary } = career
      const shouldReplaceTitle = isDisallowedCatalogText(career?.title) && resolved?.nombre_carrera_generica
      return {
        ...withoutSalary,
        title: shouldReplaceTitle ? resolved?.nombre_carrera_generica : withoutSalary.title,
        career_generic_id: resolved?.career_generic_id ?? career?.career_generic_id ?? null,
        matched_career: resolved?.nombre_carrera_generica ?? career?.matched_career,
        salary_source: 'none',
        salary_label: 'Sin dato oficial SIES para esta recomendación',
      }
    }

    const {
      career_generic_id: _careerGenericId,
      matched_career: _careerMatchedCareer,
      ...careerBase
    } = career
    const {
      career_generic_id: officialCareerGenericId,
      matched_career: officialMatchedCareer,
      ...officialBase
    } = official

    return {
      ...careerBase,
      ...officialBase,
      title: officialCandidate?.nombre_carrera_generica ?? careerBase.title,
      career_generic_id: officialCandidate?.career_generic_id ?? officialCareerGenericId ?? career?.career_generic_id ?? null,
      matched_career: officialCandidate?.nombre_carrera_generica ?? officialMatchedCareer ?? career?.matched_career,
    }
  }))

  return { ...result, variations: enriched }
}