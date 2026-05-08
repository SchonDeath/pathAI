import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const DATA_DIR = resolve(process.cwd(), 'convertidor/scripts/resultado_json')
const SOURCE_YEAR = envInt('RESULTADO_JSON_SOURCE_YEAR', 2026)
const PROGRAM_DATASET = `OFE_${SOURCE_YEAR}`
const SIES_DATASET = `SIES_${SOURCE_YEAR}`
const BATCH_SIZE = envInt('RESULTADO_JSON_BATCH_SIZE', 250)

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Falta VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
})

type JsonRecord = Record<string, any>

function isStagingSchemaError(error: { message?: string } | null | undefined): boolean {
  return String(error?.message || '').toLowerCase().includes('invalid schema: staging')
}

function envInt(name: string, fallback: number): number {
  const value = Number(process.env[name])
  return Number.isFinite(value) ? value : fallback
}

function loadJson<T = any>(name: string): T {
  const filePath = resolve(DATA_DIR, name)
  return JSON.parse(readFileSync(filePath, 'utf-8')) as T
}

function normalizeText(value: any): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

function slugify(value: any): string {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function stableHash(value: string): string {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash.toString(36)
}

function asString(value: any): string | null {
  if (value === null || value === undefined) return null
  const normalized = String(value).trim()
  return normalized.length ? normalized : null
}

function cleanLabel(value: any): string | null {
  const normalized = normalizeText(value)
  return normalized || null
}

function asNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const normalized = String(value)
    .replace(/\$/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.')
    .trim()
  if (!normalized.length) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function asInt(value: any): number | null {
  const parsed = asNumber(value)
  if (parsed === null) return null
  return Math.round(parsed)
}

function ratioToPct(value: any): number | null {
  const parsed = asNumber(value)
  if (parsed === null) return null
  const pct = Math.abs(parsed) <= 1.2 ? parsed * 100 : parsed
  return Math.round(pct * 100) / 100
}

function booleanFromNumber(value: any): boolean | null {
  const parsed = asNumber(value)
  if (parsed === null) return null
  return parsed === 1
}

function parsePctString(value: any): number | null {
  const raw = asString(value)
  if (!raw) return null
  const normalized = raw.toLowerCase().replace('%', '').replace(',', '.').trim()
  if (!normalized.length || normalized === 'sin informacion') return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : null
}

function findYearValue(payload: any, year: number): number | null {
  if (!payload || typeof payload !== 'object') return null
  const suffix = String(year)
  for (const [key, value] of Object.entries(payload)) {
    if (normalizeText(key).includes(suffix)) {
      return asInt(value)
    }
  }
  return null
}

function nestedYearNumber(payload: any, year: number, key: string): number | null {
  const yearNode = payload?.[`ano_${year}`]
  if (!yearNode || typeof yearNode !== 'object') return null
  return asInt(yearNode[key])
}

function nestedYearDecimal(payload: any, year: number, key: string): number | null {
  const yearNode = payload?.[`ano_${year}`]
  if (!yearNode || typeof yearNode !== 'object') return null
  return ratioToPct(yearNode[key])
}

function extractRangeNumbers(value: any): { min: number | null; max: number | null; label: string | null } {
  const label = asString(value)
  if (!label) return { min: null, max: null, label: null }
  const matches = label.match(/\d+(?:[\.,]\d+)?/g) ?? []
  const parsed = matches
    .map((item) => Number(item.replace(',', '.')))
    .filter((item) => Number.isFinite(item))
  if (parsed.length >= 2) {
    return { min: parsed[0] ?? null, max: parsed[1] ?? null, label }
  }
  return { min: null, max: null, label }
}

function parseIncomeRange(label: any): { label: string | null; min: number | null; max: number | null } {
  const raw = asString(label)
  if (!raw) return { label: null, min: null, max: null }
  const normalized = normalizeText(raw)
  if (normalized.includes('sin informacion')) return { label: raw, min: null, max: null }

  const parts = normalized
    .replace(/^de\s+/i, '')
    .split(/\s+a\s+/i)
    .map((item) => item.trim())

  if (parts.length !== 2) return { label: raw, min: null, max: null }

  const parsePart = (text: string): number | null => {
    const directDigits = text.replace(/[^0-9]/g, '')
    if (/^[0-9\s]+$/.test(text) && directDigits) {
      const parsed = Number(directDigits)
      return Number.isFinite(parsed) ? parsed : null
    }

    let total = 0
    const millionMatch = text.match(/(\d+)\s*millon(?:es)?\b/)
    if (millionMatch?.[1]) {
      total += Number(millionMatch[1]) * 1_000_000
    } else if (/\bmillon(?:es)?\b/.test(text)) {
      total += 1_000_000
    }

    const withoutMillions = text
      .replace(/\d+\s*millon(?:es)?\b/, '')
      .replace(/\bmillon(?:es)?\b/, '')
    const thousandMatch = withoutMillions.match(/(\d+)\s*mil\b/)
    if (thousandMatch?.[1]) {
      total += Number(thousandMatch[1]) * 1_000
    }

    if (!total && directDigits) {
      total = Number(directDigits)
    }

    return Number.isFinite(total) && total > 0 ? total : null
  }

  return {
    label: raw,
    min: parsePart(parts[0]),
    max: parsePart(parts[1]),
  }
}

function parseSpanishDate(input: string | null): string | null {
  if (!input) return null
  const months: Record<string, number> = {
    enero: 1,
    febrero: 2,
    marzo: 3,
    abril: 4,
    mayo: 5,
    junio: 6,
    julio: 7,
    agosto: 8,
    septiembre: 9,
    setiembre: 9,
    octubre: 10,
    noviembre: 11,
    diciembre: 12,
  }
  const match = normalizeText(input).match(/(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})/)
  if (!match) return null
  const day = Number(match[1])
  const month = months[match[2]]
  const year = Number(match[3])
  if (!month) return null
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
}

function parseVigenciaRange(value: any): { desde: string | null; hasta: string | null } {
  const raw = asString(value)
  if (!raw) return { desde: null, hasta: null }
  const [left, right] = raw.split(/hasta/i)
  return {
    desde: parseSpanishDate(left?.replace(/desde/i, '').trim() ?? null),
    hasta: parseSpanishDate(right?.trim() ?? null),
  }
}

function programCode(value: any): string | null {
  const raw = asString(value)
  return raw ? raw.toUpperCase() : null
}

function regionCode(value: any): string | null {
  const label = cleanLabel(value)
  return label ? slugify(label) : null
}

function comunaCode(region: any, comuna: any): string | null {
  const regionSlug = regionCode(region)
  const comunaSlug = cleanLabel(comuna) ? slugify(comuna) : null
  if (!regionSlug || !comunaSlug) return null
  return `${regionSlug}:${comunaSlug}`
}

function genericKey(area: any, tipoInstitucion: any, nombre: any): string | null {
  const cleanArea = cleanLabel(area)
  const cleanTipo = cleanLabel(tipoInstitucion)
  const cleanNombre = cleanLabel(nombre)
  if (!cleanArea || !cleanTipo || !cleanNombre) return null
  return `${cleanArea}|${cleanTipo}|${cleanNombre}`
}

function chunk<T>(items: T[], size: number): T[][] {
  const output: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size))
  }
  return output
}

