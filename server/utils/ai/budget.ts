import { getSupabaseServiceClient } from '../supabase-clients'

export interface AiBudgetState {
  enabled: boolean
  monthlyLimitClp: number
  spentThisMonthClp: number
  mode: 'normal' | 'compact'
}

function monthStartIso() {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

export async function getAiBudgetState(userId: string): Promise<AiBudgetState> {
  const config = useRuntimeConfig()
  const monthlyLimitClp = Number(config.aiMonthlyBudgetClp || 0)
  if (!monthlyLimitClp || monthlyLimitClp <= 0) {
    return { enabled: false, monthlyLimitClp: 0, spentThisMonthClp: 0, mode: 'normal' }
  }

  const service = getSupabaseServiceClient()
  if (!service) {
    return { enabled: true, monthlyLimitClp, spentThisMonthClp: 0, mode: 'normal' }
  }

  const { data, error } = await service
    .from('ai_usage_events')
    .select('estimated_cost_clp')
    .eq('user_id', userId)
    .gte('created_at', monthStartIso())
    .limit(5000)

  if (error) {
    console.warn('[ai-budget] lookup failed:', error.message)
    return { enabled: true, monthlyLimitClp, spentThisMonthClp: 0, mode: 'normal' }
  }

  const spentThisMonthClp = (data ?? []).reduce(
    (sum: number, row: any) => sum + (Number(row.estimated_cost_clp) || 0),
    0,
  )
  const mode = spentThisMonthClp >= monthlyLimitClp * 0.8 ? 'compact' : 'normal'

  return { enabled: true, monthlyLimitClp, spentThisMonthClp, mode }
}
