/**
 * scrape-institution-logos.ts
 *
 * Extrae logos desde acceso.mineduc.cl/admision-especial/ (CDN oficial MINEDUC)
 * Los sube a Supabase Storage y actualiza logo_url en la tabla institutions.
 *
 * Estructura HTML:
 *   <img loading="lazy" src="https://cdnaccesoeducacion.mineduc.cl/logos_instituciones/86.png"
 *        alt="Pontificia Universidad Católica de Chile" ...>
 *
 * Uso:
 *   npx tsx convertidor/scripts/scrape-institution-logos.ts
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
const SOURCE_URL = 'https://acceso.mineduc.cl/admision-especial/'

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Falta SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function getAttr(tag: string, attr: string): string {
  const m = tag.match(new RegExp(attr + '="([^"]*)"', 'i'))
  return m?.[1] ?? ''
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
}

function similarity(a: string, b: string): number {
  const na = normalize(a); const nb = normalize(b)
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.9
  const wa = new Set(na.split(' ')); const wb = new Set(nb.split(' '))
  const inter = [...wa].filter(w => wb.has(w)).length
  return inter / new Set([...wa, ...wb]).size
}

function slugify(s: string): string {
  return normalize(s).replace(/\s+/g, '-').slice(0, 60)
}

interface LogoItem { name: string; imgUrl: string }

async function scrapeLogos(): Promise<LogoItem[]> {
  console.log('\n Descargando', SOURCE_URL, '...')
  const res = await fetch(SOURCE_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', Accept: 'text/html' }
  })
  if (!res.ok) throw new Error('HTTP ' + res.status)
  const html = await res.text()
  const logos: LogoItem[] = []
  const re = /<img\s[^>]+>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const tag = m[0]
    const src = getAttr(tag, 'src')
    const alt = getAttr(tag, 'alt')
    if (!src.includes('cdnaccesoeducacion.mineduc.cl/logos_instituciones')) continue
    if (!alt) continue
    logos.push({ name: alt, imgUrl: src.startsWith('http') ? src : new URL(src, SOURCE_URL).href })
  }
  const unique = [...new Map(logos.map(l => [l.imgUrl, l])).values()]
  console.log('   Encontradas', unique.length, 'imagenes desde CDN MINEDUC')
  return unique
}

async function uploadLogo(name: string, imgUrl: string): Promise<string | null> {
  try {
    const res = await fetch(imgUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!res.ok) return null
    const ct = res.headers.get('content-type') || 'image/png'
    if (!ct.startsWith('image/')) return null
    const ext = ct.includes('svg') ? 'svg' : ct.includes('webp') ? 'webp' : ct.includes('png') ? 'png' : 'jpg'
    const cdnId = imgUrl.match(/\/(\d+)\.\w+$/)?.[1] ?? slugify(name)
    const path = 'logos/' + cdnId + '-' + slugify(name) + '.' + ext
    const buffer = Buffer.from(await res.arrayBuffer())
    const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType: ct, upsert: true, cacheControl: '2592000' })
    if (error) { console.warn('   Storage:', error.message); return null }
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
  } catch { return null }
}

async function updateDB(logos: LogoItem[], uploaded: Map<string, string>) {
  const { data: institutions, error } = await supabase.from('institutions').select('institution_code, nombre_institucion')
  if (error || !institutions?.length) { console.error('No se pudo leer institutions:', error?.message); return }
  console.log('\n Matching contra', institutions.length, 'instituciones en DB...\n')
  let matched = 0, skipped = 0
  for (const logo of logos) {
    const publicUrl = uploaded.get(logo.imgUrl)
    if (!publicUrl) { skipped++; continue }
    let bestCode: number | null = null, bestName = '', bestScore = 0
    for (const inst of institutions) {
      const score = similarity(logo.name, inst.nombre_institucion)
      if (score > bestScore) { bestScore = score; bestCode = inst.institution_code; bestName = inst.nombre_institucion }
    }
    if (bestCode === null || bestScore < 0.35) { console.log('   Sin match (' + bestScore.toFixed(2) + '):', logo.name); skipped++; continue }
    const { error: updErr } = await supabase.from('institutions').update({ logo_url: publicUrl }).eq('institution_code', bestCode)
    if (updErr) { console.warn('   Update error:', updErr.message); skipped++ }
    else { console.log('   OK [' + bestScore.toFixed(2) + '] "' + logo.name + '" -> "' + bestName + '"'); matched++ }
  }
  console.log('\n Resultado: ' + matched + ' logos guardados, ' + skipped + ' sin match')
}

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets()
  if (!buckets?.some(b => b.name === BUCKET)) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 5242880, allowedMimeTypes: ['image/png','image/jpeg','image/webp','image/svg+xml','image/gif'] })
    if (error) throw new Error('No se pudo crear bucket: ' + error.message)
    console.log('Bucket creado:', BUCKET)
  } else { console.log('Bucket ya existe:', BUCKET) }
}

async function main() {
  console.log('KoraChile -- scrape-institution-logos (CDN MINEDUC)')
  console.log('Supabase:', SUPABASE_URL)
  await ensureBucket()
  const logos = await scrapeLogos()
  if (!logos.length) { console.error('No se encontraron logos.'); return }
  console.log('\n Subiendo', logos.length, 'logos a Supabase Storage...')
  const uploaded = new Map<string, string>()
  for (let i = 0; i < logos.length; i++) {
    const { name, imgUrl } = logos[i]
    process.stdout.write('   [' + String(i+1).padStart(3) + '/' + logos.length + '] ' + name.slice(0,50).padEnd(50) + ' ... ')
    const url = await uploadLogo(name, imgUrl)
    if (url) { uploaded.set(imgUrl, url); console.log('OK') } else { console.log('FAIL') }
    await new Promise(r => setTimeout(r, 100))
  }
  await updateDB(logos, uploaded)
  console.log('\n Proceso completado.')
}

main().catch(e => { console.error('Error fatal:', e); process.exit(1) })
