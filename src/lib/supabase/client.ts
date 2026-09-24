'use client'

import { createBrowserClient } from '@supabase/ssr'
import { publicEnv } from '@/lib/env'

/**
 * Browser client. Only used for auth flows that must run client-side
 * (email link callback handling). All data reads go through Server Components
 * so the anon key is never used to query application tables.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey)
}