function withInstitutionDefaults(row: JsonRecord): JsonRecord {
  return {
    acreditacion_areas: [],
    acreditacion_areas_electivas: [],
    financial_statements_payload: {},
    matricula_pregrado_por_ano: {},
    matricula_posgrado_por_ano: {},
    titulados_pregrado_por_ano: {},
    titulados_posgrado_por_ano: {},
    matricula_pct_por_area: {},
    matricula_pct_por_origen: {},
    jce_por_nivel_academico: {},
    infrastructure_payload: {},
    source_payload: {},
    ...row,
  }
}

async function ensureMigrationApplied() {
  const { error } = await supabase
    .from('regions')
    .select('code', { head: true, count: 'exact' })
    .limit(1)

  if (error) {
    throw new Error(
      'La estructura nueva no existe todavia en la base de datos. Aplica primero la migracion 20260507000000_rebuild_academic_schema_2026.sql y luego vuelve a correr este script.',
    )
  }
}

async function insertStage(table: string, rows: JsonRecord[]) {
  let inserted = 0
  for (const batch of chunk(rows, BATCH_SIZE)) {
    const { error } = await supabase.schema('staging').from(table).insert(batch)
    if (error) throw new Error(`${table}: ${error.message}`)
    inserted += batch.length
    process.stdout.write(`\r  ${table}: ${inserted}/${rows.length}`)
  }
  process.stdout.write('\n')
}

async function upsertPublic(table: string, rows: JsonRecord[], onConflict: string) {
  let upserted = 0
  for (const batch of chunk(rows, BATCH_SIZE)) {
    const { error } = await supabase.from(table).upsert(batch, { onConflict })
    if (error) throw new Error(`${table}: ${error.message}`)
    upserted += batch.length
    process.stdout.write(`\r  ${table}: ${upserted}/${rows.length}`)
  }
  process.stdout.write('\n')
}

async function selectAll(table: string, columns: string): Promise<JsonRecord[]> {
  const rows: JsonRecord[] = []
  let from = 0

  while (true) {
    const to = from + 999
    const { data, error } = await supabase.from(table).select(columns).range(from, to)
    if (error) throw new Error(`${table}: ${error.message}`)
    if (!data?.length) break
    rows.push(...data)
    if (data.length < 1000) break
    from += 1000
  }

  return rows
}

async function createRun(): Promise<string | null> {
  const { data, error } = await supabase
    .schema('staging')
    .from('resultado_json_runs')
    .insert({
      dataset_label: `RESULTADO_JSON_${SOURCE_YEAR}`,
      source_folder: 'convertidor/scripts/resultado_json',
      source_year: SOURCE_YEAR,
      notes: 'Carga automatizada desde scripts/import-resultado-json-2026.ts',
    })
    .select('id')
    .single()

  if (isStagingSchemaError(error)) {
    console.log('Staging no esta expuesto por la API de Supabase en este proyecto. Continuo con carga directa a tablas publicas.')
    return null
  }

  if (error || !data?.id) {
    throw new Error(`No pude crear el run de staging: ${error?.message ?? 'sin id'}`)
  }

  return data.id as string
}

