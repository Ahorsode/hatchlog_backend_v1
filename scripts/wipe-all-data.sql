-- One-shot operational wipe. Do not apply as a schema migration.
-- Keeps schema + Prisma/Supabase migration history. Deletes all app rows
-- and Auth users. storage.objects is intentionally omitted: Supabase
-- blocks direct DELETE and this project had no stored files.

DO $$
DECLARE
  stmt text;
BEGIN
  SELECT 'TRUNCATE TABLE ' || string_agg(format('%I.%I', schemaname, tablename), ', ')
    || ' RESTART IDENTITY CASCADE'
  INTO stmt
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename NOT IN ('spatial_ref_sys', '_prisma_migrations')
    AND tablename NOT LIKE '%schema_migrations%';

  IF stmt IS NOT NULL THEN
    EXECUTE stmt;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'auth' AND table_name = 'users'
  ) THEN
    DELETE FROM auth.users;
  END IF;
END $$;
