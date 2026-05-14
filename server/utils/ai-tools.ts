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

export const aiTools = [
  {
    type: 'function',
    function: {
      name: 'search_career_match',
      description:
        'Busca programas oficiales (Mineduc/SIES) por keywords/área/región/tipo institución/arancel. Devuelve lista con stats.',
      parameters: {
        type: 'object',
        properties: {
          keywords: { type: 'array', items: { type: 'string' }, description: 'Palabras clave de interés' },
          institution: { type: 'string', description: 'Nombre o sigla de una institución específica (ej: "Universidad de Chile", "PUCV"). Úsalo cuando el usuario pregunte por una carrera EN una institución concreta.' },
          institution_code: { type: 'integer', description: 'Código MINEDUC de la institución si ya fue resuelta. Tiene prioridad sobre institution.' },
          strict_institution: { type: 'boolean', description: 'Si true, devuelve solo programas de la institución indicada; no rellena con alternativas de otras instituciones.' },
          allow_broad_fallback: { type: 'boolean', description: 'Si true, permite alternativas de otras instituciones cuando no hay resultados en la institución indicada. Por defecto debe ser false.' },
          area: { type: 'string', description: 'Área genérica de conocimiento (ej: Tecnología, Salud)' },
          tipo_institucion: {
            type: 'string',
            enum: ['Universidades', 'Institutos Profesionales', 'Centros de Formación Técnica'],
          },
          tipos_institucion: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['Universidades', 'Institutos Profesionales', 'Centros de Formación Técnica'],
            },
            description: 'Úsalo cuando el usuario acepte más de un tipo, por ejemplo IP + CFT para "institutos técnicos".',
          },
          region: { type: 'string', description: 'Región de Chile. Usa el nombre completo o parcial tal como aparece en el catálogo (ej: "Metropolitana", "Valparaíso", "Biobío"). Para "Santiago" usa Metropolitana salvo que el usuario pida la comuna exacta.' },
          comuna: { type: 'string', description: 'Comuna de Chile si el usuario la menciona explícitamente (ej: Santiago, Providencia, Concepción).' },
          nivel_carrera: { type: 'string', description: 'Nivel académico solicitado por el usuario. Para post-PAES/colegio usa nivel_carrera directo: Profesional con Licenciatura, Profesional sin Licenciatura, Licenciatura no conducente a título, Bachillerato/Ciclo Inicial/Plan Común o Técnico de Nivel Superior. Postítulo, Diplomado, Magíster, Doctorado y Especialidad Médica/Odontológica son post formación previa.' },
          max_arancel: { type: 'number', description: 'Arancel anual máximo en CLP' },
          randomize: { type: 'boolean', description: 'Usa true cuando Kora esté explorando opciones y deba mostrar una muestra variada de programas.' },
          limit: { type: 'number', default: 10 },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_financial_stats',
      description:
        'Ingresos y empleabilidad oficiales (MiFuturo/SIES) por carrera genérica. Requiere area+tipo_institucion.',
      parameters: {
        type: 'object',
        required: ['area', 'tipo_institucion'],
        properties: {
          area: { type: 'string' },
          tipo_institucion: { type: 'string' },
          nombre_carrera_generica: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_institution',
      description:
        'Ficha de una institución (universidad/IP/CFT): matrícula, retención, titulados, sede, acreditación, web, NEM/PAES. Usa cuando pregunten por una universidad concreta. Acepta nombre parcial.',
      parameters: {
        type: 'object',
        properties: {
          nombre: { type: 'string', description: 'Nombre o parte del nombre de la institución' },
          institution_code: { type: 'integer', description: 'Código MINEDUC si lo conoces' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_program_detail',
      description:
        'Ficha de UN programa (carrera-en-universidad): sede, jornada, vacantes, arancel, puntaje corte, ponderaciones PAES, acreditación, duración. Incluye arancel_referencia_becas (tope BES/BJG/BAES), arancel_referencia_creditos (tope CAE/Fondo Solidario), brecha_arancel_becas y brecha_arancel_creditos (lo que paga el alumno de su bolsillo). Usa estos datos para responder preguntas sobre financiamiento, becas o créditos.',
      parameters: {
        type: 'object',
        properties: {
          program_unique_code: { type: 'string', description: 'Código único MINEDUC si lo conoces' },
          nombre_carrera: { type: 'string', description: 'Nombre o parte del nombre de la carrera' },
          nombre_institucion: { type: 'string', description: 'Nombre/alias/sigla de la IES (se resuelve automáticamente al institution_code)' },
          institution_code: { type: 'integer', description: 'Código MINEDUC de la IES (opcional, prioritario sobre nombre)' },
          sede: { type: 'string', description: 'Filtro opcional por sede' },
          jornada: { type: 'string', description: 'Filtro opcional: Diurna, Vespertina, etc.' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_career_stats_detailed',
      description:
        'Stats DETALLADAS de carrera genérica: ingresos al 1°-5° año post-titulación (son promedios sectoriales, NO por institución específica), empleabilidad 1°/2° año, retención, titulados, matrícula, duración real, evolución. IMPORTANTE: si el usuario pregunta por un CFT o IP, DEBES pasar tipo_institucion="Institutos Profesionales" o "Centros de Formación Técnica" para evitar que los datos universitarios (salarios mucho mayores) contaminen el resultado. Los ingresos representan el ingreso promedio AL 4° AÑO post-titulación, no el primer sueldo.',
      parameters: {
        type: 'object',
        required: ['nombre_carrera_generica'],
        properties: {
          nombre_carrera_generica: { type: 'string', description: 'Nombre de la carrera genérica (ej: "Asistente Ejecutivo")' },
          tipo_institucion: {
            type: 'string',
            enum: ['Universidades', 'Institutos Profesionales', 'Centros de Formación Técnica'],
          },
          area: { type: 'string', description: 'Área genérica de conocimiento' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'compare_institutions',
      description:
        'Compara hasta 4 instituciones: acreditación, matrícula, retención, duración real, infraestructura (m2/biblioteca/labs), NEM/PAES. Usa para "¿cuál es mejor en X?" entre universidades.',
      parameters: {
        type: 'object',
        properties: {
          nombres: { type: 'string', description: 'Nombres separados por coma, ej: "UDP,Universidad Central"' },
          institution_codes: { type: 'string', description: 'Códigos MINEDUC separados por coma, ej: "3,4"' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'rank_careers',
      description:
        'TOP N carreras por métrica. Usa para "mejor pagadas", "peor empleabilidad", "más tituladas". Métricas: ingreso_1er/2do/4to/5to, empleabilidad_1er/2do, retencion, titulados, matricula.',
      parameters: {
        type: 'object',
        properties: {
          metric: { type: 'string' },
          order: { type: 'string', enum: ['desc', 'asc'] },
          tipo_institucion: { type: 'string' },
          area: { type: 'string' },
          limit: { type: 'integer' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'rank_institutions',
      description:
        'TOP N instituciones por métrica. Usa para "más acreditadas", "mejor infraestructura", "más matrícula". Métricas: acreditacion, matricula, titulados, retencion, paes, nem, duracion_real, m2, biblioteca, laboratorios, computadores.',
      parameters: {
        type: 'object',
        properties: {
          metric: { type: 'string' },
          order: { type: 'string', enum: ['desc', 'asc'] },
          tipo_institucion: { type: 'string' },
          limit: { type: 'integer' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_career_employability_by_institution',
      description:
        'Empleabilidad+ingreso por carrera genérica EN una institución específica. Devuelve ingreso_label, ingreso_promedio_4to_ano_clp, empleabilidad_1_ano_pct y empleabilidad_2_ano_pct. Usa esta tool para comparar "sueldo Ing. Comercial UDP vs UChile" o "empleabilidad Psicología por universidad". Al citar ingresos privilegia ingreso_label cuando exista y no inventes rangos.',
      parameters: {
        type: 'object',
        properties: {
          nombre_carrera: { type: 'string' },
          nombre_institucion: { type: 'string', description: 'Nombre/alias/sigla de la IES (se resuelve automáticamente al institution_code oficial)' },
          institution_code: { type: 'integer', description: 'Código MINEDUC si lo conoces (opcional, tiene prioridad sobre el nombre)' },
          area: { type: 'string' },
          limit: { type: 'integer' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_filters_catalog',
      description:
        'Catálogo de valores válidos: áreas, tipos de institución, niveles, regiones y comunas de Chile. Usa si dudas del valor exacto de un filtro.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'compare_curriculums',
      description:
        'Compara mallas curriculares de hasta 5 programas por program_unique_code. Si no hay malla, devuelve metadata oficial. NO inventes ramos si status=pending_scrape.',
      parameters: {
        type: 'object',
        required: ['programCodes'],
        properties: {
          programCodes: {
            type: 'array',
            items: { type: 'string' },
            maxItems: 5,
            description: 'Códigos únicos de carrera (ej: I1S1C10J4V1)',
          },
        },
      },
    },
  },
] as const

type ToolName =
  | 'search_career_match'
  | 'get_financial_stats'
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

async function resolveInstitutionInArgs(args: any) {
  if (!args || typeof args !== 'object') return args
  const nombreKey = args.nombre_institucion ? 'nombre_institucion' : args.nombre ? 'nombre' : args.institution ? 'institution' : null
  if (!nombreKey) return args
  if (args.institution_code) return args
  try {
    const supabase = getSupabaseServiceClient({ fallbackToAnon: true })
    if (!supabase) return args

    const r = await resolveInstitution(supabase, args[nombreKey])
    if (r) {
      args.institution_code = r.institution_code
      args._resolved_nombre_oficial = r.nombre_oficial
      args._resolved_via = r.via
      if (nombreKey === 'institution') args.institution = r.nombre_oficial
    }
  } catch (e) {
    console.warn('[runTool] resolveInstitution failed:', e)
  }
  return args
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

  if (TOOLS_WITH_INSTITUTION.has(name)) {
    args = await resolveInstitutionInArgs(args)
  }
  switch (name) {
    case 'get_institution':
      return await $fetch(`${base}/api/tools/get-institution`, { method: 'GET', query: args, headers })
    case 'get_program_detail':
      return await $fetch(`${base}/api/tools/get-program-detail`, { method: 'GET', query: args, headers })
    case 'get_career_stats_detailed':
      return await $fetch(`${base}/api/tools/career-stats-detailed`, { method: 'GET', query: args, headers })
    case 'search_career_match':
      return await $fetch(`${base}/api/tools/search-career-match`, { method: 'POST', body: args, headers })
    case 'get_financial_stats':
      return await $fetch(`${base}/api/tools/financial-stats`, { method: 'GET', query: args, headers })
    case 'rank_careers':
      return await $fetch(`${base}/api/tools/rank-careers`, { method: 'GET', query: args, headers })
    case 'rank_institutions':
      return await $fetch(`${base}/api/tools/rank-institutions`, { method: 'GET', query: args, headers })
    case 'get_career_employability_by_institution':
      return await $fetch(`${base}/api/tools/career-employability-by-institution`, { method: 'GET', query: args, headers })
    case 'get_filters_catalog':
      return await $fetch(`${base}/api/tools/filters-catalog`, { method: 'GET', headers })
    case 'compare_curriculums':
      return await $fetch(`${base}/api/tools/compare-curriculums`, { method: 'POST', body: args, headers })
    case 'compare_institutions':
      return await $fetch(`${base}/api/tools/compare-institutions`, { method: 'GET', query: args, headers })
    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}
