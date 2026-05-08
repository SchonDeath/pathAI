/**
 * extract-malla-from-pdf.ts
 *
 * Toma un reporte JSON con resultados de carreras, descarga cada malla PDF,
 * extrae texto y genera un JSON enriquecido.
 *
 * Uso:
 *   npx tsx convertidor/scripts/extract-malla-from-pdf.ts --input="convertidor/mallas/100 - Instituto Profesional INACAP/_reporte_inacap_ip_mallas.json"
 *   npx tsx convertidor/scripts/extract-malla-from-pdf.ts --input="...json" --output="..._enriched.json" --limit=10
 */

import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { PDFParse } from 'pdf-parse'

type ReportItem = {
  title?: string
  careerUrl?: string
  mallaPdfUrl?: string | null
  mallaDigitalUrl?: string | null
  [key: string]: unknown
}

type EnrichedMalla = {
  source: 'pdf'
  textLength: number
  textPreview: string
  semestresDetected: number
  yearsDetected: number
  hasAsignaturasKeyword: boolean
  semesters: Array<{ semester: string; courses: string[] }>
}

type EnrichedItem = ReportItem & {
  mallaExtract: EnrichedMalla | null
  mallaExtractError?: string
}

function getArg(name: string): string | null {
  const pref = `--${name}=`
  const arg = process.argv.find(a => a.startsWith(pref))
  if (!arg) return null
  return arg.slice(pref.length)
}

function normalizeText(text: string): string {
  return text
    .replace(/\r/g, ' ')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function countSemestres(text: string): number {
  const re = /\b(?:I|II|III|IV|V|VI|VII|VIII|IX|X)\s+SEMESTRE\b/gi
  return [...text.matchAll(re)].length
}

function countYears(text: string): number {
  const re = /\bA(?:N|Ñ)O\s*\d+\b/gi
  return [...text.matchAll(re)].length
}

function cleanLine(line: string): string {
  return line
    .replace(/[\u0000-\u001f]+/g, ' ')
    .replace(/[•·]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

function semesterLabelFromLine(line: string): string | null {
  const cleaned = cleanLine(line)

  const m1 = cleaned.match(/\b((?:\d{1,2})(?:er|do|to|ro|mo|°)?)\s+SEMESTRE\b/i)
  if (m1?.[1]) return `${m1[1]} SEMESTRE`

  const m2 = cleaned.match(/\b((?:I|II|III|IV|V|VI|VII|VIII|IX|X))\s+SEMESTRE\b/i)
  if (m2?.[1]) return `${m2[1].toUpperCase()} SEMESTRE`

  const m3 = cleaned.match(/\b(PRIMER|SEGUNDO|TERCER|CUARTO|QUINTO|SEXTO|SEPTIMO|OCTAVO|NOVENO|DECIMO)\s+SEMESTRE\b/i)
  if (m3?.[1]) return `${m3[1].toUpperCase()} SEMESTRE`

  return null
}

function looksLikeCourse(line: string): boolean {
  const l = cleanLine(line)
  if (!l) return false
  if (semesterLabelFromLine(l)) return false
  if (/^--\s*\d+\s+of\s+\d+\s*--$/i.test(l)) return false
  if (/^(AREA|RUTA|COD\.|CODIGO|VACANTES|DIRECCION|SECTORIAL)\b/i.test(l)) return false
  if (/^\d+$/.test(l)) return false
  if (l.length < 3) return false
  return /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(l)
}

function parseSemesters(rawText: string): Array<{ semester: string; courses: string[] }> {
  const lines = rawText
    .replace(/\r/g, '\n')
    .split('\n')
    .map(cleanLine)
    .filter(Boolean)

  const semesters: Array<{ semester: string; courses: string[] }> = []
  let current: { semester: string; courses: string[] } | null = null

  for (const line of lines) {
    const sem = semesterLabelFromLine(line)
    if (sem) {
      if (current) semesters.push(current)
      current = { semester: sem, courses: [] }
      continue
    }

    if (!current) continue
    if (!looksLikeCourse(line)) continue

    const course = line.replace(/^[-*]\s*/, '').trim()
    if (!course) continue

    const prev = current.courses[current.courses.length - 1]
    if (prev !== course) current.courses.push(course)
  }

  if (current) semesters.push(current)

  return semesters
    .map(s => ({ semester: s.semester, courses: [...new Set(s.courses)] }))
    .filter(s => s.courses.length > 0)
}

async function extractFromPdfUrl(pdfUrl: string): Promise<EnrichedMalla> {
  const res = await fetch(pdfUrl, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      accept: 'application/pdf,*/*;q=0.8',
      'accept-language': 'es-CL,es;q=0.9,en;q=0.8',
    },
  })

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }

  const ab = await res.arrayBuffer()
  const parser = new PDFParse({ data: Buffer.from(ab) })
  const parsed = await parser.getText()
  await parser.destroy()

  const rawText = parsed.text || ''
  const normalized = normalizeText(rawText)
  const semesters = parseSemesters(rawText)

  return {
    source: 'pdf',
    textLength: normalized.length,
    textPreview: normalized.slice(0, 1200),
    semestresDetected: countSemestres(normalized),
    yearsDetected: countYears(normalized),
    hasAsignaturasKeyword: /\bASIGNATURAS?\b/i.test(normalized),
    semesters,
  }
}

