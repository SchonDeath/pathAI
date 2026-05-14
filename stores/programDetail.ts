/**
 * stores/programDetail.ts
 *
 * Cache Pinia para detalles completos de programas ya fetcheados.
 * Evita re-fetchear /api/tools/get-program-detail cuando el usuario
 * navega entre chat ↔ compare ↔ detalle dentro de la misma sesión,
 * y también entre recargas gracias a la persistencia en localStorage.
 *
 * Capacidad máxima: 8 programas (los más recientes, FIFO).
 */
import { defineStore } from 'pinia'

const MAX_CACHED = 8
const LS_DETAIL_KEY = 'KoraChile:programDetailCache:v1'
const LS_INST_KEY = 'KoraChile:programInstitutionCache:v1'
const LS_EMPLOY_KEY = 'KoraChile:employabilityCache:v1'
const TTL_MS = 1000 * 60 * 60 * 4 // 4 horas

/** Lee un Map serializado desde localStorage, descartando entradas caducadas. */
function readLsMap(key: string): Map<string, any> {
  if (typeof window === 'undefined') return new Map()
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return new Map()
    const parsed: Record<string, { v: any; t: number }> = JSON.parse(raw)
    const now = Date.now()
    const m = new Map<string, any>()
    for (const [k, entry] of Object.entries(parsed)) {
      if (now - entry.t < TTL_MS) m.set(k, entry.v)
    }
    return m
  } catch {
    return new Map()
  }
}

/** Persiste un Map en localStorage como objeto con timestamps. */
function writeLsMap(key: string, m: Map<string, any>) {
  if (typeof window === 'undefined') return
  try {
    const obj: Record<string, { v: any; t: number }> = {}
    const now = Date.now()
    for (const [k, v] of m.entries()) obj[k] = { v, t: now }
    localStorage.setItem(key, JSON.stringify(obj))
  } catch {
    // quota exceeded — no crítico
  }
}

function trimMap(map: Map<string, any>) {
  while (map.size > MAX_CACHED) {
    const firstKey = map.keys().next().value
    if (!firstKey) break
    map.delete(firstKey)
  }
}

function mergeDefined(existing: any, incoming: any) {
  if (!existing || typeof existing !== 'object') return incoming
  if (!incoming || typeof incoming !== 'object') return existing
  const merged = { ...existing }
  for (const [key, value] of Object.entries(incoming)) {
    if (value !== undefined && value !== null) merged[key] = value
  }
  return merged
}

export const useProgramDetailStore = defineStore('programDetail', () => {
  // Hidratación inicial desde localStorage (sin fetch de red)
  const cache = ref<Map<string, any>>(readLsMap(LS_DETAIL_KEY))
  const institutionCache = ref<Map<string, any>>(readLsMap(LS_INST_KEY))
  const employabilityCache = ref<Map<string, any>>(readLsMap(LS_EMPLOY_KEY))

  function get(code: string): any | null {
    return cache.value.get(code) ?? null
  }

  function set(code: string, detail: any) {
    if (!code || !detail) return
    const existing = cache.value.get(code)
    cache.value.set(code, existing ? mergeDefined(existing, detail) : detail)
    trimMap(cache.value)
    // Persistir en localStorage para sobrevivir recargas
    writeLsMap(LS_DETAIL_KEY, cache.value)
  }

  function getInstitution(code: string): any | null {
    const program = cache.value.get(code)
    return institutionCache.value.get(code)
      ?? program?.institution
      ?? program?.institution_data
      ?? null
  }

  function setInstitution(code: string, detail: any) {
    if (!code || !detail) return
    const existing = institutionCache.value.get(code)
    institutionCache.value.set(code, existing ? mergeDefined(existing, detail) : detail)
    trimMap(institutionCache.value)
    writeLsMap(LS_INST_KEY, institutionCache.value)
  }

  function getEmployability(code: string): any | null {
    return employabilityCache.value.get(code) ?? null
  }

  function setEmployability(code: string, metrics: any) {
    if (!code || !metrics) return
    employabilityCache.value.set(code, metrics)
    trimMap(employabilityCache.value)
    // Persistir en localStorage para sobrevivir recargas
    writeLsMap(LS_EMPLOY_KEY, employabilityCache.value)
  }

  function hasEmployability(code: string): boolean {
    return employabilityCache.value.has(code)
  }

  function has(code: string): boolean {
    return cache.value.has(code)
  }

  function clear() {
    cache.value.clear()
    institutionCache.value.clear()
    employabilityCache.value.clear()
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LS_DETAIL_KEY)
      localStorage.removeItem(LS_INST_KEY)
      localStorage.removeItem(LS_EMPLOY_KEY)
    }
  }

  return {
    get,
    set,
    getInstitution,
    setInstitution,
    getEmployability,
    setEmployability,
    hasEmployability,
    has,
    clear,
  }
})
