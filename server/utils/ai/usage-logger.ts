import { getSupabaseServiceClient } from '../supabase-clients'

type ChatMsgForEstimate = {
  role: string
  content?: string
  tool_calls?: any
  tool_call_id?: string
  name?: string
}

export interface CapturedLlmUsage {
  provider: string
  model: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  estimated: boolean
}

export interface AiUsageLogInput {
  userId?: string | null
  sessionId?: string | null
  route: 'chat' | 'discover' | 'admin' | 'other'
  intent?: string | null
  llmUsages: CapturedLlmUsage[]
  cacheHit?: boolean
  toolsUsed?: string[]
  toolCallCount?: number
  llmCallCount?: number
  latencyMs?: number
  metadata?: Record<string, any>
}

const MODEL_PRICES_USD_PER_1M: Record<string, { input: number; output: number }> = {
  // Valores de referencia. Si cambian precios/proveedor, ajustar con env o aquí.
  'openai/gpt-4.1-mini': { input: 0.40, output: 1.60 },
  'deepseek/DeepSeek-V3-0324': { input: 0.14, output: 0.28 },
  'meta/Meta-Llama-3.1-8B-Instruct': { input: 0.05, output: 0.08 },
  'llama-3.1-8b-instant': { input: 0.05, output: 0.08 },
}

let aiUsageTableUnavailable = false

function getClient() {
  return getSupabaseServiceClient()
}

export function estimateTokenCount(value: unknown): number {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? '')
  return Math.max(0, Math.ceil(text.length / 4))
}

export function captureLlmUsage(
  response: any,
  requestMessages: ChatMsgForEstimate[],
  assistantMessage: any,
): CapturedLlmUsage {
  const meta = response?._kora ?? {}
  const provider = String(meta.provider || 'unknown')
  const model = String(meta.model || response?.model || 'unknown')
  const usage = response?.usage ?? {}

  const promptTokens = Number(usage.prompt_tokens ?? usage.input_tokens)
  const completionTokens = Number(usage.completion_tokens ?? usage.output_tokens)
  const totalTokens = Number(usage.total_tokens)

  if (Number.isFinite(promptTokens) && Number.isFinite(completionTokens)) {
    return {
      provider,
      model,
      promptTokens: Math.max(0, Math.round(promptTokens)),
      completionTokens: Math.max(0, Math.round(completionTokens)),
      totalTokens: Number.isFinite(totalTokens)
        ? Math.max(0, Math.round(totalTokens))
        : Math.max(0, Math.round(promptTokens + completionTokens)),
      estimated: false,
    }
  }

  const estimatedPrompt = estimateTokenCount(requestMessages)
  const estimatedCompletion = estimateTokenCount({
    content: assistantMessage?.content ?? '',
    tool_calls: assistantMessage?.tool_calls ?? [],
  })

  return {
    provider,
    model,
    promptTokens: estimatedPrompt,
    completionTokens: estimatedCompletion,
    totalTokens: estimatedPrompt + estimatedCompletion,
    estimated: true,
  }
}

export function summarizeAiUsage(llmUsages: CapturedLlmUsage[]) {
  const config = useRuntimeConfig()
  const usdToClp = Number(config.aiUsdToClp || 950)
  let estimatedCostUsd = 0

  for (const usage of llmUsages) {
    const price = MODEL_PRICES_USD_PER_1M[usage.model] ?? { input: 0.40, output: 1.60 }
    estimatedCostUsd += (usage.promptTokens / 1_000_000) * price.input
    estimatedCostUsd += (usage.completionTokens / 1_000_000) * price.output
  }

  const promptTokens = llmUsages.reduce((sum, u) => sum + u.promptTokens, 0)
  const completionTokens = llmUsages.reduce((sum, u) => sum + u.completionTokens, 0)

  return {
    provider: [...new Set(llmUsages.map(u => u.provider).filter(Boolean))].join(',') || null,
    model: [...new Set(llmUsages.map(u => u.model).filter(Boolean))].join(',') || null,
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    estimatedTokens: llmUsages.some(u => u.estimated),
    estimatedCostUsd,
    estimatedCostClp: Math.ceil(estimatedCostUsd * usdToClp),
  }
}

export async function logAiUsageEvent(input: AiUsageLogInput) {
  const client = getClient()
  if (!client || aiUsageTableUnavailable) return

  const summary = summarizeAiUsage(input.llmUsages)
  const row = {
    user_id: input.userId ?? null,
    session_id: input.sessionId ?? null,
    route: input.route,
    intent: input.intent ?? null,
    provider: summary.provider,
    model: summary.model,
    prompt_tokens: summary.promptTokens,
    completion_tokens: summary.completionTokens,
    total_tokens: summary.totalTokens,
    estimated_tokens: summary.estimatedTokens,
    estimated_cost_usd: Number(summary.estimatedCostUsd.toFixed(6)),
    estimated_cost_clp: summary.estimatedCostClp,
    cache_hit: input.cacheHit ?? false,
    tools_used: [...new Set(input.toolsUsed ?? [])],
    tool_call_count: input.toolCallCount ?? 0,
    llm_call_count: input.llmCallCount ?? input.llmUsages.length,
    latency_ms: input.latencyMs ?? null,
    metadata: input.metadata ?? {},
  }

  const { error } = await client.from('ai_usage_events').insert(row as any)
  if (!error) return

  const msg = String(error.message || '')
  if (msg.includes("Could not find the table 'public.ai_usage_events'")) {
    aiUsageTableUnavailable = true
    console.warn('[ai-usage] tabla ai_usage_events no existe. Aplicar migracion 20260502000000_ai_usage_events.sql para habilitar telemetria.')
    return
  }

  console.warn('[ai-usage] insert failed:', msg)
}
