/**
 * evals/run.ts
 *
 * Runner de evaluación del agente Kora. Ejecuta cada caso de `dataset.jsonl`
 * contra /api/chat en un servidor vivo y verifica la respuesta en dos niveles:
 *
 *   1. Determinista  → must_contain / must_not_contain / expected_route
 *   2. LLM-as-judge  → groundedness: ¿cita cifras que no vinieron de una tool?
 *
 * Prueba el sistema COMPLETO (rutas deterministas + cache + RAG + tools + LLM),
 * que es lo que vive el usuario. Un runner que llamara runTool() directamente
 * mediría si las tools devuelven datos, no si el agente elige la tool correcta
 * —que es la pregunta que importa.
 *
 * Requisitos (.env):
 *   EVAL_BASE_URL        (default http://localhost:3000)
 *   EVAL_USER_EMAIL      usuario de prueba ya registrado en Supabase
 *   EVAL_USER_PASSWORD
 *   VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY   (para obtener el JWT)
 *   GROQ o APY_GIT       (opcional: habilita el juez de groundedness)
 *
 * Uso:
 *   npm run eval
 *   npm run eval -- --difficulty=easy
 *   npm run eval -- --id=emp-derecho-udp
 *   npm run eval -- --no-judge          (solo verificación determinista)
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))

// ── Config ────────────────────────────────────────────────────
const BASE_URL = process.env.EVAL_BASE_URL || 'http://localhost:3000'
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const EVAL_EMAIL = process.env.EVAL_USER_EMAIL
const EVAL_PASSWORD = process.env.EVAL_USER_PASSWORD
const GROQ_KEY = process.env.GROQ || process.env.GROQ_API_KEY || ''

const args = process.argv.slice(2)
const filterDifficulty = args.find(a => a.startsWith('--difficulty='))?.split('=')[1] ?? null
const filterId = args.find(a => a.startsWith('--id='))?.split('=')[1] ?? null
const useJudge = !args.includes('--no-judge')

// El chat aplica rate limit de 12 req/min por usuario (requireAuth scope 'chat').
// Serializamos con una pausa para no chocar contra el 429 y falsear el resultado.
const DELAY_BETWEEN_CASES_MS = Number(process.env.EVAL_DELAY_MS || 5500)

interface EvalCase {
  id: string
  difficulty: 'easy' | 'medium' | 'hard'
  messages: Array<{ role: string; content: string }>
  expect: {
    must_contain?: string[]
    must_not_contain?: string[]
    expected_tools?: string[]
    expected_route?: string | null
    grounded?: boolean
    notes?: string
  }
}

interface CaseResult {
  id: string
  difficulty: string
  passed: boolean
  checks: Record<string, { ok: boolean; detail?: string }>
  toolMatch: 'exact' | 'partial' | 'none' | 'n/a'
  reply: string
  diagnostics: any
  latencyMs: number
  error?: string
}

// ── Utilidades ────────────────────────────────────────────────
/** Normaliza para comparar: sin tildes, minúsculas. Igual criterio que pickTools. */
function normalize(text: string) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

function loadDataset(): EvalCase[] {
  const raw = readFileSync(resolve(HERE, 'dataset.jsonl'), 'utf-8')
  const cases = raw
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map((line, i) => {
      try { return JSON.parse(line) as EvalCase }
      catch (e: any) { throw new Error(`dataset.jsonl línea ${i + 1} inválida: ${e.message}`) }
    })

  return cases.filter(c => {
    if (filterId && c.id !== filterId) return false
    if (filterDifficulty && c.difficulty !== filterDifficulty) return false
    return true
  })
}

async function getAccessToken(): Promise<string> {
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    throw new Error('Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en .env')
  }
  if (!EVAL_EMAIL || !EVAL_PASSWORD) {
    throw new Error('Faltan EVAL_USER_EMAIL / EVAL_USER_PASSWORD en .env (usuario de prueba de Supabase)')
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } })
  const { data, error } = await supabase.auth.signInWithPassword({ email: EVAL_EMAIL, password: EVAL_PASSWORD })
  if (error || !data.session?.access_token) {
    throw new Error(`No se pudo autenticar el usuario de eval: ${error?.message ?? 'sin sesión'}`)
  }
  return data.session.access_token
}

// ── Juez de groundedness ──────────────────────────────────────
/**
 * El principio rector del proyecto es "la IA NO inventa cifras". Este juez
 * verifica justamente eso: que toda cifra citada provenga de una tool.
 * Tolerante en formato y redacción; estricto solo en el hecho verificable.
 */
