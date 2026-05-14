/**
 * GET /api/tools/filters-catalog
 *
 * Devuelve el catálogo de filtros válidos para que la IA no invente valores:
 * - áreas de conocimiento
 * - tipos de institución
 * - regiones
 * - comunas principales
 *
 * Uso: la IA lo llama una vez al inicio si no está segura de los valores válidos.
 */
import { requireAuth } from '~/server/utils/require-auth'
import { requireSupabaseServiceClient } from '~/server/utils/supabase-clients'

export default defineEventHandler(async (event) => {
  await requireAuth(event, { skipRateLimit: true })
  const supabase = requireSupabaseServiceClient({ fallbackToAnon: true })

  const [areas, regions, comunas, levels] = await Promise.all([
    supabase.from('career_generic').select('area').limit(1000),
    supabase.from('regions').select('code, nombre').order('code'),
    supabase.from('comunas').select('code, nombre, region_code').order('nombre').limit(500),
    supabase.from('programs').select('nivel_carrera').limit(2000),
  ])

  const uniqAreas = [...new Set((areas.data ?? []).map(a => a.area).filter(Boolean))].sort()
  const uniqLevels = [...new Set((levels.data ?? []).map(a => a.nivel_carrera).filter(Boolean))].sort()

  return {
    tipos_institucion: [
      'Universidades',
      'Institutos Profesionales',
      'Centros de Formación Técnica',
    ],
    areas_conocimiento: uniqAreas,
    niveles_carrera: uniqLevels,
    regiones: regions.data ?? [],
    comunas: comunas.data ?? [],
  }
})
