/**
 * GET /api/tools/get-institution?nombre=...&institution_code=...
 *
 * Devuelve ficha completa de una institución (universidad, IP o CFT)
 * con matrícula, retención, titulados, dirección, acreditación, etc.
 *
 * Uso típico desde el chat: "¿Cuántos matriculados tiene la Universidad X?"
 *                           "¿Dónde queda la sede de la Universidad Y?"
 */
import { resolveInstitution } from '~/server/utils/institution-resolver'
import { requireAuth } from '~/server/utils/require-auth'
import { requireSupabaseServiceClient } from '~/server/utils/supabase-clients'

export default defineEventHandler(async (event) => {
  await requireAuth(event, { skipRateLimit: true })
  const { nombre, institution_code } = getQuery(event) as Record<string, string>

  if (!nombre && !institution_code) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Debe entregar `nombre` o `institution_code`.',
    })
  }

  const supabase = requireSupabaseServiceClient({ fallbackToAnon: true })

  // Si viene nombre pero no code, intenta resolver (alias/sigla -> code)
  let resolvedCode = institution_code ? Number(institution_code) : null
  if (!resolvedCode && nombre) {
    const r = await resolveInstitution(supabase, nombre)
    if (r) resolvedCode = r.institution_code
  }

  let q = supabase
    .from('institutions')
    .select(`
      institution_code, nombre_institucion, tipo_institucion, autonomia,
      direccion_sede_central, pagina_web, rut,
      acreditacion_estado, acreditacion_anos,
      acreditacion_vigencia_desde, acreditacion_vigencia_hasta,
      acreditacion_areas, acreditacion_areas_electivas,
      matricula_pregrado_actual, matricula_posgrado_actual,
      titulados_pregrado_actual, retencion_1er_ano_pct,
      duracion_formal_semestres, duracion_real_semestres,
      promedio_nem, promedio_paes, total_jce,
      m2_construidos, volumenes_biblioteca,
      laboratorios_talleres, computadores,
      ingresos_operacion_clp, resultado_ejercicio_clp,
      total_activos_clp, patrimonio_total_clp
    `)
    // Nota: las series temporales (matricula_*_por_ano, titulados_*_por_ano,
    // matricula_pct_por_*, jce_por_nivel_academico) NO se traen aquí. Son blobs
    // JSON de miles de tokens que el summarizer del chat descartaba siempre.
    // La UI los obtiene de /api/ranking/institutions, que sí los necesita.
    .limit(5)

  if (resolvedCode) {
    q = q.eq('institution_code', resolvedCode)
  } else {
    q = q.ilike('nombre_institucion', `%${nombre}%`)
  }

  const { data, error } = await q
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const withCasaCentral = (row: any) => ({
    ...row,
    casa_central: row.direccion_sede_central ?? null,
  })

  if (!data?.length) {
    return {
      match: 'none',
      candidates: [],
      message: `No se encontró ninguna institución que coincida con "${nombre ?? institution_code ?? ''}". Verifica el nombre con el usuario (puede ser una sigla poco común) o pídele el nombre completo. NO inventes datos de esta institución.`,
    }
  }

  // Si hay match único o exacto, devolver ficha completa.
  // Si hay varios, devolver lista resumida para que la IA pida confirmación.
  if (data.length === 1) return { match: 'exact', institution: withCasaCentral(data[0]) }

  const exact = data.find(d =>
    nombre && d.nombre_institucion?.toLowerCase() === nombre.toLowerCase(),
  )
  if (exact) return { match: 'exact', institution: withCasaCentral(exact) }

  return {
    match: 'multiple',
    candidates: data.map(d => ({
      institution_code: d.institution_code,
      nombre_institucion: d.nombre_institucion,
      tipo_institucion: d.tipo_institucion,
      direccion_sede_central: d.direccion_sede_central,
    })),
  }
})
