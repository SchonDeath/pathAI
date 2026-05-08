import { getSupabaseServiceClient } from './supabase-clients'

const RATE_LIMIT_PURGE_INTERVAL_MS = 10 * 60_000
const RATE_LIMIT_RETENTION_MS = 24 * 60 * 60_000

const fallbackBuckets = new Map<string, number[]>()
let fallbackWarningShown = false
let lastRateLimitPurgeAt = 0
let persistedTableMissingWarningShown = false
let persistedRateLimitUnavailable = false

export interface SharedRateLimitOptions {
  key: string
  scope?: string
  windowMs?: number
  max?: number
}

function getBucketKey(scope: string, key: string) {
  return `${scope}:${key}`.slice(0, 200)
}

function computeRetryInSeconds(timestamps: number[], windowMs: number, now: number) {
  const oldest = timestamps[0] ?? now
  return Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000))
}

function enforceFallbackRateLimit(bucketKey: string, windowMs: number, max: number) {
  const now = Date.now()
  const existing = fallbackBuckets.get(bucketKey) ?? []
  const recent = existing.filter((timestamp) => now - timestamp < windowMs)

  if (recent.length >= max) {
    const retryIn = computeRetryInSeconds(recent, windowMs, now)
    throw createError({
      statusCode: 429,
      statusMessage: `Demasiadas solicitudes. Espera ${retryIn}s.`,
    })
  }

  recent.push(now)
  fallbackBuckets.set(bucketKey, recent)

  if (fallbackBuckets.size > 5000) {
    for (const [key, timestamps] of fallbackBuckets.entries()) {
      if (!timestamps.some((timestamp) => now - timestamp < windowMs)) {
        fallbackBuckets.delete(key)
      }
    }
  }
}

function warnFallbackUsage() {
  if (fallbackWarningShown) return
  fallbackWarningShown = true
  console.warn('[rate-limit] Supabase service role no disponible; usando fallback local no compartido.')
}

function isMissingRateLimitTableError(message: string | undefined) {
  const text = String(message ?? '')
  return /rate_limits/i.test(text)
    && /(schema cache|does not exist|could not find the table|relation)/i.test(text)
}

function markPersistedRateLimitUnavailable(message?: string) {
  persistedRateLimitUnavailable = true
  if (persistedTableMissingWarningShown) return
  persistedTableMissingWarningShown = true
  console.warn('[rate-limit] Tabla public.rate_limits no existe; usando fallback local no compartido.')
  if (message && !isMissingRateLimitTableError(message)) {
    console.warn('[rate-limit] detalle:', message)
  }
}

function maybePurgePersistedBuckets() {
  const client = getSupabaseServiceClient()
  if (!client) return
  if (persistedRateLimitUnavailable) return

  const now = Date.now()
  if (now - lastRateLimitPurgeAt < RATE_LIMIT_PURGE_INTERVAL_MS) return
  lastRateLimitPurgeAt = now

  const cutoff = new Date(now - RATE_LIMIT_RETENTION_MS).toISOString()
  void (async () => {
    try {
      const { error } = await client
        .from('rate_limits')
        .delete()
        .lt('created_at', cutoff)

      if (!error) return
      if (isMissingRateLimitTableError(error.message)) {
        markPersistedRateLimitUnavailable(error.message)
        return
      }
      console.warn('[rate-limit] purge error:', error.message)
    } catch (error: any) {
      if (isMissingRateLimitTableError(error?.message)) {
        markPersistedRateLimitUnavailable(error?.message)
        return
      }
      console.warn('[rate-limit] purge fail:', error?.message)
    }
  })()
}

export async function enforceSharedRateLimit(options: SharedRateLimitOptions) {
  const scope = options.scope ?? 'default'
  const windowMs = options.windowMs ?? 60_000
  const max = options.max ?? 20
  const bucketKey = getBucketKey(scope, options.key)
  const client = getSupabaseServiceClient()

  if (!client) {
    warnFallbackUsage()
    enforceFallbackRateLimit(bucketKey, windowMs, max)
    return
  }

  if (persistedRateLimitUnavailable) {
    markPersistedRateLimitUnavailable()
    enforceFallbackRateLimit(bucketKey, windowMs, max)
    return
  }

  maybePurgePersistedBuckets()

  const sinceIso = new Date(Date.now() - windowMs).toISOString()
  const { data, error } = await client
    .from('rate_limits')
    .select('created_at')
    .eq('ip', bucketKey)
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: true })
    .limit(max)

  if (error) {
    if (isMissingRateLimitTableError(error.message)) {
      markPersistedRateLimitUnavailable(error.message)
    } else {
      console.warn('[rate-limit] count error:', error.message)
    }
    enforceFallbackRateLimit(bucketKey, windowMs, max)
    return
  }

  const recent = (data ?? [])
    .map((row) => Date.parse(row.created_at))
    .filter((timestamp) => Number.isFinite(timestamp))

  if (recent.length >= max) {
    const retryIn = computeRetryInSeconds(recent, windowMs, Date.now())
    throw createError({
      statusCode: 429,
      statusMessage: `Demasiadas solicitudes. Espera ${retryIn}s.`,
    })
  }

  const { error: insertError } = await client.from('rate_limits').insert({ ip: bucketKey })
  if (insertError) {
    if (isMissingRateLimitTableError(insertError.message)) {
      markPersistedRateLimitUnavailable(insertError.message)
    } else {
      console.warn('[rate-limit] insert error:', insertError.message)
    }
    enforceFallbackRateLimit(bucketKey, windowMs, max)
  }
}