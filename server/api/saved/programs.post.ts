import { requireAuth } from '~/server/utils/require-auth'
import { requireSupabaseServiceClient } from '~/server/utils/supabase-clients'

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().replace(/[\u0000-\u001F\u007F]+/g, '')
  return trimmed ? trimmed.slice(0, maxLength) : null
}

export default defineEventHandler(async (event) => {
  const { userId } = await requireAuth(event)
  const body = await readBody<Record<string, unknown>>(event)

  const programUniqueCode = cleanText(body?.program_unique_code, 120)
  if (!programUniqueCode) {
    throw createError({ statusCode: 400, statusMessage: 'program_unique_code es obligatorio.' })
  }

  const institutionCode = Number(body?.institution_code)
  const supabase = requireSupabaseServiceClient()

  const payload = {
    user_id: userId,
    career_id: null,
    program_unique_code: programUniqueCode,
    institution_code: Number.isFinite(institutionCode) ? institutionCode : null,
    career_generic_id: cleanText(body?.career_generic_id, 64),
    nombre_carrera_snapshot: cleanText(body?.nombre_carrera, 180),
    nombre_institucion_snapshot: cleanText(body?.nombre_institucion, 180),
    nombre_sede_snapshot: cleanText(body?.nombre_sede, 180),
    region_snapshot: cleanText(body?.region, 120),
    comuna_snapshot: cleanText(body?.comuna, 120),
    source: cleanText(body?.source, 40) ?? 'app',
    notes: cleanText(body?.notes, 400) ?? '',
  }

  const { data, error } = await supabase
    .from('saved')
    .upsert(payload, { onConflict: 'user_id,program_unique_code' })
    .select(`
      id,
      program_unique_code,
      institution_code,
      career_generic_id,
      nombre_carrera_snapshot,
      nombre_institucion_snapshot,
      nombre_sede_snapshot,
      region_snapshot,
      comuna_snapshot,
      source,
      notes,
      created_at
    `)
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { item: data }
})