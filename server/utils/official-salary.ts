type SupabaseLike = {
  from: (table: string) => any
}

export interface OfficialSalaryResult {
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
    else if (area.includes(token)) score += 1
  }

  if (tokens.length && tokens.every(t => name.includes(t) || name.includes(t.slice(0, Math.max(4, t.length - 2))))) {
    score += 6
  }

  return score
}

function toOfficialSalary(row: any): OfficialSalaryResult {
  const primer = row.ingreso_1er_ano_clp ?? null
  const medio = row.ingreso_3er_ano_clp ?? row.ingreso_4to_ano_clp ?? null
  const senior = row.ingreso_5to_ano_clp ?? row.ingreso_4to_ano_clp ?? null

  return {
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

export async function findOfficialSalaryForTitle(supabase: SupabaseLike, title: string): Promise<OfficialSalaryResult | null> {
  const tokens = tokenize(title)
  if (!tokens.length) return null

  const or = tokens
    .slice(0, 5)
    .map(t => `nombre_carrera_generica.ilike.%${t}%`)
    .join(',')

  const { data, error } = await supabase
    .from('career_stats')
    .select(`
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
    .filter((item: any) => item.score >= 6)
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
    const official = await findOfficialSalaryForTitle(supabase, String(career?.title || ''))
    if (!official) {
      const { salary_range: _discarded, ...withoutSalary } = career
      return {
        ...withoutSalary,
        salary_source: 'none',
        salary_label: 'Sin dato oficial SIES para esta recomendación',
      }
    }

    return {
      ...career,
      ...official,
    }
  }))

  return { ...result, variations: enriched }
}