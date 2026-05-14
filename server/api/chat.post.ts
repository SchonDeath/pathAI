// POST /api/chat
// IA conversacional con RAG híbrido (pgvector) + cache semántico + tool calling.
//
// Flujo:
//   1. Check cache semántico → si hit > 0.93 similitud, devuelve sin LLM.
//   2. Retrieve híbrido (search_hybrid RPC) → inyecta datos reales al system prompt.
//   3. LLM (con tools específicas) → redacta respuesta.
//   4. Guarda (pregunta, respuesta) en cache para futuros hits.
//
// Body: { sessionId?: string, messages: [{role,content}] }

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
- Carrera en institución específica: usa parámetro "institution" en search_career_match. Si found_in_institution=true, muestra SOLO los resultados de esa institución; si hay múltiples nivel_carrera distintos (Pregrado, Magíster, etc.), agrúpalos por nivel en la respuesta. Si found_in_institution=false, muestra primero related_in_institution ("programas relacionados en esa institución") y luego results como alternativas en otras instituciones.

FLUJO KORA:
- Si el usuario menciona una institución sin carrera concreta, consulta get_institution, resume datos clave y pregunta qué nivel académico quiere explorar.
- Mantén contexto activo {institución, nivel académico, área}. En follow-ups como "salud" o "mejor empleabilidad", conserva institución+nivel y añade el nuevo filtro.
- Si el usuario cambia de institución (ej: "¿y en la PUC?"), reinicia nivel/área y vuelve a preguntar nivel antes de listar programas.
- Si ya hay institución+nivel, search_career_match debe llevar institution, nivel_carrera y randomize=true cuando estés mostrando opciones de descubrimiento.
- Cuando el usuario pida mejor empleabilidad, contextualiza con la institución/nivel activo y usa datos oficiales antes de recomendar.

NIVELES ACADÉMICOS:
- Estudiante post-PAES/colegio: usa nivel_carrera, no nivel_global. Niveles válidos: Profesional con Licenciatura, Profesional sin Licenciatura, Licenciatura no conducente a título, Bachillerato/Ciclo Inicial/Plan Común, Técnico de Nivel Superior.
- Postítulo, Diplomado, Magíster, Doctorado y Especialidad Médica/Odontológica son para usuarios que ya tienen formación previa.
- Si el usuario pide una carrera concreta pero no especifica nivel ni hay nivel activo en contexto, primero pregunta el nivel antes de buscar datos.

REGLAS CRÍTICAS:
- **OBLIGATORIO USAR TOOL** antes de responder sobre: arancel, puntaje, vacantes, duración, matrícula, sueldo, empleabilidad, acreditación, o cualquier dato numérico de una carrera o institución. SIN EXCEPCIÓN.
- Follow-up corto ("y el sueldo?", "y en esa universidad?", "y en la Chile?") → infiere carrera e institución del contexto y llama la tool PRIMERO, luego responde con esos datos reales.
- Ingresos = "Ingreso Promedio al 4° año post-titulación". Cita el rango tal cual, no calcules promedio.
- Puntajes: solo puntaje_promedio_matriculados de la tool. Si es null → "No encontré puntaje PAES". No menciones puntajes en IPs/CFTs.
- PUNTAJE SIN CARRERA: si el usuario pregunta sobre puntajes de corte sin mencionar una carrera específica, PREGUNTA primero: "¿Para qué carrera quieres saber el puntaje de corte?" No llames ninguna tool hasta tener el nombre de la carrera.
- RECOMENDACIÓN POR PUNTAJE: si el usuario menciona su propio puntaje PAES (ej: "tengo 600 puntos", "saqué 550 en la PAES", "mi puntaje es X") y quiere saber qué carreras puede estudiar, usa rank_careers con ese puntaje como referencia para recomendar opciones accesibles. Si no sabes el puntaje, pregúntaselo antes de buscar.
- Si tool devuelve vacío → "No encontré datos SIES para esa carrera."
- Nunca menciones nombres de funciones/tablas internas.
- Financiamiento: usa arancel_referencia_becas (tope becas BES/BJG/BAES) y arancel_referencia_creditos (tope CAE). Calcula y muestra la brecha si corresponde.
- Sin datos: gratuidad individual, fechas DEMRE, rankings QS/Times → "No tengo ese dato, revisa mifuturo.cl".
- NIVEL AMBIGUO: si el usuario pregunta por una carrera sin especificar si quiere pregrado, técnico/IP, magíster o diplomado, PREGUNTA antes de buscar. Ejemplo: "¿Buscas el pregrado (carrera universitaria), técnico/IP, o algún diplomado/postgrado en Derecho?" Solo busca directamente si el nivel está claro en el mensaje.
- PREGUNTAS AMPLIAS: si el usuario hace una pregunta amplia sin pistas (ej: "qué carrera estudio", "no sé qué quiero estudiar", "qué me recomiendas"), pregunta antes de buscar: por área de interés, gustos, nivel académico o región. No llames tools hasta tener al menos un criterio concreto.
- VARIEDAD: cuando el usuario pide "variedades", "qué carreras tiene la X", "muéstrame opciones" sin nombrar una carrera específica, llama search_career_match con la institución (sin keywords de carrera) y agrupa la respuesta por nivel_carrera para mostrar diversidad.
- PROHIBIDO inventar o estimar datos que debería entregar una tool. Si no tienes el dato real, di "No encontré ese dato en SIES, revisa mifuturo.cl".`

function buildSystemPrompt(): string {
  return BASE_SYSTEM_PROMPT
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
  const normalizedText = normalizeForContext(text)
  const matchedRanges: Array<[number, number]> = []
  const officialMatches = new Set<string>()

  for (const [alias, full] of SORTED_ALIASES) {
    const normalizedAlias = normalizeForContext(alias)
    const normalizedRe = new RegExp(`\\b${normalizedAlias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    const match = normalizedRe.exec(normalizedText)
    if (!match || match.index == null) continue

    const range: [number, number] = [match.index, match.index + normalizedAlias.length]
    const alreadyCovered = matchedRanges.some(([start, end]) => range[0] >= start && range[1] <= end)
    if (alreadyCovered) continue

    matchedRanges.push(range)
    officialMatches.add(full)
  }

  if (!officialMatches.size) return text
  return `${text} ${[...officialMatches].join(' ')}`
}

