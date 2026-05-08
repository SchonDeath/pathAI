/**
 * scripts/generate-embeddings.ts
 *
 * Genera embeddings vectoriales (384d) para institutions, career_generic y programs
 * usando el modelo local `Xenova/paraphrase-multilingual-MiniLM-L12-v2` ($0, sin API key).
 *
 * Primera vez: descarga el modelo ~120MB y lo cachea en node_modules/.cache/
 * Corridas siguientes: solo procesa filas con embedding IS NULL → seguro de re-ejecutar.
 *
 * Uso:
 *   npx tsx scripts/generate-embeddings.ts
 *   npx tsx scripts/generate-embeddings.ts --table institutions   (solo una tabla)
 *   npx tsx scripts/generate-embeddings.ts --reset                (re-genera todo)
 *
 * Estrategia de texto por tabla:
 *   institutions  → "nombre_institucion | tipo | direccion | acreditacion_anos años"
 *   career_generic → "nombre_carrera_generica | area | tipo_institucion"
 *   programs      → "nombre_carrera | nombre_institucion | sede | region | jornada | nivel"
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { pipeline, type FeatureExtractionPipeline } from '@xenova/transformers'

// ── Config ────────────────────────────────────────────────────
const SUPABASE_URL        = process.env.VITE_SUPABASE_URL        || process.env.SUPABASE_URL        || process.env.NUXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NUXT_SUPABASE_SERVICE_KEY!
const MODEL               = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2'
const BATCH_SIZE          = 32   // filas por batch de embed (ajusta según RAM)

const args    = process.argv.slice(2)
const TABLE   = args.find(a => a.startsWith('--table='))?.split('=')[1] ?? null
const RESET   = args.includes('--reset')

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌  Faltan variables de entorno SUPABASE_URL y SUPABASE_SERVICE_KEY')
  console.error('   Crea un archivo .env con esas dos variables.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// ── Texto representativo por tabla ───────────────────────────
function textForInstitution(row: any): string {
  const parts = [
    row.nombre_institucion,
    row.tipo_institucion,
    row.direccion_sede_central,
    row.acreditacion_anos ? `${row.acreditacion_anos} años acreditación` : null,
    row.matricula_pregrado_actual ? `${row.matricula_pregrado_actual} matriculados` : null,
  ]
  return parts.filter(Boolean).join(' | ')
}

function textForCareerGeneric(row: any): string {
  return [row.nombre_carrera_generica, row.area, row.tipo_institucion]
    .filter(Boolean).join(' | ')
}

function textForProgram(row: any): string {
  return [
    row.nombre_carrera,
    row.nombre_institucion,
    row.nombre_sede,
    row.region,
    row.jornada,
    row.nivel_carrera,
    row.area_carrera_generica,
  ].filter(Boolean).join(' | ')
}

// ── Embed en batches ─────────────────────────────────────────
async function embedBatch(
  embedder: FeatureExtractionPipeline,
  texts: string[],
): Promise<number[][]> {
  const output = await embedder(texts, { pooling: 'mean', normalize: true })
  // output.data es Float32Array con (n * 384) elementos
  const dim = 384
  const vectors: number[][] = []
  for (let i = 0; i < texts.length; i++) {
    vectors.push(Array.from(output.data.slice(i * dim, (i + 1) * dim) as Float32Array))
  }
  return vectors
}

// ── Procesar una tabla ────────────────────────────────────────
async function processTable(
  embedder: FeatureExtractionPipeline,
  tableName: 'institutions' | 'career_generic' | 'programs',
  idColumn: string,
  textFn: (row: any) => string,
  selectCols: string,
) {
  console.log(`\n📦  Procesando tabla: ${tableName}`)

  if (RESET) {
    console.log('   ⚠️  --reset: limpiando embeddings existentes...')
    await supabase.from(tableName).update({ embedding: null } as any).neq(idColumn, '')
  }

  // Contar filas pendientes
  const countQuery = supabase
    .from(tableName)
    .select(idColumn, { count: 'exact', head: true })
    .is('embedding', null)

  const { count, error: countError } = await countQuery
  if (countError) {
    console.warn(`   ⚠️ No se pudo obtener count exacto: ${countError.message}`)
  }

  console.log(`   ${count ?? '?'} filas sin embedding`)
  if (count === 0) return

  let processed = 0

  while (true) {
    // Siempre leemos el primer batch pendiente. Usar offset sobre un conjunto
    // que se va achicando al actualizar `embedding` hace que se salten filas.
    let q = supabase
      .from(tableName)
      .select(selectCols)
      .is('embedding', null)
      .range(0, BATCH_SIZE - 1)

    const { data: rows, error } = await q as any

    if (error) {
      console.error(`   ❌ Error al leer:`, error.message)
      break
    }
    if (!rows?.length) break

    // Generar textos y embeddings
    const texts   = rows.map(textFn)
    const vectors = await embedBatch(embedder, texts)

    // UPDATE por id (una llamada por fila, pero con Promise.all en paralelo).
    // Usamos UPDATE y no upsert porque upsert intentaría INSERT con campos NOT NULL nulos.
    await Promise.all(
      rows.map((row: any, j: number) => {
        const vec = `[${vectors[j]!.join(',')}]`
        return supabase
          .from(tableName)
          .update({ embedding: vec } as any)
          .eq(idColumn, row[idColumn])
          .then(({ error: updErr }: any) => {
            if (updErr) {
              console.error(`   ❌ Error al actualizar ${row[idColumn]}:`, updErr.message)
            }
          })
      }),
    )

    processed += rows.length
    process.stdout.write(`   ✅  ${processed}/${count} procesadas\r`)
  }

  console.log(`\n   ✔️  ${tableName} listo (${processed} embeddings generados)`)
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  console.log('🤖  Cargando modelo multilingual-e5-small (primera vez ~120MB)...')
  const embedder = await pipeline('feature-extraction', MODEL) as FeatureExtractionPipeline
  console.log('✅  Modelo listo\n')

  const tables: Array<{
    name: 'institutions' | 'career_generic' | 'programs'
    id: string
    cols: string
    fn: (r: any) => string
  }> = [
    {
      name: 'institutions',
      id:   'institution_code',
      cols: 'institution_code, nombre_institucion, tipo_institucion, direccion_sede_central, acreditacion_anos, matricula_pregrado_actual',
      fn:   textForInstitution,
    },
    {
      name: 'career_generic',
      id:   'id',
      cols: 'id, nombre_carrera_generica, area, tipo_institucion',
      fn:   textForCareerGeneric,
    },
    {
      name: 'programs',
      id:   'program_unique_code',
      cols: 'program_unique_code, nombre_carrera, nombre_institucion, nombre_sede, region, jornada, nivel_carrera, area_carrera_generica',
      fn:   textForProgram,
    },
  ]

  const toProcess = TABLE
    ? tables.filter(t => t.name === TABLE)
    : tables

  if (!toProcess.length) {
    console.error(`❌  Tabla "${TABLE}" no válida. Opciones: institutions, career_generic, programs`)
    process.exit(1)
  }

  for (const t of toProcess) {
    await processTable(embedder, t.name, t.id, t.fn, t.cols)
  }

  console.log('\n🎉  Embeddings generados. Ya puedes usar search_hybrid en tu API.')
}

main().catch(err => {
  console.error('Error fatal:', err)
  process.exit(1)
})
