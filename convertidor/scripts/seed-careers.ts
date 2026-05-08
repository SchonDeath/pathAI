/**
 * Script de pre-generación de carreras — KoraChile
 * Ejecutar: npx tsx scripts/seed-careers.ts
 *
 * Genera fichas de carreras con Groq y las guarda en Supabase.
 * Este script se corre UNA sola vez (o cuando quieras agregar más carreras).
 * En producción, la API solo lee de la tabla careers (sin IA en cada request).
 */

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
)

const GROQ_API_KEY = process.env.GROQ!

// Lista de carreras a pre-generar
const CAREERS_TO_GENERATE = [
  // 💻 Tecnología
  { title: 'Ingeniería en Informática', category: 'tecnología' },
  { title: 'Ingeniería Civil en Computación', category: 'tecnología' },
  { title: 'Ingeniería en Sistemas de Información', category: 'tecnología' },
  { title: 'Desarrollo de Software', category: 'tecnología' },
  { title: 'Diseño UX/UI', category: 'tecnología' },
  { title: 'Ciencia de Datos', category: 'tecnología' },
  { title: 'Ciberseguridad', category: 'tecnología' },
  { title: 'Inteligencia Artificial', category: 'tecnología' },
  { title: 'Ingeniería en Telecomunicaciones', category: 'tecnología' },
  { title: 'Técnico en Redes y Comunicaciones', category: 'tecnología' },
  { title: 'Técnico en Desarrollo de Apps', category: 'tecnología' },
  { title: 'Analista Programador', category: 'tecnología' },

  // 🏥 Salud
  { title: 'Medicina', category: 'salud' },
  { title: 'Odontología', category: 'salud' },
  { title: 'Enfermería', category: 'salud' },
  { title: 'Kinesiología', category: 'salud' },
  { title: 'Psicología', category: 'salud' },
  { title: 'Nutrición y Dietética', category: 'salud' },
  { title: 'Fonoaudiología', category: 'salud' },
  { title: 'Terapia Ocupacional', category: 'salud' },
  { title: 'Tecnología Médica', category: 'salud' },
  { title: 'Química y Farmacia', category: 'salud' },
  { title: 'Bioquímica', category: 'salud' },
  { title: 'Paramédico', category: 'salud' },
  { title: 'Técnico en Enfermería', category: 'salud' },
  { title: 'Técnico en Dental', category: 'salud' },

  // 📊 Negocios
  { title: 'Ingeniería Comercial', category: 'negocios' },
  { title: 'Contador Auditor', category: 'negocios' },
  { title: 'Marketing Digital', category: 'negocios' },
  { title: 'Administración de Empresas', category: 'negocios' },
  { title: 'Finanzas', category: 'negocios' },
  { title: 'Comercio Internacional', category: 'negocios' },
  { title: 'Recursos Humanos', category: 'negocios' },
  { title: 'Logística y Transporte', category: 'negocios' },
  { title: 'Gestión Turística', category: 'negocios' },
  { title: 'Gastronomía', category: 'negocios' },
  { title: 'Técnico en Administración', category: 'negocios' },
  { title: 'Técnico en Contabilidad', category: 'negocios' },

  // ⚖️ Derecho y Ciencias Sociales
  { title: 'Derecho', category: 'derecho' },
  { title: 'Trabajo Social', category: 'derecho' },
  { title: 'Sociología', category: 'derecho' },
  { title: 'Ciencia Política', category: 'derecho' },
  { title: 'Relaciones Internacionales', category: 'derecho' },
  { title: 'Antropología', category: 'derecho' },

  // 🏗️ Ingeniería
  { title: 'Ingeniería Civil', category: 'ingeniería' },
  { title: 'Ingeniería en Construcción', category: 'ingeniería' },
  { title: 'Ingeniería Mecánica', category: 'ingeniería' },
  { title: 'Ingeniería Eléctrica', category: 'ingeniería' },
  { title: 'Ingeniería Industrial', category: 'ingeniería' },
  { title: 'Ingeniería en Minas', category: 'ingeniería' },
  { title: 'Ingeniería Química', category: 'ingeniería' },
  { title: 'Ingeniería Ambiental', category: 'ingeniería' },
  { title: 'Ingeniería en Alimentos', category: 'ingeniería' },
  { title: 'Ingeniería Agrícola', category: 'ingeniería' },
  { title: 'Técnico en Electricidad', category: 'ingeniería' },
  { title: 'Técnico en Mecánica Automotriz', category: 'ingeniería' },
  { title: 'Técnico en Refrigeración y Climatización', category: 'ingeniería' },

  // 🎨 Arte, Diseño y Comunicación
  { title: 'Arquitectura', category: 'arte' },
  { title: 'Diseño Gráfico', category: 'arte' },
  { title: 'Diseño de Interiores', category: 'arte' },
  { title: 'Periodismo', category: 'arte' },
  { title: 'Publicidad', category: 'arte' },
  { title: 'Comunicación Audiovisual', category: 'arte' },
  { title: 'Producción Musical', category: 'arte' },
  { title: 'Actuación y Teatro', category: 'arte' },
  { title: 'Animación Digital', category: 'arte' },
  { title: 'Fotografía', category: 'arte' },

  // ⚗️ Ciencias
  { title: 'Biología', category: 'ciencias' },
  { title: 'Química', category: 'ciencias' },
  { title: 'Física', category: 'ciencias' },
  { title: 'Geología', category: 'ciencias' },
  { title: 'Astronomía', category: 'ciencias' },
  { title: 'Matemáticas', category: 'ciencias' },
  { title: 'Estadística', category: 'ciencias' },

  // 🌱 Agro y Medio Ambiente
  { title: 'Agronomía', category: 'ciencias' },
  { title: 'Medicina Veterinaria', category: 'salud' },
  { title: 'Ingeniería Forestal', category: 'ingeniería' },
  { title: 'Ingeniería en Recursos Naturales', category: 'ingeniería' },
  { title: 'Técnico Agrícola', category: 'ciencias' },

  // 📚 Educación
  { title: 'Pedagogía en Educación Básica', category: 'educación' },
  { title: 'Pedagogía en Matemáticas', category: 'educación' },
  { title: 'Pedagogía en Inglés', category: 'educación' },
  { title: 'Educación Parvularia', category: 'educación' },
  { title: 'Educación Física', category: 'educación' },
]

