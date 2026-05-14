import { enrichDiscoverResultWithOfficialSalaries } from '~/server/utils/official-salary'
import { captureLlmUsage, logAiUsageEvent, type CapturedLlmUsage } from '~/server/utils/ai/usage-logger'
import { getSupabaseServiceClient, requireSupabaseServiceClient } from '~/server/utils/supabase-clients'
import { findCatalogCareerCandidates, getCatalogCareerById, type CatalogCareerMatch } from '~/server/utils/career-catalog'

// --- Rate limiter via Supabase (funciona en entornos serverless/Vercel) ---
async function checkRateLimit(ip: string): Promise<void> {
  // Rate limiter requiere service_role (tabla rate_limits no es accesible con anon).
  const supabase = getSupabaseServiceClient()
  if (!supabase) {
    console.error('[KoraChile] Rate limit deshabilitado: falta SUPABASE_SERVICE_ROLE_KEY')
    return
  }

  const windowStart = new Date(Date.now() - 10 * 60 * 1000).toISOString()

  const { count, error: countError } = await supabase
    .from('rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('ip', ip)
    .gte('created_at', windowStart)

  if (countError) {
    // Fail-open intencional: no bloqueamos si Supabase falla, pero lo
    // registramos como ERROR (no warn) para que sea visible en monitoreo.
    console.error('[KoraChile] Rate limit check FAIL-OPEN:', countError.message)
    return
  }

  if ((count ?? 0) >= 10) {
    throw createError({ statusCode: 429, message: 'Demasiadas solicitudes. Intenta de nuevo en 10 minutos.' })
  }

  await supabase.from('rate_limits').insert({ ip })
}
// ---------------------------------

const SYSTEM_PROMPT = `Eres una IA de orientación vocacional para Chile especializada en análisis psicológico del lenguaje. Devuelve SOLO JSON válido, sin markdown. Sé conciso: cada descripción máximo 3 oraciones breves.

ANTES de generar las carreras, analiza internamente el texto del usuario aplicando estas técnicas (no las menciones en el JSON, úsalas para decidir qué recomendar):

1. BIG FIVE (Yarkoni 2010): Detecta rasgos en el lenguaje.
   - Responsabilidad: verbos de proceso, estructura lógica, palabras como "organizar", "planificar", "terminar"
   - Apertura: lenguaje abstracto, metáforas, curiosidad expresada, variedad de temas
   - Extraversión: verbos de interacción social, energía, palabras como "gente", "equipo", "evento"
   - Amabilidad: pronombres inclusivos ("nosotros"), verbos de ayuda, empatía expresada
   - Neuroticismo: palabras de preocupación, incertidumbre, lenguaje emocional negativo

2. SELF-CONCEPT (NER + frecuencia emocional):
   - Si usa jerga técnica de forma natural (sin explicarla), infiere competencia real en esa área
   - La frecuencia y carga emocional de los conceptos importa más que lo que dice explícitamente que "le gusta"
   - "nosotros" frecuente → perfil colaborativo/liderazgo; "yo" frecuente → perfil independiente/especialista

3. ANÁLISIS SEMÁNTICO:
   - Sentiment: qué temas generan entusiasmo vs. resignación en su texto
   - Topic modeling: cuáles son los temas recurrentes aunque no los declare como intereses
   - Stylometry: nivel de abstracción del pensamiento (operativo vs. estratégico vs. creativo)

Usa estos insights para seleccionar las 3 carreras más alineadas con el perfil REAL de la persona, no solo con lo que declara explícitamente.

Reglas (aplican a TODO el JSON): recomienda solo carreras de pregrado, técnicas de nivel superior, CFT/IP/universidades o formación de Fuerzas Armadas y de Orden. No recomiendes posgrados, magíster, doctorados, diplomados, postítulos ni especialidades. Usa instituciones chilenas reales (U. de Chile, PUC, USACH, DUOC, INACAP, UDP, UAI, CFTs); adapta al mercado chileno (tecnología, minería, fintech, salud, retail, agroindustria). No entregues sueldos ni estimaciones salariales: el backend los agrega solo si existen datos oficiales SIES. Si usas una carrera del catálogo entregado, copia su career_generic_id exacto.
Las 3 variaciones deben ser carreras distintas: no repitas title, matched_career ni career_generic_id.

Estructura exacta con 3 variaciones (universitarias o no, según el perfil del usuario):
{
  "query": string,
  "summary": string,
  "variations": [{
    "id": string (slug),
    "career_generic_id": string|null,
    "title": string,
    "tagline": string,
    "description": string,
    "emoji": string,
    "match_score": number (70-99),
    "pros": string[3],
    "cons": string[2],
    "skills": string[5],
    "personality_types": string[2] (tipos MBTI),
    "fun_facts": string[3],
    "job_demand": "Alta"|"Media"|"Muy Alta",
    "universities": [{ "name": string, "type": string, "location": string, "program": string }] (exactamente 3),
    "curriculum": [
      { "semester": 1, "subjects": string[4-5] },
      { "semester": 2, "subjects": string[4-5] },
      { "semester": 3, "subjects": string[4] },
      { "semester": 4, "subjects": string[4] },
      { "semester": 5, "subjects": string[3] },
      { "semester": 6, "subjects": string[3] }
    ]
  }]
}`

// Versión compacta para proveedores con límites TPM bajos (ej. Groq on_demand).
const COMPACT_SYSTEM_PROMPT = `Eres una IA vocacional para Chile. Devuelve SOLO JSON válido (sin markdown), breve y concreto.

Analiza el texto del usuario con: Big Five, self-concept y señales semánticas (temas, tono, estilo). Recomienda 3 rutas realistas para Chile.

Reglas:
- No entregues sueldos ni estimaciones salariales; si el usuario los ve, vendrán de SIES/MiFuturo.
- Considera universidades, IP, CFT y formación de Fuerzas Armadas y de Orden.
- No recomiendes posgrados, magíster, doctorados, diplomados, postítulos ni especialidades.
- Si usas una carrera del catálogo entregado, copia su career_generic_id exacto.
- Las 3 variaciones deben ser carreras distintas; no repitas title, matched_career ni career_generic_id.

Estructura JSON obligatoria:
{
  "query": string,
  "summary": string,
  "variations": [{
    "id": string,
    "career_generic_id": string|null,
    "title": string,
    "tagline": string,
    "description": string,
    "emoji": string,
    "match_score": number,
    "pros": string[3],
    "cons": string[2],
    "skills": string[5],
    "personality_types": string[2],
    "fun_facts": string[3],
    "job_demand": "Alta"|"Media"|"Muy Alta",
    "universities": [{ "name": string, "type": string, "location": string, "program": string }],
    "curriculum": [
      { "semester": 1, "subjects": string[4-5] },
      { "semester": 2, "subjects": string[4-5] },
      { "semester": 3, "subjects": string[4] },
      { "semester": 4, "subjects": string[4] },
      { "semester": 5, "subjects": string[3] },
      { "semester": 6, "subjects": string[3] }
    ]
  }]
}`

// Para Groq 8B: pedir menos campos reduce truncamientos y mejora parseabilidad.
const GROQ_MINIMAL_PROMPT = `Eres una IA vocacional para Chile. Devuelve SOLO JSON válido, sin markdown y sin texto extra.

Devuelve exactamente este formato:
{
  "query": string,
  "summary": string,
  "variations": [
    {
      "id": string,
      "career_generic_id": string|null,
      "title": string,
      "tagline": string,
      "description": string,
      "emoji": string,
      "match_score": number,
      "pros": string[3],
      "cons": string[2],
      "skills": string[5],
      "job_demand": "Alta"|"Media"|"Muy Alta"
    }
  ]
}

Reglas:
- Genera 3 variaciones.
- match_score entero entre 70 y 99.
- Todo adaptado a Chile.
- Recomienda solo pregrado, técnico de nivel superior, CFT/IP/universidad o Fuerzas Armadas y de Orden.
- No recomiendes posgrados, magíster, doctorados, diplomados, postítulos ni especialidades.
- Si usas una carrera del catálogo entregado, copia su career_generic_id exacto.
- Las 3 variaciones deben ser carreras distintas; no repitas title, matched_career ni career_generic_id.
- No incluyas sueldos, ingresos ni salary_range.
- No inventes datos absurdos ni uses markdown.`

function buildDiscoverCatalogHint(candidates: CatalogCareerMatch[]) {
  if (!candidates.length) return ''

  const lines = [
    'CATÁLOGO REAL DISPONIBLE PARA ESTA CONSULTA:',
    'Estas son carreras de la tabla career_generic. Si eliges una, copia EXACTAMENTE su id en variations[].career_generic_id y usa su nombre como title:',
  ]

  for (const candidate of candidates.slice(0, 8)) {
    const bits = [
      `id=${candidate.career_generic_id}`,
      `nombre=${candidate.nombre_carrera_generica}`,
      candidate.area ? `area=${candidate.area}` : null,
      candidate.tipo_institucion ? `tipo=${candidate.tipo_institucion}` : null,
    ].filter(Boolean).join(' | ')
    lines.push(`- ${bits}`)
  }

  lines.push('INSTRUCCIONES DE CATÁLOGO:')
  lines.push('- Prioriza estas carreras reales cuando calcen con el perfil vocacional.')
  lines.push('- Elige hasta 3 carreras DISTINTAS: no repitas el mismo id ni el mismo nombre.')
  lines.push('- Solo puedes elegir carreras de pregrado/técnicas/CFT/IP/universidad/FF.AA.; nunca posgrados.')
  lines.push('- No cambies el id. Si ninguna calza, usa career_generic_id: null y un título vocacional propio.')
  lines.push('- No inventes sueldos; el backend cruza career_generic_id con career_stats.')

  return lines.join('\n')
}

function normalizeSlug(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function isDisallowedRecommendationTitle(title: string) {
  return /\b(postgrado|posgrado|mag[ií]ster|magistr|maestr[ií]a|doctorado|diplomado|post[ií]tulo|especialidad|residencia)\b/i.test(title)
}

function uniqueCareerKey(career: any) {
  const id = String(career?.career_generic_id || '').trim()
  if (id) return `id:${id}`
  return `title:${normalizeSlug(String(career?.title || career?.matched_career || ''))}`
}

function candidateCareerKey(candidate: CatalogCareerMatch) {
  return `id:${candidate.career_generic_id}`
}

function applyCatalogCandidate(career: any, candidate: CatalogCareerMatch, index: number) {
  return {
    ...career,
    id: normalizeSlug(candidate.nombre_carrera_generica) || String(career?.id || `ruta-${index + 1}`),
    title: candidate.nombre_carrera_generica,
    career_generic_id: candidate.career_generic_id,
    matched_career: candidate.nombre_carrera_generica,
  }
}

function fallbackCatalogCandidate(
  candidates: CatalogCareerMatch[],
  usedKeys: Set<string>,
) {
  return candidates.find(candidate => !usedKeys.has(candidateCareerKey(candidate))) ?? null
}

async function alignDiscoverResultWithCatalog<T extends { variations?: any[] }>(
  result: T,
  supabase: any,
  catalogCandidates: CatalogCareerMatch[],
): Promise<T> {
  if (!Array.isArray(result.variations)) return result

  const usedKeys = new Set<string>()
  const aligned: any[] = []

  for (let index = 0; index < result.variations.length; index++) {
    const career = result.variations[index]
    const currentId = String(career?.career_generic_id || '').trim()
    const invalidTitle = isDisallowedRecommendationTitle(String(career?.title || ''))
    let candidate = currentId
      ? catalogCandidates.find(item => item.career_generic_id === currentId) ?? await getCatalogCareerById(supabase, currentId)
      : null

    const candidateIsDuplicate = candidate ? usedKeys.has(candidateCareerKey(candidate)) : false

    if (!candidate || invalidTitle || candidateIsDuplicate) {
      const searchText = [
        career?.title,
        career?.tagline,
        career?.description,
        Array.isArray(career?.skills) ? career.skills.join(' ') : '',
      ].filter(Boolean).join(' ')
      const localCandidates = invalidTitle
        ? catalogCandidates
        : await findCatalogCareerCandidates(supabase, searchText, 6)

      candidate = localCandidates.find(item => !usedKeys.has(candidateCareerKey(item)))
        ?? fallbackCatalogCandidate(catalogCandidates, usedKeys)
        ?? (candidateIsDuplicate ? null : candidate)
    }

    const nextCareer = candidate
      ? applyCatalogCandidate(career, candidate, index)
      : career

    const nextKey = uniqueCareerKey(nextCareer)
    if (usedKeys.has(nextKey)) {
      const fallback = fallbackCatalogCandidate(catalogCandidates, usedKeys)
      if (!fallback) continue
      const replacement = applyCatalogCandidate(career, fallback, index)
      usedKeys.add(uniqueCareerKey(replacement))
      aligned.push(replacement)
      continue
    }

    usedKeys.add(nextKey)
    aligned.push(nextCareer)
  }

  for (const fallback of catalogCandidates) {
    if (aligned.length >= 3) break
    const key = candidateCareerKey(fallback)
    if (usedKeys.has(key)) continue
    const index = aligned.length
    const base = result.variations[index] ?? result.variations[0] ?? {}
    const replacement = applyCatalogCandidate(base, fallback, index)
    usedKeys.add(uniqueCareerKey(replacement))
    aligned.push(replacement)
  }

  return { ...result, variations: aligned.slice(0, 3) }
}

function extractLikelyJson(raw: string): string {
  let cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
  cleaned = cleaned.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim()

  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1)
  }
  return cleaned
}

