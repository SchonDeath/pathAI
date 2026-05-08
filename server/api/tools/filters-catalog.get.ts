/**
 * GET /api/tools/filters-catalog
 *
 * Devuelve el catálogo de filtros válidos para que la IA no invente valores:
 * - áreas de conocimiento
 * - tipos de institución
 * - regiones
 *
 * Uso: la IA lo llama una vez al inicio si no está segura de los valores válidos.
 */
import { requireAuth } from '~/server/utils/require-auth'
import { requireSupabaseServiceClient } from '~/server/utils/supabase-clients'

export default defineEventHandler(async (event) => {
  await requireAuth(event, { skipRateLimit: true })
  const supabase = requireSupabaseServiceClient({ fallbackToAnon: true })

  const [areas, regions] = await Promise.all([
    supabase.from('career_generic').select('area').limit(1000),
    supabase.from('regions').select('code, nombre').order('code'),
  ])

  const uniqAreas = [...new Set((areas.data ?? []).map(a => a.area).filter(Boolean))].sort()

  return {
    tipos_institucion: [
      'Universidades',
      'Institutos Profesionales',
      'Centros de Formación Técnica',
    ],
    areas_conocimiento: uniqAreas,
    regiones: regions.data ?? [],
  }
})
