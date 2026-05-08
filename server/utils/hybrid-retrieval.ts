/**
 * server/utils/hybrid-retrieval.ts
 *
 * Búsqueda híbrida: embedding → search_hybrid (pgvector) → contexto compacto.
 * Reemplaza el prefetch con ILIKE, que es frágil con nombres/tildes.
 */

import { embedText, toPgVector } from './embeddings'
import { getSupabaseServiceClient } from './supabase-clients'

export interface RetrievedItem {
  kind: 'institution' | 'career' | 'program'
  ref_id: string
  nombre: string
  score: number
  payload: any
}

function getClient() {
  // Retrieval usa RPCs que solo deben exponerse con service_role
  // (nunca exponer la anon key para esto: evita que un cliente llame a
  // search_hybrid directamente saltando validaciones del endpoint).
  const client = getSupabaseServiceClient()
  if (!client) {
    console.warn('[retrieve] service_role key no configurada; retrieval deshabilitado')
  }
  return client
}

/**
 * Recupera los top-K items más similares a la pregunta del usuario.
 * Si falla (sin embeddings generados, etc.), devuelve [] silenciosamente.
 * `precomputedEmbedding` evita recomputar si el caller ya tiene el vector.
 */
export async function retrieveContext(
  question: string,
  k = 8,
  minScore = 0.30,
  precomputedEmbedding?: number[] | null,
): Promise<RetrievedItem[]> {
  const client = getClient()
  if (!client) return []

  const embedding = precomputedEmbedding ?? (await embedText(question))
  if (!embedding) return []

  try {
    const { data, error } = await client.rpc('search_hybrid', {
      q_embedding: toPgVector(embedding),
      k,
      min_score: minScore,
    })
    if (error) {
      console.warn('[retrieve] rpc error:', error.message)
      return []
    }
    return (data ?? []) as RetrievedItem[]
  } catch (e: any) {
    console.warn('[retrieve] fail:', e?.message)
    return []
  }
}

/**
 * Formatea los resultados como contexto compacto para inyectar al system prompt.
 * Agrupa por tipo para que el LLM lea fácil.
 */
export function formatContext(items: RetrievedItem[]): string {
  if (!items.length) return ''

  const institutions = items.filter(i => i.kind === 'institution')
  const careers      = items.filter(i => i.kind === 'career')
  const programs     = items.filter(i => i.kind === 'program')

  const lines: string[] = []

  if (institutions.length) {
    lines.push('INSTITUCIONES RELEVANTES:')
    for (const i of institutions) {
      const p = i.payload || {}
      const bits = [
        i.nombre,
        p.tipo,
        p.direccion ? `📍 ${p.direccion}` : null,
        p.web ? `🌐 ${p.web}` : null,
        p.acreditacion_anos ? `acreditación ${p.acreditacion_anos} años` : null,
        p.matricula_pregrado ? `${p.matricula_pregrado} matriculados` : null,
        p.titulados_pregrado ? `${p.titulados_pregrado} titulados/año` : null,
      ].filter(Boolean).join(' | ')
      lines.push(`- ${bits}`)
    }
  }

  if (programs.length) {
    if (lines.length) lines.push('')
    lines.push('PROGRAMAS RELEVANTES:')
    for (const p of programs) {
      const pl = p.payload || {}
      const arancel = pl.arancel_anual ? `$${pl.arancel_anual.toLocaleString('es-CL')}/año` : 's/d'
      const bits = [
        pl.nombre_carrera,
        pl.nombre_institucion,
        pl.nombre_sede ? `sede ${pl.nombre_sede}` : null,
        pl.region,
        pl.jornada,
        `arancel ${arancel}`,
        pl.puntaje_promedio_matriculados ? `promedio PAES ${Math.round(pl.puntaje_promedio_matriculados)}` : null,
        pl.vacantes_semestre_1 ? `${pl.vacantes_semestre_1} vacantes` : null,
      ].filter(Boolean).join(' | ')
      lines.push(`- ${bits} [code:${p.ref_id}]`)
    }
  }

  if (careers.length) {
    if (lines.length) lines.push('')
    lines.push('CARRERAS GENÉRICAS RELEVANTES:')
    for (const c of careers) {
      const pl = c.payload || {}
      lines.push(`- ${c.nombre} (${pl.area ?? ''}, ${pl.tipo_institucion ?? ''})`)
    }
  }

  return lines.join('\n')
}

/**
 * Extrae program cards (para UI) de los items tipo 'program'.
 */
export function extractProgramCards(items: RetrievedItem[]) {
  return items
    .filter(i => i.kind === 'program')
    .slice(0, 4)
    .map(i => ({
      code: i.ref_id,
      title: i.payload?.nombre_carrera ?? i.nombre,
      institution: i.payload?.nombre_institucion ?? '',
      semesters: typeof i.payload?.duracion_formal_semestres === 'number' ? i.payload.duracion_formal_semestres : null,
      cost: typeof i.payload?.arancel_anual === 'number' ? i.payload.arancel_anual : null,
      type: i.payload?.tipo_institucion ?? null,
      region: i.payload?.region ?? null,
      jornada: i.payload?.jornada ?? null,
      nivel: i.payload?.nivel_carrera ?? null,
      vacantes: typeof i.payload?.vacantes_semestre_1 === 'number' ? i.payload.vacantes_semestre_1 : null,
      titulados: typeof i.payload?.titulacion_total_2024 === 'number' ? i.payload.titulacion_total_2024 : null,
    }))
}
