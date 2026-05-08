import { requireSupabaseServiceClient } from '~/server/utils/supabase-clients'

// GET /api/careers?q=texto&category=tecnología&limit=12&offset=0
export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const q        = String(query.q || '').trim().toLowerCase()
  const rawCategory = String(query.category || '').trim().toLowerCase()
  // Normalizar tildes para hacer match con la BD
  const category = rawCategory.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const limit    = Math.min(Number(query.limit) || 12, 50)
  const offset   = Number(query.offset) || 0

  const supabase = requireSupabaseServiceClient({ fallbackToAnon: true })

  let sb = supabase
    .from('careers')
    .select('id, slug, title, tagline, emoji, category, skills, salary_junior, salary_mid, salary_senior, job_demand, match_keywords', { count: 'exact' })
    .order('title')
    .range(offset, offset + limit - 1)

  if (category) {
    sb = sb.eq('category', category)
  }

  if (q) {
    sb = sb.or(`title.ilike.%${q}%,tagline.ilike.%${q}%,match_keywords.cs.{${q}}`)
  }

  const { data, error, count } = await sb

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return { careers: data ?? [], total: count ?? 0 }
})
