import { requireAdmin } from '~/server/utils/require-admin'

function dayKey(iso: string) {
  return new Date(iso).toISOString().slice(0, 10)
}

/** Percentil sobre una muestra sin ordenar. Devuelve null si no hay datos. */
function percentile(values: number[], p: number): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return Math.round(sorted[index])
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
      tool_error_count: 0,
      latencies: [] as number[],
    }
  }

  bucket[key].requests += 1
  bucket[key].prompt_tokens += Number(row.prompt_tokens) || 0
  bucket[key].completion_tokens += Number(row.completion_tokens) || 0
  bucket[key].total_tokens += Number(row.total_tokens) || 0
  bucket[key].estimated_cost_clp += Number(row.estimated_cost_clp) || 0
  bucket[key].tool_call_count += Number(row.tool_call_count) || 0
  bucket[key].llm_call_count += Number(row.llm_call_count) || 0
  bucket[key].tool_error_count += Number(row.metadata?.tool_error_count) || 0
  if (row.cache_hit) bucket[key].cache_hits += 1
  const latency = Number(row.latency_ms)
  if (Number.isFinite(latency)) bucket[key].latencies.push(latency)
}

/** Sustituye la muestra cruda de latencias por sus percentiles antes de serializar. */
function finalizeBucket(bucket: any) {
  const { latencies, ...rest } = bucket
  return {
    ...rest,
    latency_p50_ms: percentile(latencies, 50),
    latency_p95_ms: percentile(latencies, 95),
  }
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
      metadata,
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
  // Salud por tool: qué se usa, qué falla y cuánto tarda. Antes `tools_used` se
  // persistía pero no se agregaba en ninguna vista.
  const byTool: Record<string, any> = {}
  const routeCounts: Record<string, number> = {}

  for (const row of rows as any[]) {
    addToBucket(byDay, dayKey(row.created_at), row)
    addToBucket(byIntent, row.intent || 'sin_intencion', row)
    addToBucket(byUser, row.user_id || 'anonimo', row)

    const route = row.metadata?.deterministic_route ?? (row.cache_hit ? 'cache' : 'llm')
    routeCounts[route] = (routeCounts[route] ?? 0) + 1

    // `metadata.tool_calls` sólo existe desde la instrumentación por tool call.
    // Para filas anteriores caemos a `tools_used`, que no distingue éxito de fallo.
    const toolCalls = Array.isArray(row.metadata?.tool_calls) ? row.metadata.tool_calls : null
    if (toolCalls?.length) {
      for (const call of toolCalls) {
        const name = String(call?.name || 'desconocida')
        if (!byTool[name]) byTool[name] = { key: name, calls: 0, errors: 0, deduped: 0, latencies: [] as number[] }
        byTool[name].calls += 1
        if (call?.ok === false) byTool[name].errors += 1
        if (call?.deduped) byTool[name].deduped += 1
        const latency = Number(call?.latency_ms)
        if (Number.isFinite(latency)) byTool[name].latencies.push(latency)
      }
    } else {
      for (const name of (row.tools_used ?? [])) {
        if (!byTool[name]) byTool[name] = { key: name, calls: 0, errors: 0, deduped: 0, latencies: [] as number[] }
        byTool[name].calls += 1
      }
    }
  }

  const allLatencies: number[] = []
  const total = rows.reduce((acc: any, row: any) => {
    acc.requests += 1
    acc.prompt_tokens += Number(row.prompt_tokens) || 0
    acc.completion_tokens += Number(row.completion_tokens) || 0
    acc.total_tokens += Number(row.total_tokens) || 0
    acc.estimated_cost_clp += Number(row.estimated_cost_clp) || 0
    acc.tool_call_count += Number(row.tool_call_count) || 0
    acc.llm_call_count += Number(row.llm_call_count) || 0
    acc.tool_error_count += Number(row.metadata?.tool_error_count) || 0
    acc.tool_calls_deduped += Number(row.metadata?.tool_calls_deduped) || 0
    if (row.cache_hit) acc.cache_hits += 1
    const latency = Number(row.latency_ms)
    if (Number.isFinite(latency)) allLatencies.push(latency)
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
    tool_error_count: 0,
    tool_calls_deduped: 0,
  })

  total.latency_p50_ms = percentile(allLatencies, 50)
  total.latency_p95_ms = percentile(allLatencies, 95)

  return {
    days,
    total,
    byDay: Object.values(byDay).map(finalizeBucket).sort((a: any, b: any) => b.key.localeCompare(a.key)),
    byIntent: Object.values(byIntent).map(finalizeBucket).sort((a: any, b: any) => b.estimated_cost_clp - a.estimated_cost_clp),
    byUser: Object.values(byUser)
      .map(finalizeBucket)
      .map((bucket: any) => ({
        ...bucket,
        user: usersById.get(bucket.key) ?? null,
      }))
      .sort((a: any, b: any) => b.estimated_cost_clp - a.estimated_cost_clp)
      .slice(0, 50),
    byTool: Object.values(byTool)
      .map(({ latencies, ...rest }: any) => ({
        ...rest,
        error_rate_pct: rest.calls ? Math.round((rest.errors / rest.calls) * 1000) / 10 : 0,
        latency_p50_ms: percentile(latencies, 50),
        latency_p95_ms: percentile(latencies, 95),
      }))
      .sort((a: any, b: any) => b.calls - a.calls),
    byRoute: Object.entries(routeCounts)
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count),
    recent: rows.slice(0, 100).map((row: any) => ({
      ...row,
      user: row.user_id ? usersById.get(row.user_id) ?? null : null,
    })),
  }
})