function detectMentionedInstitution(text: string): string | null {
  if (!text) return null
  const lowered = normalizeForContext(text)

  // 1) Primero, buscar aliases/siglas conocidas (AIEP, UChile, PUCV, etc.)
  for (const [alias, full] of SORTED_ALIASES) {
    const escaped = normalizeForContext(alias).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`\\b${escaped}\\b`, 'i')
    if (re.test(lowered)) return full
  }

  // 2) Luego, buscar nombres oficiales ya resueltos en el texto.
  for (const [nameLower, original] of OFFICIAL_BY_LOWER.entries()) {
    if (lowered.includes(normalizeForContext(nameLower))) return original
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

type ProgramCard = {
  code: string
  title: string
  institution: string
  institution_code: number | null
  career_generic_id: string | null
  campus: string | null
  comuna: string | null
  semesters: number | null
  cost: number | null
  type: string | null
  region: string | null
  jornada: string | null
  nivel: string | null
  vacantes: number | null
  titulados: number | null
  empleabilidad_1er_ano_pct: number | null
  ingreso_4to_ano_clp: number | null
}

type ChatQuickAction = {
  label: string
  prompt: string
}

type KoraChatContext = {
  institution: string | null
  nivel: string | null
  area: string | null
  careerQuery: string | null
  pendingCareerQuery: string | null
  lastInstitution: string | null
  lastNivel: string | null
  lastArea: string | null
  institutionChanged: boolean
}

const PRE_ADMISSION_LEVEL_ACTIONS: ChatQuickAction[] = [
  { label: 'Profesional con licenciatura', prompt: 'Profesional con Licenciatura' },
  { label: 'Profesional IP', prompt: 'Profesional sin Licenciatura' },
  { label: 'Licenciatura', prompt: 'Licenciatura no conducente a título' },
  { label: 'Bachillerato / plan común', prompt: 'Bachillerato, ciclo inicial o plan común' },
  { label: 'Técnico', prompt: 'Técnico de Nivel Superior' },
]

const LEVEL_ACTIONS: ChatQuickAction[] = [
  ...PRE_ADMISSION_LEVEL_ACTIONS,
  { label: 'Magíster', prompt: 'Magíster' },
  { label: 'Doctorado', prompt: 'Doctorado' },
  { label: 'Postítulo', prompt: 'Postítulo' },
  { label: 'Diplomado', prompt: 'Diplomado' },
]

const AREA_ACTIONS: ChatQuickAction[] = [
  { label: 'Salud', prompt: 'Algo relacionado con salud' },
  { label: 'Tecnología', prompt: 'Algo relacionado con tecnología' },
  { label: 'Ingeniería', prompt: 'Algo relacionado con ingeniería' },
  { label: 'Educación', prompt: 'Algo relacionado con educación' },
  { label: 'Administración', prompt: 'Algo relacionado con administración y negocios' },
]

function normalizeForContext(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function detectRequestedNivel(text: string): string | null {
  const s = normalizeForContext(text)
  if (!s) return null
  if (/\b(tecnico|tecnica|tens)\b|nivel superior/.test(s)) return 'Técnico de Nivel Superior'
  if (/profesional/.test(s) && /sin\s+licenciatura|sin\s+grado|instituto profesional|\bip\b/.test(s)) return 'Profesional sin Licenciatura'
  if (/profesional/.test(s) && /con\s+licenciatura|licenciado/.test(s)) return 'Profesional con Licenciatura'
  if (/licenciatura\s+no\s+conducente|solo\s+el\s+grado|sin\s+titulo\s+profesional|sin\s+título\s+profesional/.test(s)) return 'Licenciatura no conducente a título'
  if (/bachillerato|ciclo\s+inicial|plan\s+comun|plan\s+común/.test(s)) return 'Bachillerato, ciclo inicial o plan común'
  if (/\blicenciatura\b|\blicenciado\b/.test(s)) return 'Licenciatura'
  if (/\bprofesional\b/.test(s)) return 'Profesional'
  if (/magister|magistr|maestria/.test(s)) return 'Magíster'
  if (/doctorado/.test(s)) return 'Doctorado'
  if (/especialidad|residencia/.test(s) && /medic|odontolog/.test(s)) return 'Especialidad Médica u Odontológica'
  if (/diplomado/.test(s)) return 'Diplomado'
  if (/postitulo/.test(s)) return 'Postítulo'
  if (/postgrado|posgrado/.test(s)) return 'Postgrado'
  return null
}

// Stems de carreras genéricas reconocibles. Cuando el mensaje del usuario NO
// contiene ninguno de estos stems, no debemos asumir que las palabras sueltas
// son nombres de carrera (evita pasar typos/ruido como keywords a la BD).
const CAREER_HINT_RE = /(medicin|enfermer|odontolog|kinesiolog|nutricion|fonoaudiolog|terapia|veterinari|obstetri|tecnolog medica|psicolog|sociolog|antropolog|periodismo|trabajo social|comunicacion|publicidad|derecho|juridic|ingenier|construccion|arquitectur|diseno|arte|musica|teatro|cine|audiovisual|pedagog|parvular|educacion basica|educacion fisica|profesor|docencia|administracion|contabilidad|contador|comercial|negocio|auditoria|economia|finanza|marketing|gastronom|culinari|turismo|hoteler|agronom|forestal|biolog|quimic|matematic|fisic|geolog|mineri|metalurgi|electric|mecanic|electronic|industrial|civil|informatic|sistema|software|datos|computacion|programac|ciberseguridad|telecomun|enferm|kinesio|odonto|veterin|obstet)/

function hasCareerHint(text: string) {
  return CAREER_HINT_RE.test(normalizeForContext(text))
}

function tokenLooksLikeCareer(token: string) {
  return CAREER_HINT_RE.test(normalizeForContext(token))
}

function detectRequestedArea(text: string): string | null {
  const s = normalizeForContext(text)
  if (/salud|medicina|enfermer|odontolog|kinesiolog|nutricion|fonoaudiolog|terapia/.test(s)) return 'Salud'
  if (/tecnolog|informat|computacion|programacion|software|datos|ciberseguridad/.test(s)) return 'Tecnología'
  if (/ingenier|construccion|industrial|mecanica|electric|minas|civil/.test(s)) return 'Ingeniería'
  if (/educacion|pedagog|parvular|docencia|profesor/.test(s)) return 'Educación'
  if (/administracion|negocio|comercial|contabilidad|finanza|marketing|auditoria/.test(s)) return 'Administración y Comercio'
  if (/derecho|juridic|legal/.test(s)) return 'Derecho'
  if (/arte|diseno|diseño|musica|teatro|audiovisual|creativ/.test(s)) return 'Arte y Arquitectura'
  if (/social|psicolog|trabajo social|sociolog|periodismo|comunicacion/.test(s)) return 'Ciencias Sociales'
  if (/agro|veterinaria|forestal|agronom|recursos naturales|sustentabilidad/.test(s)) return 'Agropecuaria y Recursos Naturales'
  return null
}

const SEARCH_STOPWORDS = new Set([
  'donde', 'donde', 'estudiar', 'estudio', 'estudia', 'puedo', 'puede', 'pueden', 'queda', 'quedan',
  'hay', 'ofrecen', 'ofrece', 'buscar', 'busca', 'muestrame', 'mostrar', 'opciones', 'opcion',
  'explorar', 'explora', 'conocer', 'conoce', 'informacion', 'información',
  'carrera', 'carreras', 'programa', 'programas', 'universidad', 'universidades', 'instituto',
  'institutos', 'universitario', 'universitaria', 'universitarios', 'universitarias',
  'profesional', 'profesionales', 'centro', 'centros', 'formacion', 'tecnica', 'tecnico',
  'nivel', 'superior', 'pregrado', 'algo', 'relacionado', 'relacionada', 'con', 'sobre', 'para', 'por', 'en',
  'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'y', 'o', 'que', 'cual',
  'santiago', 'stgo', 'metropolitana', 'region', 'comuna', 'chile', 'me', 'quiero', 'necesito',
  // ruido conversacional
  'pero', 'especificamente', 'especifica', 'especifico', 'exactamente', 'exacto', 'exacta',
  'concretamente', 'puntualmente', 'esta', 'esto', 'este', 'ese', 'esa', 'esos', 'esas',
  'tiene', 'tienes', 'tengo', 'quisiera', 'dame', 'dime', 'mostrame', 'ver',
])

const STATS_STOPWORDS = new Set([
  ...SEARCH_STOPWORDS,
  'empleabilidad', 'sueldo', 'salario', 'gana', 'ganan', 'ingreso', 'ingresos', 'retencion',
  'titulados', 'matricula', 'cuanto', 'cuanta', 'cuantos', 'cuantas', 'datos', 'estadisticas',
])

function tokenizeUserText(text: string) {
  return normalizeForContext(text)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length >= 3)
}

function meaningfulTokens(text: string, stopwords = SEARCH_STOPWORDS) {
  return tokenizeUserText(text).filter(token => !stopwords.has(token))
}

function detectLocationFilter(text: string): { region?: string; comuna?: string; label?: string } {
  const s = normalizeForContext(text)
  if (/santiago|stgo|metropolitana/.test(s)) return { region: 'Metropolitana', label: 'Santiago / Región Metropolitana' }
  if (/valparaiso|vina del mar|viña del mar/.test(s)) return { region: 'Valparaíso', label: 'Valparaíso' }
  if (/concepcion|concepción|biobio|bio bio|bio-bio/.test(s)) return { region: 'Biobío', label: 'Biobío' }
  if (/antofagasta/.test(s)) return { region: 'Antofagasta', label: 'Antofagasta' }
  if (/coquimbo|serena/.test(s)) return { region: 'Coquimbo', label: 'Coquimbo' }
  if (/maule|talca/.test(s)) return { region: 'Maule', label: 'Maule' }
  if (/araucania|temuco/.test(s)) return { region: 'Araucanía', label: 'Araucanía' }
  if (/los lagos|puerto montt/.test(s)) return { region: 'Los Lagos', label: 'Los Lagos' }
  return {}
}

function detectInstitutionTypeFilters(text: string): { tipo?: string; tipos?: string[]; nivel?: string | null } {
  const s = normalizeForContext(text)
  const mentionsUniversity = /universidad|universidades|universitari[oa]s?/.test(s)
  const mentionsGenericInstitute = /\binstitutos?\b/.test(s)
  const mentionsIp = /\bip\b|institutos? profesionales?/.test(s)
  const mentionsCft = /\bcft\b|centros? de formacion tecnica/.test(s)

  if (mentionsUniversity && (mentionsGenericInstitute || mentionsIp || mentionsCft)) {
    return {
      tipos: ['Universidades', 'Institutos Profesionales', 'Centros de Formación Técnica'],
      nivel: detectRequestedNivel(text),
    }
  }
  if (/institutos? tecnic|tecnico profesional|ip\s+y\s+cft|cft\s+y\s+ip/.test(s)) {
    return {
      tipos: ['Institutos Profesionales', 'Centros de Formación Técnica'],
      nivel: detectRequestedNivel(text) ?? 'Técnico de Nivel Superior',
    }
  }
  if (mentionsCft) {
    return { tipo: 'Centros de Formación Técnica', nivel: detectRequestedNivel(text) ?? 'Técnico de Nivel Superior' }
  }
  if (mentionsIp) return { tipo: 'Institutos Profesionales', nivel: detectRequestedNivel(text) }
  if (mentionsGenericInstitute) {
    return {
      tipos: ['Institutos Profesionales', 'Centros de Formación Técnica'],
      nivel: detectRequestedNivel(text),
    }
  }
  if (mentionsUniversity) return { tipo: 'Universidades', nivel: detectRequestedNivel(text) }
  return { nivel: detectRequestedNivel(text) }
}

function extractProgramSearchKeywords(text: string) {
  const area = detectRequestedArea(text)
  const tokens = meaningfulTokens(text)
  if (tokens.length) return tokens.slice(0, 6)
  if (area) return [area]
  return []
}

function stripInstitutionTokens(keywords: string[], institutionName?: string | null) {
  if (!keywords.length) return []
  const institutionTokens = new Set(tokenizeUserText(institutionName || ''))
  const normalizedInstitution = normalizeForContext(institutionName || '')
  for (const [alias, full] of SORTED_ALIASES) {
    if (normalizeForContext(full) === normalizedInstitution) {
      for (const token of tokenizeUserText(alias)) institutionTokens.add(token)
    }
  }
  return keywords.filter((keyword) => {
    const normalized = normalizeForContext(keyword)
    if (!normalized) return false
    if (institutionTokens.has(normalized)) return false
    return normalized !== 'pregrado'
  })
}

function isProgramSearchTurn(text: string) {
  const s = normalizeForContext(text)
  // Guard: rankings, comparaciones y métricas no son búsqueda de programas.
  if (/acreditaci|ranking|\btop\b|mejor(es)?|peor(es)?|mayor(es)?|menor(es)?|versus|\bvs\b/.test(s)) return false
  const hasSearchVerb = /donde estudiar|donde puedo estudiar|donde se estudia|en que universidad|en que instituto|que instituto|que cft|buscar|busca|muestrame|mostrar|opciones|programas|carreras|oferta|relacionado/.test(s)
  if (!hasSearchVerb) return false
  if (/empleabilidad|sueldo|salario|ingreso|ranking|comparar|compara|puntaje|paes|arancel|malla/.test(s)) return false
  const location = detectLocationFilter(text)
  const types = detectInstitutionTypeFilters(text)
  return !!(extractProgramSearchKeywords(text).length || location.region || location.comuna || types.tipo || types.tipos?.length || types.nivel)
}

// ── RANKING DETERMINISTA ──────────────────────────────────
// Detecta consultas tipo "universidades con más años de acreditación",
// "mejores carreras por empleabilidad", "top IES por matrícula".
const RANK_INSTITUTION_METRICS: Array<{ re: RegExp; metric: string; order: 'desc' | 'asc' }> = [
  { re: /acreditaci/, metric: 'acreditacion', order: 'desc' },
  { re: /matricula|matriculados/, metric: 'matricula', order: 'desc' },
  { re: /titulad/, metric: 'titulados', order: 'desc' },
  { re: /retenci/, metric: 'retencion', order: 'desc' },
  { re: /paes/, metric: 'paes', order: 'desc' },
  { re: /\bnem\b/, metric: 'nem', order: 'desc' },
  { re: /infraestructura|metros|\bm2\b/, metric: 'm2', order: 'desc' },
  { re: /biblioteca|volumen/, metric: 'biblioteca', order: 'desc' },
  { re: /laboratori/, metric: 'laboratorios', order: 'desc' },
  { re: /computador/, metric: 'computadores', order: 'desc' },
  { re: /duracion.*real|tarda|demora/, metric: 'duracion_real', order: 'asc' },
]

const RANK_CAREER_METRICS: Array<{ re: RegExp; metric: string; order: 'desc' | 'asc' }> = [
  { re: /sueldo|salario|gana|ingreso/, metric: 'ingreso_4to_ano_clp', order: 'desc' },
  { re: /empleabilid/, metric: 'empleabilidad_1er_ano_pct', order: 'desc' },
  { re: /retenci/, metric: 'retencion_1er_ano_pct', order: 'desc' },
  { re: /titulad/, metric: 'titulados', order: 'desc' },
  { re: /matricula/, metric: 'matricula', order: 'desc' },
]

function detectRankingIntent(text: string): null | {
  target: 'institutions' | 'careers'
  metric: string
  order: 'desc' | 'asc'
  tipo_institucion?: string
  area?: string
} {
  const s = normalizeForContext(text)
  if (!/mejor(es)?|peor(es)?|top|ranking|mayor(es)?|menor(es)?|mas\s+(acreditad|matricul|titulad|alta|alto|grande)|cu(a|á)les\s+son\s+las?\s+(mejor|mas)/.test(s)
      && !/acreditaci/.test(s)) {
    return null
  }
  const orderHint: 'desc' | 'asc' = /peor|menor(es)?|menos/.test(s) ? 'asc' : 'desc'
  const types = detectInstitutionTypeFilters(text)
  const area = detectRequestedArea(text)
  const mentionsInstitution = /universidad|universidades|instituci(o|ó)n|instituci(o|ó)nes|\bip\b|\bcft\b|instituto/.test(s)
  const mentionsCareer = /\bcarreras?\b|\bprogramas?\b|\bpregrado\b|\bcarrera\b/.test(s)

  // Si menciona explícitamente carreras y trae métrica de carrera → rank_careers.
  if (mentionsCareer && !mentionsInstitution) {
    for (const m of RANK_CAREER_METRICS) {
      if (m.re.test(s)) return { target: 'careers', metric: m.metric, order: orderHint === 'asc' ? 'asc' : m.order, tipo_institucion: types.tipo, area: area ?? undefined }
    }
  }
  // Por defecto, asume ranking de instituciones cuando hay acreditación/infraestructura.
  for (const m of RANK_INSTITUTION_METRICS) {
    if (m.re.test(s)) return { target: 'institutions', metric: m.metric, order: orderHint === 'asc' ? 'asc' : m.order, tipo_institucion: types.tipo }
  }
  // Fallback: si pide "mejores universidades/IES" sin métrica → acreditación.
  if (mentionsInstitution) {
    return { target: 'institutions', metric: 'acreditacion', order: 'desc', tipo_institucion: types.tipo }
  }
  // "mejores carreras" sin métrica → empleabilidad por defecto.
  if (mentionsCareer) {
    return { target: 'careers', metric: 'empleabilidad_1er_ano_pct', order: 'desc', tipo_institucion: types.tipo, area: area ?? undefined }
  }
  return null
}

function isRankingTurn(text: string) {
  return detectRankingIntent(text) !== null
}

// Mapea la métrica externa (param) al campo real de la fila devuelta por rank-institutions.
const METRIC_DISPLAY_KEYS: Record<string, string> = {
  acreditacion: 'acreditacion_anos',
  matricula: 'matricula_pregrado_actual',
  titulados: 'titulados_pregrado_actual',
  retencion: 'retencion_1er_ano_pct',
  paes: 'promedio_paes',
  nem: 'promedio_nem',
  duracion_real: 'duracion_real_semestres',
  m2: 'm2_construidos',
  biblioteca: 'volumenes_biblioteca',
  laboratorios: 'laboratorios_talleres',
  computadores: 'computadores',
}

// ── SEÑALES Y CLASIFICACIÓN DE CONVERSACIÓN ─────────────────────────
// Extrae señales binarias del turno actual + contexto inferido. Útil
// para telemetría y para analizar qué tipo de conversación tuvo el
// usuario (exploración, institución, carrera, comparación, decisión).
export type ConversationType =
  | 'greeting'
  | 'exploration'
  | 'institution'
  | 'career'
  | 'comparison'
  | 'decision'
  | 'ranking'
  | 'stats'
  | 'unknown'

function extractConversationSignals(rawText: string, ctx: KoraChatContext) {
  const s = normalizeForContext(rawText)
  const location = detectLocationFilter(rawText)
  return {
    has_institution: !!ctx.institution,
    institution_changed: !!ctx.institutionChanged,
    has_career_hint: hasCareerHint(rawText) || !!ctx.careerQuery,
    has_level: !!ctx.nivel,
    has_area: !!ctx.area,
    has_location: !!location.region || !!location.comuna,
    asks_price: /arancel|cuesta|cuanto vale|precio|costo|matricula/.test(s),
    asks_scholarship: /beca|gratuidad|credito|cae|financiamiento|bjg|baes|bes/.test(s),
    asks_score: /\bpaes\b|puntaje|ponderaci|corte|nem/.test(s),
    asks_employability: /empleabilid|sueldo|salario|gana|ingreso|retenci/.test(s),
    asks_accreditation: /acreditaci/.test(s),
    asks_ranking: /mejor(es)?|peor(es)?|\btop\b|ranking|mayor(es)?|menor(es)?/.test(s),
    asks_comparison: /compar(ar|a|e|ame|acion)|versus|\bvs\b|diferencia/.test(s),
    asks_curriculum: /malla|ramos?|asignatura|curriculum|curr(i|í)culo|semestres?|duracion/.test(s),
    asks_decision: /me\s+conviene|cual\s+elijo|cual\s+me\s+conviene|recomi(e|é)ndame|decid|guardar|favorito/.test(s),
  }
}

function classifyConversationType(
  rawText: string,
  ctx: KoraChatContext,
  intentKind: string,
  signals: ReturnType<typeof extractConversationSignals>,
): ConversationType {
  if (intentKind === 'greeting') return 'greeting'
  if (signals.asks_comparison) return 'comparison'
  if (signals.asks_decision || (signals.asks_price && signals.asks_scholarship)) return 'decision'
  if (signals.asks_ranking || signals.asks_accreditation) return 'ranking'
  if (signals.has_career_hint && !signals.has_institution) return 'career'
  if (signals.has_institution && !signals.has_career_hint) return 'institution'
  if (signals.has_institution && signals.has_career_hint) return 'career'
  if (signals.asks_employability || signals.asks_score) return 'stats'
  const s = normalizeForContext(rawText)
  if (/explorar|conocer|opciones|que\s+carrera|que\s+estudiar|no\s+se\s+que|recomiend|orienta/.test(s)) return 'exploration'
  return 'unknown'
}

function isStatsLookupTurn(text: string, ctx: KoraChatContext) {
  if (ctx.institution) return false
  const s = normalizeForContext(text)
  return /empleabilidad|sueldo|salario|gana|ingreso|retencion/.test(s) && meaningfulTokens(text, STATS_STOPWORDS).length > 0
}

function buildProgramSearchArgs(text: string) {
  const area = detectRequestedArea(text)
  const location = detectLocationFilter(text)
  const typeFilters = detectInstitutionTypeFilters(text)
  const keywords = extractProgramSearchKeywords(text)
  const args: Record<string, any> = {
    limit: 12,
    randomize: /opciones|relacionado|alternativas|muestrame|mostrar/.test(normalizeForContext(text)),
  }
  if (keywords.length) args.keywords = keywords
  if (area) args.area = area
  if (location.region) args.region = location.region
  if (location.comuna) args.comuna = location.comuna
  if (typeFilters.tipo) args.tipo_institucion = typeFilters.tipo
  if (typeFilters.tipos?.length) args.tipos_institucion = typeFilters.tipos
  if (typeFilters.nivel) args.nivel_carrera = typeFilters.nivel
  return { args, area, location, typeFilters }
}

function formatClpValue(value: unknown) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return 'sin dato de ingreso'
  return `$${new Intl.NumberFormat('es-CL').format(Math.round(n))}`
}

