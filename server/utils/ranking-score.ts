export interface RankingScoreBreakdown {
  acreditacion: number
  retencion: number
  paes: number
  matricula: number
}

export interface RankingScoreAvailability {
  acreditacion: boolean
  retencion: boolean
  paes: boolean
  matricula: boolean
}

export interface RankingScoreResult {
  score: number
  breakdown: RankingScoreBreakdown
  breakdown_available: RankingScoreAvailability
  score_data_coverage_pct: number
  score_used_weight: number
  score_excluded_metrics: RankingScoreMetricStatus[]
  score_included_metrics: RankingScoreMetricStatus[]
}

export interface RankingScoreMetricStatus {
  key: 'acreditacion' | 'retencion' | 'paes' | 'matricula'
  label: string
  weight_pct: number
  source_field: string
  raw_value: number | null
  included: boolean
  reason: string
}

export interface RankingScoreInput {
  acreditacion_anos: number | null
  retencion_1er_ano_pct: number | null
  promedio_paes: number | null
  matricula_pregrado_actual: number | null
}

const WEIGHTS = {
  acreditacion: 0.4,
  retencion: 0.25,
  paes: 0.2,
  matricula: 0.15,
} as const

function clamp01To100(value: number) {
  return Math.min(Math.max(value, 0), 100)
}

function toAcreditacionScore(acreditacionAnios: number | null): number | null {
  if (acreditacionAnios === null || acreditacionAnios === undefined) return null
  return clamp01To100((acreditacionAnios / 7) * 100)
}

function toRetencionScore(retencion: number | null): number | null {
  if (retencion === null || retencion === undefined) return null
  return clamp01To100(retencion)
}

function toPaesScore(paes: number | null): number | null {
  if (paes === null || paes === undefined) return null
  return clamp01To100(((paes - 450) / 400) * 100)
}

function toMatriculaScore(matricula: number | null, maxLogMatricula: number): number | null {
  if (matricula === null || matricula === undefined || matricula <= 0) return null
  const log = Math.log(Math.max(matricula, 1))
  return clamp01To100((log / Math.max(maxLogMatricula, 1)) * 100)
}

export function computeRankingScore(row: RankingScoreInput, maxLogMatricula: number): RankingScoreResult {
  const acredScore = toAcreditacionScore(row.acreditacion_anos)
  const retScore = toRetencionScore(row.retencion_1er_ano_pct)
  const paesScore = toPaesScore(row.promedio_paes)
  const matScore = toMatriculaScore(row.matricula_pregrado_actual, maxLogMatricula)

  const metricStatuses: RankingScoreMetricStatus[] = [
    {
      key: 'acreditacion',
      label: 'Acreditación',
      weight_pct: Math.round(WEIGHTS.acreditacion * 100),
      source_field: 'acreditacion_anos',
      raw_value: row.acreditacion_anos,
      included: acredScore !== null,
      reason: acredScore !== null
        ? 'Incluida en el cálculo.'
        : 'No se encontró dato en SIES o no fue entregado por la fuente.',
    },
    {
      key: 'retencion',
      label: 'Retención 1er año',
      weight_pct: Math.round(WEIGHTS.retencion * 100),
      source_field: 'retencion_1er_ano_pct',
      raw_value: row.retencion_1er_ano_pct,
      included: retScore !== null,
      reason: retScore !== null
        ? 'Incluida en el cálculo.'
        : 'No se encontró dato en SIES o no fue entregado por la fuente.',
    },
    {
      key: 'paes',
      label: 'Promedio PAES',
      weight_pct: Math.round(WEIGHTS.paes * 100),
      source_field: 'promedio_paes',
      raw_value: row.promedio_paes,
      included: paesScore !== null,
      reason: paesScore !== null
        ? 'Incluida en el cálculo.'
        : 'No se encontró dato en SIES o no fue entregado por la fuente.',
    },
    {
      key: 'matricula',
      label: 'Matrícula pregrado',
      weight_pct: Math.round(WEIGHTS.matricula * 100),
      source_field: 'matricula_pregrado_actual',
      raw_value: row.matricula_pregrado_actual,
      included: matScore !== null,
      reason: matScore !== null
        ? 'Incluida en el cálculo.'
        : (row.matricula_pregrado_actual === null || row.matricula_pregrado_actual === undefined)
          ? 'No se encontró dato en SIES o no fue entregado por la fuente.'
          : 'Valor no válido en la fuente (<= 0).',
    },
  ]

  const metrics = [
    { value: acredScore, weight: WEIGHTS.acreditacion },
    { value: retScore, weight: WEIGHTS.retencion },
    { value: paesScore, weight: WEIGHTS.paes },
    { value: matScore, weight: WEIGHTS.matricula },
  ]

  let weightedSum = 0
  let usedWeight = 0
  for (const metric of metrics) {
    if (metric.value !== null) {
      weightedSum += metric.value * metric.weight
      usedWeight += metric.weight
    }
  }

  const normalized = usedWeight > 0 ? weightedSum / usedWeight : 0

  return {
    score: Math.round(normalized),
    breakdown: {
      acreditacion: Math.round(acredScore ?? 0),
      retencion: Math.round(retScore ?? 0),
      paes: Math.round(paesScore ?? 0),
      matricula: Math.round(matScore ?? 0),
    },
    breakdown_available: {
      acreditacion: acredScore !== null,
      retencion: retScore !== null,
      paes: paesScore !== null,
      matricula: matScore !== null,
    },
    score_data_coverage_pct: Math.round(usedWeight * 100),
    score_used_weight: Number(usedWeight.toFixed(2)),
    score_excluded_metrics: metricStatuses.filter(metric => !metric.included),
    score_included_metrics: metricStatuses.filter(metric => metric.included),
  }
}
