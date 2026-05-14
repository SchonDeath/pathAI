import { requireSupabaseServiceClient } from '~/server/utils/supabase-clients'
import { enrichDiscoverResultWithOfficialSalaries } from '~/server/utils/official-salary'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function hasUsableSalary(career: any) {
  const salary = career?.salary_range
  return !!salary && [salary.junior, salary.mid, salary.senior].some(value => typeof value === 'number' && value > 0)
}

function needsSalaryRefresh(result: any) {
  return Array.isArray(result?.variations)
    && result.variations.some((career: any) => career?.salary_source !== 'sies' || !hasUsableSalary(career))
}

export default defineEventHandler(async (event) => {
  const id = String(getRouterParam(event, 'id') || '').trim()
  if (!UUID_RE.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'id inválido.' })
  }

  const supabase = requireSupabaseServiceClient()
  const { data, error } = await supabase
    .from('discovery_sessions')
    .select('id, query, result')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
  if (!data) {
    throw createError({ statusCode: 404, statusMessage: 'Sesión no encontrada. Es posible que haya expirado.' })
  }

  if (needsSalaryRefresh(data.result)) {
    const refreshedResult = await enrichDiscoverResultWithOfficialSalaries(data.result, supabase)
    if (JSON.stringify(refreshedResult) !== JSON.stringify(data.result)) {
      data.result = refreshedResult
      await supabase
        .from('discovery_sessions')
        .update({ result: refreshedResult })
        .eq('id', id)
    }
  }

  return { session: data }
})