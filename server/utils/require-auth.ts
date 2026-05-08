/**
 * Helper para endpoints que requieren usuario autenticado (cualquier rol).
 * Valida el JWT de Supabase y aplica rate limiting básico in-memory.
 *
 * Uso:
 *   const { userId } = await requireAuth(event)
 */
import type { H3Event } from 'h3'
import { getSupabaseAnonClient } from './supabase-clients'
import { enforceSharedRateLimit, type SharedRateLimitOptions } from './rate-limit'

export interface RequireAuthOptions {
  /** Si true, omite el rate-limit por usuario. Útil para llamadas internas
   * (server→server) donde el chat ya consumió el límite del request original. */
  skipRateLimit?: boolean
  /** Permite personalizar scope/límite para endpoints más caros como chat. */
  rateLimit?: Omit<SharedRateLimitOptions, 'key'>
}

export async function requireAuth(
  event: H3Event,
  options: RequireAuthOptions = {},
): Promise<{ userId: string; email: string | null }> {
  const authHeader = getHeader(event, 'authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Inicia sesión para continuar.' })
  }

  const anon = getSupabaseAnonClient()
  if (!anon) {
    throw createError({ statusCode: 500, statusMessage: 'Supabase no está configurado.' })
  }

  const { data, error } = await anon.auth.getUser(token)
  if (error || !data?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Sesión inválida o expirada.' })
  }

  if (!options.skipRateLimit) {
    await enforceSharedRateLimit({
      key: data.user.id,
      scope: options.rateLimit?.scope ?? 'auth',
      windowMs: options.rateLimit?.windowMs,
      max: options.rateLimit?.max,
    })
  }

  return { userId: data.user.id, email: data.user.email ?? null }
}
