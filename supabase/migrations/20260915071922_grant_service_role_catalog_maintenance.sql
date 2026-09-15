-- The seed script prunes merged catalog duplicates and moves collection entries onto the kept record.
grant delete on table public.fragrances to service_role;
grant insert, update, delete on table public.user_fragrances to service_role;
