// POST /api/chat
// IA conversacional con RAG híbrido (pgvector) + cache semántico + tool calling.
//
// Flujo:
//   1. Check cache semántico → si hit > 0.93 similitud, devuelve sin LLM.
//   2. Retrieve híbrido (search_hybrid RPC) → inyecta datos reales al system prompt.
//   3. LLM (con tools específicas) → redacta respuesta.
//   4. Guarda (pregunta, respuesta) en cache para futuros hits.
//
// Body: { sessionId?: string, messages: [{role,content}], careersContext?: {...} }

import { aiTools, runTool } from '~/server/utils/ai-tools'
import { retrieveContext, formatContext } from '~/server/utils/hybrid-retrieval'
import { checkSemanticCache, saveSemanticCache, isVolatileAnswer } from '~/server/utils/semantic-cache'
import { requireAuth } from '~/server/utils/require-auth'
import { classifyChatIntent } from '~/server/utils/ai/intent-router'
import { getAiBudgetState } from '~/server/utils/ai/budget'
import { normalizeSessionId, persistChatTurn } from '~/server/utils/ai/chat-persistence'
import { captureLlmUsage, logAiUsageEvent, type CapturedLlmUsage } from '~/server/utils/ai/usage-logger'
import { resolveGratuidad } from '~/server/utils/gratuidad'
import { randomUUID } from 'node:crypto'

const BASE_SYSTEM_PROMPT = `Eres KoraChile, asistente de orientación vocacional para Chile. Responde en español, tono cálido y conciso (2-4 párrafos). Fuente: datos SIES/Mineduc 2026. Nunca inventes números — si la tool no devuelve el dato, dilo y sugiere mifuturo.cl.

TOOLS — cuándo usar cada una:
- Institución específica mencionada + sueldo/empleabilidad → get_career_employability_by_institution (devuelve rango textual exacto, cítalo tal cual).
- Sueldo/empleabilidad sin institución → get_career_stats_detailed.
- Puntaje, arancel, vacantes, duración, malla → get_program_detail o search_career_match.
- Info de institución (sede, acreditación, matrícula, CRUCH) → get_institution; para CRUCH lee tipo_institucion_detalle.
- Ranking/comparación → rank_careers / rank_institutions / compare_institutions.
- Carrera en institución específica: usa parámetro "institution" en search_career_match. Si found_in_institution=false, muestra primero related_in_institution ("programas relacionados en esa institución") y luego results como alternativas.

REGLAS CRÍTICAS:
- Ingresos = "Ingreso Promedio al 4° año post-titulación". Cita el rango tal cual, no calcules promedio.
- Puntajes: solo puntaje_promedio_matriculados de la tool. Si es null → "No encontré puntaje PAES". No menciones puntajes en IPs/CFTs.
- Si tool devuelve vacío → "No encontré datos SIES para esa carrera."
- Nunca menciones nombres de funciones/tablas internas.
- Financiamiento: usa arancel_referencia_becas (tope becas BES/BJG/BAES) y arancel_referencia_creditos (tope CAE). Calcula y muestra la brecha si corresponde.
- Sin datos: gratuidad individual, fechas DEMRE, rankings QS/Times → "No tengo ese dato, revisa mifuturo.cl".
- Follow-up corto ("y el sueldo?") → infiere carrera e institución del contexto y llama la tool antes de responder.`

/**
 * Siempre retorna BASE_SYSTEM_PROMPT sin modificar.
 * El careersContext se inyecta como segundo mensaje de sistema separado
 * para que el prefijo estático sea siempre idéntico (activa prompt caching de OpenAI).
 */
function buildSystemPrompt(_careersContext?: any): string {
  return BASE_SYSTEM_PROMPT
}

/** Construye el mensaje de contexto de carreras para inyectar por separado. */
function buildCareersContextMessage(careersContext: any): string | null {
  if (!careersContext?.careers?.length) return null

  const careersList = careersContext.careers.slice(0, 3).map((c: any) => {
    const salary = c.salary_source === 'sies' && c.salary_range?.junior
      ? `Ingreso SIES 1° año: $${c.salary_range.junior.toLocaleString('es-CL')} CLP`
      : ''
    return `- ${clipText(c.title, 80)} (match: ${Number(c.match_score) || 0}%): ${clipText(c.description, 200)}. Skills: ${(c.skills ?? []).slice(0, 4).map((s: any) => clipText(s, 30)).join(', ')}. ${salary}. Demanda: ${clipText(c.job_demand, 25)}.`
  }).join('\n')

  return `CONTEXTO DEL USUARIO: Describió sus intereses como "${clipText(careersContext.query, 400)}". Carreras recomendadas:\n${careersList}`
}

// ── helpers ───────────────────────────────────────────────
// Carga aliases desde JSON — edita utils/institution-aliases.json para agregar nuevos.
import aliasesData from '~/utils/institution-aliases.json'

const INSTITUTION_ALIASES: Record<string, string> = {}
for (const entry of aliasesData) {
  for (const alias of entry.aliases) {
    INSTITUTION_ALIASES[alias.toLowerCase()] = entry.nombre_oficial
  }
}

/**
 * Reemplaza siglas conocidas por el nombre oficial antes de enviar al LLM.
 * Ordenamos de más largo a más corto para evitar solapamientos (ej: "pucv" antes que "uc").
 */
const SORTED_ALIASES = Object.entries(INSTITUTION_ALIASES)
  .sort(([a], [b]) => b.length - a.length)

const OFFICIAL_INSTITUTIONS = Array.from(
  new Set((aliasesData as Array<{ nombre_oficial: string }>).map(e => e.nombre_oficial).filter(Boolean)),
)
const OFFICIAL_BY_LOWER = new Map(OFFICIAL_INSTITUTIONS.map(n => [n.toLowerCase(), n]))