function tryParsePossiblyTruncatedJson(raw: string): any {
  const cleaned = extractLikelyJson(raw)
  try {
    return JSON.parse(cleaned)
  } catch {
    let fixed = cleaned
    const quoteBalance = (fixed.match(/"/g) || []).length % 2
    if (quoteBalance !== 0) fixed += '"'

    let braces = 0
    let brackets = 0
    for (const ch of fixed) {
      if (ch === '{') braces++
      else if (ch === '}') braces--
      else if (ch === '[') brackets++
      else if (ch === ']') brackets--
    }

    while (brackets > 0) { fixed += ']'; brackets-- }
    while (braces > 0) { fixed += '}'; braces-- }

    // Corrige comas colgantes antes de } o ]
    fixed = fixed.replace(/,\s*([}\]])/g, '$1')

    return JSON.parse(fixed)
  }
}

function uniqueStringList(value: unknown, limit: number) {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of value) {
    const text = String(item || '').trim()
    if (!text) continue
    const key = normalizeSlug(text)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(text)
    if (out.length >= limit) break
  }
  return out
}

function pushUniqueFallback(list: string[], values: string[], limit: number) {
  const seen = new Set(list.map(normalizeSlug))
  for (const value of values) {
    if (list.length >= limit) break
    const key = normalizeSlug(value)
    if (seen.has(key)) continue
    seen.add(key)
    list.push(value)
  }
}

