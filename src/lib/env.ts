/**
 * Environment access.
 *
 * Validation is lazy — checked when a value is first used, not at import time.
 * A module-scope throw would fail `next build` on a machine that has no
 * credentials, even for pages that never touch Supabase.
 *
 * `NEXT_PUBLIC_*` values are written as literal `process.env.X` expressions
 * because the bundler inlines them by static reference; a dynamic lookup would
 * be `undefined` in the browser.
 */

function required(name: string, value: string | undefined): string {
  if (!value || value.startsWith('<')) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    )
  }
  return value
}

export const publicEnv = {
  get supabaseUrl() {
    return required(
      'NEXT_PUBLIC_SUPABASE_URL',
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    )
  },
  get supabaseAnonKey() {
    return required(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    )
  },
  get siteUrl() {
    return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  },
}

/** Server-only secrets. Never reference these from a Client Component. */
export const serverEnv = {
  get databaseUrl() {
    return required('DATABASE_URL', process.env.DATABASE_URL)
  },
  get serviceRoleKey() {
    return required(
      'SUPABASE_SERVICE_ROLE_KEY',
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    )
  },
}