function resolveInstitutionAliases(text: string): string {
  let result = text
  for (const [alias, full] of SORTED_ALIASES) {
    // Match como palabra completa, case-insensitive.
    // \b en JS solo reconoce [A-Za-z0-9_] como carácter de palabra, lo que aquí
    // nos conviene: todas las siglas son ASCII y no queremos que "uc" matchee
    // dentro de palabras largas. Además escapamos caracteres regex del alias.
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`\\b${escaped}\\b`, 'gi')
    result = result.replace(re, full)
  }
  return result
}

function detectMentionedInstitution(text: string): string | null {
  if (!text) return null
  const lowered = text.toLowerCase()

  // 1) Primero, buscar aliases/siglas conocidas (AIEP, UChile, PUCV, etc.)
  for (const [alias, full] of SORTED_ALIASES) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`\\b${escaped}\\b`, 'i')
    if (re.test(lowered)) return full
  }

  // 2) Luego, buscar nombres oficiales ya resueltos en el texto.
  for (const [nameLower, original] of OFFICIAL_BY_LOWER.entries()) {
    if (lowered.includes(nameLower)) return original
  }
  return null
}

function inferTipoInstitucion(institutionName: string | null): string | null {
  if (!institutionName) return null
  const s = institutionName.toLowerCase()
  if (s.includes('ip ') || s.includes('instituto profesional')) return 'Institutos Profesionales'
  if (s.includes('cft ') || s.includes('centro de formacion tecnica') || s.includes('centro de formación técnica')) {
    return 'Centros de Formación Técnica'
  }
  if (s.includes('universidad')) return 'Universidades'
  return null
}

const MAX_TOOL_ROUNDS = 4
const MAX_USER_TURNS = 5        // últimos 5 turnos user/assistant
const MAX_TOOL_ROUND_HISTORY = 2 // conservar solo últimas 2 rondas de tools
const MAX_REQUEST_MESSAGES = 20
const MAX_TOOL_RESULT_CHARS = 3200

function clipText(value: unknown, max = 600): string {
  const text = String(value ?? '')
  return text.length > max ? `${text.slice(0, max)}…` : text
}

type ChatMsg = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_calls?: any
  tool_call_id?: string
  name?: string
}

// Filtra qué tools enviar al LLM según la intención detectada en el último
// mensaje del usuario. Reduce drásticamente los tokens de schema por request.
function pickTools(userMsg: string) {
  const m = (userMsg ?? '').toLowerCase()
  const names = new Set<string>()
  const normalized = m
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
  const words = normalized.split(/\s+/).filter(Boolean)

  if (/puntaje|ponderaci|corte|vacante|arancel|matric(u|ú)la\s+anual|jornada|requisito|demre|plan\s+especial|grado|t(i|í)tulo|semestres?|duraci(o|ó)n/.test(m)) {
    names.add('get_program_detail')
    // Sin el código del programa, necesita buscar primero en la BD.
    names.add('search_career_match')
  }
  // Preguntas sobre institución: ubicación, sede, egresados, matrícula, dirección
  if (/donde\s+queda|d(o|ó)nde\s+(est(a|á)|queda|se\s+ubica)|sede|direcci(o|ó)n|casa\s+central|ubicaci(o|ó)n|cu(a|á)ntos\s+(egresaron|titularon|se\s+titularon|graduaron|matriculados)|egresados|graduados/.test(normalized)) {
    names.add('get_institution')
    names.add('search_career_match')
  }
  if (/empleabilidad|sueldo|gana|ingreso|titulad|retenci|matr(i|í)cula\b/.test(m)) {
    names.add('get_career_stats_detailed')
    names.add('get_career_employability_by_institution')
  }
  if (/mejor|top|ranking|mayor|menor|cu(a|á)les\s+son|lista\s+de/.test(m)) {
    names.add('rank_careers')
    names.add('rank_institutions')
  }
  if (/compar(ar|a|e)|versus|\bvs\b|diferencia/.test(m)) {
    names.add('compare_institutions')
    names.add('compare_curriculums')
  }
  if (/universidad|instituto|cft|acreditaci|infraestructura|biblioteca|laboratori|casa\s+central|direcci(o|ó)n|p(a|á)gina\s+web|instituci(o|ó)n|duoc|inacap|usach|udp|uc\b|uchile|uai|unab|udla|umayor|santo\s+tomas|finis|terrae/.test(normalized)) {
    names.add('get_institution')
    names.add('search_career_match')
  }
  if (/malla|ramo|asignatura|curriculum|curr(i|í)culo/.test(m)) {
    names.add('compare_curriculums')
  }
  if (/buscar|encontrar|recomi(e|é)nd|qu(e|é)\s+carrera|oferta/.test(m)) {
    names.add('search_career_match')
  }

  // Si el usuario escribe solo el nombre de una carrera (ej: "ingenieria forestal"),
  // forzamos búsqueda para evitar respuestas sin consultar BD.
  if (
    words.length >= 1
    && words.length <= 6
    && normalized.length <= 60
    && !/[?¡!]/.test(normalized)
    && /(ingenier|tecnico|licenciatura|pedagogia|medicina|derecho|arquitectura|psicologia|enfermeria|forestal|kinesiolog|odontolog|veterinari|contador|nutricion|quimica|biologia|periodismo|agronom)/.test(normalized)
  ) {
    names.add('search_career_match')
  }

  if (!names.size) {
    // Sin intención clara: enviamos solo el set mínimo esencial (no las 11)
    // para que el modelo aún pueda decidir consultar BD si lo necesita,
    // ahorrando ~2k tokens de schema en cada turno.
    const fallback = ['search_career_match', 'get_career_stats_detailed', 'get_institution']
    return (aiTools as readonly any[]).filter(t => fallback.includes(t.function?.name))
  }

  const picked = (aiTools as readonly any[]).filter(t => names.has(t.function?.name))
  return picked.length ? picked : (aiTools as any)
}