function normalizeDiscoverResult(input: any, fallbackQuery: string) {
  const safeQuery = String(input?.query || fallbackQuery || '').trim() || fallbackQuery
  const safeSummary = String(input?.summary || 'Resultado vocacional generado por IA para Chile.').trim()
  const vars = Array.isArray(input?.variations) ? input.variations : []

  const normalizedVariations = vars.slice(0, 3).map((v: any, idx: number) => {
    const scoreRaw = Number(v?.match_score)
    const score = Number.isFinite(scoreRaw)
      ? Math.max(70, Math.min(99, scoreRaw <= 1 ? Math.round(scoreRaw * 100) : Math.round(scoreRaw)))
      : 80

    const title = String(v?.title || `Ruta vocacional ${idx + 1}`).trim()
    const id = String(v?.id || title.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/(^-|-$)/g, '') || `ruta-${idx + 1}`

    const pros = uniqueStringList(v?.pros, 3)
    pushUniqueFallback(pros, ['Buena proyección de aprendizaje', 'Desarrolla habilidades transferibles', 'Permite crecimiento profesional'], 3)

    const cons = uniqueStringList(v?.cons, 2)
    pushUniqueFallback(cons, ['Exige constancia y práctica', 'Requiere tolerancia a la frustración'], 2)

    const skills = uniqueStringList(v?.skills, 5)
    pushUniqueFallback(skills, ['Aprendizaje continuo', 'Pensamiento crítico', 'Comunicación efectiva', 'Resolución de problemas', 'Trabajo en equipo'], 5)

    const personalityTypes = uniqueStringList(v?.personality_types, 2)
    pushUniqueFallback(personalityTypes, ['INTJ', 'ENTP'], 2)

    const funFacts = uniqueStringList(v?.fun_facts, 3)
    pushUniqueFallback(funFacts, ['Tiene alta demanda de talento en Chile', 'Permite crecimiento profesional continuo', 'Combina teoría con aplicación práctica'], 3)

    const roadmap: any[] = []

    return {
      id,
      career_generic_id: String(v?.career_generic_id || '').trim() || null,
      title,
      matched_career: String(v?.matched_career || v?.catalog_title || '').trim() || undefined,
      tagline: String(v?.tagline || 'Una ruta con futuro en Chile'),
      description: String(v?.description || 'Ruta recomendada según tu perfil vocacional.'),
      emoji: String(v?.emoji || '🚀'),
      match_score: score,
      pros,
      cons,
      skills,
      salary_source: 'none',
      salary_label: 'Sin dato oficial SIES para esta recomendación',
      personality_types: personalityTypes,
      fun_facts: funFacts,
      books: [],
      job_demand: (v?.job_demand === 'Muy Alta' || v?.job_demand === 'Alta' || v?.job_demand === 'Media') ? v.job_demand : 'Alta',
      roadmap: [],
      universities: Array.isArray(v?.universities) ? v.universities.slice(0, 3) : [],
      notable_people: [],
      curriculum: Array.isArray(v?.curriculum) ? v.curriculum.slice(0, 6) : [],
    }
  })

  while (normalizedVariations.length < 3) {
    const i = normalizedVariations.length + 1
    normalizedVariations.push({
      id: `ruta-${i}`,
      career_generic_id: null,
      title: `Ruta vocacional ${i}`,
      matched_career: undefined,
      tagline: 'Alternativa alineada a tu perfil',
      description: 'Propuesta adicional para ampliar tus opciones de estudio y trabajo.',
      emoji: '🎯',
      match_score: 78,
      pros: ['Buena empleabilidad', 'Ruta flexible', 'Aprendizaje transferible'],
      cons: ['Requiere disciplina', 'Curva de aprendizaje inicial'],
      skills: ['Comunicación', 'Pensamiento crítico', 'Trabajo en equipo', 'Resolución de problemas', 'Aprendizaje continuo'],
      salary_source: 'none',
      salary_label: 'Sin dato oficial SIES para esta recomendación',
      personality_types: ['INTJ', 'ENTP'],
      fun_facts: ['Opción con demanda estable', 'Permite especialización', 'Tiene salida en varias industrias'],
      books: [],
      job_demand: 'Alta',
      roadmap: [],
      universities: [],
      notable_people: [],
      curriculum: [],
    })
  }

  return {
    query: safeQuery,
    summary: safeSummary,
    variations: normalizedVariations,
  }
}

