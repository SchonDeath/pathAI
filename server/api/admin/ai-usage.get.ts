import { requireAdmin } from '~/server/utils/require-admin'

function dayKey(iso: string) {
  return new Date(iso).toISOString().slice(0, 10)
}

function addToBucket(bucket: Record<string, any>, key: string, row: any) {
  if (!bucket[key]) {
    bucket[key] = {
      key,
      requests: 0,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      estimated_cost_clp: 0,
      tool_call_count: 0,
      llm_call_count: 0,
      cache_hits: 0,
    }
  }

  bucket[key].requests += 1
  bucket[key].prompt_tokens += Number(row.prompt_tokens) || 0
  bucket[key].completion_tokens += Number(row.completion_tokens) || 0
  bucket[key].total_tokens += Number(row.total_tokens) || 0
  bucket[key].estimated_cost_clp += Number(row.estimated_cost_clp) || 0
  bucket[key].tool_call_count += Number(row.tool_call_count) || 0
  bucket[key].llm_call_count += Number(row.llm_call_count) || 0
  if (row.cache_hit) bucket[key].cache_hits += 1
}

export default defineEventHandler(async (event) => {
  const { supabase: service } = await requireAdmin(event)

  const days = Math.min(Math.max(Number(getQuery(event).days ?? 30), 1), 90)
  const since = new Date(Date.now() - days * 86_400_000).toISOString()

  const { data, error } = await service
    .from('ai_usage_events')
    .select(`
      id,
      user_id,
      session_id,
      route,
      intent,
      provider,
      model,
      prompt_tokens,
      completion_tokens,
      total_tokens,
      estimated_tokens,
      estimated_cost_usd,
      estimated_cost_clp,
      cache_hit,
      tools_used,
      tool_call_count,
      llm_call_count,
      latency_ms,
      created_at
    `)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(5000)

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  const rows = data ?? []
  const userIds = [...new Set(rows.map((row: any) => row.user_id).filter(Boolean))]
  const { data: users } = userIds.length
    ? await service.from('users').select('id, email, name').in('id', userIds)
    : { data: [] as any[] }
  const usersById = new Map((users ?? []).map((u: any) => [u.id, u]))

  const byDay: Record<string, any> = {}
  const byUser: Record<string, any> = {}
  const byIntent: Record<string, any> = {}

  for (const row of rows as any[]) {
    addToBucket(byDay, dayKey(row.created_at), row)
    addToBucket(byIntent, row.intent || 'sin_intencion', row)
    addToBucket(byUser, row.user_id || 'anonimo', row)
  }

  const total = rows.reduce((acc: any, row: any) => {
    acc.requests += 1
    acc.prompt_tokens += Number(row.prompt_tokens) || 0
    acc.completion_tokens += Number(row.completion_tokens) || 0
    acc.total_tokens += Number(row.total_tokens) || 0
    acc.estimated_cost_clp += Number(row.estimated_cost_clp) || 0
    acc.tool_call_count += Number(row.tool_call_count) || 0
    acc.llm_call_count += Number(row.llm_call_count) || 0
    if (row.cache_hit) acc.cache_hits += 1
    return acc
  }, {
    requests: 0,
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
    estimated_cost_clp: 0,
    tool_call_count: 0,
    llm_call_count: 0,
    cache_hits: 0,
  })

  return {
    days,
    total,
    byDay: Object.values(byDay).sort((a: any, b: any) => b.key.localeCompare(a.key)),
    byIntent: Object.values(byIntent).sort((a: any, b: any) => b.estimated_cost_clp - a.estimated_cost_clp),
    byUser: Object.values(byUser)
      .map((bucket: any) => ({
        ...bucket,
        user: usersById.get(bucket.key) ?? null,
      }))
      .sort((a: any, b: any) => b.estimated_cost_clp - a.estimated_cost_clp)
      .slice(0, 50),
    recent: rows.slice(0, 100).map((row: any) => ({
      ...row,
      user: row.user_id ? usersById.get(row.user_id) ?? null : null,
    })),
  }
})
