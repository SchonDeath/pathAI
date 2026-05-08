/**
 * Resolver centralizado de instituciones.
 *
 * Toma cualquier referencia textual (alias, sigla, nombre parcial) y devuelve
 * el `institution_code` único que identifica a la institución en la BD.
 *
 * Fuentes:
 *  - utils/institution-aliases.json (aliases curados: "uch" -> UNIVERSIDAD DE CHILE)
 *  - tabla institutions (121 instituciones con tipo_institucion)
 *
 * El resolver se inicializa perezosamente en el primer uso y cachea el índice
 * en memoria (se refresca cada RESOLVER_TTL_MS).
 */
import fs from 'node:fs'
import path from 'node:path'
import type { SupabaseClient } from '@supabase/supabase-js'

type AliasEntry = { code: number; nombre_oficial: string; aliases: string[] }

export type ResolvedInstitution = {
  institution_code: number
  nombre_oficial: string
  tipo_institucion: string
  via: 'exact' | 'alias' | 'core' | 'sigla'
}

type Indexed = {
  code: number
  tipo: string
  full: string         // nombre normalizado completo
  core: string         // núcleo (sin prefijo ni stopwords)
  siglas: string[]     // tokens distintivos detectados en el nombre
  nombre_oficial: string
}

const RESOLVER_TTL_MS = 10 * 60 * 1000
let cache: {
  indexed: Indexed[]
  aliasMap: Map<string, number>
  loadedAt: number
} | null = null

const STOP_WORDS = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'y', 'region', 'chile', 'nacional',
])

