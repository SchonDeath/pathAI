/**
 * server/utils/semantic-cache.ts
 *
 * Cache semántico: guarda (pregunta, respuesta, embedding) y busca por similitud.
 * Si hay match > 0.93 → respuesta inmediata sin llamar al LLM.
 *
 * Diseñado para fallar en silencio: si Supabase o embeddings fallan,
 * el chat sigue funcionando normalmente (solo pierde el ahorro).
 */

import { embedText, toPgVector } from './embeddings'
import { getSupabaseServiceClient } from './supabase-clients'

const MIN_SCORE = 0.88
const MAX_PENDING_CACHE_WRITES = 4
const CACHE_PURGE_INTERVAL_MS = 30 * 60_000
const VOLATILE_CACHE_TTL_MS = 24 * 60 * 60_000
const STABLE_CACHE_TTL_MS = 30 * 24 * 60 * 60_000
let pendingCacheWrites = 0
let lastCachePurgeAt = 0

function getClient() {
  // chat_cache solo tiene política para service_role, nunca usar anon aquí.
  return getSupabaseServiceClient()
}

function maybePurgeExpiredEntries() {
  const client = getClient()
  if (!client) return

  const now = Date.now()
  if (now - lastCachePurgeAt < CACHE_PURGE_INTERVAL_MS) return
  lastCachePurgeAt = now

  const volatileCutoff = new Date(now - VOLATILE_CACHE_TTL_MS).toISOString()
  const stableCutoff = new Date(now - STABLE_CACHE_TTL_MS).toISOString()

  void Promise.all([
    client.from('chat_cache').delete().eq('volatile', true).lt('created_at', volatileCutoff),
    client.from('chat_cache').delete().eq('volatile', false).lt('created_at', stableCutoff),
  ])
    .then((results) => {
      for (const result of results) {
        if (result.error) console.warn('[cache] purge error:', result.error.message)
      }
    })
    .catch((error: any) => {
      console.warn('[cache] purge fail:', error?.message)
    })
}

export interface CacheLookup {
  /** Hit si score >= MIN_SCORE; null si miss o fallo */
  hit: { answer: string; cachedId: string; score: number } | null
  /** Embedding reutilizable por saveSemanticCache (evita recomputar) */
  embedding: number[] | null
}

/**
 * Busca en cache una pregunta similar.
 *
 * Devuelve siempre un objeto `{ hit, embedding }`:
 *   - `hit` = datos cacheados si hay match ≥ 0.93; null si miss.
 *   - `embedding` = vector 384d reutilizable para `saveSemanticCache`.
 *
 * Devuelve `null` solo si el cliente / embeddings no están disponibles.
 * Timeout 800ms para no bloquear el request.
 */
export async function checkSemanticCache(question: string): Promise<CacheLookup | null> {
  const client = getClient()
  if (!client) return null
  maybePurgeExpiredEntries()

  const embedding = await embedText(question)
  if (!embedding) return null

  try {
    const { data, error } = await Promise.race([
      client.rpc('match_chat_cache', {
        q_embedding: toPgVector(embedding),
        min_score: MIN_SCORE,
      }),
      new Promise<any>((resolve) => setTimeout(() => resolve({ data: null, error: 'timeout' }), 800)),
    ])

    if (error || !data?.length) return { hit: null, embedding }

    const row = data[0]
    // Fire-and-forget: no esperamos para responder rápido
    void client.rpc('bump_chat_cache_hit', { cache_id: row.id })
      .then(() => undefined)
      .catch((e) => console.warn('[cache] bump fail:', e?.message))

    return {
      hit: { answer: row.answer, cachedId: row.id, score: row.score },
      embedding,
    }
  } catch (e: any) {
    console.warn('[cache] miss error:', e?.message)
    return { hit: null, embedding }
  }
}

/**
 * Guarda una pregunta y respuesta en cache. Fire-and-forget.
 * Si se pasa `precomputedEmbedding` (obtenido de checkSemanticCache) se reutiliza
 * y se evita recomputar el embedding (~100-200ms ahorrados por request).
 */
/** Intents cuyas respuestas cambian con frecuencia → TTL corto (24h). */
const VOLATILE_INTENTS = new Set(['official_salary', 'official_program', 'institution_info', 'ranking', 'comparison'])

export function saveSemanticCache(
  question: string,
  answer: string,
  opts: { tags?: string[]; volatile?: boolean; intent?: string; precomputedEmbedding?: number[] | null } = {},
) {
  const client = getClient()
  if (!client) return
  maybePurgeExpiredEntries()
  if (pendingCacheWrites >= MAX_PENDING_CACHE_WRITES) return

  pendingCacheWrites++

  ;(async () => {
    const embedding = opts.precomputedEmbedding ?? (await embedText(question))
    if (!embedding) return

    const { error } = await client.from('chat_cache').insert({
      question: question.slice(0, 500),
      answer: answer.slice(0, 4000),
      embedding: toPgVector(embedding) as any,
      tags: opts.tags ?? [],
      volatile: opts.intent != null ? VOLATILE_INTENTS.has(opts.intent) : (opts.volatile ?? false),
    })
    if (error) console.warn('[cache] save error:', error.message)
  })()
    .catch((e) => console.warn('[cache] save fail:', e?.message))
    .finally(() => {
      pendingCacheWrites = Math.max(0, pendingCacheWrites - 1)
    })
}

/**
 * Heurística: ¿esta respuesta tiene datos volátiles (aranceles, puntajes, etc.)?
 * Si sí → se cachea con TTL más corto.
 */
export function isVolatileAnswer(answer: string): boolean {
  return /arancel|puntaje|corte|empleabilid|ingreso\s+(mensual|promedio)|vacante/i.test(answer)
}