function formatPctValue(value: unknown) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 'sin dato'
  return `${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 }).format(n)}%`
}

function inferChatContext(messages: ChatMsg[], lastUser: string): KoraChatContext {
  const userMessages = messages.filter(m => m.role === 'user')
  const previousUsers = userMessages.slice(0, -1).reverse()
  const lastInstitution = detectMentionedInstitution(lastUser)
  const previousInstitution = previousUsers
    .map(m => detectMentionedInstitution(resolveInstitutionAliases(m.content)))
    .find(Boolean) ?? null
  const lastNivel = detectRequestedNivel(lastUser)
  const previousNivel = previousUsers.map(m => detectRequestedNivel(m.content)).find(Boolean) ?? null
  const lastArea = detectRequestedArea(lastUser)
  const previousArea = previousUsers.map(m => detectRequestedArea(m.content)).find(Boolean) ?? null
  const lastCareerQuery = hasCareerHint(lastUser) ? lastUser : null
  const previousCareerQuery = previousUsers
    .map(m => resolveInstitutionAliases(m.content))
    .find(content => hasCareerHint(content)) ?? null
  const pendingCareerQuery = !lastCareerQuery && lastNivel && previousCareerQuery
    ? previousCareerQuery
    : null
  const institutionChanged = !!lastInstitution && !!previousInstitution && lastInstitution !== previousInstitution

  return {
    institution: lastInstitution ?? previousInstitution,
    nivel: lastNivel ?? (lastInstitution ? null : previousNivel),
    area: lastArea ?? (!lastInstitution && !lastNivel ? previousArea : null),
    careerQuery: lastCareerQuery ?? pendingCareerQuery,
    pendingCareerQuery,
    lastInstitution,
    lastNivel,
    lastArea,
    institutionChanged,
  }
}

