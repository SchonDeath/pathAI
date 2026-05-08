import { createClient } from '@supabase/supabase-js'
import { readFileSync, mkdirSync, existsSync } from 'fs'
import { resolve } from 'path'

// Cargar .env
try {
  const raw = readFileSync(resolve(process.cwd(), '.env'), 'utf-8')
  for (const line of raw.split('\n')) {
    const [key, ...rest] = line.split('=')
    if (key?.trim() && rest.length && !process.env[key.trim()])
      process.env[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '')
  }
} catch { /* sin .env */ }

const sb = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!,
)

const { data: instituciones, error } = await sb
  .from('institutions')
  .select('institution_code, nombre_institucion')
  .order('nombre_institucion')

if (error) { console.error('Error BD:', error.message); process.exit(1) }

// Traer TODOS los programas paginando de a 1000
const programas: { institution_code: number, nombre_carrera: string, sede: string, jornada: string, program_unique_code: string }[] = []
let from = 0
const PAGE = 1000
while (true) {
  const { data: page, error: err2 } = await sb
    .from('programs')
    .select('institution_code, nombre_carrera, sede, jornada, modalidad, program_unique_code')
    .order('nombre_carrera')
    .range(from, from + PAGE - 1)
  if (err2) { console.error('Error programas:', err2.message); process.exit(1) }
  if (!page?.length) break
  programas.push(...page)
  if (page.length < PAGE) break
  from += PAGE
}

const progsByInst = new Map<number, typeof programas>()
for (const p of programas ?? []) {
  const arr = progsByInst.get(p.institution_code) ?? []
  arr.push(p)
  progsByInst.set(p.institution_code, arr)
}

function safeName(s: string) {
  return s.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim()
}

let instCreadas = 0
let carrerasCreadas = 0

for (const inst of instituciones ?? []) {
  const instDir = resolve(process.cwd(), 'convertidor', 'mallas', `${inst.institution_code} - ${safeName(inst.nombre_institucion)}`)
  if (!existsSync(instDir)) { mkdirSync(instDir, { recursive: true }); instCreadas++ }

  const progs = progsByInst.get(inst.institution_code) ?? []
  for (const p of progs) {
    // Nombre de la carpeta: "nombre_carrera - modalidad - jornada - sede"
    const partes = [safeName(p.nombre_carrera)]
    if (p.modalidad) partes.push(safeName(p.modalidad))
    if (p.jornada) partes.push(safeName(p.jornada))
    if (p.sede) partes.push(safeName(p.sede))
    const carreraDir = resolve(instDir, partes.join(' - '))
    if (!existsSync(carreraDir)) { mkdirSync(carreraDir, { recursive: true }); carrerasCreadas++ }
  }
}

console.log(`✅  Instituciones nuevas: ${instCreadas}`)
console.log(`✅  Carpetas de carreras creadas: ${carrerasCreadas}`)
console.log(`📁  Total programas: ${programas?.length ?? 0}`)
