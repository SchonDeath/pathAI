// DELETE /api/chat/sessions
// Elimina TODOS los mensajes de chat del usuario autenticado.
//
// Seguridad: el WHERE incluye user_id = JWT.sub, por lo que solo se
// eliminan los mensajes del propio usuario.

import { requireAuth } from '~/server/utils/require-auth'
import { requireSupabaseServiceClient } from '~/server/utils/supabase-clients'

export default defineEventHandler(async (event) => {
  const { userId } = await requireAuth(event)

  const service = requireSupabaseServiceClient()

  const { error } = await service
    .from('chat_messages')
    .delete()
    .eq('user_id', userId)

  if (error) {
    throw createError({ statusCode: 500, message: `Error al eliminar: ${error.message}` })
  }

  return { ok: true }
})
