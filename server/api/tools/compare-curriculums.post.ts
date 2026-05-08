/**
 * POST /api/tools/compare-curriculums
 * Body: { programCodes: string[] }  // array de program_unique_code
 *
 * Estrategia:
 *  1. Busca mallas oficiales en `program_curricula`.
 *  2. Si alguno NO tiene malla → FALLBACK:
 *       - devuelve metadata oficial del programa (duración, arancel, jornada, sede, etc.)
 *       - marca status='pending_scrape'
 *       - encola en `pending_curricula` para el worker de scraping
 *  3. Devuelve en ambos casos la comparación estructurada.
 *
 * La IA debe consumir este endpoint como tool y NO inventar ramos si status='pending_scrape'.
 */
import { requireAuth } from '~/server/utils/require-auth'
import { requireSupabaseServiceClient } from '~/server/utils/supabase-clients'

export default defineEventHandler(async (event) => {
  await requireAuth(event, { skipRateLimit: true })
  const body = await readBody<{ programCodes?: string[] }>(event)
  const codes = Array.isArray(body?.programCodes) ? body!.programCodes.filter(Boolean) : []

  if (codes.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'programCodes is required (string[])' })
  }
  if (codes.length > 5) {
    throw createError({ statusCode: 400, statusMessage: 'Máx. 5 programas por comparación' })
  }

  const supabase = requireSupabaseServiceClient({ fallbackToAnon: true })

  // 1. Programs (siempre disponibles)
  const { data: programs, error: pErr } = await supabase
    .from('programs')
    .select(`
      program_unique_code, nombre_carrera, nombre_institucion, tipo_institucion,
      sede, region, jornada, nivel_carrera, duracion_formal_semestres,
      arancel_anual, costo_titulacion, vacantes_semestre_1, ponderaciones,
      area_carrera_generica, career_generic_id
    `)
    .in('program_unique_code', codes)

  if (pErr) throw createError({ statusCode: 500, statusMessage: pErr.message })

  const foundCodes = new Set((programs ?? []).map(p => p.program_unique_code))
  const missing = codes.filter(c => !foundCodes.has(c))

  // 2. Mallas oficiales
  const { data: curricula } = await supabase
    .from('program_curricula')
    .select('program_unique_code, status, subjects, source, source_url, scraped_at')
    .in('program_unique_code', codes)

  const curriculaByCode = new Map((curricula ?? []).map(c => [c.program_unique_code, c]))

  // 3. Stats agregadas por carrera genérica (para fallback "útil")
  const genericIds = [...new Set((programs ?? []).map(p => p.career_generic_id).filter(Boolean))]
  const { data: stats } = genericIds.length
    ? await supabase
        .from('career_stats')
        .select('career_generic_id, ingreso_promedio, empleabilidad, duracion_titulados')
        .in('career_generic_id', genericIds as string[])
    : { data: [] as any[] }
  const statsByGeneric = new Map((stats ?? []).map(s => [s.career_generic_id, s]))

  // 4. Armar respuesta + encolar pending
  const toQueue: string[] = []
  const results = (programs ?? []).map(p => {
    const malla = curriculaByCode.get(p.program_unique_code)
    const stat = p.career_generic_id ? statsByGeneric.get(p.career_generic_id) : null

    if (malla && malla.status === 'ok') {
      return {
        program_unique_code: p.program_unique_code,
        nombre_carrera: p.nombre_carrera,
        institucion: p.nombre_institucion,
        sede: p.sede,
        jornada: p.jornada,
        duracion_semestres: p.duracion_formal_semestres,
        arancel_anual: p.arancel_anual,
        status: 'ok' as const,
        source: malla.source,
        subjects: malla.subjects,
      }
    }

    // FALLBACK
    toQueue.push(p.program_unique_code)
    return {
      program_unique_code: p.program_unique_code,
      nombre_carrera: p.nombre_carrera,
      institucion: p.nombre_institucion,
      sede: p.sede,
      jornada: p.jornada,
      duracion_semestres: p.duracion_formal_semestres,
      arancel_anual: p.arancel_anual,
      status: 'pending_scrape' as const,
      fallback: {
        area_carrera_generica: p.area_carrera_generica,
        nivel_carrera: p.nivel_carrera,
        ponderaciones: p.ponderaciones,
        vacantes_semestre_1: p.vacantes_semestre_1,
        stats_carrera_generica: stat
          ? {
              ingreso_promedio: stat.ingreso_promedio,
              empleabilidad: stat.empleabilidad,
              duracion_real: stat.duracion_titulados,
            }
          : null,
      },
      message: 'Malla no disponible aún. Se encoló para scraping. Se muestran datos oficiales del programa.',
    }
  })

  // 5. Queue pending scrapes (best-effort, no bloquea respuesta)
  if (toQueue.length) {
    await supabase
      .from('pending_curricula')
      .upsert(
        toQueue.map(code => ({ program_unique_code: code, status: 'queued' })),
        { onConflict: 'program_unique_code', ignoreDuplicates: false },
      )
  }

  return {
    requested: codes,
    missing,          // códigos que no existen en `programs` (dato inválido)
    pending_scrape: toQueue,
    results,
  }
})