// Deja al sistema + últimos N turnos user/assistant.
function trimUserHistory(messages: ChatMsg[]): ChatMsg[] {
  const system = messages.filter(m => m.role === 'system')
  const rest = messages.filter(m => m.role !== 'system')
  const trimmed = rest.slice(-MAX_USER_TURNS * 2)
  return [...system, ...trimmed]
}

// Mantiene en memoria solo las últimas N rondas de tool_calls + resultados.
// Conserva íntegro el flujo user/assistant/system.
function pruneToolHistory(messages: ChatMsg[]): ChatMsg[] {
  const out: ChatMsg[] = []
  const toolRoundIndices: number[] = []
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i]!
    if (m.role === 'assistant' && m.tool_calls?.length) {
      toolRoundIndices.push(i)
    }
  }
  if (toolRoundIndices.length <= MAX_TOOL_ROUND_HISTORY) return messages

  const keepFrom = toolRoundIndices[toolRoundIndices.length - MAX_TOOL_ROUND_HISTORY]!
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]!
    const isToolish = (msg.role === 'assistant' && msg.tool_calls?.length) || msg.role === 'tool'
    if (isToolish) {
      if (i >= keepFrom) out.push(msg)
    } else {
      out.push(msg)
    }
  }
  return out
}

function compactForPrompt(value: any, depth = 0): any {
  if (value === null || value === undefined) return value
  if (typeof value === 'string') return clipText(value, depth <= 1 ? 700 : 360)
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (depth >= 4) return Array.isArray(value) ? '[array omitido]' : '[objeto omitido]'

  if (Array.isArray(value)) {
    const maxItems = depth <= 1 ? 10 : 6
    const out = value.slice(0, maxItems).map(item => compactForPrompt(item, depth + 1))
    if (value.length > maxItems) out.push({ __truncated_items: value.length - maxItems })
    return out
  }

  if (typeof value === 'object') {
    const out: Record<string, any> = {}
    const keys = Object.keys(value)
    const maxKeys = depth <= 1 ? 36 : 20
    for (const key of keys.slice(0, maxKeys)) {
      if (/embedding|vector|raw|html|markdown|source_url/i.test(key)) continue
      out[key] = compactForPrompt(value[key], depth + 1)
    }
    if (keys.length > maxKeys) out.__truncated_keys = keys.length - maxKeys
    return out
  }

  return String(value)
}

function summarizeProgram(row: any) {
  return {
    program_unique_code: row?.program_unique_code,
    nombre_carrera: clipText(row?.nombre_carrera, 140),
    nombre_institucion: clipText(row?.nombre_institucion, 140),
    institution_code: row?.institution_code ?? null,
    tipo_institucion: row?.tipo_institucion ?? null,
    region: row?.region ?? null,
    sede: clipText(row?.sede, 90),
    jornada: row?.jornada ?? null,
    duracion_formal_semestres: row?.duracion_formal_semestres ?? null,
    arancel_anual: row?.arancel_anual ?? null,
    arancel_referencia_becas: row?.arancel_referencia_becas ?? null,
    brecha_arancel_becas: row?.brecha_arancel_becas ?? null,
    vacantes_semestre_1: row?.vacantes_semestre_1 ?? null,
    rango_percentil_paes: row?.rango_percentil_paes ?? null,
    puntaje_promedio_matriculados: row?.puntaje_promedio_matriculados ?? null,
    anio_puntajes: row?.anio_puntajes ?? null,
    stats: row?.stats ? compactForPrompt(row.stats, 2) : null,
  }
}

function summarizeInstitution(row: any) {
  return {
    institution_code: row?.institution_code,
    nombre_institucion: clipText(row?.nombre_institucion, 140),
    tipo_institucion: row?.tipo_institucion,
    direccion_sede_central: clipText(row?.direccion_sede_central, 160),
    pagina_web: clipText(row?.pagina_web, 120),
    acreditacion_estado: row?.acreditacion_estado,
    acreditacion_anos: row?.acreditacion_anos,
    acreditacion_vigencia_hasta: row?.acreditacion_vigencia_hasta,
    matricula_pregrado_actual: row?.matricula_pregrado_actual,
    titulados_pregrado_actual: row?.titulados_pregrado_actual,
    retencion_1er_ano_pct: row?.retencion_1er_ano_pct,
    duracion_real_semestres: row?.duracion_real_semestres,
    promedio_nem: row?.promedio_nem,
    promedio_paes: row?.promedio_paes,
    m2_construidos: row?.m2_construidos,
    volumenes_biblioteca: row?.volumenes_biblioteca,
    laboratorios_talleres: row?.laboratorios_talleres,
    computadores: row?.computadores,
    casa_central: clipText(row?.casa_central, 160),
  }
}

