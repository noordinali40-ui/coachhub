import path from 'node:path'
import { config as loadEnv } from 'dotenv'
import { defineConfig, env } from 'prisma/config'

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
    url: process.env.DIRECT_URL ? env('DIRECT_URL') : env('DATABASE_URL'),
  },
})