const STOP_SIGLAS = new Set([
  'IP', 'CFT', 'DEL', 'LAS', 'LOS', 'UNIVERSIDAD', 'PROFESIONAL',
  'INSTITUTO', 'CENTRO', 'FORMACION', 'TECNICA', 'REGION', 'NACIONAL',
  'SUPERIOR', 'ESTUDIOS', 'CAPACITACION', 'EDUCACIONAL', 'CHILE',
  'CHILENA', 'POLITECNICO', 'AND', 'DON',
])

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function normalizeName(s: string): string {
  return stripAccents(s).toLowerCase().replace(/[.,'`´]/g, '').replace(/\s+/g, ' ').trim()
}

function coreName(s: string): string {
  let out = normalizeName(s).replace(
    /^(cft|ip|u|universidad|instituto profesional|centro de formacion tecnica)\b\s*/u,
    '',
  )
  return out.split(' ').filter(w => w && !STOP_WORDS.has(w)).join(' ').trim()
}

function detectSiglas(s: string): string[] {
  const upper = stripAccents(s).toUpperCase()
  const matches = upper.match(/\b[A-Z]{3,}\b/g) ?? []
  return [...new Set(matches.filter(m => !STOP_SIGLAS.has(m)))]
}

function expectedTipo(raw: string): string | null {
  const up = raw.toUpperCase().trim()
  if (up.startsWith('CFT ') || up.startsWith('CFT-') || /\bcft\b/i.test(raw))
    return 'Centros de Formación Técnica'
  if (up.startsWith('IP ') || up.startsWith('IP-') || /\binstituto profesional\b/i.test(raw))
    return 'Institutos Profesionales'
  if (up.startsWith('U ') || up.startsWith('UNIVERSIDAD') || /\buniversidad\b/i.test(raw))
    return 'Universidades'
  return null
}

async function buildIndex(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('institutions')
    .select('institution_code, tipo_institucion, nombre_institucion')
  if (error) throw error

  const indexed: Indexed[] = (data ?? [])
    .filter(i => i.nombre_institucion)
    .map(i => ({
      code: i.institution_code,
      tipo: i.tipo_institucion ?? '',
      full: normalizeName(i.nombre_institucion!),
      core: coreName(i.nombre_institucion!),
      siglas: detectSiglas(i.nombre_institucion!),
      nombre_oficial: i.nombre_institucion!,
    }))

  const aliasMap = new Map<string, number>()
  try {
    const p = path.join(process.cwd(), 'utils', 'institution-aliases.json')
    const entries: AliasEntry[] = JSON.parse(fs.readFileSync(p, 'utf-8'))
    for (const e of entries) {
      aliasMap.set(normalizeName(e.nombre_oficial), e.code)
      for (const a of e.aliases) aliasMap.set(normalizeName(a), e.code)
    }
  } catch (e) {
    console.warn('[institution-resolver] no se pudo cargar aliases JSON:', e)
  }

  cache = { indexed, aliasMap, loadedAt: Date.now() }
  return cache
}

async function getIndex(supabase: SupabaseClient) {
  if (cache && Date.now() - cache.loadedAt < RESOLVER_TTL_MS) return cache
  return buildIndex(supabase)
}

/**
 * Resuelve un texto a un institution_code único.
 * Retorna null si no hay match confiable.
 */
export async function resolveInstitution(
  supabase: SupabaseClient,
  input: string | null | undefined,
): Promise<ResolvedInstitution | null> {
  if (!input || !input.trim()) return null
  const { indexed, aliasMap } = await getIndex(supabase)

  const raw = input.trim()
  const inputNorm = normalizeName(raw)
  const inputCore = coreName(raw)
  const inputSiglas = detectSiglas(raw)
  const want = expectedTipo(raw)

  const pool = want ? indexed.filter(i => i.tipo === want) : indexed

  // 1) Exact full
  let hit = pool.find(i => i.full === inputNorm)
  if (hit) return toResolved(hit, 'exact')

  // 2) Alias dict (respeta tipo)
  const aliasCode = aliasMap.get(inputNorm)
  if (aliasCode) {
    hit = pool.find(i => i.code === aliasCode)
    if (hit) return toResolved(hit, 'alias')
  }
  // Alias parcial: el input contiene un alias conocido como palabra completa
  for (const [alias, code] of aliasMap.entries()) {
    if (alias.length < 3) continue
    const re = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
    if (re.test(inputNorm)) {
      const cand = pool.find(i => i.code === code) ?? indexed.find(i => i.code === code)
      if (cand) return toResolved(cand, 'alias')
    }
  }

  // 3) Sigla distintiva compartida: elegir el candidato con MÁS siglas en común
  if (inputSiglas.length > 0) {
    const scored = pool
      .map(i => ({ i, shared: i.siglas.filter(s => inputSiglas.includes(s)).length }))
      .filter(x => x.shared > 0)
      .sort((a, b) => b.shared - a.shared)
    if (scored.length > 0) {
      // Si hay empate en top shared, preferir el que tenga menos siglas extras
      // (más específico). Si hay ambigüedad real (múltiples con mismo score y
      // misma longitud de siglas), no resolver.
      const top = scored[0]
      const tied = scored.filter(x => x.shared === top.shared)
      if (tied.length === 1) {
        return toResolved(top.i, 'sigla')
      }
      const byBrevity = tied.sort((a, b) => a.i.siglas.length - b.i.siglas.length)
      if (byBrevity[0].i.siglas.length < byBrevity[1].i.siglas.length) {
        return toResolved(byBrevity[0].i, 'sigla')
      }
      // Ambigüedad real: no resolver por sigla, seguir al core match
    }
  }

  // 4) Core exacto
  if (inputCore.length >= 4) {
    hit = pool.find(i => i.core === inputCore)
    if (hit) return toResolved(hit, 'core')
    // Contención por palabra completa
    hit = pool.find(i => {
      if (!i.core || i.core.length < 4) return false
      return i.core.includes(` ${inputCore} `)
        || i.core.startsWith(inputCore + ' ')
        || i.core.endsWith(' ' + inputCore)
        || inputCore.includes(` ${i.core} `)
        || inputCore.startsWith(i.core + ' ')
        || inputCore.endsWith(' ' + i.core)
    })
    if (hit) return toResolved(hit, 'core')
  }

  return null
}

function toResolved(i: Indexed, via: ResolvedInstitution['via']): ResolvedInstitution {
  return {
    institution_code: i.code,
    nombre_oficial: i.nombre_oficial,
    tipo_institucion: i.tipo,
    via,
  }
}

/**
 * Variante síncrona: requiere que el índice ya esté cargado. Útil cuando
 * ya se llamó `resolveInstitution` antes en el mismo request.
 */
export function resolveInstitutionSync(input: string | null | undefined): ResolvedInstitution | null {
  if (!cache || !input) return null
  const { indexed, aliasMap } = cache
  const norm = normalizeName(input)
  const code = aliasMap.get(norm)
  if (code) {
    const hit = indexed.find(i => i.code === code)
    if (hit) return toResolved(hit, 'alias')
  }
  const exact = indexed.find(i => i.full === norm)
  return exact ? toResolved(exact, 'exact') : null
}
