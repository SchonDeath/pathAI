/**
 * Helper para endpoints de admin.
 * Valida que el usuario autenticado tenga role = 'admin'.
 * Devuelve el cliente con service_role (escritura) + el userId verificado.
 */
import type { H3Event } from 'h3'
import { getSupabaseAnonClient, getSupabaseServiceClient } from './supabase-clients'

function hasAdminRole(value: unknown) {
  if (Array.isArray(value)) return value.some(hasAdminRole)
  return String(value ?? '').toLowerCase() === 'admin'
}

export async function requireAdmin(event: H3Event) {
  const anon = getSupabaseAnonClient()
  const service = getSupabaseServiceClient()
  if (!anon || !service) {
    throw createError({ statusCode: 500, statusMessage: 'Falta SUPABASE_SERVICE_ROLE_KEY para admin.' })
  }

  const authHeader = getHeader(event, 'authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Falta token de sesión.' })
  }

  // Cliente anon para validar el JWT
  const { data: userData, error: userErr } = await anon.auth.getUser(token)
  if (userErr || !userData?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Sesión inválida.' })
  }

  // Verificar rol en tabla users
  const { data: profile } = await service
    .from('users')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle()

  const tokenRole = userData.user.app_metadata?.role ?? userData.user.user_metadata?.role
  const tokenRoles = userData.user.app_metadata?.roles ?? userData.user.user_metadata?.roles

  if (!hasAdminRole(profile?.role) && !hasAdminRole(tokenRole) && !hasAdminRole(tokenRoles)) {
    throw createError({ statusCode: 403, statusMessage: 'Requiere rol admin.' })
  }

  return { userId: userData.user.id, supabase: service }
}