function buildChatContextMessage(ctx: KoraChatContext): string | null {
  if (!ctx.institution && !ctx.nivel && !ctx.area && !ctx.careerQuery) return null
  return `CONTEXTO ACTIVO DE LA CONVERSACIÓN:
- institución: ${ctx.institution ?? 'sin definir'}
- nivel académico: ${ctx.nivel ?? 'sin definir'}
- área: ${ctx.area ?? 'sin definir'}
- carrera/consulta de programa: ${ctx.careerQuery ? clipText(ctx.careerQuery, 140) : 'sin definir'}

INSTRUCCIONES DE CONTEXTO:
- Mantén estos filtros en follow-ups cortos del usuario.
- Si el usuario cambia de institución, reinicia nivel/área y vuelve a preguntar el nivel académico.
- Si hay institución + nivel, filtra programas estrictamente por ambos antes de recomendar.
- Si el usuario agrega un área, conserva institución + nivel y añade el área como filtro.
- Si el usuario respondió solo el nivel académico, conserva la carrera/consulta anterior como keywords de búsqueda.`
}

function withPendingCareerQuery(text: string, ctx: KoraChatContext) {
  if (!ctx.pendingCareerQuery || !ctx.lastNivel || hasCareerHint(text)) return text
  return `${ctx.pendingCareerQuery} ${text}`
}

function asksForConcreteCareerWithoutLevel(text: string, ctx: KoraChatContext) {
  if (!hasCareerHint(text)) return false
  if (detectRequestedNivel(text) || ctx.nivel) return false
  const s = normalizeForContext(text)
  if (/que\s+carrera\s+estudio|no\s+se\s+que|recomiend|orienta|intereses|habilidades|vocacion/.test(s)) return false
  return true
}

function appendLevelToPrompt(text: string, level: string) {
  const base = text.trim().replace(/[\s?.!¡¿]+$/g, '')
  return `${base} ${level}`.trim()
}

function buildCareerLevelClarificationActions(text: string): ChatQuickAction[] {
  return PRE_ADMISSION_LEVEL_ACTIONS.map(action => ({
    label: action.label,
    prompt: appendLevelToPrompt(text, action.prompt),
  }))
}

function buildCareerLevelClarificationReply(text: string) {
  const career = clipText(text.replace(/[?¿!¡]/g, '').trim(), 120) || 'esa carrera'
  return `Para buscar bien **${career}**, necesito saber el nivel académico. ¿Te refieres a pregrado universitario, una carrera profesional IP, una licenciatura, un bachillerato/plan común o una carrera técnica?`
}

function isBroadInstitutionExplorationTurn(text: string) {
  const s = normalizeForContext(text)
  if (!s) return false
  if (detectMentionedInstitution(resolveInstitutionAliases(text))) return false
  if (hasCareerHint(text) || isConcreteDataQuestion(text)) return false
  if (/acreditaci|ranking|top|mejor|mayor|menor|matricula|retencion|paes|nem|infraestructura|biblioteca|laboratori/.test(s)) return false
  const mentionsInstitutionType = /universidad|universidades|universitari[oa]s?|\binstitutos?\b|\bip\b|\bcft\b|centros? de formacion tecnica|instituciones?/.test(s)
  const broadVerb = /explorar|conocer|informacion|información|ver|mostrar|muestrame|quiero|orienta/.test(s)
  const broadProgram = /carreras?\s+(universitari[oa]s?|tecnic[ao]s?)|opciones\s+(universitari[oa]s?|tecnic[ao]s?)/.test(s)
  return mentionsInstitutionType && (broadVerb || broadProgram || s.split(/\s+/).length <= 4)
}

function buildBroadInstitutionExplorationReply(text: string) {
  const s = normalizeForContext(text)
  if (/\bip\b|institutos? profesionales?/.test(s) && !/universidad|universidades|universitari[oa]s?|\bcft\b/.test(s)) {
    return 'Perfecto. Para explorar Institutos Profesionales, conviene partir por carreras profesionales IP, carreras técnicas, acreditación o una región.'
  }
  if (/\bcft\b|centros? de formacion tecnica/.test(s) && !/universidad|universidades|universitari[oa]s?|\bip\b/.test(s)) {
    return 'Perfecto. Para explorar CFT, conviene partir por carreras técnicas, acreditación o una región.'
  }
  if (/\binstitutos?\b/.test(s) && !/universidad|universidades|universitari[oa]s?|\bcft\b|\bip\b|institutos? profesionales?/.test(s)) {
    return 'Perfecto. En educación superior chilena, “institutos” puede referirse a Institutos Profesionales (IP) o Centros de Formación Técnica (CFT). ¿Cuál quieres mirar primero?'
  }
  if (/universidad|universidades|universitari[oa]s?/.test(s) && !/\binstitutos?\b|\bcft\b|\bip\b/.test(s)) {
    return 'Perfecto. Podemos partir por universidades, pero necesito un criterio para traer datos útiles: ranking/acreditación, una carrera, una región o un área de interés.'
  }
  return 'Perfecto. Para explorar instituciones sin mezclar resultados, partamos por el tipo o por el nivel académico que te interesa.'
}

function buildBroadInstitutionExplorationActions(text: string): ChatQuickAction[] {
  const s = normalizeForContext(text)
  if (/\bip\b|institutos? profesionales?/.test(s) && !/universidad|universidades|universitari[oa]s?|\bcft\b/.test(s)) {
    return [
      { label: 'Profesional IP', prompt: 'Muéstrame carreras profesionales sin licenciatura' },
      { label: 'Técnico en IP', prompt: 'Muéstrame carreras de Técnico de Nivel Superior en Institutos Profesionales' },
      { label: 'IP acreditados', prompt: 'Muéstrame Institutos Profesionales con más años de acreditación' },
      { label: 'IP en Santiago', prompt: 'Muéstrame carreras profesionales sin licenciatura en Santiago' },
    ]
  }
  if (/\bcft\b|centros? de formacion tecnica/.test(s) && !/universidad|universidades|universitari[oa]s?|\bip\b/.test(s)) {
    return [
      { label: 'Carreras técnicas', prompt: 'Muéstrame carreras de Técnico de Nivel Superior' },
      { label: 'CFT acreditados', prompt: 'Muéstrame Centros de Formación Técnica con más años de acreditación' },
      { label: 'CFT en Santiago', prompt: 'Muéstrame carreras de Técnico de Nivel Superior en Santiago' },
      { label: 'Salud técnica', prompt: 'Muéstrame carreras de Técnico de Nivel Superior en Salud' },
    ]
  }
  if (/\binstitutos?\b/.test(s) && !/universidad|universidades|universitari[oa]s?/.test(s)) {
    return [
      { label: 'Institutos Profesionales', prompt: 'Muéstrame carreras profesionales sin licenciatura' },
      { label: 'Centros de Formación Técnica', prompt: 'Muéstrame carreras de Técnico de Nivel Superior' },
      { label: 'Carreras técnicas', prompt: 'Muéstrame carreras de Técnico de Nivel Superior' },
      { label: 'IP y CFT en Santiago', prompt: 'Muéstrame carreras de Técnico de Nivel Superior en Santiago' },
    ]
  }
  if (/universidad|universidades|universitari[oa]s?/.test(s) && !/\binstitutos?\b|\bcft\b|\bip\b/.test(s)) {
    return [
      { label: 'Más acreditadas', prompt: 'Muéstrame universidades con más años de acreditación' },
      { label: 'Profesional con licenciatura', prompt: 'Muéstrame carreras profesionales con licenciatura' },
      { label: 'Universitarias en Santiago', prompt: 'Muéstrame carreras profesionales con licenciatura en Santiago' },
      { label: 'Comparar universidades', prompt: 'Quiero comparar universidades' },
    ]
  }
  return [
    { label: 'Universidades', prompt: 'Muéstrame carreras profesionales con licenciatura' },
    { label: 'Institutos Profesionales', prompt: 'Muéstrame carreras profesionales sin licenciatura' },
    { label: 'CFT', prompt: 'Muéstrame carreras de Técnico de Nivel Superior' },
    { label: 'Técnico', prompt: 'Muéstrame carreras de Técnico de Nivel Superior' },
    { label: 'Profesional con licenciatura', prompt: 'Muéstrame carreras profesionales con licenciatura' },
  ]
}

