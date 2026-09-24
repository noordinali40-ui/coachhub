-- Lock the public schema down against Supabase's auto-generated PostgREST API.
--
-- Supabase exposes every table in `public` over REST to the `anon` and
-- `authenticated` roles. This application never uses that path: all reads and
-- writes go through Prisma in Server Components and Server Actions, where
-- src/lib/dal.ts enforces authorization.
--
-- Without this migration, anyone holding the public anon key (which ships to
-- the browser by design) could read every table directly — private coach
-- notes, messages, student progress — bypassing the app entirely.
--
-- Two layers:
--   1. REVOKE removes table privileges from the API roles.
--   2. ENABLE ROW LEVEL SECURITY with *no policies* denies everything even if
--      a future migration or extension re-grants privileges.
--
-- Prisma connects as the table owner, and an owner bypasses RLS unless FORCE
-- is set, so these statements do not affect the application's own queries.

DO $$
DECLARE
  target_table text;
BEGIN
  FOR target_table IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
  LOOP
    EXECUTE format(
      'REVOKE ALL ON TABLE public.%I FROM anon, authenticated',
      target_table
    );
    EXECUTE format(
      'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
      target_table
    );
  END LOOP;
END
$$;

-- Stop future tables from being granted to the API roles by default.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
