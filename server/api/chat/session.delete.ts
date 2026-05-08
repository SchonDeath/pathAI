// DELETE /api/chat/session
// Elimina todos los mensajes de una sesión de chat del usuario autenticado.
// Body: { sessionId: string }
//
// Seguridad: el WHERE incluye user_id = JWT.sub, por lo que un usuario
// nunca puede borrar mensajes de otro aunque conozca el session_id.

import { requireAuth } from '~/server/utils/require-auth'
import { requireSupabaseServiceClient } from '~/server/utils/supabase-clients'

export default defineEventHandler(async (event) => {
  const { userId } = await requireAuth(event)

  const body = await readBody(event)
  const { sessionId } = body ?? {}

  if (!sessionId || typeof sessionId !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'sessionId requerido.' })
  }

  // Usamos service_role para poder borrar, pero el WHERE garantiza que solo
  // se borran filas del usuario autenticado.
  const service = requireSupabaseServiceClient()

  const { error } = await service
    .from('chat_messages')
    .delete()
    .eq('user_id', userId)
    .eq('session_id', sessionId)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: `Error al eliminar: ${error.message}` })
  }

  return { ok: true }
})
