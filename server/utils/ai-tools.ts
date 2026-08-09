/**
 * Definiciones de "tools" (function calling) que puede invocar el LLM.
 * Formato compatible con OpenAI / Groq / GitHub Models.
 *
 * El orquestador (chat.post.ts / discover.post.ts) debe:
 *   1. Pasar `aiTools` al LLM en cada request.
 *   2. Si el LLM responde con tool_calls, ejecutar `runTool(name, args)`.
 *   3. Reenviar el resultado al LLM para que redacte la respuesta final.
 *
 * Regla de oro: la IA NO inventa cifras. Siempre consulta tools para ingresos,
 * empleabilidad, carreras y mallas. Solo interpreta/redacta.
 */
import { $fetch } from 'ofetch'
import { resolveInstitution } from './institution-resolver'
import { getSupabaseServiceClient } from './supabase-clients'

/** Techo por tool call. Sin esto un endpoint colgado bloquea el turno entero. */
const TOOL_TIMEOUT_MS = 8000

/**
 * Valores cerrados que los endpoints validan. Declararlos como `enum` en el
 * schema evita que el modelo invente variantes y ahorra un 400 de ida y vuelta.
 */
const TIPOS_INSTITUCION = ['Universidades', 'Institutos Profesionales', 'Centros de Formación Técnica'] as const

/** Claves de METRIC_MAP en server/api/tools/rank-careers.get.ts */
const RANK_CAREERS_METRICS = [
  'ingreso_1er', 'ingreso_2do', 'ingreso_4to', 'ingreso_5to',
  'empleabilidad_1er', 'empleabilidad_2do',
  'retencion', 'titulados', 'matricula',
] as const

/** Claves de METRIC_MAP en server/api/tools/rank-institutions.get.ts */
const RANK_INSTITUTIONS_METRICS = [
  'acreditacion', 'matricula', 'titulados', 'retencion', 'paes', 'nem',
  'duracion_real', 'm2', 'biblioteca', 'laboratorios', 'computadores',
] as const

const NIVELES_CARRERA = [
  'Profesional con Licenciatura',
  'Profesional sin Licenciatura',
  'Licenciatura no conducente a título',
  'Bachillerato/Ciclo Inicial/Plan Común',
  'Técnico de Nivel Superior',
  'Postítulo',
  'Diplomado',
  'Magíster',
  'Doctorado',
  'Especialidad Médica u Odontológica',
] as const

