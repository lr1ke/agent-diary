import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { isSupabaseConfigured } from '@/lib/config/env'
import type { Database } from '@/lib/db/database.types'

const serverAuth = {
  persistSession:     false,
  detectSessionInUrl: false,
  autoRefreshToken:   false,
  storage: {
    getItem:    () => null,
    setItem:    () => {},
    removeItem: () => {},
  },
} as const

export type SupabaseAdmin = SupabaseClient<Database>
export type SupabaseAnon = SupabaseClient<Database>

let _admin: SupabaseAdmin | null = null
let _client: SupabaseAnon | null = null

/** Service-role client for API routes. Returns null when env vars are absent. */
export function getSupabaseAdmin(): SupabaseAdmin | null {
  if (_admin) return _admin
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!isSupabaseConfigured(url, key)) return null
  _admin = createClient<Database>(url!, key!, { auth: serverAuth })
  return _admin
}

/** Anon-key client for Server Components. Returns null when env vars are absent. */
export function getSupabase(): SupabaseAnon | null {
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!isSupabaseConfigured(url, key)) return null
  _client = createClient<Database>(url!, key!, { auth: serverAuth })
  return _client
}