function summarizeToolResult(name: string, result: any) {
  if (name === 'search_career_match' && Array.isArray(result?.results)) {
    const maxResults = 8
    return {
      count: result.count,
      source_count: result.source_count,
      institutions_count: result.institutions_count,
      institution_filter: result.institution_filter ?? null,
      // Programas relacionados en la institución buscada (variantes del nombre)
      related_in_institution: Array.isArray(result.related_in_institution)
        ? result.related_in_institution
        : [],
      results: result.results.slice(0, maxResults).map(summarizeProgram),
      truncated_results: Math.max(0, result.results.length - maxResults),
    }
  }

  if (name === 'get_institution') {
    if (result?.institution) return { match: result.match, institution: summarizeInstitution(result.institution) }
    if (Array.isArray(result?.candidates)) {
      return { match: result.match, candidates: result.candidates.slice(0, 5).map(summarizeInstitution) }
    }
  }

  if (name === 'compare_institutions') {
    return {
      count: result?.count,
      institutions: Array.isArray(result?.institutions)
        ? result.institutions.slice(0, 4).map(summarizeInstitution)
        : [],
      rankings: result?.rankings ?? {},
      employability_by_career: Array.isArray(result?.employability_by_career)
        ? result.employability_by_career.slice(0, 12).map((row: any) => compactForPrompt(row, 2))
        : [],
      note: result?.note,
    }
  }

  if (name === 'compare_curriculums') {
    return {
      requested: result?.requested ?? [],
      missing: result?.missing ?? [],
      pending_scrape: result?.pending_scrape ?? [],
      results: Array.isArray(result?.results)
        ? result.results.slice(0, 5).map((row: any) => ({
            program_unique_code: row.program_unique_code,
            nombre_carrera: clipText(row.nombre_carrera, 140),
            institucion: clipText(row.institucion, 140),
            sede: clipText(row.sede, 90),
            jornada: row.jornada,
            duracion_semestres: row.duracion_semestres,
            arancel_anual: row.arancel_anual,
            status: row.status,
            source: row.source,
            subjects_count: Array.isArray(row.subjects) ? row.subjects.length : 0,
            subjects: Array.isArray(row.subjects) ? compactForPrompt(row.subjects.slice(0, 16), 2) : undefined,
            fallback: row.fallback ? compactForPrompt(row.fallback, 2) : undefined,
            message: row.message,
          }))
        : [],
    }
  }

  if (name === 'get_filters_catalog') {
    return {
      tipos_institucion: result?.tipos_institucion ?? [],
      areas_conocimiento: Array.isArray(result?.areas_conocimiento)
        ? result.areas_conocimiento.slice(0, 80)
        : [],
      regiones: result?.regiones ?? [],
      truncated_areas: Array.isArray(result?.areas_conocimiento)
        ? Math.max(0, result.areas_conocimiento.length - 80)
        : 0,
    }
  }

  return compactForPrompt(result)
}

function stringifyToolResultForPrompt(name: string, result: any) {
  const json = JSON.stringify(summarizeToolResult(name, result))
  return json.length > MAX_TOOL_RESULT_CHARS
    ? `${json.slice(0, MAX_TOOL_RESULT_CHARS)}… [resultado truncado para proteger memoria]`
    : json
}

function withLLMMeta(data: any, provider: string, model: string) {
  return { ...data, _kora: { provider, model } }
}