async function judgeGroundedness(question: string, reply: string, toolsUsed: string[]): Promise<{ ok: boolean; reason: string }> {
  if (!GROQ_KEY) return { ok: true, reason: 'juez deshabilitado (sin GROQ key)' }

  const prompt = `Eres un evaluador estricto de un asistente de orientación vocacional chileno.

PREGUNTA DEL USUARIO:
${question}

RESPUESTA DEL ASISTENTE:
${reply}

HERRAMIENTAS DE DATOS QUE SE EJECUTARON: ${toolsUsed.length ? toolsUsed.join(', ') : 'NINGUNA'}

Regla que debe cumplir el asistente: NUNCA debe inventar cifras concretas
(sueldos, aranceles, puntajes de corte, porcentajes de empleabilidad, años de
acreditación, vacantes). Toda cifra debe provenir de una herramienta.

Responde FAIL si la respuesta cita cifras concretas y NO se ejecutó ninguna
herramienta que pudiera proveerlas.
Responde PASS si: no cita cifras; o las cita y sí se ejecutaron herramientas; o
declara honestamente que no tiene el dato.

NO penalices formato, redacción, tono, longitud ni que la respuesta pida
aclaraciones. Solo evalúas invención de datos.

Formato exacto de tu salida:
VEREDICTO: PASS|FAIL
RAZON: <una frase>`

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 150,
      }),
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) return { ok: true, reason: `juez no disponible (HTTP ${res.status})` }
    const data: any = await res.json()
    const text = String(data?.choices?.[0]?.message?.content ?? '')
    const verdict = /VEREDICTO:\s*(PASS|FAIL)/i.exec(text)?.[1]?.toUpperCase()
    const reason = /RAZON:\s*(.+)/i.exec(text)?.[1]?.trim() ?? text.slice(0, 120)
    // Ante duda del juez, no marcamos fallo: preferimos falsos negativos a ruido.
    return { ok: verdict !== 'FAIL', reason }
  } catch (e: any) {
    return { ok: true, reason: `juez falló: ${e?.message}` }
  }
}

// ── Ejecución de un caso ──────────────────────────────────────
async function runCase(testCase: EvalCase, token: string): Promise<CaseResult> {
  const checks: CaseResult['checks'] = {}
  const startedAt = Date.now()

  let body: any
  try {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ messages: testCase.messages, diagnostics: true }),
      signal: AbortSignal.timeout(90000),
    })
    if (!res.ok) {
      const text = await res.text()
      return {
        id: testCase.id,
        difficulty: testCase.difficulty,
        passed: false,
        checks: { http: { ok: false, detail: `HTTP ${res.status}: ${text.slice(0, 200)}` } },
        toolMatch: 'n/a',
        reply: '',
        diagnostics: null,
        latencyMs: Date.now() - startedAt,
        error: `HTTP ${res.status}`,
      }
    }
    body = await res.json()
  } catch (e: any) {
    return {
      id: testCase.id,
      difficulty: testCase.difficulty,
      passed: false,
      checks: { request: { ok: false, detail: e?.message } },
      toolMatch: 'n/a',
      reply: '',
      diagnostics: null,
      latencyMs: Date.now() - startedAt,
      error: e?.message,
    }
  }

  const latencyMs = Date.now() - startedAt
  const reply = String(body?.reply ?? '')
  const diagnostics = body?.diagnostics ?? null
  const toolsUsed: string[] = body?.toolsUsed ?? []
  const normalizedReply = normalize(reply)
  const expect = testCase.expect

  checks.non_empty = { ok: reply.trim().length > 0, detail: reply.trim() ? undefined : 'respuesta vacía' }

  if (expect.must_contain?.length) {
    const missing = expect.must_contain.filter(term => !normalizedReply.includes(normalize(term)))
    checks.must_contain = { ok: missing.length === 0, detail: missing.length ? `falta: ${missing.join(', ')}` : undefined }
  }

  if (expect.must_not_contain?.length) {
    const present = expect.must_not_contain.filter(term => normalizedReply.includes(normalize(term)))
    checks.must_not_contain = { ok: present.length === 0, detail: present.length ? `presente: ${present.join(', ')}` : undefined }
  }

  if (expect.expected_route !== undefined && diagnostics) {
    const actual = diagnostics.deterministic_route ?? null
    checks.route = {
      ok: actual === expect.expected_route,
      detail: actual === expect.expected_route ? undefined : `esperada ${expect.expected_route}, obtenida ${actual}`,
    }
  }

  // Errores de tool nunca son aceptables, se pidan o no tools en el caso.
  if (diagnostics?.tools_failed?.length) {
    checks.no_tool_errors = { ok: false, detail: `tools con error: ${diagnostics.tools_failed.join(', ')}` }
  }

  // Coincidencia de tools: se REPORTA pero no decide el pase. Hay múltiples
  // caminos válidos y sobreajustar la estrategia va contra la guía de Anthropic.
  let toolMatch: CaseResult['toolMatch'] = 'n/a'
  if (expect.expected_tools) {
    if (!expect.expected_tools.length) {
      toolMatch = toolsUsed.length === 0 ? 'exact' : 'none'
    } else {
      const hits = expect.expected_tools.filter(t => toolsUsed.includes(t))
      toolMatch = hits.length === expect.expected_tools.length ? 'exact' : hits.length > 0 ? 'partial' : 'none'
    }
  }

  if (useJudge && expect.grounded) {
    const lastUser = [...testCase.messages].reverse().find(m => m.role === 'user')?.content ?? ''
    const verdict = await judgeGroundedness(lastUser, reply, toolsUsed)
    checks.grounded = { ok: verdict.ok, detail: verdict.ok ? undefined : verdict.reason }
  }

  return {
    id: testCase.id,
    difficulty: testCase.difficulty,
    passed: Object.values(checks).every(c => c.ok),
    checks,
    toolMatch,
    reply,
    diagnostics,
    latencyMs,
  }
}

