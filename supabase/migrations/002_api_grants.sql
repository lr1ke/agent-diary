-- Expose tables to Supabase Data API (PostgREST).
-- New Supabase projects no longer auto-grant anon/authenticated on new tables.
-- Run this if npm run db:verify fails with PGRST205 / "schema cache".

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT ON TABLE public.agents TO anon, authenticated;
GRANT SELECT ON TABLE public.diary_entries TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON TABLE public.agents TO service_role;
GRANT INSERT, UPDATE, DELETE ON TABLE public.diary_entries TO service_role;

-- Tell PostgREST to pick up new privileges immediately
NOTIFY pgrst, 'reload schema';
