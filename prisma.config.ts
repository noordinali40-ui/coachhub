import path from 'node:path'
import { config as loadEnv } from 'dotenv'
import { defineConfig } from 'prisma/config'

// Next.js reads .env.local, so Prisma must too — otherwise `prisma migrate`
// and `next dev` end up pointed at different databases.
loadEnv({ path: '.env.local', quiet: true })
loadEnv({ path: '.env', quiet: true })

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'node prisma/seed.ts',
  },
  datasource: {
    // Migrate needs the *direct* connection (port 5432): advisory locks and
    // DDL do not survive pgBouncer's transaction pooling. The running app uses
    // the pooled DATABASE_URL instead, through the driver adapter in
    // src/lib/prisma.ts.
    //
    // Read process.env directly rather than via Prisma's env(), which throws
    // when the variable is unset. `prisma generate` runs on `npm install`
    // (postinstall) and needs no database, so CI/Vercel installs must not fail
    // just because no URL is configured at install time.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
})
