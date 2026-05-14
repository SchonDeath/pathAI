/**
 * POST /api/paes-simulator
 *
 * Calcula el puntaje ponderado del usuario para cada programa de un área
 * y devuelve los 10 con mayor holgura sobre el puntaje de corte.
 *
 * Body:
 *   nem:      number  (400–850)
 *   ranking:  number  (400–850)
 *   cl:       number  (100–1000)  Comprensión Lectora
 *   m1:       number  (100–1000)  Matemática M1
 *   m2?:      number  (100–1000)
 *   historia?: number (100–1000)
 *   ciencias?: number (100–1000)
 *   area?:    string  Área de conocimiento — si no viene, devuelve de todas
 *   areas?:   string[]  Múltiples áreas a la vez
 */
import { requireAuth } from '~/server/utils/require-auth'
import { requireSupabaseServiceClient } from '~/server/utils/supabase-clients'

function clamp(val: number | null | undefined, min: number, max: number): number | null {
  if (val == null || !Number.isFinite(val)) return null
  return Math.max(min, Math.min(max, val))
}

export default defineEventHandler(async (event) => {
  // El simulador exige sesión para evitar scraping masivo.
  await requireAuth(event, {
    rateLimit: { scope: 'paes-simulator', max: 20, windowMs: 60_000 },
  })

  const body = await readBody(event)

  // ── Validar puntajes ──────────────────────────────────────────────────────
  const nem     = clamp(Number(body?.nem),     400, 850)
  const ranking = clamp(Number(body?.ranking), 400, 850)
  const cl      = clamp(Number(body?.cl),      100, 1000)
  const m1      = clamp(Number(body?.m1),      100, 1000)
  const m2      = clamp(Number(body?.m2),      100, 1000)
  const historia = clamp(Number(body?.historia), 100, 1000)
  const ciencias = clamp(Number(body?.ciencias), 100, 1000)

  if (!nem || !ranking || !cl || !m1) {
    throw createError({
      statusCode: 400,
      message: 'Se requieren NEM, Ranking, Comprensión Lectora y Matemática M1.',
    })
  }

  // ── Normalizar texto a minúsculas sin tildes (igual que los valores en DB) ─
  const normalizeStr = (s: string) =>
    s.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()

  // ── Áreas seleccionadas ──────────────────────────────────────────────────
  const areaParam: string | undefined = typeof body?.area === 'string' ? body.area.trim() : undefined
  const areasParam: string[] = Array.isArray(body?.areas)
    ? body.areas.map((a: any) => String(a).trim()).filter(Boolean)
    : []

  const selectedAreas = (areasParam.length
    ? areasParam
    : areaParam
      ? [areaParam]
      : []
  ).map(normalizeStr)

  // ── Consultar programas con ponderaciones ────────────────────────────────
  const supabase = requireSupabaseServiceClient({ fallbackToAnon: true })

  let query = supabase
    .from('programs')
    .select(`
      program_unique_code,
      institution_code,
      nombre_carrera,
      nombre_institucion,
      nombre_sede,
      region,
      jornada,
      modalidad,
      grado_academico,
      nivel_carrera,
      area_conocimiento,
      tipo_institucion,
      arancel_anual,
      matricula_anual,
      vacantes_semestre_1,
      duracion_formal_semestres,
      acreditacion_programa,
      puntaje_promedio_matriculados,
      pond_nem,
      pond_ranking,
      pond_lenguaje,
      pond_matematicas,
      pond_matematicas_2,
      pond_historia,
      pond_ciencias,
      pond_otros
    `)
    // Solo programas con puntaje de referencia real y al menos una ponderación
    .not('puntaje_promedio_matriculados', 'is', null)
    .not('pond_nem', 'is', null)
    .gt('puntaje_promedio_matriculados', 0)

  if (selectedAreas.length === 1) {
    query = query.eq('area_conocimiento', selectedAreas[0])
  } else if (selectedAreas.length > 1) {
    query = query.in('area_conocimiento', selectedAreas)
  }

  // Traemos suficientes filas para calcular y devolver los top 10 con holgura.
  // Máximo 2000 para no colapsar la respuesta.
  const { data, error } = await query.limit(2000)

  if (error) {
    throw createError({ statusCode: 500, message: 'Error consultando programas.' })
  }

  if (!data?.length) {
    return { total: 0, programs: [], areas_sin_datos: selectedAreas }
  }

  // ── Calcular puntaje ponderado para cada programa ─────────────────────
  type ResultRow = {
    program_unique_code: string
    institution_code: number | null
    nombre_carrera: string
    nombre_institucion: string
    nombre_sede: string | null
    region: string | null
    jornada: string | null
    modalidad: string | null
    grado_academico: string | null
    nivel_carrera: string | null
    area_conocimiento: string | null
    tipo_institucion: string | null
    arancel_anual: number | null
    matricula_anual: number | null
    vacantes_semestre_1: number | null
    duracion_formal_semestres: number | null
    acreditacion_programa: string | null
    pond_nem: number | null
    pond_ranking: number | null
    pond_lenguaje: number | null
    pond_matematicas: number | null
    pond_matematicas_2: number | null
    pond_historia: number | null
    pond_ciencias: number | null
    puntaje_calculado: number
    puntaje_referencia: number
    diferencia: number
  }

  const results: ResultRow[] = []

  for (const p of data) {
    const pNem     = Number(p.pond_nem     ?? 0) / 100
    const pRanking = Number(p.pond_ranking ?? 0) / 100
    const pCl      = Number(p.pond_lenguaje ?? 0) / 100
    const pM1      = Number(p.pond_matematicas ?? 0) / 100
    const pM2      = Number(p.pond_matematicas_2 ?? 0) / 100
    const pHist    = Number(p.pond_historia ?? 0) / 100
    const pCienc   = Number(p.pond_ciencias ?? 0) / 100

    const totalPonderacion = pNem + pRanking + pCl + pM1 + pM2 + pHist + pCienc
    // Si las ponderaciones no suman al menos 0.5 (50%) descartamos el programa
    // (datos incompletos en BD).
    if (totalPonderacion < 0.5) continue

    let puntaje =
      nem     * pNem +
      ranking * pRanking +
      cl      * pCl +
      m1      * pM1 +
      (m2       ?? 0) * pM2 +
      (historia ?? 0) * pHist +
      (ciencias ?? 0) * pCienc

    // Si el usuario no rindió M2/Historia/Ciencias pero el programa las pondera,
    // redistribuimos esa ponderación entre las pruebas rendidas para no penalizar.
    let faltantesPond = 0
    if (!m2       && pM2   > 0) faltantesPond += pM2
    if (!historia && pHist > 0) faltantesPond += pHist
    if (!ciencias && pCienc > 0) faltantesPond += pCienc

    if (faltantesPond > 0) {
      const rendidosPond = totalPonderacion - faltantesPond
      if (rendidosPond <= 0) continue
      // Escalar el puntaje calculado con las pruebas rendidas a 100%
      puntaje = puntaje / rendidosPond
    } else if (totalPonderacion < 1) {
      // Normalizar al 100%
      puntaje = puntaje / totalPonderacion
    }

    const calculado = Math.round(puntaje)
    const referencia = Number(p.puntaje_promedio_matriculados)
    const diferencia = calculado - referencia

    // Solo programas donde el usuario iguala o supera el promedio de matriculados
    if (diferencia < 0) continue

    results.push({
      program_unique_code: p.program_unique_code,
      institution_code:    typeof p.institution_code === 'number' ? p.institution_code : null,
      nombre_carrera:      p.nombre_carrera,
      nombre_institucion:  p.nombre_institucion,
      nombre_sede:         p.nombre_sede ?? null,
      region:              p.region ?? null,
      jornada:             p.jornada ?? null,
      modalidad:           p.modalidad ?? null,
      grado_academico:     p.grado_academico ?? null,
      nivel_carrera:       p.nivel_carrera ?? null,
      area_conocimiento:   p.area_conocimiento ?? null,
      tipo_institucion:    p.tipo_institucion ?? null,
      arancel_anual:       typeof p.arancel_anual === 'number' ? p.arancel_anual : null,
      matricula_anual:     typeof p.matricula_anual === 'number' ? p.matricula_anual : null,
      vacantes_semestre_1: typeof p.vacantes_semestre_1 === 'number' ? p.vacantes_semestre_1 : null,
      duracion_formal_semestres: typeof p.duracion_formal_semestres === 'number' ? p.duracion_formal_semestres : null,
      acreditacion_programa: p.acreditacion_programa ?? null,
      pond_nem:            typeof p.pond_nem === 'number' ? p.pond_nem : null,
      pond_ranking:        typeof p.pond_ranking === 'number' ? p.pond_ranking : null,
      pond_lenguaje:       typeof p.pond_lenguaje === 'number' ? p.pond_lenguaje : null,
      pond_matematicas:    typeof p.pond_matematicas === 'number' ? p.pond_matematicas : null,
      pond_matematicas_2:  typeof p.pond_matematicas_2 === 'number' ? p.pond_matematicas_2 : null,
      pond_historia:       typeof p.pond_historia === 'number' ? p.pond_historia : null,
      pond_ciencias:       typeof p.pond_ciencias === 'number' ? p.pond_ciencias : null,
      puntaje_calculado:   calculado,
      puntaje_referencia:  referencia,
      diferencia,
    })
  }

  // Ordenar por mayor holgura, luego tomar top 10
  results.sort((a, b) => b.diferencia - a.diferencia)
  const top10 = results.slice(0, 10)

  return {
    total: results.length,
    programs: top10,
  }
})
