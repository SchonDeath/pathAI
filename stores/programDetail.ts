/**
 * stores/programDetail.ts
 *
 * Cache Pinia para detalles completos de programas ya fetcheados.
 * Evita re-fetchear /api/tools/get-program-detail cuando el usuario
 * navega entre chat ↔ compare ↔ detalle dentro de la misma sesión.
 *
 * Capacidad máxima: 8 programas (los más recientes, FIFO).
 */
import { defineStore } from 'pinia'

const MAX_CACHED = 8

export const useProgramDetailStore = defineStore('programDetail', () => {
  // Map: program_unique_code → detalle completo
  const cache = ref<Map<string, any>>(new Map())

  function get(code: string): any | null {
    return cache.value.get(code) ?? null
  }

  function set(code: string, detail: any) {
    if (cache.value.has(code)) return // ya existe, no sobreescribir

    // Si se supera el máximo, eliminar la entrada más antigua
    if (cache.value.size >= MAX_CACHED) {
      const firstKey = cache.value.keys().next().value
      if (firstKey) cache.value.delete(firstKey)
    }
    cache.value.set(code, detail)
  }

  function has(code: string): boolean {
    return cache.value.has(code)
  }

  function clear() {
    cache.value.clear()
  }

  return { get, set, has, clear }
})
