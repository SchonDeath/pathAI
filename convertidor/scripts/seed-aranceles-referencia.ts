/**
 * seed-aranceles-referencia.ts
 *
 * Importa aranceles de referencia MINEDUC 2026 a la tabla `programs`.
 * Lee los JSON generados por aranceles_referencia_to_json.py y hace
 * UPDATE por program_unique_code.
 *
 * Uso:
 *   npx tsx convertidor/scripts/seed-aranceles-referencia.ts
 *
 * Requisitos:
 *   - Haber ejecutado primero el script Python para generar los JSON:
 *     convertidor/scripts/resultados_scripts/aranceles_referencia_becas.json
 *     convertidor/scripts/resultados_scripts/aranceles_referencia_creditos.json
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import 'dotenv/config'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!,
)

const DATA_DIR = resolve(process.cwd(), 'convertidor/scripts/resultados_scripts')
const CHUNK_SIZE = 200
const DATASET_VERSION = 'SIES_2025_2026'

interface ArancelRecord {
  program_unique_code: string
  arancel_referencia_becas?: number | null
  arancel_referencia_creditos?: number | null
}

function loadJson(filename: string): any[] {
  const path = resolve(DATA_DIR, filename)
  try {
    const raw = readFileSync(path, 'utf-8')
    return JSON.parse(raw)
  } catch (e: any) {
    throw new Error(`No se pudo leer ${path}: ${e.message}`)
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

async function updateChunk(
  updates: Array<{ program_unique_code: string; patch: Record<string, number | null> }>
) {
  // UPDATE bulk via función PostgreSQL — evita el problema de NOT NULL en upsert
  const records = updates.map(({ program_unique_code, patch }) => ({
    program_unique_code,
    ...patch,
  }))

  const { error } = await supabase.rpc('bulk_update_aranceles', {
    records: records,
  })

  if (error) throw new Error(`rpc error: ${error.message}`)
}

async function main() {
  console.log('=== Seed aranceles de referencia MINEDUC 2026 ===\n')

  // ── 1. Cargar JSONs ────────────────────────────────────────────────────
  console.log('Cargando aranceles_referencia_becas.json...')
  const becasData: any[] = loadJson('aranceles_referencia_becas.json')
  console.log(`  ${becasData.length} registros de becas\n`)

  console.log('Cargando aranceles_referencia_creditos.json...')
  const creditosData: any[] = loadJson('aranceles_referencia_creditos.json')
  console.log(`  ${creditosData.length} registros de créditos\n`)

  // ── 2. Combinar por program_unique_code ───────────────────────────────
  const merged = new Map<string, { arancel_referencia_becas?: number | null; arancel_referencia_creditos?: number | null }>()

  for (const row of becasData) {
    const code = row.program_unique_code
    if (!code) continue
    merged.set(code, { arancel_referencia_becas: row.arancel_referencia_becas ?? null })
  }

  for (const row of creditosData) {
    const code = row.program_unique_code
    if (!code) continue
    const existing = merged.get(code) ?? {}
    merged.set(code, { ...existing, arancel_referencia_creditos: row.arancel_referencia_creditos ?? null })
  }

  const updates = Array.from(merged.entries())
    .filter(([, patch]) => patch.arancel_referencia_becas !== undefined || patch.arancel_referencia_creditos !== undefined)
    .map(([program_unique_code, patch]) => ({ program_unique_code, patch }))

  console.log(`Total programas a actualizar: ${updates.length}`)

  // ── 3. Verificar cuántos existen en la BD ─────────────────────────────
  const codes = updates.map(u => u.program_unique_code)
  const { count: existingCount, error: countError } = await supabase
    .from('programs')
    .select('program_unique_code', { count: 'exact', head: true })
    .in('program_unique_code', codes.slice(0, 1000)) // primera muestra
    .eq('dataset_version', DATASET_VERSION)

  if (countError) {
    console.warn('No se pudo verificar existencia:', countError.message)
  } else {
    console.log(`  Muestra (primeros 1000): ${existingCount} programas encontrados en BD\n`)
  }

  // ── 4. Actualizar en chunks ────────────────────────────────────────────
  const chunks = chunkArray(updates, CHUNK_SIZE)
  let totalOk = 0
  let totalErr = 0

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    process.stdout.write(`  Chunk ${i + 1}/${chunks.length} (${chunk.length} registros)... `)
    try {
      await updateChunk(chunk)
      totalOk += chunk.length
      process.stdout.write('OK\n')
    } catch (e: any) {
      totalErr += chunk.length
      process.stdout.write(`ERROR: ${e.message}\n`)
    }
  }

  // ── 5. Resumen ────────────────────────────────────────────────────────
  console.log(`\n✓ Completado: ${totalOk} OK · ${totalErr} errores`)

  // ── 6. Verificación rápida ────────────────────────────────────────────
  const { data: sample } = await supabase
    .from('programs')
    .select('program_unique_code, nombre_carrera, arancel_anual, arancel_referencia_becas, arancel_referencia_creditos, brecha_arancel_becas')
    .not('arancel_referencia_becas', 'is', null)
    .eq('dataset_version', DATASET_VERSION)
    .limit(5)

  if (sample?.length) {
    console.log('\nMuestra de 5 programas actualizados:')
    for (const p of sample) {
      const cobertura = p.arancel_referencia_becas && p.arancel_anual
        ? Math.round((p.arancel_referencia_becas / p.arancel_anual) * 100)
        : null
      console.log(
        `  ${p.program_unique_code} | ${p.nombre_carrera?.slice(0, 40).padEnd(40)} | ` +
        `Real: $${(p.arancel_anual ?? 0).toLocaleString()} | ` +
        `Ref_becas: $${(p.arancel_referencia_becas ?? 0).toLocaleString()} | ` +
        `Brecha: $${(p.brecha_arancel_becas ?? 0).toLocaleString()} | ` +
        `Cobertura: ${cobertura ?? '?'}%`
      )
    }
  } else {
    console.log('\n[WARN] No se encontraron programas actualizados. Verifica que los program_unique_code coincidan.')
  }
}

main().catch(e => {
  console.error('\n[FATAL]', e.message)
  process.exit(1)
})
