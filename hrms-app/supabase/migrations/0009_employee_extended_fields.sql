-- Migration 0009: Add extended employee profile fields & candidate portal fields
-- Ensures all form fields (emergency contacts, guardian info, current & permanent addresses) and candidate portal fields are supported natively in Supabase

alter table public.employees
  add column if not exists emergency_contact text,
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_relation text,
  add column if not exists emergency_contact_phone text,
  add column if not exists guardian_name text,
  add column if not exists guardian_relation text,
  add column if not exists guardian_phone text,
  add column if not exists current_address text,
  add column if not exists current_city text,
  add column if not exists current_state text,
  add column if not exists current_country text,
  add column if not exists current_postal_code text,
  add column if not exists permanent_address text,
  add column if not exists permanent_city text,
  add column if not exists permanent_state text,
  add column if not exists permanent_country text,
  add column if not exists permanent_postal_code text,
  add column if not exists basic_salary numeric,
  add column if not exists hra numeric,
  add column if not exists allowances numeric,
  add column if not exists bonus numeric,
  add column if not exists branch text default 'HQ';

-- Candidates portal extended fields
alter table public.candidates
  add column if not exists reference_id text,
  add column if not exists temp_id text,
  add column if not exists ats_score int default 80,
  add column if not exists exam_link text,
  add column if not exists category text default 'Fresher',
  add column if not exists experience_years int default 0,
  add column if not exists current_stage text default 'Applied';

-- Ensure RLS allows insert and update for authenticated users / managers / public candidates
drop policy if exists "employees insert authenticated" on public.employees;
create policy "employees insert authenticated" on public.employees
  for insert to authenticated
  with check (true);

drop policy if exists "employees select authenticated" on public.employees;
create policy "employees select authenticated" on public.employees
  for select to authenticated
  using (true);

drop policy if exists "employees update authenticated" on public.employees;
create policy "employees update authenticated" on public.employees
  for update to authenticated
  using (true);

drop policy if exists "candidates insert public" on public.candidates;
create policy "candidates insert public" on public.candidates
  for insert to anon, authenticated
  with check (true);

-- Performance reviews cycle level
alter table public.performance_reviews
  add column if not exists cycle_level int default 1;

-- Assets and Incident Tracking tables
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  serial_number text,
  assigned_to uuid references public.employees(id) on delete set null,
  status text not null default 'Active',
  assigned_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.assets enable row level security;
drop policy if exists "assets public all" on public.assets;
create policy "assets public all" on public.assets
  for all to authenticated
  using (true) with check (true);

create table if not exists public.asset_incidents (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  incident_type text not null,
  report text,
  penalty_charge numeric(10,2) not null default 0,
  status text not null default 'Pending',
  hr_sign_off uuid references public.users(id),
  created_at timestamptz not null default now()
);

alter table public.asset_incidents enable row level security;
drop policy if exists "asset_incidents public all" on public.asset_incidents;
create policy "asset_incidents public all" on public.asset_incidents
  for all to authenticated
  using (true) with check (true);


