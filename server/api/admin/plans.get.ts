/**
 * GET /api/admin/plans — catálogo público, pero aislamos el consumo al panel admin
 */
import { requireAdmin } from '~/server/utils/require-admin'

export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: true })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { plans: data ?? [] }
})
