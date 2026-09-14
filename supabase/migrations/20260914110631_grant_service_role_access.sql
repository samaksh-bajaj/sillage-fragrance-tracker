-- Server-side access (seed script, Edge Functions) uses the service_role.
grant select, insert, update on table public.fragrances to service_role;
grant select on table public.user_fragrances to service_role;
grant select on table public.profiles to service_role;
