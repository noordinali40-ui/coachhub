import 'server-only'

import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { publicEnv } from '@/lib/env'

/**
 * Request-scoped Supabase client for Server Components, Server Actions and
 * Route Handlers. A new client per request is required: the library only emits
 * the no-store cache headers on a client's first cookie write, so a shared
 * client would leave later responses cacheable with someone else's session.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Server Components cannot set cookies. Token refresh is handled in
          // proxy.ts, which runs before render and can write to the response,
          // so ignoring the write here is safe.
        }
      },
    },
  })
}
