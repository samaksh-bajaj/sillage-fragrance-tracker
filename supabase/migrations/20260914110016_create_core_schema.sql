-- Sillage core schema: profiles, fragrance catalog, per-user fragrance status, image bucket.

create extension if not exists pg_trgm with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Shared trigger: keep updated_at current
-- ---------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles (one row per auth user)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;

create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Fragrance catalog (read-only for app users)
-- ---------------------------------------------------------------------------
create table public.fragrances (
  id bigint generated always as identity primary key,
  name text not null,
  brand text not null,
  release_year smallint,
  concentration text,
  rating_value numeric(3, 1),
  rating_count integer,
  main_accords text[] not null default '{}',
  top_notes text[] not null default '{}',
  middle_notes text[] not null default '{}',
  base_notes text[] not null default '{}',
  perfumers text[] not null default '{}',
  parfumo_url text not null unique,
  search_text text not null,
  image_url text,
  image_last_attempt_at timestamptz
);

create index fragrances_search_text_trgm_idx
  on public.fragrances using gin (search_text extensions.gin_trgm_ops);

alter table public.fragrances enable row level security;

revoke all on table public.fragrances from anon, authenticated;
grant select on table public.fragrances to authenticated;

create policy "Signed-in users can browse the catalog"
  on public.fragrances for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Per-user fragrance status
-- ---------------------------------------------------------------------------
create type public.fragrance_status as enum ('owned', 'not owned');

create table public.user_fragrances (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  fragrance_id bigint not null references public.fragrances (id) on delete cascade,
  status public.fragrance_status not null default 'owned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, fragrance_id)
);

create index user_fragrances_fragrance_id_idx on public.user_fragrances (fragrance_id);

create trigger user_fragrances_set_updated_at
  before update on public.user_fragrances
  for each row execute function private.set_updated_at();

alter table public.user_fragrances enable row level security;

revoke all on table public.user_fragrances from anon, authenticated;
grant select, insert, update on table public.user_fragrances to authenticated;

create policy "Users can view their own fragrances"
  on public.user_fragrances for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add their own fragrances"
  on public.user_fragrances for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own fragrances"
  on public.user_fragrances for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Storage bucket for fragrance images (written only by the service role)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fragrance-images', 'fragrance-images', true, 5242880, array['image/*'])
on conflict (id) do nothing;