async function callLLM(config: any, messages: ChatMsg[], tools: any, toolChoice: 'auto' | 'none' = 'auto') {
  // Cuando toolChoice='none' no enviamos tools para evitar que algunos
  // providers rechacen la combinación tools+tool_choice:none.
  const payload: any = {
    temperature: 0.2,
    max_tokens: 750,
    messages,
  }
  if (toolChoice === 'none') {
    // Sin tools: el modelo responde texto directamente con los datos ya en contexto.
  } else {
    payload.tools = tools
    payload.tool_choice = 'auto'
  }

  if (config.githubToken) {
    // Valida que la respuesta del LLM tenga forma utilizable: content con
    // texto O tool_calls bien formadas. Algunos modelos (Llama en GitHub
    // Models) devuelven 200 con payload vacío/malformado; si no validamos,
    // el loop de tool-rounds entra con estado corrupto.
    const isUsable = (data: any) => {
      const msg = data?.choices?.[0]?.message
      if (!msg) return false
      const hasContent = typeof msg.content === 'string' && msg.content.trim().length > 0
      // En modo síntesis (sin tools) aceptamos cualquier respuesta con contenido.
      if (toolChoice === 'none') return hasContent
      const hasToolCalls = Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0
        && msg.tool_calls.every((tc: any) => tc?.function?.name && typeof tc.function.arguments === 'string')
      return hasContent || hasToolCalls
    }

    // Primer intento: GPT-4.1-mini
    try {
      const res = await fetch('https://models.github.ai/inference/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.githubToken}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({ model: 'openai/gpt-4.1-mini', ...payload }),
      })
      if (res.ok) {
        const data = await res.json()
        if (isUsable(data)) return withLLMMeta(data, 'github_models', 'openai/gpt-4.1-mini')
        console.warn('[Chat] GitHub Models (GPT-4.1-mini) devolvió payload inutilizable, fallback...')
      } else {
        console.warn('[Chat] GitHub Models (GPT-4.1-mini) HTTP', res.status)
      }
    } catch (e: any) {
      console.warn('[Chat] GitHub Models (GPT-4.1-mini) error:', e?.message)
    }

    // Segundo intento: DeepSeek-V3-0324 (más económico)
    try {
      const res = await fetch('https://models.github.ai/inference/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.githubToken}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({ model: 'deepseek/DeepSeek-V3-0324', ...payload }),
      })
      if (res.ok) {
        const data = await res.json()
        if (isUsable(data)) return withLLMMeta(data, 'github_models', 'deepseek/DeepSeek-V3-0324')
        console.warn('[Chat] GitHub Models (DeepSeek-V3-0324) devolvió payload inutilizable, fallback...')
      } else {
        console.warn('[Chat] GitHub Models (DeepSeek-V3-0324) HTTP', res.status)
      }
    } catch (e: any) {
      console.warn('[Chat] GitHub Models (DeepSeek-V3-0324) error:', e?.message)
    }

    // Segundo intento: Meta-Llama-3.1-8B-Instruct (fallback rápido)
    try {
      const res2 = await fetch('https://models.github.ai/inference/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.githubToken}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({ model: 'meta/Meta-Llama-3.1-8B-Instruct', ...payload }),
      })
      if (res2.ok) {
        const data = await res2.json()
        if (isUsable(data)) return withLLMMeta(data, 'github_models', 'meta/Meta-Llama-3.1-8B-Instruct')
        console.warn('[Chat] GitHub Models (Meta-Llama) devolvió payload inutilizable, fallback...')
      } else {
        console.warn('[Chat] GitHub Models (Meta-Llama) HTTP', res2.status)
      }
    } catch (e: any) {
      console.warn('[Chat] GitHub Models (Meta-Llama) error:', e?.message)
    }
  }

  if (config.groqApiKey) {
    // llama-3.1-8b-instant soporta tool calling si se limita a 1-2 tools y
    // se deshabilitan las llamadas paralelas (parallel_tool_calls: false).
    const groqTools = Array.isArray(tools) ? tools.slice(0, 2) : tools

    // Sanitiza el historial para Groq preservando trazabilidad multi-ronda.
    // Groq llama-3.1-8b-instant SOPORTA el formato OpenAI tool-calling, así que
    // conservamos tool_calls y tool_call_id tal cual. Solo colapsamos casos
    // en los que el historial vendría malformado.
    function sanitizeForGroq(msgs: ChatMsg[]) {
      return msgs.map((m) => {
        if (m.role === 'tool') {
          return {
            role: 'tool' as const,
            tool_call_id: m.tool_call_id,
            name: m.name,
            content: m.content,
          }
        }
        if (m.role === 'assistant' && m.tool_calls?.length) {
          return {
            role: 'assistant' as const,
            content: m.content || '',
            tool_calls: m.tool_calls,
          }
        }
        return { role: m.role as 'system' | 'user' | 'assistant', content: m.content }
      })
    }

    // Intento 1: con tools (consulta BD)
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.groqApiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          temperature: 0.2,
          max_tokens: 700,
          ...(toolChoice !== 'none' && {
            parallel_tool_calls: false,
            tools: groqTools,
            tool_choice: 'auto',
          }),
          messages: sanitizeForGroq(messages),
        }),
      })
      if (res.ok) return withLLMMeta(await res.json(), 'groq', 'llama-3.1-8b-instant')
      const errTxt = await res.text()
      console.warn('[Chat] Groq (tools) error:', res.status, errTxt.slice(0, 200))
    } catch (e: any) {
      console.warn('[Chat] Groq (tools) timeout/network:', e?.message)
    }

    // Intento 2: sin tools (respuesta general, evita errores de schema)
    const GROQ_FALLBACK_SYSTEM = `Eres KoraChile, un asistente de orientación vocacional para Chile.
Responde siempre en español, de forma cálida y motivadora. Sé conciso (2-4 párrafos).
Ayuda al usuario a explorar qué carrera le conviene según sus intereses y habilidades.
Si no tienes datos precisos sobre puntajes o aranceles, dilo honestamente y sugiere revisar el sitio oficial del DEMRE.`

    try {
      const fallbackMsgs = sanitizeForGroq(messages).map(m =>
        m.role === 'system' ? { ...m, content: GROQ_FALLBACK_SYSTEM } : m
      )
      const res2 = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.groqApiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          temperature: 0.2,
          max_tokens: 600,
          messages: fallbackMsgs,
        }),
      })
      if (res2.ok) return withLLMMeta(await res2.json(), 'groq', 'llama-3.1-8b-instant')
      const txt2 = await res2.text()
      console.error('[Chat] Groq (fallback) error:', res2.status, txt2.slice(0, 200))
    } catch (e: any) {
      console.error('[Chat] Groq (fallback) timeout/network:', e?.message)
    }
  }

  return null
}

