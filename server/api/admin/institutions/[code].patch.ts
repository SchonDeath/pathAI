/**
 * PATCH /api/admin/institutions/:code
 * Body: { is_featured?, priority?, featured_until?, plan_slug? }
 * Actualiza destaque/priority y opcionalmente registra una suscripción.
 */
import { requireAdmin } from '~/server/utils/require-admin'

function normalizeFeaturedUntil(value: string | null | undefined) {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'string') {
    throw createError({ statusCode: 400, message: 'featured_until inválido' })
  }

  const trimmed = value.trim()
  if (!trimmed) return null

  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.valueOf())) {
    throw createError({ statusCode: 400, message: 'featured_until debe ser una fecha ISO válida' })
  }

  return parsed.toISOString()
}

export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  const code = Number(getRouterParam(event, 'code'))
  if (!code) throw createError({ statusCode: 400, message: 'code inválido' })

  const body = await readBody<{
    is_featured?: boolean
    priority?: number
    featured_until?: string | null
    plan_slug?: string
  }>(event) || {}
  const featuredUntil = normalizeFeaturedUntil(body.featured_until)

  // Si viene plan_slug sin priority manual, tomar priority/features desde catalog.
  let computedPriority = body.priority
  if (body.plan_slug && computedPriority === undefined) {
    const { data: plan } = await supabase
      .from('plans')
      .select('priority')
      .eq('slug', body.plan_slug)
      .maybeSingle()
    if (!plan) throw createError({ statusCode: 400, message: 'Plan inexistente' })
    computedPriority = plan.priority
  }

  const patch: Record<string, any> = {}
  if (body.is_featured !== undefined)   patch.is_featured = body.is_featured
  if (computedPriority !== undefined)   patch.priority = computedPriority
  if (featuredUntil !== undefined) patch.featured_until = featuredUntil

  if (!Object.keys(patch).length) {
    throw createError({ statusCode: 400, statusMessage: 'Sin cambios' })
  }

  const { data, error } = await supabase
    .from('institutions')
    .update(patch)
    .eq('institution_code', code)
    .select('institution_code, nombre_institucion, is_featured, priority, featured_until')
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!data)  throw createError({ statusCode: 404, statusMessage: 'Institución no encontrada' })

  // Si plan_slug viene, registrar suscripción
  if (body.plan_slug) {
    await supabase
      .from('institution_subscriptions')
      .update({ is_active: false })
      .eq('institution_code', code)
      .eq('is_active', true)

    await supabase.from('institution_subscriptions').insert({
      institution_code: code,
      plan_slug: body.plan_slug,
      expires_at: featuredUntil ?? null,
      is_active: true,
    })
  }

  return { ok: true, institution: data }
})