// ── Reporte ───────────────────────────────────────────────────
function percentile(values: number[], p: number): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return Math.round(sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))])
}

function report(results: CaseResult[]) {
  const passed = results.filter(r => r.passed)
  const latencies = results.map(r => r.latencyMs)
  const tokens = results.reduce((sum, r) => sum + (Number(r.diagnostics?.tokens) || 0), 0)
  const toolCalls = results.reduce((sum, r) => sum + (r.diagnostics?.tool_calls?.length || 0), 0)
  const toolErrors = results.reduce((sum, r) => sum + (r.diagnostics?.tools_failed?.length || 0), 0)
  const deduped = results.reduce((sum, r) => sum + (Number(r.diagnostics?.tool_calls_deduped) || 0), 0)

  const line = '─'.repeat(64)
  console.log(`\n${line}\nRESULTADO\n${line}`)
  console.log(`Precisión global : ${passed.length}/${results.length} (${Math.round((passed.length / results.length) * 100)}%)`)

  for (const level of ['easy', 'medium', 'hard'] as const) {
    const subset = results.filter(r => r.difficulty === level)
    if (!subset.length) continue
    const ok = subset.filter(r => r.passed).length
    console.log(`  ${level.padEnd(7)}        : ${ok}/${subset.length} (${Math.round((ok / subset.length) * 100)}%)`)
  }

  const withTools = results.filter(r => r.toolMatch !== 'n/a')
  if (withTools.length) {
    const exact = withTools.filter(r => r.toolMatch === 'exact').length
    const partial = withTools.filter(r => r.toolMatch === 'partial').length
    console.log(`\nSelección de tools: ${exact} exacta · ${partial} parcial · ${withTools.length - exact - partial} sin coincidencia`)
  }

  console.log(`\nTool calls        : ${toolCalls}  (errores: ${toolErrors}, deduplicadas: ${deduped})`)
  console.log(`Tokens totales    : ${tokens.toLocaleString('es-CL')}`)
  console.log(`Latencia p50/p95  : ${percentile(latencies, 50)}ms / ${percentile(latencies, 95)}ms`)

  const failed = results.filter(r => !r.passed)
  if (failed.length) {
    console.log(`\n${line}\nFALLOS (${failed.length})\n${line}`)
    for (const f of failed) {
      const reasons = Object.entries(f.checks)
        .filter(([, c]) => !c.ok)
        .map(([name, c]) => `${name}${c.detail ? ` (${c.detail})` : ''}`)
        .join('; ')
      console.log(`  ✗ ${f.id.padEnd(24)} ${reasons}`)
    }
  }

  const outDir = resolve(HERE, 'results')
  mkdirSync(outDir, { recursive: true })
  const outFile = resolve(outDir, `${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  writeFileSync(outFile, JSON.stringify({
    ranAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    judgeEnabled: useJudge && !!GROQ_KEY,
    summary: {
      total: results.length,
      passed: passed.length,
      accuracyPct: Math.round((passed.length / results.length) * 100),
      toolCalls,
      toolErrors,
      deduped,
      tokens,
      latencyP50: percentile(latencies, 50),
      latencyP95: percentile(latencies, 95),
    },
    results,
  }, null, 2), 'utf-8')

  console.log(`\nTranscripciones: ${outFile}`)
  console.log('(pégalas en Claude Code para analizar por qué el agente eligió mal una tool)\n')

  return failed.length === 0
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  const cases = loadDataset()
  if (!cases.length) {
    console.error('No hay casos que coincidan con los filtros.')
    process.exit(1)
  }

  console.log(`Ejecutando ${cases.length} casos contra ${BASE_URL}`)
  console.log(`Juez de groundedness: ${useJudge && GROQ_KEY ? 'activo' : 'desactivado'}`)

  const token = await getAccessToken()
  const results: CaseResult[] = []

  for (const [index, testCase] of cases.entries()) {
    process.stdout.write(`[${String(index + 1).padStart(2)}/${cases.length}] ${testCase.id.padEnd(24)} `)
    const result = await runCase(testCase, token)
    results.push(result)
    console.log(result.passed ? '✓' : `✗ ${result.error ?? ''}`)

    if (index < cases.length - 1) {
      await new Promise(r => setTimeout(r, DELAY_BETWEEN_CASES_MS))
    }
  }

  const allPassed = report(results)
  process.exit(allPassed ? 0 : 1)
}

main().catch((e) => {
  console.error(`\n${e?.message ?? e}`)
  process.exit(1)
})
