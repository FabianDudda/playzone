-- Named map areas for QR code deep links
-- Accessible via /?area=<slug>

create table if not exists public.areas (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  description text,
  min_lat     double precision not null,
  max_lat     double precision not null,
  min_lng     double precision not null,
  max_lng     double precision not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Everyone can read active areas
create policy "areas_select_active"
  on public.areas for select
  using (is_active = true);

-- Only admins can insert / update / delete
create policy "areas_admin_all"
  on public.areas for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and user_role = 'admin'
    )
  );

alter table public.areas enable row level security;
