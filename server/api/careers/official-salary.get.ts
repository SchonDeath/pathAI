import { findOfficialSalaryForCareerGenericId, findOfficialSalaryForTitle } from '~/server/utils/official-salary'
import { requireSupabaseServiceClient } from '~/server/utils/supabase-clients'

export default defineEventHandler(async (event) => {
  const q = String(getQuery(event).q || '').trim()
  const careerGenericId = String(getQuery(event).career_generic_id || '').trim()
  if (!careerGenericId && q.length < 3) {
    throw createError({ statusCode: 400, message: 'q debe tener al menos 3 caracteres.' })
  }

  const supabase = requireSupabaseServiceClient({ fallbackToAnon: true })

  const salary = careerGenericId
    ? await findOfficialSalaryForCareerGenericId(supabase, careerGenericId)
    : await findOfficialSalaryForTitle(supabase, q)
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