/**
 * Script de importación desde archivo JSON — KoraChile
 * Ejecutar: npx tsx scripts/import-careers.ts
 *
 * Lee el archivo scripts/careers-data.json y lo sube a Supabase.
 * Genera ese archivo con ChatGPT, Claude o Gemini (ver prompt abajo).
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'
import 'dotenv/config'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
)

// Lee el archivo generado por la IA
const filePath = join(process.cwd(), 'scripts', 'careers-data.json')
let careers: any[]

try {
  const raw = readFileSync(filePath, 'utf-8')
  const parsed = JSON.parse(raw)
  // Acepta tanto un array directo como { careers: [...] }
  careers = Array.isArray(parsed) ? parsed : parsed.careers
  if (!Array.isArray(careers)) throw new Error('El JSON debe ser un array o { careers: [] }')
} catch (e: any) {
  console.error(`❌ No se pudo leer scripts/careers-data.json: ${e.message}`)
  console.error(`\n📋 Crea ese archivo con una IA usando el prompt de abajo.\n`)
  printPrompt()
  process.exit(1)
}

async function importCareer(career: any) {
  const { curricula: curriculaData, ...careerData } = career

  const { data: inserted, error } = await supabase
    .from('careers')
    .upsert(careerData, { onConflict: 'slug' })
    .select('id')
    .single()

  if (error) throw new Error(`Supabase: ${error.message}`)

  const careerId = inserted.id

  if (Array.isArray(curriculaData) && curriculaData.length > 0) {
    await supabase.from('curricula').delete().eq('career_id', careerId)

    const rows = curriculaData.map((c: any) => ({
      career_id: careerId,
      institution: c.institution,
      institution_type: c.institution_type,
      location: c.location,
      program: c.program,
      duration_semesters: c.duration_semesters,
      monthly_cost: c.monthly_cost,
      total_cost: c.total_cost,
      subjects: c.subjects,
    }))

    const { error: currErr } = await supabase.from('curricula').insert(rows)
    if (currErr) console.warn(`  ⚠️  Curricula: ${currErr.message}`)
  }
}

async function main() {
  console.log(`\n🚀 KoraChile — Importando desde careers-data.json`)
  console.log(`📦 Carreras encontradas: ${careers.length}\n`)

  let success = 0
  let failed = 0

  for (let i = 0; i < careers.length; i++) {
    const career = careers[i]
    const name = career.title || career.slug || `carrera-${i}`
    process.stdout.write(`[${i + 1}/${careers.length}] ${name}...`)
    try {
      await importCareer(career)
      console.log(` ✅`)
      success++
    } catch (e: any) {
      console.log(` ❌ ${e.message}`)
      failed++
    }
  }

  console.log(`\n✨ Finalizado: ${success} importadas, ${failed} fallidas`)
}

function printPrompt() {
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`PROMPT PARA CHATGPT / CLAUDE / GEMINI:`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`
Genera un archivo JSON con fichas de las siguientes carreras chilenas.
Devuelve SOLO un JSON válido (array), sin texto extra ni markdown.

Carreras: [pega aquí la lista]

Estructura de cada carrera:
{
  "slug": "ingenieria-informatica",
  "title": "Ingeniería en Informática",
  "tagline": "Frase corta descriptiva (máx 80 chars)",
  "description": "2-3 oraciones sobre la carrera en Chile",
  "emoji": "💻",
  "category": "tecnología",
  "skills": ["habilidad1", "habilidad2", "habilidad3", "habilidad4", "habilidad5"],
  "pros": ["ventaja1", "ventaja2", "ventaja3"],
  "cons": ["desventaja1", "desventaja2"],
  "salary_junior": 900000,
  "salary_mid": 1500000,
  "salary_senior": 2500000,
  "job_demand": "Alta",
  "personality_types": ["INTJ", "ENTP"],
  "fun_facts": ["dato1", "dato2", "dato3"],
  "match_keywords": ["kw1", "kw2", "kw3", "kw4", "kw5", "kw6", "kw7", "kw8"],
  "roadmap": [
    { "phase": "Fundación", "duration": "0-3 meses", "milestones": ["m1", "m2"], "theory": ["t1", "t2", "t3"] },
    { "phase": "Construcción", "duration": "3-9 meses", "milestones": ["m1", "m2"], "theory": ["t1", "t2", "t3"] },
    { "phase": "Primer trabajo", "duration": "9-18 meses", "milestones": ["m1", "m2"], "theory": ["t1", "t2"] }
  ],
  "books": [
    { "title": "Título real", "author": "Autor real", "description": "Descripción", "emoji": "📖" },
    { "title": "...", "author": "...", "description": "...", "emoji": "..." },
    { "title": "...", "author": "...", "description": "...", "emoji": "..." }
  ],
  "notable_people": [
    { "name": "Nombre real", "role": "Cargo", "country": "Chile", "contribution": "Aporte", "emoji": "👤" },
    { "name": "...", "role": "...", "country": "...", "contribution": "...", "emoji": "..." },
    { "name": "...", "role": "...", "country": "...", "contribution": "...", "emoji": "..." }
  ],
  "curricula": [
    {
      "institution": "Universidad de Chile",
      "institution_type": "Universidad",
      "location": "Santiago",
      "program": "Ingeniería en Informática",
      "duration_semesters": 10,
      "monthly_cost": 350000,
      "total_cost": 3500000,
      "subjects": [
        { "semester": 1, "subjects": ["Cálculo I", "Álgebra", "Programación I", "Inglés"] },
        { "semester": 2, "subjects": ["Cálculo II", "Programación II", "Estructuras de Datos", "Física"] },
        { "semester": 3, "subjects": ["Base de Datos", "Redes", "Sistemas Operativos", "Estadística"] },
        { "semester": 4, "subjects": ["Ingeniería de Software", "Arquitectura", "IA", "Proyecto"] }
      ]
    },
    { ... segunda institución ... },
    { ... tercera institución (puede ser DUOC, INACAP o CFT) ... }
  ]
}

Reglas:
- Salarios reales en CLP del mercado chileno 2025
- Usar instituciones chilenas reales: U. de Chile, PUC, USACH, DUOC, INACAP, UDP, UAI, CFTs
- job_demand solo puede ser: "Alta", "Media", "Muy Alta" o "Baja"
- institution_type solo puede ser: "Universidad", "Instituto", "CFT" u "Online"
- Exactamente 3 libros, 3 personas notables, 3 instituciones por carrera
- Libros y personas deben ser 100% reales
`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
}

main().catch(console.error)
