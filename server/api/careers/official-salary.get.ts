import { findOfficialSalaryForTitle } from '~/server/utils/official-salary'
import { requireSupabaseServiceClient } from '~/server/utils/supabase-clients'

export default defineEventHandler(async (event) => {
  const q = String(getQuery(event).q || '').trim()
  if (q.length < 3) {
    throw createError({ statusCode: 400, statusMessage: 'q debe tener al menos 3 caracteres.' })
  }

  const supabase = requireSupabaseServiceClient({ fallbackToAnon: true })

  const salary = await findOfficialSalaryForTitle(supabase, q)
  if (!salary) {
    return {
      match: 'none',
      salary: null,
      message: 'No se encontraron ingresos oficiales SIES para esta carrera.',
    }
  }

  return {
    match: 'official',
    salary,
  }
})