function withLLMMeta(data: any, provider: string, model: string) {
  return { ...data, _kora: { provider, model } }
}

function captureDiscoverUsage(
  llmUsages: CapturedLlmUsage[],
  response: any,
  requestMessages: Array<{ role: string, content: string }>,
) {
  const assistantMessage = response?.choices?.[0]?.message ?? { content: '' }
  llmUsages.push(captureLlmUsage(response, requestMessages, assistantMessage))
}

async function repairJsonWithProvider(
  rawText: string,
  config: ReturnType<typeof useRuntimeConfig>,
  llmUsages: CapturedLlmUsage[],
): Promise<string> {
  const repairPrompt = `Repara este contenido para que sea JSON válido estricto.\n\nReglas:\n- Devuelve SOLO JSON, sin markdown.\n- Mantén la misma estructura esperada (query, summary, variations...).\n- Si está truncado, completa lo faltante de forma breve y coherente.\n- No agregues comentarios.\n\nContenido a reparar:\n${rawText.slice(0, 10000)}`

  if (config.githubToken) {
    try {
      const repairMessages = [
        { role: 'system', content: 'Eres un reparador de JSON. Devuelve únicamente JSON válido.' },
        { role: 'user', content: repairPrompt },
      ]
      const res = await fetch('https://models.github.ai/inference/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.githubToken}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({
          model: 'openai/gpt-4.1-mini',
          temperature: 0.1,
          max_tokens: 1800,
          messages: repairMessages,
        }),
      })
      if (res.ok) {
        const data = withLLMMeta(await res.json(), 'github_models', 'openai/gpt-4.1-mini')
        captureDiscoverUsage(llmUsages, data, repairMessages)
        return data.choices?.[0]?.message?.content || ''
      }
    } catch {
      // continúa con Groq
    }
  }

  if (config.groqApiKey) {
    try {
      const repairMessages = [
        { role: 'system', content: 'Eres un reparador de JSON. Devuelve únicamente JSON válido.' },
        { role: 'user', content: repairPrompt.slice(0, 7000) },
      ]
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.groqApiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          temperature: 0.1,
          max_tokens: 1200,
          messages: repairMessages,
        }),
      })
      if (res.ok) {
        const data = withLLMMeta(await res.json(), 'groq', 'llama-3.1-8b-instant')
        captureDiscoverUsage(llmUsages, data, repairMessages)
        return data.choices?.[0]?.message?.content || ''
      }
    } catch {
      // sin más fallback
    }
  }

  return ''
}

