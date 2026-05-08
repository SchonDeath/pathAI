/**
 * server/utils/embeddings.ts
 *
 * Singleton para cargar el modelo de embeddings UNA VEZ en el runtime del server
 * y generar embeddings de queries en ~50-150ms por pregunta.
 *
 * Modelo: Xenova/paraphrase-multilingual-MiniLM-L12-v2 (384d, multilingüe, $0)
 * Se carga en primera llamada (~1s cold start), luego queda en memoria.
 */

let pipelinePromise: Promise<any> | null = null
let disabledWarningShown = false

function embeddingsEnabled() {
  return useRuntimeConfig().aiEmbeddingsEnabled !== false
}

function warnEmbeddingsDisabled() {
  if (disabledWarningShown) return
  disabledWarningShown = true
  console.info('[embeddings] disabled in this runtime; set AI_EMBEDDINGS_ENABLED=1 to enable them explicitly')
}

async function getPipeline() {
  if (!embeddingsEnabled()) {
    warnEmbeddingsDisabled()
    return null
  }

  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      const { pipeline, env } = await import('@xenova/transformers')
      // Permitir descarga del modelo (no solo cache local)
      env.allowLocalModels = true
      env.allowRemoteModels = true
      return pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2')
    })().catch((err) => {
      pipelinePromise = null
      throw err
    })
  }
  return pipelinePromise
}

/**
 * Genera el embedding 384-dimensional de un texto.
 * Retorna null si el modelo falla (el chat debe seguir funcionando).
 */
export async function embedText(text: string): Promise<number[] | null> {
  if (!text?.trim()) return null
  try {
    const embedder = await getPipeline()
    if (!embedder) return null
    const output = await embedder(text, { pooling: 'mean', normalize: true })
    return Array.from(output.data as Float32Array)
  } catch (err: any) {
    console.warn('[embeddings] error:', err?.message)
    return null
  }
}

/** Convierte un vector number[] al formato que espera pgvector (texto "[1,2,3]"). */
export function toPgVector(vec: number[]): string {
  return `[${vec.join(',')}]`
}