function isConcreteDataQuestion(text: string) {
  return /sueldo|gana|ingreso|salario|empleabilid|arancel|puntaje|paes|ponderaci|corte|vacante|malla|ramos?|duraci|semestres?|ranking|compar/i.test(text)
}

function isInstitutionOnlyExploration(text: string, ctx: KoraChatContext) {
  if (!ctx.lastInstitution || ctx.lastNivel || ctx.lastArea) return false
  if (isConcreteDataQuestion(text)) return false
  const s = normalizeForContext(text)
  if (/\b(carreras?|programas?|oferta|pregrado)\b/.test(s)) return false
  return !/\b(medicina|derecho|psicolog|ingenier|enfermer|arquitectura|pedagog|contador|kinesiolog|odontolog)\b/.test(s)
}

function isContextDiscoveryTurn(text: string, ctx: KoraChatContext) {
  if (!ctx.institution) return false
  if (isConcreteDataQuestion(text)) return false
  const s = normalizeForContext(text)
  return !!ctx.lastNivel || (!!ctx.lastArea && !!ctx.nivel) || /\b(carreras?|programas?|oferta|pregrado)\b/.test(s)
}

function formatCompactNumber(value: unknown) {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return new Intl.NumberFormat('es-CL').format(n)
}

function buildQuickActions(ctx: KoraChatContext, cards: ProgramCard[] = []): ChatQuickAction[] {
  if (cards.length) return []
  if (ctx.institution && !ctx.nivel) return LEVEL_ACTIONS
  if (ctx.institution && ctx.nivel && !ctx.area) return AREA_ACTIONS
  return []
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
  if (/buscar|encontrar|recomi(e|é)nd|qu(e|é)\s+carrera|oferta|d(o|ó)nde\s+estudiar|donde\s+estudiar|opciones|programas/.test(m)) {
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
    nivel_carrera: row?.nivel_carrera ?? null,
    region: row?.region ?? null,
    comuna: row?.comuna ?? null,
    sede: clipText(row?.nombre_sede ?? row?.sede, 90),
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

  if (name === 'get_program_detail') {
    if (result?.match === 'exact') {
      return {
        match: 'exact',
        program: result.program,
        institution: result.institution ? summarizeInstitution(result.institution) : null,
        career_stats: result.career_stats ?? null,
      }
    }
    if (result?.match === 'multiple') {
      return { match: 'multiple', note: result.note, candidates: result.candidates?.slice(0, 6) }
    }
    return result
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
      niveles_carrera: Array.isArray(result?.niveles_carrera)
        ? result.niveles_carrera.slice(0, 80)
        : [],
      comunas: Array.isArray(result?.comunas)
        ? result.comunas.slice(0, 80)
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
      console.log('[LLM] → openai/gpt-4.1-mini')
      const t0 = Date.now()
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
        if (isUsable(data)) {
          console.log(`[LLM] ✓ openai/gpt-4.1-mini (${Date.now() - t0}ms)`)
          return withLLMMeta(data, 'github_models', 'openai/gpt-4.1-mini')
        }
        console.warn('[Chat] GitHub Models (GPT-4.1-mini) devolvió payload inutilizable, fallback...')
      } else {
        console.warn('[Chat] GitHub Models (GPT-4.1-mini) HTTP', res.status)
      }
    } catch (e: any) {
      console.warn('[Chat] GitHub Models (GPT-4.1-mini) error:', e?.message)
    }

    // Segundo intento: DeepSeek-V3-0324 (más económico)
    try {
      console.log('[LLM] → deepseek/DeepSeek-V3-0324')
      const t0 = Date.now()
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
        if (isUsable(data)) {
          console.log(`[LLM] ✓ deepseek/DeepSeek-V3-0324 (${Date.now() - t0}ms)`)
          return withLLMMeta(data, 'github_models', 'deepseek/DeepSeek-V3-0324')
        }
        console.warn('[Chat] GitHub Models (DeepSeek-V3-0324) devolvió payload inutilizable, fallback...')
      } else {
        console.warn('[Chat] GitHub Models (DeepSeek-V3-0324) HTTP', res.status)
      }
    } catch (e: any) {
      console.warn('[Chat] GitHub Models (DeepSeek-V3-0324) error:', e?.message)
    }

    // Tercer intento: xai/grok-3
    try {
      console.log('[LLM] → xai/grok-3')
      const t0 = Date.now()
      const res = await fetch('https://models.github.ai/inference/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.githubToken}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({ model: 'xai/grok-3', ...payload }),
      })
      if (res.ok) {
        const data = await res.json()
        if (isUsable(data)) {
          console.log(`[LLM] ✓ xai/grok-3 (${Date.now() - t0}ms)`)
          return withLLMMeta(data, 'github_models', 'xai/grok-3')
        }
        console.warn('[Chat] GitHub Models (Grok-3) devolvió payload inutilizable, fallback...')
      } else {
        console.warn('[Chat] GitHub Models (Grok-3) HTTP', res.status)
      }
    } catch (e: any) {
      console.warn('[Chat] GitHub Models (Grok-3) error:', e?.message)
    }

    // Cuarto intento: Meta-Llama-3.1-8B-Instruct (fallback rápido)
    try {
      console.log('[LLM] → meta/Meta-Llama-3.1-8B-Instruct')
      const t0 = Date.now()
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
        if (isUsable(data)) {
          console.log(`[LLM] ✓ meta/Meta-Llama-3.1-8B-Instruct (${Date.now() - t0}ms)`)
          return withLLMMeta(data, 'github_models', 'meta/Meta-Llama-3.1-8B-Instruct')
        }
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
      console.log('[LLM] → groq/llama-3.1-8b-instant (con tools)')
      const t0 = Date.now()
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
      if (res.ok) {
        console.log(`[LLM] ✓ groq/llama-3.1-8b-instant (${Date.now() - t0}ms)`)
        return withLLMMeta(await res.json(), 'groq', 'llama-3.1-8b-instant')
      }
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
      console.log('[LLM] → groq/llama-3.1-8b-instant (fallback sin tools)')
      const t0 = Date.now()
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
      if (res2.ok) {
        console.log(`[LLM] ✓ groq/llama-3.1-8b-instant fallback (${Date.now() - t0}ms)`)
        return withLLMMeta(await res2.json(), 'groq', 'llama-3.1-8b-instant')
      }
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
  const { messages } = body
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
  const seedMessages: ChatMsg[] = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ]
  const trimmedUser = trimUserHistory(seedMessages)
  const conversation: ChatMsg[] = [...trimmedUser]

  // Detectar intención desde el último user msg y filtrar tools disponibles.
  // Resolvemos siglas ANTES de todo: pickTools, cache y retrieval trabajan
  // con el texto ya normalizado ("PUCV" → "Pontificia Universidad Católica de Valparaíso").
  const rawLastUser = [...messages].reverse().find(m => m.role === 'user')?.content ?? ''
  const lastUser = resolveInstitutionAliases(rawLastUser)
  const chatContext = inferChatContext(messages, lastUser)
  const effectiveLastUser = withPendingCareerQuery(lastUser, chatContext)
  const effectiveRawLastUser = withPendingCareerQuery(rawLastUser, chatContext)
  const normalizedLastUser = effectiveLastUser
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
  const intent = classifyChatIntent(effectiveLastUser)
  // Si el usuario ya tiene carreras en contexto (viene de /results),
  // el LLM puede responder directamente sin buscar más en la BD.
  if (intent.kind === 'career_recommendation') {
    intent.maxToolRounds = 0
    intent.maxToolCallsPerRound = 0
    intent.maxToolCallsTotal = 0
  }
  const budget = await getAiBudgetState(auth.userId)
  const activeInstitution = chatContext.institution
  const mentionedTipoInstitucion = inferTipoInstitucion(activeInstitution)
  const tools = pickTools(effectiveLastUser)
  const chatContextMsg = buildChatContextMessage(chatContext)
  if (chatContextMsg) {
    const systemIdx = conversation.findIndex(m => m.role === 'system')
    conversation.splice(systemIdx >= 0 ? systemIdx + 1 : 0, 0, { role: 'system', content: chatContextMsg })
  }

  const toolsUsed: string[] = []
  const llmUsages: CapturedLlmUsage[] = []
  let llmCallCount = 0
  let totalToolCallCount = 0
  let skippedToolCallCount = 0
  // Datos completos de programas para cachear en el cliente (sin requests adicionales)
  const programFullData: Record<string, any> = {}
  let programCards: ProgramCard[] = []

  const selectedToolNames = tools.map((t: any) => t.function?.name).filter(Boolean)
  let deterministicRoute: string | null = null
  const conversationSignals = extractConversationSignals(rawLastUser, chatContext)
  const conversationType = classifyConversationType(rawLastUser, chatContext, intent.kind, conversationSignals)

  function rowMatchesActiveInstitution(row: any, institutionFilter?: any) {
    const searchedCode = Number(institutionFilter?.institution_code)
    if (Number.isFinite(searchedCode) && Number(row?.institution_code) === searchedCode) return true

    const searchedName = String(institutionFilter?.searched || activeInstitution || '')
    if (!searchedName) return true
    const rowName = normalizeForContext(String(row?.nombre_institucion || ''))
    const searched = normalizeForContext(searchedName)
    return !!rowName && !!searched && (rowName.includes(searched) || searched.includes(rowName))
  }

  function scopedProgramRows(result: any) {
    if (!Array.isArray(result?.results)) return []
    const institutionFound = result?.institution_filter?.found_in_institution === true
    if (!institutionFound) return result.results
    return result.results.filter((row: any) => rowMatchesActiveInstitution(row, result?.institution_filter))
  }

  function setProgramCardsFromRows(rows: any[], max = 4) {
    const cardSource = rows.slice(0, max)
    programCards = cardSource.map((r: any) => ({
      code: r.program_unique_code,
      title: r.nombre_carrera,
      institution: r.nombre_institucion,
      institution_code: typeof r.institution_code === 'number' ? r.institution_code : Number.isFinite(Number(r.institution_code)) ? Number(r.institution_code) : null,
      career_generic_id: r.career_generic_id ?? null,
      campus: r.nombre_sede ?? r.sede ?? null,
      comuna: r.comuna ?? null,
      semesters: typeof r.duracion_formal_semestres === 'number' ? r.duracion_formal_semestres : null,
      cost: typeof r.arancel_anual === 'number' ? r.arancel_anual : null,
      type: r.tipo_institucion ?? null,
      region: r.region ?? null,
      jornada: r.jornada ?? null,
      nivel: r.nivel_carrera ?? null,
      vacantes: typeof r.vacantes_semestre_1 === 'number' ? r.vacantes_semestre_1 : null,
      titulados: typeof r.titulacion_total_2024 === 'number' ? r.titulacion_total_2024 : null,
      empleabilidad_1er_ano_pct: typeof r.stats?.empleabilidad_1er_ano_pct === 'number' ? r.stats.empleabilidad_1er_ano_pct : null,
      ingreso_4to_ano_clp: typeof r.stats?.ingreso_4to_ano_clp === 'number' ? r.stats.ingreso_4to_ano_clp : null,
    }))

    for (const r of cardSource) {
      if (r?.program_unique_code && !programFullData[r.program_unique_code]) {
        const primerAnoPct = (r.matricula_primer_ano_2025 && r.matricula_total_2025 && r.matricula_total_2025 > 0)
          ? Math.round((r.matricula_primer_ano_2025 / r.matricula_total_2025) * 1000) / 10
          : null
        programFullData[r.program_unique_code] = {
          ...r,
          nombre_sede: r.nombre_sede ?? null,
          gratuidad: resolveGratuidad(r.institution_code, r.nombre_institucion),
          porcentaje_matricula_primer_ano_2025: primerAnoPct,
          institution_data: r.institution_data ?? null,
        }
      }
    }
  }

  async function finalize(payload: {
    reply: string
    toolsUsed?: string[]
    programCards?: typeof programCards
    quickActions?: ChatQuickAction[]
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
          conversation_type: conversationType,
          deterministic_route: deterministicRoute,
          signals: conversationSignals,
          ctx: {
            institution: chatContext.institution ?? null,
            nivel: chatContext.nivel ?? null,
            area: chatContext.area ?? null,
            has_career_query: !!chatContext.careerQuery,
            institution_changed: chatContext.institutionChanged ?? false,
          },
        },
      }),
    ])

    return {
      ...payload,
      toolsUsed: finalToolsUsed,
      programCards: payload.programCards ?? programCards,
      quickActions: payload.quickActions ?? buildQuickActions(chatContext, payload.programCards ?? programCards),
      // Datos completos para que el cliente los cachee en Pinia sin fetch extra
      programFullData: Object.keys(programFullData).length ? programFullData : undefined,
      sessionId,
    }
  }

  if (isBroadInstitutionExplorationTurn(rawLastUser)) {
    deterministicRoute = 'broad_institution'
    return await finalize({
      reply: buildBroadInstitutionExplorationReply(rawLastUser),
      toolsUsed: [],
      programCards: [],
      quickActions: buildBroadInstitutionExplorationActions(rawLastUser),
    })
  }

  // ── RUTA DETERMINISTA: RANKING (acreditación, infraestructura, empleabilidad TOP, etc.) ──
  const rankingIntent = detectRankingIntent(rawLastUser)
  if (rankingIntent) {
    try {
      deterministicRoute = `ranking_${rankingIntent.target}`
      const limit = 10
      if (rankingIntent.target === 'institutions') {
        const args: Record<string, any> = { metric: rankingIntent.metric, order: rankingIntent.order, limit }
        if (rankingIntent.tipo_institucion) args.tipo_institucion = rankingIntent.tipo_institucion
        totalToolCallCount++
        toolsUsed.push('rank_institutions')
        const result = await runTool('rank_institutions', args, event)
        const rows = Array.isArray(result?.results) ? result.results : []
        const metricLabels: Record<string, string> = {
          acreditacion: 'años de acreditación',
          matricula: 'matrícula de pregrado',
          titulados: 'titulados',
          retencion: 'retención de 1er año',
          paes: 'puntaje PAES promedio',
          nem: 'NEM promedio',
          m2: 'm² construidos',
          biblioteca: 'volúmenes de biblioteca',
          laboratorios: 'laboratorios y talleres',
          computadores: 'computadores disponibles',
          duracion_real: 'duración real (semestres)',
        }
        const metricLabel = metricLabels[rankingIntent.metric] ?? rankingIntent.metric
        const tipoLabel = rankingIntent.tipo_institucion ? ` (${rankingIntent.tipo_institucion})` : ''
        const orderLabel = rankingIntent.order === 'desc' ? 'mayor' : 'menor'
        const list = rows.length
          ? rows.map((r: any, i: number) => {
              const metricKey = result?.metric ? METRIC_DISPLAY_KEYS[result.metric] : null
              const value = metricKey ? r?.[metricKey] : null
              const valueText = value != null && Number.isFinite(Number(value)) ? ` — ${formatCompactNumber(value) ?? value}` : ''
              return `${i + 1}. **${r.nombre_institucion}** (${r.tipo_institucion ?? '—'})${valueText}`
            }).join('\n')
          : ''
        const reply = rows.length
          ? `Ranking SIES/Mineduc 2026 de instituciones por ${metricLabel}${tipoLabel}, ordenadas de ${orderLabel} a ${rankingIntent.order === 'desc' ? 'menor' : 'mayor'}:\n\n${list}\n\n¿Quieres que entremos en una de estas instituciones o filtramos por región/tipo?`
          : `No encontré datos oficiales de ${metricLabel}${tipoLabel}. Puedes probar otra métrica (matrícula, retención, acreditación) o revisar mifuturo.cl.`
        return await finalize({ reply, toolsUsed, programCards: [], quickActions: [] })
      } else {
        const args: Record<string, any> = { metric: rankingIntent.metric, order: rankingIntent.order, limit }
        if (rankingIntent.tipo_institucion) args.tipo_institucion = rankingIntent.tipo_institucion
        if (rankingIntent.area) args.area = rankingIntent.area
        totalToolCallCount++
        toolsUsed.push('rank_careers')
        const result = await runTool('rank_careers', args, event)
        const rows = Array.isArray(result?.results) ? result.results : []
        const metricLabels: Record<string, string> = {
          ingreso_4to_ano_clp: 'ingreso promedio al 4° año',
          empleabilidad_1er_ano_pct: 'empleabilidad al 1er año',
          retencion_1er_ano_pct: 'retención de 1er año',
          titulados: 'titulados',
          matricula: 'matrícula',
        }
        const metricLabel = metricLabels[rankingIntent.metric] ?? rankingIntent.metric
        const filterLabel = [rankingIntent.area, rankingIntent.tipo_institucion].filter(Boolean).join(' · ')
        const list = rows.length
          ? rows.map((r: any, i: number) => `${i + 1}. **${r.nombre_carrera_generica ?? r.nombre_carrera ?? '—'}** (${r.tipo_institucion ?? '—'})`).join('\n')
          : ''
        const reply = rows.length
          ? `Ranking SIES 2026 de carreras por ${metricLabel}${filterLabel ? ` (${filterLabel})` : ''}:\n\n${list}\n\n¿Quieres profundizar en una carrera o filtrar por institución?`
          : `No encontré datos SIES de ${metricLabel}${filterLabel ? ` para ${filterLabel}` : ''}. Puedes ajustar área o tipo de institución.`
        return await finalize({ reply, toolsUsed, programCards: [], quickActions: [] })
      }
    } catch (e: any) {
      console.warn('[Chat] deterministic ranking failed:', e?.message)
      deterministicRoute = null
    }
  }

  if (asksForConcreteCareerWithoutLevel(rawLastUser, chatContext)) {
    deterministicRoute = 'level_clarification'
    return await finalize({
      reply: buildCareerLevelClarificationReply(rawLastUser),
      toolsUsed: [],
      programCards: [],
      quickActions: buildCareerLevelClarificationActions(rawLastUser),
    })
  }

  if (intent.kind === 'greeting') {
    deterministicRoute = 'greeting'
    return await finalize({
      reply: 'Hola, soy Kora. Te ayudaré a encontrar tu camino académico. ¿Te gustaría explorar información sobre universidades o institutos, o prefieres consultar puntajes de corte para una carrera específica?',
      toolsUsed: [],
      programCards: [],
      quickActions: [
        { label: 'Universidades e institutos', prompt: 'Quiero explorar universidades e institutos' },
        { label: 'Puntajes de corte', prompt: 'Quiero consultar puntajes de corte para una carrera' },
      ],
    })
  }

  if (isInstitutionOnlyExploration(rawLastUser, chatContext) && activeInstitution) {
    try {
      deterministicRoute = 'institution_overview'
      totalToolCallCount++
      toolsUsed.push('get_institution')
      const result = await runTool('get_institution', { nombre: activeInstitution }, event)
      const institution = result?.institution ?? result?.candidates?.[0] ?? null
      const name = institution?.nombre_institucion ?? activeInstitution
      const facts: string[] = []
      if (institution?.tipo_institucion) facts.push(`Tipo: ${institution.tipo_institucion}.`)
      if (institution?.acreditacion_estado) {
        facts.push(`Acreditación: ${institution.acreditacion_estado}${institution.acreditacion_anos ? ` (${institution.acreditacion_anos} años)` : ''}.`)
      }
      const enrollment = formatCompactNumber(institution?.matricula_pregrado_actual)
      if (enrollment) facts.push(`Matrícula de pregrado: ${enrollment}.`)
      const retention = formatPctValue(institution?.retencion_1er_ano_pct)
      if (retention !== 'sin dato') facts.push(`Retención de 1er año: ${retention}.`)
      if (institution?.casa_central) facts.push(`Casa central: ${institution.casa_central}.`)
      if (institution?.pagina_web) facts.push(`Sitio web: ${institution.pagina_web}.`)

      // Vitrine: muestra 3-6 programas variados (mezcla de niveles) para que
      // el usuario perciba VARIEDAD aunque sólo haya mencionado la institución.
      let vitrineSection = ''
      try {
        toolsUsed.push('search_career_match')
        totalToolCallCount++
        const programsResult = await runTool('search_career_match', {
          institution: activeInstitution,
          strict_institution: true,
          limit: 18,
          randomize: true,
        }, event)
        const programsRows = scopedProgramRows(programsResult)
        if (programsRows.length) {
          const byLevel = new Map<string, any[]>()
          for (const r of programsRows) {
            const k = String(r?.nivel_carrera || 'Otros')
            if (!byLevel.has(k)) byLevel.set(k, [])
            byLevel.get(k)!.push(r)
          }
          const mixed: any[] = []
          let added = true
          while (mixed.length < 6 && added) {
            added = false
            for (const arr of byLevel.values()) {
              if (!arr.length) continue
              mixed.push(arr.shift()!)
              added = true
              if (mixed.length >= 6) break
            }
          }
          setProgramCardsFromRows(mixed, 6)
          if (programCards.length) {
            const groups = new Map<string, ProgramCard[]>()
            for (const c of programCards) {
              const k = c.nivel ?? 'Otros'
              if (!groups.has(k)) groups.set(k, [])
              groups.get(k)!.push(c)
            }
            const grouped = [...groups.entries()].map(([nivel, cards]) =>
              `**${nivel}**\n${cards.map((c) => `• ${c.title}${c.campus ? ` — ${c.campus}` : ''}`).join('\n')}`
            ).join('\n\n')
            vitrineSection = `\n\nMuestra de su oferta académica:\n\n${grouped}`
          }
        }
      } catch (e: any) {
        console.warn('[Chat] institution vitrine failed:', e?.message)
      }

      return await finalize({
        reply: `${name}. ${facts.join(' ')}${vitrineSection}\n\n¿Qué nivel te interesa o prefieres que filtre por área (salud, ingeniería, educación…)? También puedo profundizar en una carrera puntual.`,
        toolsUsed,
        programCards: [],
        quickActions: buildQuickActions({ ...chatContext, nivel: null, area: null }, []),
      })
    } catch (e: any) {
      console.warn('[Chat] deterministic institution overview failed:', e?.message)
    }
  }

  if (isContextDiscoveryTurn(effectiveRawLastUser, chatContext) && activeInstitution) {
    try {
      deterministicRoute = 'context_discovery'
      // Solo extraemos keywords si el mensaje contiene un stem de carrera real
      // (medicina, derecho, ingeniería, etc.). Si no, evitamos pasar tokens
      // como "pregrado", typos o ruido conversacional que harían fallar la
      // búsqueda devolviendo 0 resultados aunque la institución tenga oferta.
      const messageHasCareerHint = hasCareerHint(effectiveRawLastUser)
      const rawCareerKeywords = messageHasCareerHint
        ? stripInstitutionTokens(
            extractProgramSearchKeywords(effectiveLastUser).filter(k => k.length >= 3),
            activeInstitution,
          ).filter(tokenLooksLikeCareer)
        : []
      const careerKeywords = rawCareerKeywords
      const isGenericExploration = !careerKeywords.length
      const normalizedUserText = normalizeForContext(effectiveRawLastUser)
      const askedPregrado = /\bpregrado\b/.test(normalizedUserText)
      const args: Record<string, any> = {
        institution: activeInstitution,
        limit: isGenericExploration ? 18 : 12,
        randomize: isGenericExploration,
        strict_institution: true,
      }
      if (chatContext.nivel) args.nivel_carrera = chatContext.nivel
      if (chatContext.area) args.area = chatContext.area
      if (careerKeywords.length) args.keywords = careerKeywords

      totalToolCallCount++
      toolsUsed.push('search_career_match')
      const result = await runTool('search_career_match', args, event)
      const rows = scopedProgramRows(result)
      const usableRows = rows.length ? rows : (Array.isArray(result?.results) ? result.results : [])

      // Cuando es exploración genérica (sin carrera específica) intentamos
      // mostrar variedad: una muestra por cada nivel_carrera distinto.
      let displayRows = usableRows
      if (isGenericExploration && usableRows.length > 4) {
        const byLevel = new Map<string, any[]>()
        for (const r of usableRows) {
          const k = String(r?.nivel_carrera || 'Otros')
          if (!byLevel.has(k)) byLevel.set(k, [])
          byLevel.get(k)!.push(r)
        }
        const mixed: any[] = []
        let added = true
        while (mixed.length < 8 && added) {
          added = false
          for (const arr of byLevel.values()) {
            if (!arr.length) continue
            mixed.push(arr.shift()!)
            added = true
            if (mixed.length >= 8) break
          }
        }
        displayRows = mixed
      }
      setProgramCardsFromRows(displayRows, isGenericExploration ? 8 : 4)

      const filterLabel = [chatContext.nivel, chatContext.area].filter(Boolean).join(' · ')

      let list = ''
      if (programCards.length) {
        if (isGenericExploration) {
          // Agrupa por nivel para mostrar VARIEDAD en una sola respuesta.
          const groups = new Map<string, ProgramCard[]>()
          for (const c of programCards) {
            const k = c.nivel ?? 'Otros'
            if (!groups.has(k)) groups.set(k, [])
            groups.get(k)!.push(c)
          }
          list = [...groups.entries()].map(([nivel, cards]) =>
            `**${nivel}**\n${cards.map((c) => `• ${c.title}${c.campus ? ` — ${c.campus}` : ''}`).join('\n')}`
          ).join('\n\n')
        } else {
          list = programCards.map((card, index) => `${index + 1}. **${card.title}**${card.region ? ` (${card.region})` : ''}${card.jornada ? `, ${card.jornada}` : ''}`).join('\n')
        }
      }

      const pregradoSuffix = askedPregrado
        ? ' (solo programas de pregrado: técnico, profesional y licenciatura).'
        : ''
      const followUp = isGenericExploration
        ? `Toca alguna carrera para preguntarme por arancel, puntaje PAES, empleabilidad o malla, o dime el área (salud, ingeniería, educación, etc.) y filtro la oferta.`
        : `Puedes tocar una opción para dejarla en el campo de texto y preguntarme por empleabilidad, puntajes, arancel o malla.`

      const reply = programCards.length
        ? `Aquí tienes una muestra de la oferta de **${activeInstitution}**${filterLabel ? ` filtrada por ${filterLabel}` : ''}${pregradoSuffix}\n\n${list}\n\n${followUp}`
        : `No encontré programas oficiales para ${activeInstitution}${filterLabel ? ` con el filtro ${filterLabel}` : ''}. Podemos probar otro nivel, otra área o revisar la institución completa.`

      return await finalize({
        reply,
        toolsUsed,
        programCards,
        quickActions: buildQuickActions(chatContext, programCards),
      })
    } catch (e: any) {
      console.warn('[Chat] deterministic context discovery failed:', e?.message)
    }
  }

  if (isStatsLookupTurn(effectiveRawLastUser, chatContext)) {
    try {
      deterministicRoute = 'stats_lookup'
      const careerQuery = meaningfulTokens(effectiveRawLastUser, STATS_STOPWORDS).join(' ')
      const typeFilters = detectInstitutionTypeFilters(effectiveRawLastUser)
      const args: Record<string, any> = { nombre_carrera_generica: careerQuery }
      if (typeFilters.tipo) args.tipo_institucion = typeFilters.tipo

      totalToolCallCount++
      toolsUsed.push('get_career_stats_detailed')
      const result = await runTool('get_career_stats_detailed', args, event)
      const rows = Array.isArray(result?.stats) ? result.stats.slice(0, 5) : []

      const reply = rows.length
        ? `Con datos SIES 2026 para **${careerQuery}**, encontré estas referencias:\n\n${rows.map((row: any, index: number) => {
            const ingreso4 = formatClpValue(row?.ingresos_clp?.cuarto_ano)
            const emp1 = formatPctValue(row?.empleabilidad_pct?.primer_ano)
            const emp2 = formatPctValue(row?.empleabilidad_pct?.segundo_ano)
            const ret = formatPctValue(row?.retencion_1er_ano_pct)
            return `${index + 1}. **${row.nombre_carrera_generica}** (${row.tipo_institucion}): empleabilidad 1er año ${emp1}, 2do año ${emp2}, ingreso promedio 4° año ${ingreso4}, retención ${ret}.`
          }).join('\n')}\n\nEstos son datos agregados por carrera genérica; si quieres una institución específica, dime cuál y lo reviso con ese filtro.`
        : `No encontré datos SIES de empleabilidad/ingresos para **${careerQuery}** con ese nombre exacto. Puede estar registrada con otro nombre genérico; prueba con un nombre más específico o revisa mifuturo.cl.`

      return await finalize({ reply, toolsUsed, programCards: [], quickActions: [] })
    } catch (e: any) {
      console.warn('[Chat] deterministic stats lookup failed:', e?.message)
    }
  }

  if (!activeInstitution && isProgramSearchTurn(effectiveRawLastUser)) {
    try {
      deterministicRoute = 'program_search'
      const { args, area, location, typeFilters } = buildProgramSearchArgs(effectiveRawLastUser)
      totalToolCallCount++
      toolsUsed.push('search_career_match')
      const result = await runTool('search_career_match', args, event)
      const rows = Array.isArray(result?.results) ? result.results : []
      setProgramCardsFromRows(rows)

      const filters = [
        area,
        location.label,
        typeFilters.tipo,
        ...(typeFilters.tipos ?? []),
        typeFilters.nivel,
      ].filter(Boolean)
      const filterText = filters.length ? ` con filtro ${filters.join(' · ')}` : ''
      const list = programCards.length
        ? programCards.map((card, index) => {
            const place = [card.campus, card.comuna, card.region].filter(Boolean).join(', ')
            const cost = card.cost ? `, arancel ${formatClpValue(card.cost)}` : ''
            const employability = card.empleabilidad_1er_ano_pct != null ? `, empleabilidad 1er año ${formatPctValue(card.empleabilidad_1er_ano_pct)}` : ''
            return `${index + 1}. **${card.title}** - ${card.institution}${place ? ` (${place})` : ''}${cost}${employability}.`
          }).join('\n')
        : ''

      const reply = programCards.length
        ? `Encontré opciones oficiales en SIES/Mineduc${filterText}:\n\n${list}\n\nTe dejé las cards con el código oficial del programa para que puedas agregarlas al comparador o preguntarme por arancel, puntaje, empleabilidad o malla.`
        : `No encontré programas oficiales para esa búsqueda${filterText}. Podemos probar con otra comuna, región, nivel académico o un nombre de carrera más específico.`

      return await finalize({ reply, toolsUsed, programCards, quickActions: [] })
    } catch (e: any) {
      console.warn('[Chat] deterministic program search failed:', e?.message)
    }
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
  // PERO: si la pregunta menciona una institución específica y requiere datos
  // oficiales, saltamos el cache para garantizar siempre ir a la BD. El cache
  // semántico puede confundir una carrera/IES concreta con otra similar por
  // embedding y devolver una respuesta genérica o de otra institución.
  const hasInstitution = !!activeInstitution
  const skipCache = hasInstitution

  let sharedEmbedding: number[] | null = null
  if (!skipCache) {
    try {
      const lookup = await checkSemanticCache(effectiveLastUser)
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
    const retrieved = await retrieveContext(effectiveLastUser, 8, 0.28, sharedEmbedding)
    if (retrieved.length) {
      const ctx = formatContext(retrieved)
      // Insertamos justo después del primer system prompt (no asumimos índice fijo).
      const systemIdx = conversation.findIndex(m => m.role === 'system')
      const insertAt = systemIdx >= 0 ? systemIdx + 1 : 0
      conversation.splice(insertAt, 0, {
        role: 'system',
        content: `CONTEXTO ADICIONAL RECUPERADO (Mineduc/SIES):
${ctx}

INSTRUCCIONES:
- Este contexto es orientativo. Si el usuario pide datos numéricos (arancel, puntaje, vacantes, duración, sueldo, empleabilidad), DEBES llamar la tool correspondiente para obtener datos exactos y actualizados. NO respondas solo con este contexto para datos numéricos.
- Si un dato específico no está en este contexto ni en las tools, dilo: "no encontré ese dato en SIES, revisa mifuturo.cl".`,
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
          if (activeInstitution) {
            if (name === 'search_career_match') {
              if (!args.institution && !args.institution_code) args.institution = activeInstitution
              if (chatContext.nivel && !args.nivel_carrera) args.nivel_carrera = chatContext.nivel
              if (chatContext.area && !args.area) args.area = chatContext.area
              if (chatContext.lastNivel || chatContext.lastArea) {
                args.randomize = true
                const requestedLimit = Number(args.limit || 12)
                args.limit = Number.isFinite(requestedLimit)
                  ? Math.min(Math.max(requestedLimit, 8), 20)
                  : 12
              }
            }
            if (name === 'get_career_employability_by_institution') {
              if (!args.nombre_institucion || typeof args.nombre_institucion !== 'string') {
                args.nombre_institucion = activeInstitution
              }
            }
            if (name === 'get_program_detail' && !args.nombre_institucion && !args.institution_code) {
              args.nombre_institucion = activeInstitution
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
              args.keywords = paesQueryKeywords.length ? paesQueryKeywords : [effectiveRawLastUser]
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
              const filteredByInstitution = scopedProgramRows(result)

              const list = asksPaesOrScore
                ? filteredByInstitution.filter((r: any) => {
                    const isUniversity = String(r?.tipo_institucion || '').toLowerCase().includes('univers')
                    const hasScore =
                      r?.puntaje_promedio_matriculados !== null && r?.puntaje_promedio_matriculados !== undefined
                    return isUniversity && hasScore
                  })
                : filteredByInstitution

              const cardSource = list.length ? list : filteredByInstitution
              setProgramCardsFromRows(cardSource)
            }

            // Generar programCard desde get_program_detail (match exacto)
            if (name === 'get_program_detail' && result?.match === 'exact' && result?.program) {
              const r = result.program
              if (r?.program_unique_code) {
                setProgramCardsFromRows([r])
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

      conversation.push({
        role: 'system',
        content: 'Ya tienes los resultados oficiales de las herramientas. Responde ahora en español, usando solo esos datos; si falta un dato, dilo explícitamente y no inventes.',
      })
      const synthMessages = pruneToolHistory(conversation)
      const synthData = await callLLM(config, synthMessages, tools, 'none')
      if (synthData) {
        const synthMsg = synthData.choices?.[0]?.message
        const reply = synthMsg?.content || ''
        if (reply) {
          llmCallCount++
          llmUsages.push(captureLlmUsage(synthData, synthMessages, synthMsg))
          if (!skipCache && reply.length > 50 && !/lo siento|no tengo|error/i.test(reply.slice(0, 60))) {
            saveSemanticCache(effectiveLastUser, reply, {
              tags: toolsUsed,
              intent: intent.kind,
              precomputedEmbedding: sharedEmbedding,
            })
          }
          return await finalize({ reply, toolsUsed, programCards })
        }
      }
      continue
    }

    const canUseSearchCareerMatch = selectedToolNames.includes('search_career_match')
    const shouldForceCareerSearch =
      round === 0
      && hasInstitution
      && intent.needsOfficialData
      && canUseSearchCareerMatch
      && !toolsUsed.includes('search_career_match')

    if (shouldForceCareerSearch) {
      const genericStopwords = new Set([
        'quiero', 'saber', 'informacion', 'información', 'sobre', 'de', 'la', 'el', 'los', 'las',
        'del', 'en', 'para', 'universidad', 'universitario', 'universitaria', 'chile', 'carrera',
        'profesional', 'licenciatura', 'tecnico', 'tecnica', 'nivel', 'superior', 'magister', 'doctorado',
      ])
      const forcedKeywords = normalizedLastUser
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
        .filter((token) => token.length >= 4 && !genericStopwords.has(token))
        .slice(0, 6)

      try {
        const forcedArgs: Record<string, any> = {
          keywords: forcedKeywords.length ? forcedKeywords : [effectiveRawLastUser],
          institution: activeInstitution!,
          limit: 12,
        }
        if (mentionedTipoInstitucion) forcedArgs.tipo_institucion = mentionedTipoInstitucion
        if (chatContext.nivel) forcedArgs.nivel_carrera = chatContext.nivel
        if (chatContext.area) forcedArgs.area = chatContext.area
        if (chatContext.lastNivel || chatContext.lastArea) forcedArgs.randomize = true

        totalToolCallCount++
        const forcedResult = await runTool('search_career_match', forcedArgs, event)
        toolsUsed.push('search_career_match')

        if (Array.isArray(forcedResult?.results) && !asksInstitutionMeta) {
          const filteredByInstitution = scopedProgramRows(forcedResult)

          const list = asksPaesOrScore
            ? filteredByInstitution.filter((r: any) => {
                const isUniversity = String(r?.tipo_institucion || '').toLowerCase().includes('univers')
                const hasScore =
                  r?.puntaje_promedio_matriculados !== null && r?.puntaje_promedio_matriculados !== undefined
                return isUniversity && hasScore
              })
            : filteredByInstitution

          const cardSource = list.length ? list : filteredByInstitution
          setProgramCardsFromRows(cardSource)
        }

        conversation.push({
          role: 'system',
          content: `RESULTADO FORZADO DE TOOL search_career_match:\n${stringifyToolResultForPrompt('search_career_match', forcedResult)}\n\nAhora responde al usuario SOLO con estos datos oficiales y, si falta algún número, dilo explícitamente.`,
        })
        const synthMessages = pruneToolHistory(conversation)
        const synthData = await callLLM(config, synthMessages, tools, 'none')
        if (synthData) {
          const synthMsg = synthData.choices?.[0]?.message
          const reply = synthMsg?.content || ''
          if (reply) {
            llmCallCount++
            llmUsages.push(captureLlmUsage(synthData, synthMessages, synthMsg))
            return await finalize({ reply, toolsUsed, programCards })
          }
        }
        continue
      } catch (e: any) {
        console.warn('[Chat] forced search_career_match failed:', e?.message)
      }
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
      saveSemanticCache(effectiveLastUser, reply, {
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