export default defineEventHandler(async (event) => {
  const startedAt = Date.now()
  const forwarded = getHeader(event, 'x-forwarded-for') ?? ''
  const ip =
    forwarded.split(',')[0]?.trim() ||
    getHeader(event, 'x-real-ip') ||
    event.node.req.socket?.remoteAddress ||
    'unknown'

  await checkRateLimit(ip)

  const config = useRuntimeConfig()
  const body = await readBody(event)
  const { query } = body

  if (!query || typeof query !== 'string' || query.trim().length < 5) {
    throw createError({ statusCode: 400, message: 'La consulta debe tener al menos 5 caracteres.' })
  }
  if (query.trim().length > 1000) {
    throw createError({ statusCode: 400, message: 'La consulta no puede superar los 1000 caracteres.' })
  }

  const trimmedQuery = query.trim()
  const userMessage = `Texto de la persona: "${trimmedQuery}"`
  const llmUsages: CapturedLlmUsage[] = []
  let repairAttempted = false
  let rawText = ''
  const supabase = requireSupabaseServiceClient()
  const catalogCandidates = await findCatalogCareerCandidates(supabase, trimmedQuery, 10)
  const catalogHint = buildDiscoverCatalogHint(catalogCandidates)

  if (!config.githubToken && !config.groqApiKey && !config.ollamaUrl) {
    console.warn('[KoraChile] ⚠️ Ninguna variable de proveedor configurada. Define APY_GIT, GROQ u OLLAMA_URL en las variables de entorno.')
  }

  // --- 1. GitHub Models / GPT-4.1-mini (PRIORIDAD) ---
  if (!rawText && config.githubToken) {
    try {
      console.log('[KoraChile] Intentando con GitHub Models (GPT-4.1-mini)...')
      const requestMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...(catalogHint ? [{ role: 'system', content: catalogHint }] : []),
        { role: 'user', content: userMessage },
      ]
      const ghRes = await fetch('https://models.github.ai/inference/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.githubToken}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({
          model: 'openai/gpt-4.1-mini',
          temperature: 0.7,
          max_tokens: 3200,
          messages: requestMessages,
        }),
      })
      if (ghRes.ok) {
        const ghData = withLLMMeta(await ghRes.json(), 'github_models', 'openai/gpt-4.1-mini')
        captureDiscoverUsage(llmUsages, ghData, requestMessages)
        rawText = ghData.choices?.[0]?.message?.content || ''
        if (rawText) console.log('[KoraChile] ✅ GitHub Models GPT-4.1-mini OK')
        else console.warn('[KoraChile] ⚠️ GPT-4.1-mini respondió vacío')
      } else {
        const errBody = await ghRes.text()
        console.warn(`[KoraChile] ⚠️ GPT-4.1-mini HTTP ${ghRes.status}:`, errBody)
      }
    } catch (e) {
      console.warn('[KoraChile] ⚠️ GPT-4.1-mini no disponible — probando DeepSeek...')
    }
  }

  // --- 2. GitHub Models / DeepSeek-V3-0324 (fallback económico) ---
  if (!rawText && config.githubToken) {
    try {
      console.log('[KoraChile] Intentando con GitHub Models (DeepSeek-V3-0324)...')
      const requestMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...(catalogHint ? [{ role: 'system', content: catalogHint }] : []),
        { role: 'user', content: userMessage },
      ]
      const deepseekRes = await fetch('https://models.github.ai/inference/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.githubToken}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(35000),
        body: JSON.stringify({
          model: 'deepseek/DeepSeek-V3-0324',
          temperature: 0.7,
          max_tokens: 3200,
          messages: requestMessages,
        }),
      })
      if (deepseekRes.ok) {
        const deepseekData = withLLMMeta(await deepseekRes.json(), 'github_models', 'deepseek/DeepSeek-V3-0324')
        captureDiscoverUsage(llmUsages, deepseekData, requestMessages)
        rawText = deepseekData.choices?.[0]?.message?.content || ''
        if (rawText) console.log('[KoraChile] ✅ DeepSeek-V3-0324 (GitHub Models) OK')
        else console.warn('[KoraChile] ⚠️ DeepSeek-V3-0324 respondió vacío')
      } else {
        const errBody = await deepseekRes.text()
        console.warn(`[KoraChile] ⚠️ DeepSeek-V3-0324 HTTP ${deepseekRes.status}:`, errBody)
      }
    } catch (e) {
      console.warn('[KoraChile] ⚠️ DeepSeek-V3-0324 no disponible — probando Meta-Llama...')
    }
  }

  // --- 3. GitHub Models / Meta-Llama-3.1-8B-Instruct (fallback rápido) ---
  if (!rawText && config.githubToken) {
    try {
      console.log('[KoraChile] Intentando con GitHub Models (Meta-Llama-3.1-8B)...')
      const requestMessages = [
        { role: 'system', content: GROQ_MINIMAL_PROMPT },
        ...(catalogHint ? [{ role: 'system', content: catalogHint }] : []),
        { role: 'user', content: userMessage },
      ]
      const llamaRes = await fetch('https://models.github.ai/inference/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.githubToken}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({
          model: 'meta/Meta-Llama-3.1-8B-Instruct',
          temperature: 0.5,
          max_tokens: 900,
          messages: requestMessages,
        }),
      })
      if (llamaRes.ok) {
        const llamaData = withLLMMeta(await llamaRes.json(), 'github_models', 'meta/Meta-Llama-3.1-8B-Instruct')
        captureDiscoverUsage(llmUsages, llamaData, requestMessages)
        rawText = llamaData.choices?.[0]?.message?.content || ''
        if (rawText) console.log('[KoraChile] ✅ Meta-Llama (GitHub Models) OK')
        else console.warn('[KoraChile] ⚠️ Meta-Llama respondió vacío')
      } else {
        const errBody = await llamaRes.text()
        console.warn(`[KoraChile] ⚠️ Meta-Llama HTTP ${llamaRes.status}:`, errBody)
      }
    } catch (e) {
      console.warn('[KoraChile] ⚠️ Meta-Llama no disponible — probando Groq...')
    }
  }

  // --- 4. Groq (fallback) ---
  if (!rawText && config.groqApiKey) {
    try {
      console.log('[KoraChile] Intentando con Groq...')
      const requestMessages = [
        { role: 'system', content: GROQ_MINIMAL_PROMPT },
        ...(catalogHint ? [{ role: 'system', content: catalogHint }] : []),
        { role: 'user', content: userMessage },
      ]
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.groqApiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          temperature: 0.5,
          max_tokens: 900,
          messages: requestMessages,
        }),
      })
      if (groqRes.ok) {
        const groqData = withLLMMeta(await groqRes.json(), 'groq', 'llama-3.1-8b-instant')
        captureDiscoverUsage(llmUsages, groqData, requestMessages)
        rawText = groqData.choices?.[0]?.message?.content || ''
        if (rawText) console.log('[KoraChile] ✅ Groq OK')
        else console.warn('[KoraChile] ⚠️ Groq respondió vacío')
      } else {
        const errBody = await groqRes.text()
        console.warn(`[KoraChile] ⚠️ Groq HTTP ${groqRes.status}:`, errBody)

        // Reintento defensivo si excede límite TPM/tamaño.
        if (groqRes.status === 413 || /Request too large|tokens per minute|TPM/i.test(errBody)) {
          const safeMessage = `Texto de la persona: "${trimmedQuery.slice(0, 450)}"`
          const retryMessages = [
            { role: 'system', content: GROQ_MINIMAL_PROMPT },
            ...(catalogHint ? [{ role: 'system', content: catalogHint }] : []),
            { role: 'user', content: safeMessage },
          ]
          const retryRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${config.groqApiKey}`,
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(25000),
            body: JSON.stringify({
              model: 'llama-3.1-8b-instant',
              temperature: 0.4,
              max_tokens: 750,
              messages: retryMessages,
            }),
          })

          if (retryRes.ok) {
            const retryData = withLLMMeta(await retryRes.json(), 'groq', 'llama-3.1-8b-instant')
            captureDiscoverUsage(llmUsages, retryData, retryMessages)
            rawText = retryData.choices?.[0]?.message?.content || ''
            if (rawText) console.log('[KoraChile] ✅ Groq OK (retry compact)')
          } else {
            const retryErr = await retryRes.text()
            console.warn(`[KoraChile] ⚠️ Groq retry HTTP ${retryRes.status}:`, retryErr)
          }
        }
      }
    } catch (e) {
      console.warn('[KoraChile] ⚠️ Groq no disponible')
    }
  }

  if (!rawText) {
    throw createError({
      statusCode: 502,
      message: 'No se obtuvo respuesta de ningún proveedor de IA. Verifica que las variables APY_GIT (GitHub Models), GROQ o OLLAMA_URL estén configuradas correctamente en el entorno.',
    })
  }

  // Parseo robusto + autorreparación si el modelo devuelve JSON truncado
  let parsed
  try {
    parsed = tryParsePossiblyTruncatedJson(rawText)
  } catch {
    console.warn('[KoraChile] JSON inválido, intentando reparación automática...')
    repairAttempted = true
    const repairedText = await repairJsonWithProvider(rawText, config, llmUsages)

    try {
      parsed = tryParsePossiblyTruncatedJson(repairedText)
      console.log('[KoraChile] ✅ JSON reparado automáticamente')
    } catch {
      console.error('[KoraChile] rawText no parseable (primeros 800 chars):\n', rawText?.slice(0, 800))
      // Fail-soft: evitar 502 y devolver estructura mínima utilizable.
      parsed = {
        query: trimmedQuery,
        summary: 'No se pudo parsear completamente la respuesta de IA. Se entrega una versión simplificada.',
        variations: [],
      }
    }
  }

  parsed = normalizeDiscoverResult(parsed, trimmedQuery)
  parsed = await alignDiscoverResultWithCatalog(parsed, supabase, catalogCandidates)
  parsed = await enrichDiscoverResultWithOfficialSalaries(parsed, supabase)

  const { data: session, error: dbError } = await supabase
    .from('discovery_sessions')
    .insert({ query: query.trim(), result: parsed })
    .select('id')
    .single()

  if (dbError) {
    console.error('Supabase insert error:', dbError)
  }

  await logAiUsageEvent({
    sessionId: session?.id || null,
    route: 'discover',
    intent: 'career_recommendation',
    llmUsages,
    llmCallCount: llmUsages.length,
    latencyMs: Date.now() - startedAt,
    metadata: {
      query_length: trimmedQuery.length,
      result_variations: Array.isArray(parsed?.variations) ? parsed.variations.length : 0,
      repair_attempted: repairAttempted,
      provider_chain: llmUsages.map(usage => ({ provider: usage.provider, model: usage.model, estimated: usage.estimated })),
    },
  })

  return {
    sessionId: session?.id || null,
    result: parsed,
  }
})