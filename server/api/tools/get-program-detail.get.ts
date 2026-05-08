/**
 * GET /api/tools/get-program-detail
 *   ?program_unique_code=...                       (match exacto)
 *   ?nombre_carrera=...&nombre_institucion=...     (búsqueda flexible)
 *   &sede=...&jornada=...                          (filtros opcionales)
 *
 * Devuelve la ficha COMPLETA de un programa específico:
 * sede, jornada, vacantes, arancel, matrícula, puntaje de corte,
 * ponderaciones PAES, acreditación, etc.
 *
 * Uso típico: "¿Qué puntaje de corte tiene Ingeniería Comercial UDP?"
 *             "¿Cuántas vacantes tiene la sede Alameda de la USACH?"
 */
import { resolveInstitution } from '~/server/utils/institution-resolver'
import { requireAuth } from '~/server/utils/require-auth'
import { resolveGratuidad } from '~/server/utils/gratuidad'
import { requireSupabaseServiceClient } from '~/server/utils/supabase-clients'

export default defineEventHandler(async (event) => {
  await requireAuth(event, { skipRateLimit: true })
  const config = useRuntimeConfig()
  const UF_REF_CLP = Number(config.public?.ufReferenceClp ?? 39000)

  const toUf = (value?: number | null) => {
    if (!value || UF_REF_CLP <= 0) return null
    return Math.round((value / UF_REF_CLP) * 100) / 100
  }

  const primerAnoPct = (primerAno?: number | null, total?: number | null) => {
    if (!primerAno || !total || total <= 0) return null
    return Math.round((primerAno / total) * 1000) / 10
  }

  const enrichProgram = (p: any) => ({
    ...p,
    gratuidad: resolveGratuidad(p.institution_code, p.nombre_institucion),
    arancel_anual_uf_aprox: toUf(p.arancel_anual),
    matricula_anual_uf_aprox: toUf(p.matricula_anual),
    costo_titulacion_uf_aprox: toUf(p.costo_titulacion),
    arancel_referencia_becas_uf_aprox: toUf(p.arancel_referencia_becas),
    arancel_referencia_creditos_uf_aprox: toUf(p.arancel_referencia_creditos),
    porcentaje_matricula_primer_ano_2025: primerAnoPct(
      p.matricula_primer_ano_2025,
      p.matricula_total_2025,
    ),
    uf_referencia_clp: UF_REF_CLP,
  })

  const {
    program_unique_code,
    nombre_carrera,
    nombre_institucion,
    institution_code,
    sede,
    jornada,
  } = getQuery(event) as Record<string, string>

  if (!program_unique_code && !(nombre_carrera && nombre_institucion)) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Debe entregar `program_unique_code` o (`nombre_carrera` + `nombre_institucion`).',
    })
  }

  const supabase = requireSupabaseServiceClient({ fallbackToAnon: true })

  const cols = `
    program_unique_code, nombre_carrera, nombre_institucion, nombre_sede,
    nombre_titulo, grado_academico, tipo_institucion, tipo_institucion_detalle,
    area_conocimiento, area_carrera_generica,
    region, provincia, comuna,
    jornada, modalidad, nivel_carrera, tipo_carrera, regimen,
    duracion_formal_semestres, duracion_titulacion, duracion_total,
    acreditacion_programa, requisito_ingreso, demre, ano_inicio,
    vacantes_semestre_1, vacantes_semestre_2,
    arancel_anual, matricula_anual, costo_titulacion,
    arancel_referencia_becas, arancel_referencia_creditos,
    brecha_arancel_becas, brecha_arancel_creditos,
    matricula_total_2025, matricula_primer_ano_2025,
    titulacion_total_2024,
    promedio_nem, rango_percentil_paes,
    puntaje_promedio_matriculados, anio_puntajes,
    pond_nem, pond_ranking, pond_lenguaje, pond_matematicas,
    pond_matematicas_2, pond_historia, pond_ciencias, pond_otros,
    institution_code, career_generic_id
  `

  let q = supabase.from('programs').select(cols)
    .order('puntaje_promedio_matriculados', { ascending: false, nullsFirst: false })
    .limit(10)

  if (program_unique_code) {
    q = q.eq('program_unique_code', program_unique_code)
  } else {
    // Resolver código institucional si vino como texto
    let resolvedCode: number | null = institution_code ? Number(institution_code) : null
    if (!resolvedCode && nombre_institucion) {
      const r = await resolveInstitution(supabase, nombre_institucion)
      if (r) resolvedCode = r.institution_code
    }

    q = q.ilike('nombre_carrera', `%${nombre_carrera}%`)
    if (resolvedCode) q = q.eq('institution_code', resolvedCode)
    else if (nombre_institucion) q = q.ilike('nombre_institucion', `%${nombre_institucion}%`)
    if (sede)    q = q.ilike('nombre_sede', `%${sede}%`)
    if (jornada) q = q.ilike('jornada', `%${jornada}%`)
  }

  const { data, error } = await q
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  if (!data?.length) return { match: 'none', candidates: [] }
  if (data.length === 1) return { match: 'exact', program: enrichProgram(data[0]) }

  return {
    match: 'multiple',
    note: 'Hay varios programas que coinciden. Indica sede o jornada para precisar.',
    candidates: data.map(p => ({
      program_unique_code: p.program_unique_code,
      nombre_carrera: p.nombre_carrera,
      nombre_institucion: p.nombre_institucion,
      nombre_sede: p.nombre_sede,
      jornada: p.jornada,
      region: p.region,
      arancel_anual: p.arancel_anual,
      arancel_anual_uf_aprox: toUf(p.arancel_anual),
      porcentaje_matricula_primer_ano_2025: primerAnoPct(
        p.matricula_primer_ano_2025,
        p.matricula_total_2025,
      ),
      rango_percentil_paes: p.rango_percentil_paes,
      puntaje_promedio_matriculados: p.puntaje_promedio_matriculados,
      anio_puntajes: p.anio_puntajes,
      gratuidad: resolveGratuidad(p.institution_code, p.nombre_institucion),
    })),
    uf_referencia_clp: UF_REF_CLP,
  }
})