async function main() {
  const input = getArg('input')
  if (!input) {
    throw new Error('Falta --input=...')
  }

  const output =
    getArg('output') ||
    input.replace(/\.json$/i, '_enriched.json')

  const limitRaw = getArg('limit')
  const limit = limitRaw ? Number(limitRaw) : null

  const inputPath = resolve(process.cwd(), input)
  const outputPath = resolve(process.cwd(), output)

  const report = JSON.parse(readFileSync(inputPath, 'utf8')) as {
    results?: ReportItem[]
    [key: string]: unknown
  }

  const items = Array.isArray(report.results) ? report.results : []
  const selected = limit && Number.isFinite(limit) && limit > 0 ? items.slice(0, limit) : items

  console.log(`Items a procesar: ${selected.length}`)

  const enrichedResults: EnrichedItem[] = []

  for (let i = 0; i < selected.length; i++) {
    const item = selected[i]
    const title = String(item.title || item.careerUrl || `item-${i + 1}`)
    const pdfUrl = typeof item.mallaPdfUrl === 'string' ? item.mallaPdfUrl : null

    process.stdout.write(`[${i + 1}/${selected.length}] ${title} ... `)

    if (!pdfUrl) {
      enrichedResults.push({ ...item, mallaExtract: null, mallaExtractError: 'Sin mallaPdfUrl' })
      console.log('sin PDF')
      continue
    }

    try {
      const extract = await extractFromPdfUrl(pdfUrl)
      enrichedResults.push({ ...item, mallaExtract: extract })
      console.log(`ok (len=${extract.textLength})`)
    } catch (e: any) {
      enrichedResults.push({
        ...item,
        mallaExtract: null,
        mallaExtractError: e?.message || String(e),
      })
      console.log(`error: ${e?.message || String(e)}`)
    }
  }

  const out = {
    ...report,
    extractedAt: new Date().toISOString(),
    totalItemsProcessedForExtraction: selected.length,
    summaryExtraction: {
      withPdfUrl: enrichedResults.filter(r => !!r.mallaPdfUrl).length,
      extractedOk: enrichedResults.filter(r => !!r.mallaExtract).length,
      extractedError: enrichedResults.filter(r => !!r.mallaExtractError).length,
    },
    results: enrichedResults,
  }

  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, JSON.stringify(out, null, 2), 'utf8')

  console.log(`\nListo. Salida: ${outputPath}`)
}

main().catch(err => {
  console.error('Error fatal:', err)
  process.exit(1)
})