export const aiTools = [
  {
    type: 'function',
    function: {
      name: 'search_career_match',
      description:
        'Busca programas concretos (una carrera en una institución y sede) en la oferta oficial Mineduc/SIES, filtrando por keywords, área, región, tipo de institución, nivel o arancel. Devuelve una lista con datos básicos de cada programa. Úsala para "¿dónde puedo estudiar X?" o para encontrar el program_unique_code que necesitan otras tools. Para ordenar por una métrica usa rank_careers o rank_institutions.',
      parameters: {
        type: 'object',
        properties: {
          keywords: {
            type: 'array',
            items: { type: 'string' },
            description: 'Palabras clave de la carrera o interés del usuario (ej: ["enfermería"], ["programación","software"]).',
          },
          nombre_institucion: {
            type: 'string',
            description: 'Nombre, alias o sigla de una institución (ej: "Universidad de Chile", "PUCV", "Duoc"). Se resuelve automáticamente al código oficial. Úsalo cuando el usuario pregunte por una carrera EN una institución concreta.',
          },
          institution_code: {
            type: 'integer',
            description: 'Código MINEDUC de la institución. Tiene prioridad sobre nombre_institucion; úsalo solo si una tool anterior ya te lo devolvió.',
          },
          strict_institution: {
            type: 'boolean',
            default: false,
            description: 'Si true, devuelve solo programas de la institución indicada, sin rellenar con alternativas de otras.',
          },
          allow_broad_fallback: {
            type: 'boolean',
            default: false,
            description: 'Si true, permite mostrar programas de otras instituciones cuando la indicada no tiene resultados. Mantén false salvo que el usuario pida explícitamente alternativas.',
          },
          area: {
            type: 'string',
            description: 'Área de conocimiento (ej: "Salud", "Tecnología", "Educación"). Si no estás seguro del valor exacto, consulta get_filters_catalog.',
          },
          tipo_institucion: {
            type: 'string',
            enum: TIPOS_INSTITUCION,
            description: 'Restringe a un tipo de institución.',
          },
          tipos_institucion: {
            type: 'array',
            items: { type: 'string', enum: TIPOS_INSTITUCION },
            description: 'Úsalo cuando el usuario acepte más de un tipo, por ejemplo IP + CFT para "institutos técnicos".',
          },
          region: {
            type: 'string',
            description: 'Región de Chile, nombre completo o parcial (ej: "Metropolitana", "Valparaíso", "Biobío"). Para "Santiago" usa Metropolitana, salvo que el usuario pida la comuna exacta.',
          },
          comuna: {
            type: 'string',
            description: 'Comuna específica, solo si el usuario la menciona explícitamente (ej: "Providencia", "Concepción").',
          },
          nivel_carrera: {
            type: 'string',
            enum: NIVELES_CARRERA,
            description: 'Nivel académico. Para quien sale del colegio o rinde PAES, los niveles válidos son Profesional con Licenciatura, Profesional sin Licenciatura, Licenciatura no conducente a título, Bachillerato/Ciclo Inicial/Plan Común y Técnico de Nivel Superior. Postítulo, Diplomado, Magíster, Doctorado y Especialidad requieren formación previa.',
          },
          max_arancel: {
            type: 'number',
            description: 'Arancel anual máximo en pesos chilenos (ej: 3000000 para "menos de 3 millones").',
          },
          randomize: {
            type: 'boolean',
            default: false,
            description: 'Usa true cuando estés mostrando una vitrina exploratoria y convenga variar los programas presentados.',
          },
          limit: {
            type: 'number',
            default: 10,
            minimum: 1,
            maximum: 25,
            description: 'Número de programas a devolver (máximo 25).',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_institution',
      description:
        'Ficha completa de UNA institución: acreditación, matrícula, titulados, retención, sede, sitio web y promedios NEM/PAES. Úsala cuando pregunten por una universidad, IP o CFT concreto. Acepta nombre parcial o sigla. Para datos de una carrera dentro de esa institución usa get_program_detail o get_career_employability_by_institution.',
      parameters: {
        type: 'object',
        required: ['nombre_institucion'],
        properties: {
          nombre_institucion: {
            type: 'string',
            description: 'Nombre, parte del nombre, alias o sigla de la institución (ej: "Diego Portales", "UDP", "Duoc UC").',
          },
          institution_code: {
            type: 'integer',
            description: 'Código MINEDUC, si una tool anterior ya te lo devolvió. Tiene prioridad sobre el nombre.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_program_detail',
      description:
        'Ficha de UN programa concreto (una carrera en una institución y sede): vacantes, arancel, puntaje de corte, ponderaciones PAES, jornada, duración y acreditación. Incluye los topes de financiamiento —arancel_referencia_becas (BES/BJG/BAES), arancel_referencia_creditos (CAE/Fondo Solidario)— y las brechas que el alumno paga de su bolsillo. Úsala para preguntas de costo, admisión o financiamiento de una carrera específica.',
      parameters: {
        type: 'object',
        properties: {
          program_unique_code: {
            type: 'string',
            description: 'Código único MINEDUC del programa (ej: "I1S1C10J4V1"). Es la forma más precisa; si no lo tienes, usa nombre_carrera + nombre_institucion.',
          },
          nombre_carrera: {
            type: 'string',
            description: 'Nombre o parte del nombre de la carrera tal como la ofrece la institución.',
          },
          nombre_institucion: {
            type: 'string',
            description: 'Nombre, alias o sigla de la institución que imparte el programa.',
          },
          institution_code: {
            type: 'integer',
            description: 'Código MINEDUC de la institución. Tiene prioridad sobre nombre_institucion.',
          },
          sede: {
            type: 'string',
            description: 'Sede específica, para desambiguar cuando la carrera se dicta en varias (ej: "Santiago", "Viña del Mar").',
          },
          jornada: {
            type: 'string',
            enum: ['Diurno', 'Vespertino', 'Semipresencial', 'A distancia', 'Otro'],
            description: 'Jornada, para desambiguar cuando la carrera se dicta en más de una.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_career_stats_detailed',
      description:
        'Ingresos y empleabilidad de una carrera GENÉRICA a nivel nacional (promedios del sector, NO de una institución concreta). Devuelve ingresos del 1° al 5° año post-titulación, empleabilidad de 1° y 2° año, retención, titulados, matrícula y duración real. Si el usuario pregunta por una institución específica usa get_career_employability_by_institution.',
      parameters: {
        type: 'object',
        required: ['nombre_carrera_generica'],
        properties: {
          nombre_carrera_generica: {
            type: 'string',
            description: 'Nombre de la carrera genérica SIES (ej: "Enfermería", "Ingeniería Comercial", "Técnico en Enfermería").',
          },
          tipo_institucion: {
            type: 'string',
            enum: TIPOS_INSTITUCION,
            description: 'Filtra por tipo de institución. Pásalo SIEMPRE que el usuario hable de un IP o CFT: los ingresos universitarios son mucho más altos y contaminarían el promedio.',
          },
          area: {
            type: 'string',
            description: 'Área de conocimiento, para desambiguar carreras de nombre parecido.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_career_employability_by_institution',
      description:
        'Ingresos y empleabilidad de una carrera EN una institución concreta (a diferencia de get_career_stats_detailed, que da el promedio nacional). Úsala para "¿cuánto gana un ingeniero comercial de la UDP?" o para comparar la misma carrera entre universidades. Al citar ingresos prefiere el campo ingreso_label cuando exista.',
      parameters: {
        type: 'object',
        properties: {
          nombre_carrera_generica: {
            type: 'string',
            description: 'Nombre de la carrera genérica SIES (ej: "Derecho", "Psicología").',
          },
          nombre_institucion: {
            type: 'string',
            description: 'Nombre, alias o sigla de la institución (ej: "UDP", "Universidad de Chile").',
          },
          institution_code: {
            type: 'integer',
            description: 'Código MINEDUC de la institución. Tiene prioridad sobre nombre_institucion.',
          },
          area: {
            type: 'string',
            description: 'Área de conocimiento. Úsala sola para listar la empleabilidad de todas las carreras de un área.',
          },
          limit: {
            type: 'integer',
            default: 15,
            minimum: 1,
            maximum: 30,
            description: 'Número de filas a devolver (máximo 30).',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'rank_careers',
      description:
        'TOP N de carreras genéricas ordenadas por una métrica oficial. Úsala para "las mejor pagadas", "las de peor empleabilidad", "las más tituladas". Si necesitas filtrar por región o buscar programas concretos usa search_career_match.',
      parameters: {
        type: 'object',
        required: ['metric'],
        properties: {
          metric: {
            type: 'string',
            enum: RANK_CAREERS_METRICS,
            description: 'Métrica por la que ordenar. ingreso_4to es el ingreso promedio al 4° año post-titulación y es el más representativo para "cuánto se gana".',
          },
          order: {
            type: 'string',
            enum: ['desc', 'asc'],
            default: 'desc',
            description: 'desc para las mejores/mayores, asc para las peores/menores.',
          },
          tipo_institucion: {
            type: 'string',
            enum: TIPOS_INSTITUCION,
            description: 'Restringe el ranking a un tipo de institución. Pásalo cuando el usuario hable de carreras técnicas o de IP/CFT.',
          },
          area: {
            type: 'string',
            description: 'Restringe el ranking a un área de conocimiento (ej: "Salud").',
          },
          limit: {
            type: 'integer',
            default: 10,
            minimum: 1,
            maximum: 25,
            description: 'Cuántas carreras devolver (máximo 25).',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'rank_institutions',
      description:
        'TOP N de instituciones ordenadas por una métrica oficial. Úsala para "las más acreditadas", "las de mayor matrícula", "las de mejor infraestructura". Para comparar 2 a 4 instituciones concretas lado a lado usa compare_institutions.',
      parameters: {
        type: 'object',
        required: ['metric'],
        properties: {
          metric: {
            type: 'string',
            enum: RANK_INSTITUTIONS_METRICS,
            description: 'Métrica por la que ordenar. acreditacion son años de acreditación; m2, biblioteca, laboratorios y computadores son indicadores de infraestructura.',
          },
          order: {
            type: 'string',
            enum: ['desc', 'asc'],
            default: 'desc',
            description: 'desc para las mejores/mayores, asc para las peores/menores.',
          },
          tipo_institucion: {
            type: 'string',
            enum: TIPOS_INSTITUCION,
            description: 'Restringe el ranking a un tipo de institución.',
          },
          limit: {
            type: 'integer',
            default: 10,
            minimum: 1,
            maximum: 25,
            description: 'Cuántas instituciones devolver (máximo 25).',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'compare_institutions',
      description:
        'Compara de 2 a 4 instituciones lado a lado: acreditación, matrícula, retención, duración real, infraestructura y promedios NEM/PAES. Devuelve además quién gana en cada métrica. Úsala para "¿cuál es mejor entre A y B?". Para un TOP general usa rank_institutions.',
      parameters: {
        type: 'object',
        required: ['nombres'],
        properties: {
          nombres: {
            type: 'string',
            description: 'Nombres o siglas separados por coma, entre 2 y 4 (ej: "UDP,Universidad Central"). Es una cadena, NO un array.',
          },
          institution_codes: {
            type: 'string',
            description: 'Códigos MINEDUC separados por coma (ej: "12,45"). Alternativa a nombres si ya los tienes.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'compare_curriculums',
      description:
        'Compara las mallas curriculares de hasta 5 programas, identificados por program_unique_code (obtenlos con search_career_match). Si un programa no tiene malla cargada devuelve status=pending_scrape: en ese caso di que la malla no está disponible y NO inventes ramos.',
      parameters: {
        type: 'object',
        required: ['programCodes'],
        properties: {
          programCodes: {
            type: 'array',
            items: { type: 'string' },
            maxItems: 5,
            description: 'Códigos únicos MINEDUC de los programas a comparar (ej: ["I1S1C10J4V1"]). Máximo 5.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_filters_catalog',
      description:
        'Devuelve los valores válidos de los filtros: áreas de conocimiento, tipos de institución, niveles de carrera, regiones y comunas. Úsala cuando no estés seguro del valor exacto de un filtro, o cuando una búsqueda falle porque un valor no fue reconocido.',
      parameters: { type: 'object', properties: {} },
    },
  },
] as const

type ToolName =
  | 'search_career_match'
  | 'compare_curriculums'
  | 'compare_institutions'
  | 'get_institution'
  | 'get_program_detail'
  | 'get_career_stats_detailed'
  | 'rank_careers'
  | 'rank_institutions'
  | 'get_career_employability_by_institution'
  | 'get_filters_catalog'

/**
 * Tools que aceptan institución como parámetro. Antes de invocarlas,
 * resolvemos el `nombre_institucion` al `institution_code` oficial usando
 * el resolver central. Esto evita los mismatches históricos "IP AIEP" vs
 * "Instituto Profesional AIEP" y garantiza que todas las tools usen la
 * misma identidad de institución.
 */
const TOOLS_WITH_INSTITUTION = new Set<ToolName>([
  'search_career_match',
  'get_career_employability_by_institution',
  'get_institution',
  'get_program_detail',
])

/**
 * Resuelve el nombre de institución a su `institution_code` oficial.
 *
 * Devuelve una copia de `args` (no muta el objeto del llamador) y un flag
 * `resolved`: si la resolución falla, quien llama debe saberlo, porque seguir
 * con el nombre crudo puede devolver datos de OTRA institución y atribuirlos
 * a la que pidió el usuario.
 */
async function resolveInstitutionInArgs(args: any): Promise<{ args: any; resolved: boolean; failed: boolean }> {
  if (!args || typeof args !== 'object') return { args, resolved: false, failed: false }

  const next = { ...args }
  // El schema unificó todo a `nombre_institucion`, pero seguimos aceptando los
  // alias antiguos (`nombre`, `institution`) por si el modelo los emite por
  // inercia o quedan llamadas en vuelo con el schema previo.
  const nombreKey = next.nombre_institucion
    ? 'nombre_institucion'
    : next.nombre
      ? 'nombre'
      : next.institution
        ? 'institution'
        : null
  if (!nombreKey) return { args: next, resolved: false, failed: false }
  if (next.institution_code) return { args: next, resolved: true, failed: false }

  try {
    const supabase = getSupabaseServiceClient({ fallbackToAnon: true })
    if (!supabase) return { args: next, resolved: false, failed: false }

    const r = await resolveInstitution(supabase, next[nombreKey])
    if (!r) return { args: next, resolved: false, failed: true }

    next.institution_code = r.institution_code
    if (nombreKey === 'institution') next.institution = r.nombre_oficial
    return { args: next, resolved: true, failed: false }
  } catch (e) {
    console.warn('[runTool] resolveInstitution failed:', e)
    return { args: next, resolved: false, failed: true }
  }
}

/**
 * Ejecuta una tool llamando al endpoint interno correspondiente.
 * Úsalo desde un API route de servidor:
 *   const result = await runTool('search_career_match', args, event)
 */
export async function runTool(name: ToolName, args: any, event?: any) {
  const base = event ? getRequestURL(event).origin : ''
  // Forwardea el Authorization del request original. Como las tools internas
  // exigen JWT (para cerrar la puerta a llamadas externas anónimas), aquí
  // re-inyectamos el bearer del usuario que ya pasó requireAuth en /api/chat.
  const authHeader = event ? getHeader(event, 'authorization') : ''
  const headers = authHeader ? { Authorization: authHeader } : undefined
  // Sin timeout un endpoint colgado bloquea el turno entero. callLLM ya usa
  // AbortSignal.timeout(20000); las tools deben tener su propio techo.
  const timeout = TOOL_TIMEOUT_MS

  let institutionUnresolved = false
  if (TOOLS_WITH_INSTITUTION.has(name)) {
    const resolution = await resolveInstitutionInArgs(args)
    args = resolution.args
    institutionUnresolved = resolution.failed
  }

  const result = await dispatchTool(name, args, base, headers, timeout)

  // Aviso explícito al modelo: los datos pueden no ser de la IES que pidió.
  if (institutionUnresolved && result && typeof result === 'object' && !Array.isArray(result)) {
    return {
      ...result,
      institution_resolution_warning:
        'No se pudo resolver la institución mencionada a un registro oficial. Verifica el nombre con el usuario antes de atribuir estos datos a esa institución.',
    }
  }
  return result
}

/**
 * Traduce los nombres de parámetro del schema (unificados y explícitos, para
 * que el LLM no confunda `institution` / `nombre` / `nombre_institucion`) a los
 * que espera cada endpoint. Mantener el contrato HTTP intacto evita romper a
 * otros consumidores de /api/tools/*.
 */
const PARAM_ALIASES: Partial<Record<ToolName, Record<string, string>>> = {
  search_career_match: { nombre_institucion: 'institution' },
  get_institution: { nombre_institucion: 'nombre' },
  get_career_employability_by_institution: { nombre_carrera_generica: 'nombre_carrera' },
}

function applyParamAliases(name: ToolName, args: any): any {
  const aliases = PARAM_ALIASES[name]
  if (!aliases || !args || typeof args !== 'object') return args

  const out: any = { ...args }
  for (const [schemaKey, endpointKey] of Object.entries(aliases)) {
    if (out[schemaKey] !== undefined && out[endpointKey] === undefined) {
      out[endpointKey] = out[schemaKey]
      delete out[schemaKey]
    }
  }
  return out
}

async function dispatchTool(name: ToolName, args: any, base: string, headers: any, timeout: number): Promise<any> {
  args = applyParamAliases(name, args)
  switch (name) {
    case 'get_institution':
      return await $fetch(`${base}/api/tools/get-institution`, { method: 'GET', query: args, headers, timeout })
    case 'get_program_detail':
      return await $fetch(`${base}/api/tools/get-program-detail`, { method: 'GET', query: args, headers, timeout })
    case 'get_career_stats_detailed':
      return await $fetch(`${base}/api/tools/career-stats-detailed`, { method: 'GET', query: args, headers, timeout })
    case 'search_career_match':
      return await $fetch(`${base}/api/tools/search-career-match`, { method: 'POST', body: args, headers, timeout })
    case 'rank_careers':
      return await $fetch(`${base}/api/tools/rank-careers`, { method: 'GET', query: args, headers, timeout })
    case 'rank_institutions':
      return await $fetch(`${base}/api/tools/rank-institutions`, { method: 'GET', query: args, headers, timeout })
    case 'get_career_employability_by_institution':
      return await $fetch(`${base}/api/tools/career-employability-by-institution`, { method: 'GET', query: args, headers, timeout })
    case 'get_filters_catalog':
      return await $fetch(`${base}/api/tools/filters-catalog`, { method: 'GET', headers, timeout })
    case 'compare_curriculums':
      return await $fetch(`${base}/api/tools/compare-curriculums`, { method: 'POST', body: args, headers, timeout })
    case 'compare_institutions':
      return await $fetch(`${base}/api/tools/compare-institutions`, { method: 'GET', query: args, headers, timeout })
    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}
