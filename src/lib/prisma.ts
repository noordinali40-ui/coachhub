import 'server-only'

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'

/**
 * Prisma 7 has no Rust query engine: the client talks to Postgres through a
 * driver adapter. `DATABASE_URL` should be the pooled (pgBouncer) Supabase
 * connection; Migrate uses `DIRECT_URL` separately via prisma.config.ts.
 *
 * Prisma connects as the database owner and therefore bypasses RLS. Every
 * authorization decision lives in src/lib/dal.ts — RLS on the tables exists to
 * block Supabase's PostgREST endpoint, not to protect these queries.
 */
function createClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error(
      'Missing DATABASE_URL. Copy .env.example to .env.local and fill it in.',
    )
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
}

// Reuse across HMR reloads in dev, otherwise every edit leaks a connection pool.
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createClient>
}

function getClient() {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = createClient()
  return globalForPrisma.prisma
}

/**
 * Created on first use, not at import — same reason as src/lib/env.ts: a
 * module-scope throw fails `next build` while collecting page data on a
 * machine without credentials, even though no query runs at build time.
 */
export const prisma = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    const client = getClient()
    const value = Reflect.get(client, prop, client)
    return typeof value === 'function' ? value.bind(client) : value
  },
})