async function main() {
  console.log('Verificando estructura academica nueva...')
  await ensureMigrationApplied()

  console.log('Leyendo JSONs fuente...')
  const infoInstitucion = loadJson<JsonRecord[]>('informacion_institucion_objetos.json')
  const ofertaAcademica = loadJson<JsonRecord[]>('oferta_academica_objetos.json')
  const buscarCarrera = loadJson<JsonRecord[]>('buscar_carrera_objetos.json')
  const arancelesBecas = loadJson<JsonRecord[]>('aranceles_referencia_2026_becas_objetos.json')
  const arancelesCreditos = loadJson<JsonRecord[]>('aranceles_referencia_2026_creditos_objetos.json')
  const empleabilidadIngresos = loadJson<JsonRecord[]>('buscar_empleabilidad_ingresos_objetos.json')
  const estadisticasCarrera = loadJson<JsonRecord[]>('buscar_estadisticas_carrera_objetos.json')

  const runId = await createRun()
  if (runId) {
    console.log(`Run staging creado: ${runId}`)
    console.log('Cargando staging...')
    await insertStage(
      'informacion_institucion_raw',
      infoInstitucion.map((row, index) => ({
        run_id: runId,
        row_number: index + 1,
        institution_code: asInt(row.Codigo_institucion),
        payload: row,
      })),
    )
    await insertStage(
      'oferta_academica_raw',
      ofertaAcademica.map((row, index) => ({
        run_id: runId,
        row_number: index + 1,
        program_unique_code: programCode(row.Codigo_Unico),
        institution_code: asInt(row.Codigo_IES),
        campus_code: asString(row.Codigo_Sede),
        career_code: asString(row.Codigo_Carrera),
        payload: row,
      })),
    )
    await insertStage(
      'buscar_carrera_raw',
      buscarCarrera.map((row, index) => ({
        run_id: runId,
        row_number: index + 1,
        program_unique_code: programCode(row.Codigo_Unico_de_carrera),
        institution_code: asInt(row.Codigo_institucion),
        payload: row,
      })),
    )
    await insertStage(
      'aranceles_referencia_2026_becas_raw',
      arancelesBecas.map((row, index) => ({
        run_id: runId,
        row_number: index + 1,
        program_unique_code: programCode(row.codigo_unico),
        institution_name: asString(row.nombre_institucion),
        payload: row,
      })),
    )
    await insertStage(
      'aranceles_referencia_2026_creditos_raw',
      arancelesCreditos.map((row, index) => ({
        run_id: runId,
        row_number: index + 1,
        program_unique_code: programCode(row.codigo_unico),
        institution_name: asString(row.nombre_institucion),
        payload: row,
      })),
    )
    await insertStage(
      'buscar_empleabilidad_ingresos_raw',
      empleabilidadIngresos.map((row, index) => ({
        run_id: runId,
        row_number: index + 1,
        source_row_code: asInt(row.Codigo),
        institution_name: asString(row.Nombre_de_institucion),
        generic_career_name: asString(row.Nombre_carrera_generica),
        payload: row,
      })),
    )
    await insertStage(
      'buscar_estadisticas_carrera_raw',
      estadisticasCarrera.map((row, index) => ({
        run_id: runId,
        row_number: index + 1,
        source_row_id: asInt(row.ID),
        generic_career_name: asString(row.Carrera_generica),
        payload: row,
      })),
    )
  }

  const infoByInstitution = new Map<number, JsonRecord>()
  for (const row of infoInstitucion) {
    const institutionCode = asInt(row.Codigo_institucion)
    if (institutionCode !== null) infoByInstitution.set(institutionCode, row)
  }

  const buscarByProgram = new Map<string, JsonRecord>()
  for (const row of buscarCarrera) {
    const code = programCode(row.Codigo_Unico_de_carrera)
    if (code) buscarByProgram.set(code, row)
  }

  const becasByProgram = new Map<string, JsonRecord>()
  for (const row of arancelesBecas) {
    const code = programCode(row.codigo_unico)
    if (code) becasByProgram.set(code, row)
  }

  const creditosByProgram = new Map<string, JsonRecord>()
  for (const row of arancelesCreditos) {
    const code = programCode(row.codigo_unico)
    if (code) creditosByProgram.set(code, row)
  }

  console.log('Construyendo catalogos base...')
  const regionMap = new Map<string, JsonRecord>()
  const comunaMap = new Map<string, JsonRecord>()
  const institutionMap = new Map<number, JsonRecord>()
  const campusMap = new Map<string, JsonRecord>()
  const genericMap = new Map<string, JsonRecord>()

  for (const row of ofertaAcademica) {
    const institutionCode = asInt(row.Codigo_IES)
    const institutionName = asString(row.Nombre_IES)
    if (institutionCode !== null && institutionName) {
      if (!institutionMap.has(institutionCode)) {
        institutionMap.set(institutionCode, {
          institution_code: institutionCode,
          dataset_version: SIES_DATASET,
          tipo_institucion: cleanLabel(row.Tipo_Institucion_2),
          nombre_institucion: institutionName,
          source_payload: row,
          updated_at: new Date().toISOString(),
        })
      }
    }

    const regionName = cleanLabel(row.Region_Sede)
    const regionKey = regionCode(row.Region_Sede)
    if (regionKey && regionName && !regionMap.has(regionKey)) {
      regionMap.set(regionKey, { code: regionKey, nombre: regionName, numero: null })
    }

    const comunaKey = comunaCode(row.Region_Sede, row.Comuna_Sede)
    const comunaName = cleanLabel(row.Comuna_Sede)
    if (comunaKey && comunaName && !comunaMap.has(comunaKey)) {
      comunaMap.set(comunaKey, {
        code: comunaKey,
        nombre: comunaName,
        provincia: cleanLabel(row.Provincia_Sede),
        region_code: regionKey,
      })
    }

    const campusKey = institutionCode !== null
      ? `${institutionCode}|${normalizeText(row.Nombre_Sede)}`
      : null
    if (campusKey && !campusMap.has(campusKey)) {
      campusMap.set(campusKey, {
        institution_code: institutionCode,
        campus_code: asString(row.Codigo_Sede),
        nombre_sede: asString(row.Nombre_Sede),
        region: regionName,
        region_code: regionKey,
        provincia: cleanLabel(row.Provincia_Sede),
        comuna: comunaName,
        comuna_code: comunaKey,
        direccion: null,
        normalized_name: normalizeText(row.Nombre_Sede),
        source_payload: row,
        updated_at: new Date().toISOString(),
      })
    }

    const key = genericKey(row.Area_del_conocimiento, row.Tipo_Institucion_2, row.Area_Carrera_Generica)
    if (key && !genericMap.has(key)) {
      genericMap.set(key, {
        slug: `${slugify(row.Area_Carrera_Generica)}-${stableHash(key)}`,
        area: cleanLabel(row.Area_del_conocimiento),
        tipo_institucion: cleanLabel(row.Tipo_Institucion_2),
        nombre_carrera_generica: cleanLabel(row.Area_Carrera_Generica),
        normalized_name: normalizeText(row.Area_Carrera_Generica),
        source_payload: row,
        updated_at: new Date().toISOString(),
      })
    }
  }

  for (const row of infoInstitucion) {
    const institutionCode = asInt(row.Codigo_institucion)
    if (institutionCode === null) continue
    const vigencia = parseVigenciaRange(row.Vigencia_acreditacion_30_octubre_2025)
    const financiera = row.Informacion_Financiera_Estados_Financieros_2024 ?? {}
    const retencion = row.Retencion_Pregrado ?? {}
    const estudiantes = row.Estudiantes_2025 ?? {}
    const duracion = row.Duracion_Programas_Pregrado_2024 ?? {}
    const jce = row.Distribucion_Academicos_JCE_2025 ?? {}
    const infra = row.Infraestructura_y_Equipamiento_Junio_2025 ?? {}

    institutionMap.set(institutionCode, {
      institution_code: institutionCode,
      dataset_version: SIES_DATASET,
      tipo_institucion: cleanLabel(row.Tipo_de_institucion),
      nombre_institucion: asString(row.Nombre_institucion),
      autonomia: asString(row.Autonomia),
      direccion_sede_central: asString(row.Direccion_Sede_Central),
      pagina_web: asString(row.Pagina_web),
      acreditacion_estado: asString(row.Acreditacion_30_octubre_2025),
      acreditacion_anos: asInt(row.Anos_acreditacion_30_octubre_2025),
      acreditacion_vigencia_desde: vigencia.desde,
      acreditacion_vigencia_hasta: vigencia.hasta,
      acreditacion_areas: asString(row.Areas_acreditadas_30_octubre_2025)
        ?.split(',')
        .map((item) => item.trim())
        .filter(Boolean) ?? [],
      acreditacion_areas_electivas: asString(row.Areas_electivas_acreditacion_30_octubre_2025)
        ?.split(',')
        .map((item) => item.trim())
        .filter(Boolean) ?? [],
      matricula_pregrado_actual: findYearValue(row.Matricula_Pregrado, 2025),
      matricula_posgrado_actual: findYearValue(row.Matricula_Posgrado, 2025),
      titulados_pregrado_actual: findYearValue(row.Titulados_Pregrado, 2024),
      titulados_posgrado_actual: findYearValue(row.Titulados_Posgrado, 2024),
      retencion_1er_ano_pct: ratioToPct(retencion.Retencion_1er_ano_carreras_prof_tec_cohorte_2024),
      duracion_formal_semestres: asNumber(duracion.Duracion_Formal),
      duracion_real_semestres: asNumber(duracion.Duracion_Real),
      total_jce: asNumber(jce.Total_JCE),
      promedio_nem: asNumber(estudiantes.Promedio_NEM_matriculados_1er_ano_2025),
      promedio_paes: asNumber(estudiantes.Promedio_PAES_matriculados_1er_ano_2025),
      ingresos_operacion_clp: asInt(financiera.Ingresos_de_la_operacion),
      resultado_ejercicio_clp: asInt(financiera.Resultado_del_Ejercicio),
      total_activos_clp: asInt(financiera.Total_Activos),
      patrimonio_total_clp: asInt(financiera.Patrimonio_Total),
      m2_construidos: asNumber(infra.m2_construidos),
      volumenes_biblioteca: asInt(infra.N_volumenes_biblioteca),
      laboratorios_talleres: asInt(infra.N_laboratorios_y_talleres),
      computadores: asInt(infra.N_computadores),
      financial_statements_payload: financiera,
      matricula_pregrado_por_ano: row.Matricula_Pregrado ?? {},
      matricula_posgrado_por_ano: row.Matricula_Posgrado ?? {},
      titulados_pregrado_por_ano: row.Titulados_Pregrado ?? {},
      titulados_posgrado_por_ano: row.Titulados_Posgrado ?? {},
      matricula_pct_por_area: row.Porcentaje_Matricula_Pregrado_2025_por_area ?? {},
      matricula_pct_por_origen: row.Porcentaje_Matricula_Pregrado_2025_por_establecimiento_origen ?? {},
      jce_por_nivel_academico: row.Distribucion_Academicos_JCE_2025 ?? {},
      infrastructure_payload: row.Infraestructura_y_Equipamiento_Junio_2025 ?? {},
      source_payload: row,
      updated_at: new Date().toISOString(),
    })
  }

  for (const row of buscarCarrera) {
    const key = genericKey(row.Area_del_conocimiento, row.Tipo_de_institucion, row.Area_Carrera_Generica)
    if (key && !genericMap.has(key)) {
      genericMap.set(key, {
        slug: `${slugify(row.Area_Carrera_Generica)}-${stableHash(key)}`,
        area: cleanLabel(row.Area_del_conocimiento),
        tipo_institucion: cleanLabel(row.Tipo_de_institucion),
        nombre_carrera_generica: cleanLabel(row.Area_Carrera_Generica),
        normalized_name: normalizeText(row.Area_Carrera_Generica),
        source_payload: row,
        updated_at: new Date().toISOString(),
      })
    }
  }

  for (const row of empleabilidadIngresos) {
    const key = genericKey(row.Area, row.Tipo_de_institucion, row.Nombre_carrera_generica)
    if (key && !genericMap.has(key)) {
      genericMap.set(key, {
        slug: `${slugify(row.Nombre_carrera_generica)}-${stableHash(key)}`,
        area: cleanLabel(row.Area),
        tipo_institucion: cleanLabel(row.Tipo_de_institucion),
        nombre_carrera_generica: cleanLabel(row.Nombre_carrera_generica),
        normalized_name: normalizeText(row.Nombre_carrera_generica),
        source_payload: row,
        updated_at: new Date().toISOString(),
      })
    }
  }

  for (const row of estadisticasCarrera) {
    const key = genericKey(row.Area, row.Tipo_de_institucion, row.Carrera_generica)
    if (key && !genericMap.has(key)) {
      genericMap.set(key, {
        slug: `${slugify(row.Carrera_generica)}-${stableHash(key)}`,
        area: cleanLabel(row.Area),
        tipo_institucion: cleanLabel(row.Tipo_de_institucion),
        nombre_carrera_generica: cleanLabel(row.Carrera_generica),
        normalized_name: normalizeText(row.Carrera_generica),
        source_payload: row,
        updated_at: new Date().toISOString(),
      })
    }
  }

  console.log('Upsert de tablas maestras...')
  await upsertPublic('regions', Array.from(regionMap.values()), 'code')
  await upsertPublic('comunas', Array.from(comunaMap.values()), 'code')
  await upsertPublic(
    'institutions',
    Array.from(institutionMap.values()).map(withInstitutionDefaults),
    'institution_code',
  )
  await upsertPublic('campuses', Array.from(campusMap.values()), 'institution_code,nombre_sede')
  await upsertPublic('career_generic', Array.from(genericMap.values()), 'area,tipo_institucion,nombre_carrera_generica')

  const campuses = await selectAll('campuses', 'id,institution_code,nombre_sede')
  const careerGenericRows = await selectAll('career_generic', 'id,area,tipo_institucion,nombre_carrera_generica')
  const institutionRows = await selectAll('institutions', 'institution_code,nombre_institucion')

  const campusIdByKey = new Map<string, string>()
  for (const row of campuses) {
    const key = `${row.institution_code}|${normalizeText(row.nombre_sede)}`
    campusIdByKey.set(key, row.id)
  }

  const genericIdByKey = new Map<string, string>()
  const genericIdByAreaName = new Map<string, string>()
  for (const row of careerGenericRows) {
    const key = genericKey(row.area, row.tipo_institucion, row.nombre_carrera_generica)
    if (key) genericIdByKey.set(key, row.id)
    const secondaryKey = `${normalizeText(row.area)}|${normalizeText(row.nombre_carrera_generica)}`
    if (!genericIdByAreaName.has(secondaryKey)) {
      genericIdByAreaName.set(secondaryKey, row.id)
    }
  }

  const institutionCodeByName = new Map<string, number>()
  for (const row of institutionRows) {
    institutionCodeByName.set(normalizeText(row.nombre_institucion), row.institution_code)
  }

  console.log('Construyendo programas y satelites...')
  const programRows: JsonRecord[] = []
  const admissionRows: JsonRecord[] = []
  const financeRows: JsonRecord[] = []
  const now = new Date().toISOString()

  for (const oferta of ofertaAcademica) {
    const uniqueCode = programCode(oferta.Codigo_Unico)
    const institutionCode = asInt(oferta.Codigo_IES)
    if (!uniqueCode || institutionCode === null) continue

    const buscar = buscarByProgram.get(uniqueCode)
    const becas = becasByProgram.get(uniqueCode)
    const creditos = creditosByProgram.get(uniqueCode)
    // Rango_ingreso_a_1er_ano_con_PAES contiene percentiles nacionales (ej: "80% <= x <= 100%"),
    // NO puntajes PAES reales. Solo guardamos el label descriptivo; los campos numéricos quedan null.
    const rango_percentil_paes_label = asString(buscar?.Rango_ingreso_a_1er_ano_con_PAES?.ano_2025) || null
    const campusKey = `${institutionCode}|${normalizeText(oferta.Nombre_Sede)}`
    const programGenericKey = genericKey(
      buscar?.Area_del_conocimiento ?? oferta.Area_del_conocimiento,
      buscar?.Tipo_de_institucion ?? oferta.Tipo_Institucion_2,
      buscar?.Area_Carrera_Generica ?? oferta.Area_Carrera_Generica,
    )
    const fallbackGenericKey = `${normalizeText(buscar?.Area_del_conocimiento ?? oferta.Area_del_conocimiento)}|${normalizeText(buscar?.Area_Carrera_Generica ?? oferta.Area_Carrera_Generica)}`
    const arancelBecas = asInt(becas?.arancel_de_referencia_con_beca?.['2026']?.monto)
    const arancelCreditos = asInt(creditos?.arancel_de_referencia_con_creditos?.['2026']?.monto)

    programRows.push({
      program_unique_code: uniqueCode,
      dataset_version: PROGRAM_DATASET,
      admission_year: SOURCE_YEAR,
      institution_code: institutionCode,
      campus_id: campusIdByKey.get(campusKey) ?? null,
      career_generic_id: (programGenericKey ? genericIdByKey.get(programGenericKey) : null) ?? genericIdByAreaName.get(fallbackGenericKey) ?? null,
      area_conocimiento: cleanLabel(oferta.Area_del_conocimiento),
      area_carrera_generica: cleanLabel(buscar?.Area_Carrera_Generica ?? oferta.Area_Carrera_Generica),
      tipo_institucion: cleanLabel(buscar?.Tipo_de_institucion ?? oferta.Tipo_Institucion_2),
      tipo_institucion_detalle: cleanLabel(oferta.Tipo_Institucion_2),
      codigo_ies: asString(oferta.Codigo_IES),
      codigo_sede: asString(oferta.Codigo_Sede),
      codigo_carrera: asString(oferta.Codigo_Carrera),
      nombre_carrera: asString(oferta.Nombre_Carrera),
      nombre_institucion: infoByInstitution.get(institutionCode)?.Nombre_institucion ?? asString(oferta.Nombre_IES),
      nombre_sede: asString(oferta.Nombre_Sede),
      region: cleanLabel(oferta.Region_Sede),
      region_code: regionCode(oferta.Region_Sede),
      provincia: cleanLabel(oferta.Provincia_Sede),
      comuna: cleanLabel(oferta.Comuna_Sede),
      comuna_code: comunaCode(oferta.Region_Sede, oferta.Comuna_Sede),
      jornada: cleanLabel(oferta.Jornada),
      modalidad: cleanLabel(oferta.Modalidad),
      version: asInt(oferta.Version),
      nivel_carrera: asString(oferta.Nivel_Carrera),
      nivel_global: asString(buscar?.Nivel_carrera),
      tipo_carrera: asString(oferta.Tipo_Carrera),
      plan_especial: asString(oferta.Plan_Especial),
      regimen: asInt(oferta.Regimen),
      duracion_formal_regimen: asInt(oferta.Duracion_formal_del_Regimen),
      duracion_formal_semestres: asInt(oferta.Duracion_Estudios),
      duracion_titulacion: asInt(oferta.Duracion_Titulacion),
      duracion_total: asInt(oferta.Duracion_Total),
      semestres_reconocidos: asInt(oferta.Semestres_reconocidos),
      nombre_titulo: asString(oferta.Nombre_Titulo),
      grado_academico: asString(oferta.Grado_Academico),
      acreditacion_programa: asString(oferta.Acreditacion_Carrera_o_Programa),
      requisito_ingreso: asString(oferta.Requisito_Ingreso),
      elegibilidad_beca_pedagogia: asString(oferta.Elegibilidad_Beca_Pedagogia),
      demre: booleanFromNumber(oferta.Demre),
      ano_inicio: asInt(oferta.Ano_Inicio),
      vacantes_semestre_1: asInt(oferta.Vacantes_Semestre_Uno),
      vacantes_semestre_2: asInt(oferta.Vacantes_Semestre_Dos),
      arancel_anual: asInt(oferta.Arancel_Anual ?? buscar?.Arancel_Anual_2026),
      matricula_anual: asInt(oferta.Matricula_Anual),
      costo_titulacion: asInt(oferta.Costo_Titulacion ?? buscar?.Costo_de_titulacion),
      costo_certificado_diploma: asInt(oferta.Costo_Certificado_Diploma),
      arancel_referencia_becas: arancelBecas,
      arancel_referencia_creditos: arancelCreditos,
      matricula_total_2025: asInt(buscar?.Matricula_Total?.ano_2025),
      matricula_total_fem_2025: asInt(buscar?.Matricula_Total_Femenina?.ano_2025),
      matricula_total_mas_2025: asInt(buscar?.Matricula_Total_Masculina?.ano_2025),
      matricula_primer_ano_2025: null,
      matricula_primer_ano_fem_2025: null,
      matricula_primer_ano_mas_2025: null,
      titulacion_total_2024: asInt(buscar?.Titulacion_Total?.ano_2024),
      titulacion_fem_2024: asInt(buscar?.Titulacion_Femenina?.ano_2024),
      titulacion_mas_2024: asInt(buscar?.Titulacion_Masculina?.ano_2024),
      promedio_nem: asNumber(buscar?.Promedio_NEM_de_Matricula?.ano_2025),
      rango_percentil_paes: rango_percentil_paes_label,
      puntaje_promedio_matriculados: asNumber(buscar?.Promedio_PAES_de_Matricula_1er_ano?.ano_2025),
      anio_puntajes: buscar ? 2025 : null,
      pond_nem: asNumber(buscar?.Ponderaciones?.ano_2026?.NEM),
      pond_ranking: asNumber(buscar?.Ponderaciones?.ano_2026?.Ranking),
      pond_lenguaje: asNumber(buscar?.Ponderaciones?.ano_2026?.PAES_Lenguaje),
      pond_matematicas: asNumber(buscar?.Ponderaciones?.ano_2026?.PAES_Matematicas),
      pond_matematicas_2: asNumber(buscar?.Ponderaciones?.ano_2026?.PAES_Matematicas_2),
      pond_historia: asNumber(buscar?.Ponderaciones?.ano_2026?.PAES_Historia),
      pond_ciencias: asNumber(buscar?.Ponderaciones?.ano_2026?.PAES_Ciencias),
      pond_otros: asNumber(buscar?.Ponderaciones?.ano_2026?.Otros),
      areas_destino_cine: {},
      origen_matricula_pct: {},
      source_payload: {
        oferta,
        buscar: buscar ?? null,
        aranceles_becas: becas ?? null,
        aranceles_creditos: creditos ?? null,
      },
      updated_at: now,
    })

    if (buscar) {
      admissionRows.push({
        program_unique_code: uniqueCode,
        institution_code: institutionCode,
        source_dataset: 'BUSCAR_CARRERA_2026',
        reference_year: SOURCE_YEAR,
        arancel_anual_reportado: asInt(buscar.Arancel_Anual_2026),
        costo_titulacion_reportado: asInt(buscar.Costo_de_titulacion),
        duracion_formal_semestres_reportado: asInt(buscar.Duracion_Formal_semestres),
        nivel_carrera_reportado: asString(buscar.Nivel_carrera),
        valor_uf_referencia: asNumber(buscar.Valor_UF_Referencia),
        matricula_total_femenina_payload: buscar.Matricula_Total_Femenina ?? {},
        matricula_total_masculina_payload: buscar.Matricula_Total_Masculina ?? {},
        matricula_total_payload: buscar.Matricula_Total ?? {},
        titulacion_femenina_payload: buscar.Titulacion_Femenina ?? {},
        titulacion_masculina_payload: buscar.Titulacion_Masculina ?? {},
        titulacion_total_payload: buscar.Titulacion_Total ?? {},
        rango_ingreso_paes_payload: buscar.Rango_ingreso_a_1er_ano_con_PAES ?? {},
        promedio_paes_payload: buscar.Promedio_PAES_de_Matricula_1er_ano ?? {},
        promedio_nem_payload: buscar.Promedio_NEM_de_Matricula ?? {},
        vacantes_primer_semestre_payload: buscar.Vacantes_1er_semestre ?? {},
        ponderaciones_payload: buscar.Ponderaciones ?? {},
        source_payload: buscar,
      })
    }

    financeRows.push({
      program_unique_code: uniqueCode,
      source_dataset: 'ARANCELES_REFERENCIA_2026',
      reference_year: SOURCE_YEAR,
      arancel_anual_payload: becas?.arancel_anual ?? creditos?.arancel_anual ?? {},
      arancel_referencia_becas: arancelBecas,
      arancel_referencia_creditos: arancelCreditos,
      hoja_origen_becas: asString(becas?.hoja_origen),
      hoja_origen_creditos: asString(creditos?.hoja_origen),
      source_payload_becas: becas ?? {},
      source_payload_creditos: creditos ?? {},
      updated_at: now,
    })
  }

  await upsertPublic('programs', programRows, 'program_unique_code')
  if (admissionRows.length) {
    await upsertPublic('program_admission_metrics', admissionRows, 'program_unique_code,source_dataset,reference_year')
  }
  if (financeRows.length) {
    await upsertPublic('program_finance_reference', financeRows, 'program_unique_code,source_dataset,reference_year')
  }

  const careerStatsRows: JsonRecord[] = []
  for (const row of estadisticasCarrera) {
    const key = genericKey(row.Area, row.Tipo_de_institucion, row.Carrera_generica)
    const year2025Ingreso = row.Ingreso_promedio_bruto_mensual_septiembre?.ano_2025 ?? {}
    const titulados2024 = row.Titulados?.ano_2024 ?? {}
    const duracion2024 = row.Duracion_Titulados_semestres?.ano_2024 ?? {}
    const matriculaPrimer2025 = row.Matricula_1er_ano?.ano_2025 ?? {}
    const matriculaTotal2025 = row.Matricula_Total?.ano_2025 ?? {}
    const retencion = row.Retencion_cohorte_2023 ?? {}

    careerStatsRows.push({
      dataset_version: SIES_DATASET,
      career_generic_id: key ? genericIdByKey.get(key) ?? null : null,
      area: cleanLabel(row.Area),
      tipo_institucion: cleanLabel(row.Tipo_de_institucion),
      nombre_carrera_generica: cleanLabel(row.Carrera_generica),
      ingreso_1er_ano_clp: asInt(year2025Ingreso['1er_ano']),
      ingreso_2do_ano_clp: asInt(year2025Ingreso['2do_ano']),
      ingreso_3er_ano_clp: asInt(year2025Ingreso['3er_ano']),
      ingreso_4to_ano_clp: asInt(year2025Ingreso['4to_ano']),
      ingreso_5to_ano_clp: asInt(year2025Ingreso['5to_ano']),
      empleabilidad_1er_ano_pct: ratioToPct(row.Empleabilidad?.Empleabilidad_1er_ano),
      empleabilidad_2do_ano_pct: ratioToPct(row.Empleabilidad?.Empleabilidad_2do_ano),
      retencion_1er_ano_pct: ratioToPct(retencion.Retencion_1er_ano),
      duracion_formal_semestres: asNumber(duracion2024.Duracion_Formal),
      duracion_real_semestres: asNumber(duracion2024.Duracion_Real),
      titulados_2024_total: asInt(titulados2024.Titulados_Total),
      titulados_2024_fem: asInt(titulados2024.Titulados_Mujeres),
      titulados_2024_mas: asInt(titulados2024.Titulados_Hombres),
      matricula_primer_ano_2025_total: asInt(matriculaPrimer2025.Total_Matricula_1er_ano),
      matricula_primer_ano_2025_fem: asInt(matriculaPrimer2025.Matricula_1er_ano_Mujeres),
      matricula_primer_ano_2025_mas: asInt(matriculaPrimer2025.Matricula_1er_ano_Hombres),
      matricula_total_2025_total: asInt(matriculaTotal2025.Matricula_Total),
      matricula_total_2025_fem: asInt(matriculaTotal2025.Matricula_Total_Mujeres),
      matricula_total_2025_mas: asInt(matriculaTotal2025.Matricula_Total_Hombres),
      tramos_ingreso: row.Tramos_de_ingreso_bruto_mensual_septiembre ?? {},
      evolucion_ingreso_4: row.Evolucion_Ingresos_al_4to_ano_cohortes_2016_a_2020 ?? {},
      evolucion_empleabilidad_1: row.Evolucion_Empleabilidad_1er_ano_cohortes_2019_a_2023 ?? {},
      evolucion_empleabilidad_2: row.Evolucion_Empleabilidad_2do_ano_cohortes_2018_a_2022 ?? {},
      distribucion_origen_pct: row.Distribucion_segun_establecimiento_de_origen_Matricula_2025 ?? {},
      source_payload: row,
      updated_at: now,
    })
  }

  const careerEmployabilityRows: JsonRecord[] = []
  for (const row of empleabilidadIngresos) {
    const key = genericKey(row.Area, row.Tipo_de_institucion, row.Nombre_carrera_generica)
    const income = parseIncomeRange(row.Ingreso_Promedio_al_4to_ano)
    const institutionName = asString(row.Nombre_de_institucion)

    careerEmployabilityRows.push({
      dataset_version: SIES_DATASET,
      source_row_code: asInt(row.Codigo),
      institution_code: institutionName ? institutionCodeByName.get(normalizeText(institutionName)) ?? null : null,
      career_generic_id: key ? genericIdByKey.get(key) ?? null : null,
      tipo_institucion: cleanLabel(row.Tipo_de_institucion),
      nombre_institucion: institutionName,
      area: cleanLabel(row.Area),
      nombre_carrera_generica: cleanLabel(row.Nombre_carrera_generica),
      continuidad_estudios_pct: parsePctString(row.Porcentaje_titulados_con_continuidad_de_estudios),
      retencion_1_ano_pct: parsePctString(row.Retencion_1er_ano),
      empleabilidad_1_ano_pct: parsePctString(row.Empleabilidad_1er_ano),
      empleabilidad_2_ano_pct: parsePctString(row.Empleabilidad_2do_ano),
      ingreso_promedio_4to_ano_clp: income.max,
      ingreso_label: income.label,
      source_payload: row,
      updated_at: now,
    })
  }

  await upsertPublic('career_stats', careerStatsRows, 'dataset_version,area,tipo_institucion,nombre_carrera_generica')
  await upsertPublic('career_employability', careerEmployabilityRows, 'dataset_version,source_row_code,nombre_institucion,nombre_carrera_generica')

  console.log('Carga finalizada.')
  console.log(JSON.stringify({
    runId,
    regions: regionMap.size,
    comunas: comunaMap.size,
    institutions: institutionMap.size,
    campuses: campusMap.size,
    career_generic: genericMap.size,
    programs: programRows.length,
    program_admission_metrics: admissionRows.length,
    program_finance_reference: financeRows.length,
    career_stats: careerStatsRows.length,
    career_employability: careerEmployabilityRows.length,
  }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})