import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type CachedSupabaseClient = {
  url: string
  key: string
  client: SupabaseClient
}

let anonClient: CachedSupabaseClient | null = null
let serviceClient: CachedSupabaseClient | null = null

function createServerClient(url: string, key: string) {
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

function getCachedClient(
  cached: CachedSupabaseClient | null,
  setCached: (value: CachedSupabaseClient) => void,
  url: string,
  key: string,
) {
  if (cached?.url === url && cached.key === key) return cached.client

  const next = { url, key, client: createServerClient(url, key) }
  setCached(next)
  return next.client
}

export function getSupabaseAnonClient() {
  const config = useRuntimeConfig()
  const url = config.public.supabaseUrl
  const key = config.public.supabaseAnonKey
  if (!url || !key) return null

  return getCachedClient(anonClient, value => { anonClient = value }, url, key)
}

export function requireSupabaseAnonClient() {
  const client = getSupabaseAnonClient()
  if (!client) {
    throw createError({ statusCode: 500, statusMessage: 'Supabase no está configurado.' })
  }
  return client
}

export function getSupabaseServiceClient(options: { fallbackToAnon?: boolean } = {}) {
  const config = useRuntimeConfig()
  const url = config.public.supabaseUrl
  const key = config.supabaseServiceKey
  if (!url) return null
  if (!key) return options.fallbackToAnon ? getSupabaseAnonClient() : null

  return getCachedClient(serviceClient, value => { serviceClient = value }, url, key)
}

export function requireSupabaseServiceClient(options: { fallbackToAnon?: boolean } = {}) {
  const client = getSupabaseServiceClient(options)
  if (!client) {
    throw createError({ statusCode: 500, statusMessage: 'Supabase no está configurado.' })
  }
  return client
}