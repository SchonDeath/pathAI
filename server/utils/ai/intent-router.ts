export type ChatIntentKind =
  | 'greeting'
  | 'official_salary'
  | 'official_program'
  | 'institution_info'
  | 'ranking'
  | 'comparison'
  | 'career_recommendation'
  | 'general'

export interface ChatIntent {
  kind: ChatIntentKind
  complexity: 'cheap' | 'standard' | 'deep'
  needsOfficialData: boolean
  maxToolRounds: number
  maxToolCallsPerRound: number
  maxToolCallsTotal: number
}

function normalize(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export function classifyChatIntent(message: string): ChatIntent {
  const text = normalize(message)

  if (/^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|holi)[!?.\s]*$/.test(text)) {
    return {
      kind: 'greeting',
      complexity: 'cheap',
      needsOfficialData: false,
      maxToolRounds: 0,
      maxToolCallsPerRound: 0,
      maxToolCallsTotal: 0,
    }
  }

  if (/compar(ar|a|ame|acion)|versus|\bvs\b|diferencia/.test(text)) {
    return {
      kind: 'comparison',
      complexity: 'deep',
      needsOfficialData: true,
      maxToolRounds: 3,
      maxToolCallsPerRound: 2,
      maxToolCallsTotal: 5,
    }
  }

  if (/sueldo|salario|gana|ingreso|empleabilid|retencion|titulad/.test(text)) {
    return {
      kind: 'official_salary',
      complexity: 'standard',
      needsOfficialData: true,
      maxToolRounds: 2,
      maxToolCallsPerRound: 2,
      maxToolCallsTotal: 3,
    }
  }

  if (/arancel|puntaje|ponderaci|corte|vacante|jornada|sede|malla|ramos?|semestres?|duracion/.test(text)) {
    return {
      kind: 'official_program',
      complexity: 'standard',
      needsOfficialData: true,
      maxToolRounds: 2,
      maxToolCallsPerRound: 2,
      maxToolCallsTotal: 3,
    }
  }

  if (/universidad|instituto|\bcft\b|duoc|inacap|usach|udp|uchile|uc\b|puc|uai|unab|udla|umayor|santo tomas|acreditaci|infraestructura|biblioteca|laboratori/.test(text)) {
    return {
      kind: 'institution_info',
      complexity: 'standard',
      needsOfficialData: true,
      maxToolRounds: 2,
      maxToolCallsPerRound: 2,
      maxToolCallsTotal: 3,
    }
  }

  if (/ranking|top|mejor(es)?|peor(es)?|mayor|menor|lista/.test(text)) {
    return {
      kind: 'ranking',
      complexity: 'standard',
      needsOfficialData: true,
      maxToolRounds: 2,
      maxToolCallsPerRound: 2,
      maxToolCallsTotal: 3,
    }
  }

  if (/que estudiar|recomiend|orienta|me gusta|intereses|habilidades|vocacion|perfil/.test(text)) {
    return {
      kind: 'career_recommendation',
      complexity: 'deep',
      needsOfficialData: false,
      maxToolRounds: 2,
      maxToolCallsPerRound: 2,
      maxToolCallsTotal: 3,
    }
  }

  return {
    kind: 'general',
    complexity: 'cheap',
    needsOfficialData: false,
    maxToolRounds: 2,
    maxToolCallsPerRound: 1,
    maxToolCallsTotal: 2,
  }
}
