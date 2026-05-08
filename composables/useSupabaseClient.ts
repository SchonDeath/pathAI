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

export function useSupabaseClient() {
  const config = useRuntimeConfig()
  const url = config.public.supabaseUrl
  const key = config.public.supabaseAnonKey
  const shared = globalThis as KoraGlobal

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
