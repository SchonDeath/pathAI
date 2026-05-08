/**
 * seed-favicon-logos.ts
 *
 * Para instituciones sin logo_url pero con pagina_web,
 * descarga el favicon desde Google Favicon API, lo sube a
 * Supabase Storage (bucket institution-logos) y actualiza logo_url en BD.
 *
 * Uso:
 *   npx tsx convertidor/scripts/seed-favicon-logos.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), '.env')
    const raw = readFileSync(envPath, 'utf-8')
    for (const line of raw.split('\n')) {
      const [key, ...rest] = line.split('=')
      if (key && rest.length && !process.env[key.trim()]) {
        process.env[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '')
      }
    }
  } catch { /* sin .env */ }
}
loadEnv()

const SUPABASE_URL = (
  process.env.SUPABASE_URL ||
  process.env.NUXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL || ''
)
const SUPABASE_KEY = (
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY || ''
)
const BUCKET = 'institution-logos'

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Falta SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

function extractDomain(raw: string): string {
  return raw
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .trim()
}

async function downloadFavicon(domain: string): Promise<{ buffer: Buffer; ext: string } | null> {
  const url = `https://www.google.com/s2/favicons?sz=128&domain=${domain}`
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!res.ok) return null
    const ct = res.headers.get('content-type') || 'image/png'
    if (!ct.startsWith('image/')) return null

    const buffer = Buffer.from(await res.arrayBuffer())
    // Rechazar el favicon genérico de Google (16x16 fallback, ~222 bytes)
    if (buffer.length < 500) return null

    const ext = ct.includes('svg') ? 'svg' : ct.includes('webp') ? 'webp' : ct.includes('png') ? 'png' : 'jpg'
    return { buffer, ext }
  } catch {
    return null
  }
}

async function main() {
  console.log('KoraChile -- seed-favicon-logos')
  console.log('Supabase:', SUPABASE_URL)

  // Cargar instituciones sin logo_url pero con pagina_web
  const { data: institutions, error } = await supabase
    .from('institutions')
    .select('institution_code, nombre_institucion, pagina_web')
    .is('logo_url', null)
    .not('pagina_web', 'is', null)

  if (error || !institutions?.length) {
    console.error('No se pudo leer instituciones:', error?.message ?? 'Lista vacía')
    process.exit(1)
  }

  console.log(`\nInstituciones a procesar: ${institutions.length}\n`)

  let ok = 0, skip = 0

  for (let i = 0; i < institutions.length; i++) {
    const inst = institutions[i]
    const domain = extractDomain(inst.pagina_web!)
    const prefix = `[${String(i + 1).padStart(3)}/${institutions.length}]`
    const label = inst.nombre_institucion.slice(0, 45).padEnd(45)
    process.stdout.write(`${prefix} ${label} (${domain}) ... `)

    const favicon = await downloadFavicon(domain)
    if (!favicon) {
      console.log('SKIP (sin favicon válido)')
      skip++
      // Pequeña pausa para no saturar a Google
      await new Promise(r => setTimeout(r, 80))
      continue
    }

    const path = `logos/${inst.institution_code}-${slugify(inst.nombre_institucion)}.${favicon.ext}`
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, favicon.buffer, { contentType: `image/${favicon.ext}`, upsert: true, cacheControl: '2592000' })

    if (upErr) {
      console.log(`FAIL (storage: ${upErr.message})`)
      skip++
      await new Promise(r => setTimeout(r, 80))
      continue
    }

    const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl

    const { error: updErr } = await supabase
      .from('institutions')
      .update({ logo_url: publicUrl })
      .eq('institution_code', inst.institution_code)

    if (updErr) {
      console.log(`FAIL (db: ${updErr.message})`)
      skip++
    } else {
      console.log('OK')
      ok++
    }

    await new Promise(r => setTimeout(r, 120))
  }

  console.log(`\nResultado: ${ok} logos guardados, ${skip} sin imagen válida`)
  console.log('Proceso completado.')
}

main().catch(console.error)