const CAREER_PROMPT = (title: string, category: string) => `
Genera una ficha completa de la carrera "${title}" (categoría: ${category}) para el mercado chileno.
Devuelve SOLO JSON válido, sin markdown, sin texto extra.

Estructura exacta:
{
  "slug": string (kebab-case, ej: "ingenieria-informatica"),
  "title": "${title}",
  "tagline": string (máx 80 caracteres),
  "description": string (2-3 oraciones sobre la carrera en Chile),
  "emoji": string (1 emoji representativo),
  "category": "${category}",
  "skills": string[5] (habilidades clave),
  "pros": string[3] (ventajas concretas),
  "cons": string[2] (desventajas reales),
  "salary_junior": number (en CLP, ej: 800000),
  "salary_mid": number (en CLP),
  "salary_senior": number (en CLP),
  "job_demand": "Alta"|"Media"|"Muy Alta"|"Baja",
  "personality_types": string[2] (tipos MBTI, ej: ["INTJ", "ENFP"]),
  "fun_facts": string[3] (datos curiosos reales de Chile),
  "match_keywords": string[8] (palabras clave para búsqueda, ej: ["programación", "software", "tech"]),
  "roadmap": [
    { "phase": "Fundación", "duration": "0-3 meses", "milestones": string[2], "theory": string[3] },
    { "phase": "Construcción", "duration": "3-9 meses", "milestones": string[2], "theory": string[3] },
    { "phase": "Primer trabajo", "duration": "9-18 meses", "milestones": string[2], "theory": string[2] }
  ],
  "books": [
    { "title": string, "author": string, "description": string, "emoji": string }
  ],
  "notable_people": [
    { "name": string, "role": string, "country": string, "contribution": string, "emoji": string }
  ],
  "curricula": [
    {
      "institution": string,
      "institution_type": "Universidad"|"Instituto"|"CFT"|"Online",
      "location": string,
      "program": string,
      "duration_semesters": number,
      "monthly_cost": number,
      "total_cost": number,
      "subjects": [
        { "semester": 1, "subjects": string[4] },
        { "semester": 2, "subjects": string[4] },
        { "semester": 3, "subjects": string[4] },
        { "semester": 4, "subjects": string[4] }
      ]
    }
  ]
}

Reglas:
- Salarios reales en CLP del mercado chileno actual
- Usar universidades chilenas reales: U. de Chile, PUC, USACH, DUOC, INACAP, UDP, UAI, CFTs
- Libros 100% reales y reconocidos
- Personas 100% reales con aporte concreto
- Exactamente 3 libros, 3 personas notables, 3 instituciones en curricula
`

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function generateCareer(title: string, category: string, attempt = 1): Promise<any> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 2500,  // reducido para respetar el límite de 12,000 TPM
      messages: [
        { role: 'user', content: CAREER_PROMPT(title, category) },
      ],
    }),
  })

  // Reintento automático en 429 (rate limit por minuto)
  if (res.status === 429) {
    if (attempt > 5) throw new Error('Groq 429 después de 5 intentos')
    const retryAfter = Number(res.headers.get('retry-after') || '15')
    const wait = Math.max(retryAfter, 15) * 1000
    process.stdout.write(` ⏸ esperando ${Math.ceil(wait/1000)}s...`)
    await sleep(wait)
    return generateCareer(title, category, attempt + 1)
  }

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq error ${res.status}: ${err}`)
  }

  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content || ''

  // Parseo robusto
  let cleaned = raw.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start !== -1 && end !== -1) cleaned = cleaned.slice(start, end + 1)

  return JSON.parse(cleaned)
}

async function saveCareer(career: any) {
  const { curricula: curriculaData, ...careerData } = career

  // Insertar o actualizar carrera
  const { data: inserted, error } = await supabase
    .from('careers')
    .upsert(careerData, { onConflict: 'slug' })
    .select('id')
    .single()

  if (error) throw new Error(`Supabase error: ${error.message}`)

  const careerId = inserted.id

  // Insertar mallas
  if (Array.isArray(curriculaData) && curriculaData.length > 0) {
    // Eliminar mallas anteriores de esta carrera
    await supabase.from('curricula').delete().eq('career_id', careerId)

    const curriculaRows = curriculaData.map((c: any) => ({
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

    const { error: currErr } = await supabase.from('curricula').insert(curriculaRows)
    if (currErr) console.warn(`  ⚠️  Curricula error: ${currErr.message}`)
  }
}

async function main() {
  console.log(`\n🚀 KoraChile — Script de pre-generación de carreras`)
  console.log(`📦 Total a generar: ${CAREERS_TO_GENERATE.length} carreras`)
  console.log(`⏱  Pausa entre carreras: 20s (límite Groq: 12,000 tokens/min)\n`)

  let success = 0
  const failedList: typeof CAREERS_TO_GENERATE = []

  for (let i = 0; i < CAREERS_TO_GENERATE.length; i++) {
    const { title, category } = CAREERS_TO_GENERATE[i]
    process.stdout.write(`[${i + 1}/${CAREERS_TO_GENERATE.length}] ${title}...`)
    try {
      const career = await generateCareer(title, category)
      await saveCareer(career)
      console.log(` ✅`)
      success++
    } catch (e: any) {
      console.log(` ❌ ${e.message.slice(0, 80)}`)
      failedList.push({ title, category })
    }
    // 20 segundos entre cada carrera = ~3 carreras/minuto = ~7,500 tokens/min (dentro del límite)
    if (i < CAREERS_TO_GENERATE.length - 1) await sleep(20000)
  }

  // Reintento de fallidas
  if (failedList.length > 0) {
    console.log(`\n🔁 Reintentando ${failedList.length} fallidas...\n`)
    await sleep(30000) // espera 30s extra antes de reintentar
    for (const { title, category } of failedList) {
      process.stdout.write(`  ↩ ${title}...`)
      try {
        const career = await generateCareer(title, category)
        await saveCareer(career)
        console.log(` ✅`)
        success++
      } catch (e: any) {
        console.log(` ❌ (saltando)`)
      }
      await sleep(20000)
    }
  }

  const finalFailed = CAREERS_TO_GENERATE.length - success
  console.log(`\n✨ Finalizado: ${success} exitosas, ${finalFailed} fallidas`)
  if (finalFailed > 0) console.log(`   Vuelve a ejecutar 'npm run seed' para reintentar las fallidas (usa upsert, no duplica).`)
}

main().catch(console.error)
