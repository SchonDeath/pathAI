/**
 * Caché ligero de logo_url por institution_code.
 * Almacena solo strings (URLs), no imágenes — el browser cachea los archivos.
 * El Map es global (singleton por app) y sobrevive navegación intra-SPA.
 */
import { useSupabaseClient } from '#imports'
import { reactive } from 'vue'

const LOGO_CACHE_TTL_MS = 30 * 60_000
const MAX_LOGO_CACHE_ENTRIES = 200
const logoCache = reactive(new Map<number, string | null>())
const logoCacheTouchedAt = new Map<number, number>()
const pending = new Set<number>()

function touch(code: number) {
  logoCacheTouchedAt.set(code, Date.now())
}

function evict(code: number) {
  logoCache.delete(code)
  logoCacheTouchedAt.delete(code)
}

function isFresh(code: number) {
  const touchedAt = logoCacheTouchedAt.get(code)
  return typeof touchedAt === 'number' && Date.now() - touchedAt < LOGO_CACHE_TTL_MS
}

function pruneCache() {
  const now = Date.now()
  for (const [code, touchedAt] of logoCacheTouchedAt.entries()) {
    if (now - touchedAt >= LOGO_CACHE_TTL_MS) {
      evict(code)
    }
  }

  while (logoCache.size > MAX_LOGO_CACHE_ENTRIES) {
    const oldest = [...logoCacheTouchedAt.entries()].sort((a, b) => a[1] - b[1])[0]
    if (!oldest) break
    evict(oldest[0])
  }
}

export function useInstitutionLogos() {
  const supabase = useSupabaseClient()

  /**
   * Devuelve logo_url para un institution_code dado.
   * Si no está en caché inicia la carga (reactiva via logoCache, pero
   * el componente debe llamar getLogoUrl en un computed para ser reactivo).
   */
  function getLogoUrl(code: number | null | undefined): string | null {
    if (!code) return null
    pruneCache()
    if (logoCache.has(code) && isFresh(code)) {
      touch(code)
      return logoCache.get(code) ?? null
    }
    if (logoCache.has(code)) {
      evict(code)
    }
    prefetch([code])
    return null
  }

  /**
   * Pre-carga logos para un array de codes de institución.
   * Ignora los que ya están en caché o en vuelo.
   */
  async function prefetch(codes: (number | null | undefined)[]) {
    pruneCache()

    const toFetch = [...new Set(codes.filter((c): c is number => {
      if (!c || pending.has(c)) return false
      return !logoCache.has(c) || !isFresh(c)
    }))]
    if (!toFetch.length) return

    toFetch.forEach(c => pending.add(c))

    try {
      const { data, error } = await supabase
        .from('institutions')
        .select('institution_code, logo_url')
        .in('institution_code', toFetch)

      if (error) throw error

      const fetched = new Set<number>()
      for (const row of data ?? []) {
        logoCache.set(row.institution_code, row.logo_url ?? null)
        touch(row.institution_code)
        fetched.add(row.institution_code)
      }

      for (const code of toFetch) {
        if (!fetched.has(code)) {
          logoCache.set(code, null)
          touch(code)
        }
      }
      pruneCache()
    } catch (error: any) {
      console.warn('[logos] prefetch error:', error?.message)
    } finally {
      for (const code of toFetch) {
        pending.delete(code)
      }
    }
  }

  return { getLogoUrl, prefetch, logoCache }
}
