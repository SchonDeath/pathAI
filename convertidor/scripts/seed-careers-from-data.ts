import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

type ProgramRow = {
  nombre_carrera: string | null
  area_conocimiento: string | null
  career_generic_id: string | null
}

type CareerStat = {
  career_generic_id: string
  ingreso_promedio: number | null
  empleabilidad: number | null
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!,
)

function normalize(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function mapCategory(area: string): string {
  const a = normalize(area)
  if (a.includes('tecn') || a.includes('comput') || a.includes('informat')) return 'tecnologia'
  if (a.includes('salud') || a.includes('medic')) return 'salud'
  if (a.includes('derecho') || a.includes('social')) return 'derecho'
  if (a.includes('negocio') || a.includes('admin') || a.includes('comerc')) return 'negocios'
  if (a.includes('educ')) return 'educacion'
  if (a.includes('arte') || a.includes('diseno') || a.includes('comunic')) return 'arte'
  if (a.includes('ingenier')) return 'ingenieria'
  return 'ciencias'
}

function emojiForCategory(category: string): string {
  const map: Record<string, string> = {
    tecnologia: '💻',
    salud: '🏥',
    negocios: '📊',
    arte: '🎨',
    ciencias: '⚗️',
    derecho: '⚖️',
    ingenieria: '🏗️',
    educacion: '📚',
  }
  return map[category] || '🎯'
}

function demandFromEmployability(value: number | null): 'Muy Alta' | 'Alta' | 'Media' | 'Baja' {
  const v = value ?? 0
  if (v >= 85) return 'Muy Alta'
  if (v >= 75) return 'Alta'
  if (v >= 60) return 'Media'
  return 'Baja'
}

function median(values: number[]): number | null {
  if (!values.length) return null
  const arr = [...values].sort((a, b) => a - b)
  const m = Math.floor(arr.length / 2)
  if (arr.length % 2 === 0) return Math.round((arr[m - 1] + arr[m]) / 2)
  return Math.round(arr[m])
}

function inferKeywords(name: string, area: string, tipo: string, category: string): string[] {
  const words = normalize(name)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .filter(w => w.length > 2)

  const base = new Set<string>([
    ...words,
    normalize(area),
    normalize(tipo),
    category,
  ])

  return [...base].slice(0, 10)
}

function slugify(text: string): string {
  return normalize(text)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function fetchAllPrograms(): Promise<ProgramRow[]> {
  const pageSize = 1000
  let from = 0
  const all: ProgramRow[] = []

  while (true) {
    const to = from + pageSize - 1
    const { data, error } = await supabase
      .from('programs')
      .select('nombre_carrera,area_conocimiento,career_generic_id')
      .not('nombre_carrera', 'is', null)
      .range(from, to)

    if (error) throw new Error(`programs: ${error.message}`)
    if (!data?.length) break

    all.push(...(data as ProgramRow[]))
    if (data.length < pageSize) break
    from += pageSize
  }

  return all
}

async function fetchAllCareerStats(): Promise<CareerStat[]> {
  const pageSize = 1000
  let from = 0
  const all: CareerStat[] = []

  while (true) {
    const to = from + pageSize - 1
    const { data, error } = await supabase
      .from('career_stats')
      .select('career_generic_id,ingreso_promedio,empleabilidad')
      .not('career_generic_id', 'is', null)
      .range(from, to)

    if (error) throw new Error(`career_stats: ${error.message}`)
    if (!data?.length) break

    all.push(...(data as CareerStat[]))
    if (data.length < pageSize) break
    from += pageSize
  }

  return all
}

async function main() {
  console.log('\nSeed sin IA: poblando careers desde OFERTA ACADEMICA (programs)...')

  const [programRows, statRows] = await Promise.all([
    fetchAllPrograms(),
    fetchAllCareerStats(),
  ])

  if (!programRows.length) {
    console.log('No hay filas en programs. Ejecuta primero: npm run data:import-resultado-json-2026')
    return
  }

  const statsByGeneric = new Map<string, CareerStat[]>()
  for (const row of statRows) {
    const key = row.career_generic_id
    const list = statsByGeneric.get(key) || []
    list.push(row)
    statsByGeneric.set(key, list)
  }

  // Dedupe por nombre de carrera normalizado (una sola ficha por carrera).
  const groups = new Map<string, {
    title: string
    area: string
    genericIds: Set<string>
    count: number
  }>()

  for (const p of programRows) {
    const rawTitle = (p.nombre_carrera || '').trim()
    if (!rawTitle) continue

    const key = normalize(rawTitle)
    const existing = groups.get(key)

    if (existing) {
      existing.count++
      // Mantener variante más legible (más larga suele tener mejor detalle/acento)
      if (rawTitle.length > existing.title.length) existing.title = rawTitle
      if (!existing.area && p.area_conocimiento) existing.area = p.area_conocimiento
      if (p.career_generic_id) existing.genericIds.add(p.career_generic_id)
    } else {
      groups.set(key, {
        title: rawTitle,
        area: p.area_conocimiento || 'General',
        genericIds: new Set(p.career_generic_id ? [p.career_generic_id] : []),
        count: 1,
      })
    }
  }

  const slugUsed = new Set<string>()

  const careers = [...groups.values()].map((g) => {
    const category = mapCategory(g.area)
    const emoji = emojiForCategory(category)
    const stats = [...g.genericIds].flatMap((id) => statsByGeneric.get(id) || [])

    const incomes = stats
      .map(s => Number(s.ingreso_promedio))
      .filter(v => Number.isFinite(v) && v > 0)

    const employabilityValues = stats
      .map(s => Number(s.empleabilidad))
      .filter(v => Number.isFinite(v) && v >= 0)

    const salaryMid = median(incomes)
    const salaryJunior = salaryMid ? Math.round(salaryMid * 0.75) : null
    const salarySenior = salaryMid ? Math.round(salaryMid * 1.35) : null

    const employabilityAvg = employabilityValues.length
      ? employabilityValues.reduce((a, b) => a + b, 0) / employabilityValues.length
      : null

    const jobDemand = demandFromEmployability(employabilityAvg)
    const title = g.title

    let slug = slugify(title)
    if (!slug) slug = `carrera-${Math.random().toString(36).slice(2, 8)}`
    if (slugUsed.has(slug)) slug = `${slug}-${category}`
    slugUsed.add(slug)

    return {
      slug,
      title,
      tagline: `${title} en Chile`,
      description: `Carrera del área ${g.area}. Datos consolidados desde oferta académica oficial y SIES/MiFuturo para orientación inicial.`,
      emoji,
      category,
      skills: [],
      pros: [],
      cons: [],
      salary_junior: salaryJunior,
      salary_mid: salaryMid,
      salary_senior: salarySenior,
      job_demand: jobDemand,
      personality_types: [],
      fun_facts: [],
      roadmap: [],
      books: [],
      notable_people: [],
      match_keywords: inferKeywords(title, g.area, 'general', category),
    }
  })

  const batchSize = 500
  let inserted = 0

  for (let i = 0; i < careers.length; i += batchSize) {
    const chunk = careers.slice(i, i + batchSize)
    const { error } = await supabase
      .from('careers')
      .upsert(chunk, { onConflict: 'slug' })

    if (error) throw new Error(`upsert careers: ${error.message}`)
    inserted += chunk.length
    console.log(`Upsert: ${inserted}/${careers.length}`)
  }

  console.log(`\nOK. careers poblada con ${careers.length} filas (upsert por slug).`)
}

main().catch((e) => {
  console.error('Seed sin IA falló:', e.message)
  process.exit(1)
})