export default defineEventHandler(async (event) => {
  const startedAt = Date.now()
  // Seguridad: exige sesión válida + rate limit.
  const auth = await requireAuth(event, {
    rateLimit: {
      scope: 'chat',
      max: 12,
      windowMs: 60_000,
    },
  })

  const config = useRuntimeConfig()
  const body = await readBody(event)
  const { messages, careersContext } = body
  // Si el cliente no envía sesión (o envía un ID inválido), generamos una en backend.
  // Así el chat funciona "out of the box" sin que el frontend tenga que gestionar UUID.
  const sessionId = normalizeSessionId(body?.sessionId) ?? randomUUID()
  if (!Array.isArray(messages) || messages.length === 0) {
    throw createError({ statusCode: 400, message: 'Se requiere un array de mensajes.' })
  }
  if (messages.length > MAX_REQUEST_MESSAGES) {
    throw createError({ statusCode: 400, message: `Demasiados mensajes en el request (máx ${MAX_REQUEST_MESSAGES}).` })
  }
  for (const msg of messages) {
    if (!msg.role || !msg.content || typeof msg.content !== 'string') {
      throw createError({ statusCode: 400, message: 'Formato de mensaje inválido.' })
    }
    if (!['user', 'assistant'].includes(msg.role)) {
      throw createError({ statusCode: 400, message: 'El rol debe ser user o assistant.' })
    }
    if (msg.content.length > 2000) {
      throw createError({ statusCode: 400, message: 'Mensaje demasiado largo (máx 2000 caracteres).' })
    }
  }

  if (!config.githubToken && !config.groqApiKey) {
    throw createError({ statusCode: 500, message: 'No hay API key configurada. Define APY_GIT (GitHub Models) o GROQ en las variables de entorno.' })
  }

  const systemPrompt = buildSystemPrompt()
  const careersCtxMsg = buildCareersContextMessage(careersContext)
  const seedMessages: ChatMsg[] = [
    { role: 'system', content: systemPrompt },
    ...(careersCtxMsg ? [{ role: 'system' as const, content: careersCtxMsg }] : []),
    ...messages,
  ]
  const trimmedUser = trimUserHistory(seedMessages)
  const conversation: ChatMsg[] = [...trimmedUser]

  // Detectar intención desde el último user msg y filtrar tools disponibles.
  // Resolvemos siglas ANTES de todo: pickTools, cache y retrieval trabajan
  // con el texto ya normalizado ("PUCV" → "Pontificia Universidad Católica de Valparaíso").
  const rawLastUser = [...messages].reverse().find(m => m.role === 'user')?.content ?? ''
  const lastUser = resolveInstitutionAliases(rawLastUser)
  const normalizedLastUser = lastUser
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  const asksPaesOrScore = /\bpaes\b|puntaje|ponderaci|corte/.test(normalizedLastUser)
  // Preguntas sobre características institucionales → no mostrar tarjetas de programas
  const asksInstitutionMeta = /cruch|acreditaci|tipo de universidad|tipo de institucion|pertenece|inscrita|miembro|consejo de rectores/.test(normalizedLastUser)
  const paesStopwords = new Set([
    'que', 'cual', 'cuanto', 'cuantos', 'necesito', 'necesaria', 'necesarias',
    'para', 'con', 'del', 'de', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas',
    'puntaje', 'puntajes', 'paes', 'ponderacion', 'ponderaciones', 'corte', 'cortes',
    'ingresar', 'entrar', 'admisio', 'admisiones', 'admision', 'necesitan',
  ])
  const paesQueryKeywords = asksPaesOrScore
    ? normalizedLastUser
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
        .filter((token) => !paesStopwords.has(token))
        .slice(0, 5)
    : []
  const intent = classifyChatIntent(lastUser)
  // Si el usuario ya tiene carreras en contexto (viene de /results),
  // el LLM puede responder directamente sin buscar más en la BD.
  if (intent.kind === 'career_recommendation' && careersCtxMsg) {
    intent.maxToolRounds = 0
    intent.maxToolCallsPerRound = 0
    intent.maxToolCallsTotal = 0
  }
  const budget = await getAiBudgetState(auth.userId)
  const mentionedInstitution = detectMentionedInstitution(lastUser)
  const mentionedTipoInstitucion = inferTipoInstitucion(mentionedInstitution)
  const tools = pickTools(lastUser)

  const toolsUsed: string[] = []
  const llmUsages: CapturedLlmUsage[] = []
  let llmCallCount = 0
  let totalToolCallCount = 0
  let skippedToolCallCount = 0
  // Datos completos de programas para cachear en el cliente (sin requests adicionales)
  const programFullData: Record<string, any> = {}
  let programCards: Array<{
    code: string
    title: string
    institution: string
    institution_code: number | null
    semesters: number | null
    cost: number | null
    type: string | null
    region: string | null
    jornada: string | null
    nivel: string | null
    vacantes: number | null
    titulados: number | null
  }> = []

  const selectedToolNames = tools.map((t: any) => t.function?.name).filter(Boolean)

  async function finalize(payload: {
    reply: string
    toolsUsed?: string[]
    programCards?: typeof programCards
    cached?: boolean
  }, opts: { cacheHit?: boolean } = {}) {
    const finalToolsUsed = payload.toolsUsed ?? toolsUsed
    await Promise.all([
      persistChatTurn({
        userId: auth.userId,
        sessionId,
        userContent: rawLastUser,
        assistantContent: payload.reply,
      }),
      logAiUsageEvent({
        userId: auth.userId,
        sessionId,
        route: 'chat',
        intent: intent.kind,
        llmUsages,
        cacheHit: opts.cacheHit ?? payload.cached ?? false,
        toolsUsed: finalToolsUsed,
        toolCallCount: totalToolCallCount,
        llmCallCount,
        latencyMs: Date.now() - startedAt,
        metadata: {
          complexity: intent.complexity,
          needs_official_data: intent.needsOfficialData,
          selected_tools: selectedToolNames,
          skipped_tool_calls: skippedToolCallCount,
          tool_limits: {
            max_rounds: intent.maxToolRounds,
            max_per_round: intent.maxToolCallsPerRound,
            max_total: intent.maxToolCallsTotal,
          },
          budget,
        },
      }),
    ])

    return {
      ...payload,
      toolsUsed: finalToolsUsed,
      programCards: payload.programCards ?? programCards,
      // Datos completos para que el cliente los cachee en Pinia sin fetch extra
      programFullData: Object.keys(programFullData).length ? programFullData : undefined,
      sessionId,
    }
  }

  if (intent.kind === 'greeting') {
    return await finalize({
      reply: '¡Hola! Soy KoraChile. Puedo ayudarte a comparar carreras, revisar sueldos y empleabilidad SIES/Mineduc, ver aranceles, puntajes, mallas o encontrar opciones según tus intereses. ¿Qué te gustaría explorar?',
      toolsUsed: [],
      programCards: [],
    })
  }

  if (budget.mode === 'compact') {
    conversation.push({
      role: 'system',
      content: 'Modo compacto por presupuesto: responde en máximo 2 párrafos. Usa herramientas solo si el usuario pide datos oficiales concretos y evita análisis largos salvo que sea indispensable.',
    })
  }

  // ── 1. CACHE SEMÁNTICO + EMBEDDING COMPARTIDO ─────────────────────
  // checkSemanticCache devuelve { hit, embedding } aunque no haya match, para
  // que retrieveContext y saveSemanticCache reutilicen el mismo vector
  // (ahorra 100-200ms por request al evitar 2-3 inferencias del modelo).
  // PERO: si la pregunta menciona una institución específica y un tema con
  // datos numéricos (sueldo, empleabilidad, arancel), saltamos el cache para
  // garantizar siempre ir a la BD. El cache semántico puede confundir AIEP
  // con otra institución similar por embedding.
  const hasInstitution = !!mentionedInstitution
  const isDataQuery = /sueldo|gana|ingreso|salario|arancel|empleabilid|puntaje/i.test(lastUser)
  const skipCache = hasInstitution && isDataQuery

  let sharedEmbedding: number[] | null = null
  if (!skipCache) {
    try {
      const lookup = await checkSemanticCache(lastUser)
      if (lookup) {
        sharedEmbedding = lookup.embedding
        if (lookup.hit) {
          return await finalize({
            reply: lookup.hit.answer,
            toolsUsed: ['semantic_cache'],
            programCards: [],
            cached: true,
          }, { cacheHit: true })
        }
      }
    } catch (e: any) {
      console.warn('[Chat] cache check skipped:', e?.message)
    }
  }

  // ── 2. RETRIEVAL HÍBRIDO (pgvector) ─────────────────────────────────
  // Buscamos en institutions/career_generic/programs por similitud semántica
  // e inyectamos el top-K como "HECHO VERIFICADO" al system prompt.
  // Esto reemplaza el prefetch con ILIKE (frágil con tildes/sinónimos).
  try {
    const retrieved = await retrieveContext(lastUser, 8, 0.28, sharedEmbedding)
    if (retrieved.length) {
      const ctx = formatContext(retrieved)
      // Insertamos justo después del primer system prompt (no asumimos índice fijo).
      const systemIdx = conversation.findIndex(m => m.role === 'system')
      const insertAt = systemIdx >= 0 ? systemIdx + 1 : 0
      conversation.splice(insertAt, 0, {
        role: 'system',
        content: `DATOS OFICIALES RECUPERADOS (Mineduc/SIES, pgvector):
${ctx}

INSTRUCCIONES:
- Usa SOLO estos datos para responder sobre instituciones, carreras o programas.
- NO inventes sedes, direcciones ni aranceles.
- Si un dato no está arriba, dilo: "no se encuentra en los registros".
- Si el usuario pregunta por otra cosa, puedes llamar tools adicionales.`,
      })
      toolsUsed.push('hybrid_retrieval')
      // NO generamos programCards desde el retrieval — los chunks RAG son para
      // contexto del LLM, no para cards. Las cards solo se generan cuando el LLM
      // llama explícitamente a search_career_match (resultado relevante garantizado).
    }
  } catch (e: any) {
    console.warn('[Chat] retrieval error:', e?.message)
  }

  const maxToolRounds = Math.max(1, Math.min(MAX_TOOL_ROUNDS, intent.maxToolRounds || 1))

  for (let round = 0; round < maxToolRounds; round++) {
    const toolBudgetExhausted = totalToolCallCount >= intent.maxToolCallsTotal
    const isLastRound = round === maxToolRounds - 1 || toolBudgetExhausted

    // En la última ronda inyectamos un mensaje de síntesis explícito para
    // que el modelo redacte la respuesta con los datos ya en contexto.
    if (isLastRound) {
      conversation.push({
        role: 'system',
        content: 'Ya tienes todos los datos de las herramientas. RESPONDE AHORA al usuario en español con esos datos. No llames más herramientas.',
      })
    }

    const pruned = pruneToolHistory(conversation)
    const data = await callLLM(config, pruned, tools, isLastRound ? 'none' : 'auto')
    if (!data) throw createError({ statusCode: 502, message: 'No se obtuvo respuesta de ningún proveedor de IA. Verifica que APY_GIT (GitHub Models) o GROQ estén configurados correctamente.' })

    const msg = data.choices?.[0]?.message
    if (!msg) throw createError({ statusCode: 502, message: 'Respuesta de IA vacía.' })
    llmCallCount++
    llmUsages.push(captureLlmUsage(data, pruned, msg))

    const toolCalls = msg.tool_calls
    if (toolCalls?.length) {
      const remainingToolCalls = Math.max(0, intent.maxToolCallsTotal - totalToolCallCount)
      const allowedThisRound = Math.min(intent.maxToolCallsPerRound, remainingToolCalls)
      const limitedToolCalls = toolCalls.slice(0, allowedThisRound)
      skippedToolCallCount += Math.max(0, toolCalls.length - limitedToolCalls.length)

      if (!limitedToolCalls.length) {
        conversation.push({
          role: 'system',
          content: 'Se alcanzó el presupuesto de herramientas para este turno. Responde ahora con los datos disponibles y, si falta algo, pide una pregunta más específica.',
        })
        continue
      }

      conversation.push({
        role: 'assistant',
        content: msg.content || '',
        tool_calls: limitedToolCalls,
      })
      totalToolCallCount += limitedToolCalls.length

      const results = await Promise.all(
        limitedToolCalls.map(async (tc: any) => {
          const name = tc.function?.name
          let args: any = {}
          try { args = JSON.parse(tc.function?.arguments ?? '{}') }
          catch (e: any) {
            console.warn('[Chat] tool args parse failed for', name, ':', e?.message)
            args = {}
          }

          // Guardrail: si el usuario mencionó una institución específica, forzar
          // ese contexto en las tools de sueldos/empleabilidad para evitar mezclar
          // resultados de otra IES o nivel.
          if (mentionedInstitution) {
            if (name === 'get_career_employability_by_institution') {
              if (!args.nombre_institucion || typeof args.nombre_institucion !== 'string') {
                args.nombre_institucion = mentionedInstitution
              }
            }
            if (name === 'get_career_stats_detailed') {
              if (!args.tipo_institucion && mentionedTipoInstitucion) {
                args.tipo_institucion = mentionedTipoInstitucion
              }
            }
          }

          // Guardrail PAES: si preguntan por puntaje y no dieron una institución,
          // priorizamos universidades para evitar ruido de IP/CFT (sin corte PAES).
          if (name === 'search_career_match' && asksPaesOrScore) {
            if (!args.tipo_institucion) {
              args.tipo_institucion = 'Universidades'
            }
            if (!Array.isArray(args.keywords) || !args.keywords.length) {
              args.keywords = paesQueryKeywords.length ? paesQueryKeywords : [rawLastUser]
            }
            const requestedLimit = Number(args.limit || 10)
            args.limit = Number.isFinite(requestedLimit)
              ? Math.min(Math.max(requestedLimit, 10), 20)
              : 12
          }

          toolsUsed.push(name)
          try {
            const result = await runTool(name, args, event)
            if (name === 'search_career_match' && Array.isArray(result?.results) && !asksInstitutionMeta) {
              const list = asksPaesOrScore
                ? result.results.filter((r: any) => {
                    const isUniversity = String(r?.tipo_institucion || '').toLowerCase().includes('univers')
                    const hasScore =
                      r?.puntaje_promedio_matriculados !== null && r?.puntaje_promedio_matriculados !== undefined
                    return isUniversity && hasScore
                  })
                : result.results

              const cardSource = list.length ? list : result.results
              programCards = cardSource.slice(0, 4).map((r: any) => ({
                code: r.program_unique_code,
                title: r.nombre_carrera,
                institution: r.nombre_institucion,
                institution_code: typeof r.institution_code === 'number' ? r.institution_code : null,
                semesters: typeof r.duracion_formal_semestres === 'number' ? r.duracion_formal_semestres : null,
                cost: typeof r.arancel_anual === 'number' ? r.arancel_anual : null,
                type: r.tipo_institucion ?? null,
                region: r.region ?? null,
                jornada: r.jornada ?? null,
                nivel: r.nivel_carrera ?? null,
                vacantes: typeof r.vacantes_semestre_1 === 'number' ? r.vacantes_semestre_1 : null,
                titulados: typeof r.titulacion_total_2024 === 'number' ? r.titulacion_total_2024 : null,
              }))

              // Capturar datos completos para cache en cliente (evita fetch extra en /compare)
              for (const r of cardSource.slice(0, 4)) {
                if (r?.program_unique_code && !programFullData[r.program_unique_code]) {
                  const primerAnoPct = (r.matricula_primer_ano_2025 && r.matricula_total_2025 && r.matricula_total_2025 > 0)
                    ? Math.round((r.matricula_primer_ano_2025 / r.matricula_total_2025) * 1000) / 10
                    : null
                  programFullData[r.program_unique_code] = {
                    ...r,
                    nombre_sede: r.nombre_sede ?? null,
                    gratuidad: resolveGratuidad(r.institution_code, r.nombre_institucion),
                    porcentaje_matricula_primer_ano_2025: primerAnoPct,
                  }
                }
              }
            }
            return { tool_call_id: tc.id, name, content: stringifyToolResultForPrompt(name, result) }
          } catch (e: any) {
            return { tool_call_id: tc.id, name, content: JSON.stringify({ error: e?.message || 'tool failed' }) }
          }
        }),
      )
      for (const r of results) {
        conversation.push({
          role: 'tool',
          tool_call_id: r.tool_call_id,
          name: r.name,
          content: r.content,
        })
      }

      // Tras recibir resultados de herramientas, sugerimos síntesis en la
      // siguiente ronda. Si el modelo llama más tools, está bien — pero si
      // ya tiene suficientes datos, este mensaje lo empuja a responder.
      if (!isLastRound) {
        conversation.push({
          role: 'system',
          content: 'Si ya tienes los datos necesarios para responder al usuario, hazlo ahora en español. Solo llama otra herramienta si aún te falta información específica.',
        })
      }
      continue
    }

    const reply = msg.content || ''
    if (!reply) throw createError({ statusCode: 502, message: 'La IA devolvió un mensaje vacío.' })

    // ── 3. GUARDAR EN CACHE (fire-and-forget) ─────────────────────────────
    // Solo cacheamos respuestas suficientes (>50 chars) y sin errores obvios.
    // NUNCA cacheamos cuando skipCache=true (pregunta por datos de una IES específica)
    // para evitar que respuestas de AIEP contaminen consultas de DUOC por similitud.
    if (!skipCache && reply.length > 50 && !/lo siento|no tengo|error/i.test(reply.slice(0, 60))) {
      // saveSemanticCache es fire-and-forget pero ya maneja errores
      // internamente con try/catch + console.warn (ver semantic-cache.ts).
      saveSemanticCache(lastUser, reply, {
        tags: toolsUsed,
        intent: intent.kind,
        precomputedEmbedding: sharedEmbedding,
      })
    }

    return await finalize({ reply, toolsUsed, programCards })
  }

  // Si llegamos aquí, el modelo siguió llamando herramientas sin responder.
  // Devolvemos una respuesta degradada con los datos ya en contexto.
  return await finalize({
    reply: 'Encontré algunos datos pero tuve dificultades para sintetizarlos. Por favor intenta reformular tu pregunta o consulta mifuturo.cl para información detallada.',
    toolsUsed,
    programCards,
  })
})
