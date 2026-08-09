import { createClient } from '@supabase/supabase-js'

type SupabaseClientInstance = ReturnType<typeof createClient>
type CachedSupabaseClient = {
  url: string
  key: string
  client: SupabaseClientInstance
}

type KoraGlobal = typeof globalThis & {
  __koraSupabaseClient?: CachedSupabaseClient
}

let client: CachedSupabaseClient | null = null
let missingConfigWarned = false

/**
 * True cuando faltan las credenciales públicas de Supabase. Permite a los
 * llamadores degradar en vez de reventar: sin esto, `createClient('')` lanza
 * dentro de un plugin de arranque y tumba la app entera antes de montar.
 */
export function hasSupabaseConfig() {
  const config = useRuntimeConfig()
  return !!config.public.supabaseUrl && !!config.public.supabaseAnonKey
}

export function useSupabaseClient() {
  const config = useRuntimeConfig()
  const url = config.public.supabaseUrl
  const key = config.public.supabaseAnonKey
  const shared = globalThis as KoraGlobal

  if (!url || !key) {
    if (!missingConfigWarned) {
      missingConfigWarned = true
      console.error(
        '[supabase] Faltan NUXT_PUBLIC_SUPABASE_URL / NUXT_PUBLIC_SUPABASE_ANON_KEY (o sus alias VITE_*).\n'
        + 'Copia .env.example a .env y completa las credenciales. Sin ellas la app renderiza pero no carga datos.',
      )
    }
    throw new Error('Supabase no está configurado: falta supabaseUrl o supabaseAnonKey.')
  }

  if (client?.url === url && client.key === key) return client.client
  if (shared.__koraSupabaseClient?.url === url && shared.__koraSupabaseClient.key === key) {
    client = shared.__koraSupabaseClient
    return client.client
  }

  const next: CachedSupabaseClient = {
    url,
    key,
    client: createClient(url, key, {
      auth: {
        persistSession: import.meta.client,
        autoRefreshToken: import.meta.client,
        detectSessionInUrl: import.meta.client,
      },
    }),
  }

  client = next
  shared.__koraSupabaseClient = next
  return next.client
}
