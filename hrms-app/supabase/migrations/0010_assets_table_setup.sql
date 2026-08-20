-- =============================================================================
-- Migration 0010: Assets & Incident Tracking Tables Setup
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- =============================================================================

-- 1. Create Assets Table
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  type text not null, -- 'Laptop', 'ID Card', 'Phone', 'Monitor', 'Accessories', etc.
  serial_number text,
  assigned_to uuid references public.employees(id) on delete set null,
  status text not null default 'Active', -- 'Active', 'Lost', 'Damaged', 'Returned', 'Maintenance'
  assigned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Create Asset Incidents Table
create table if not exists public.asset_incidents (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  incident_type text not null, -- 'Lost', 'Damaged', 'Stolen', 'Hardware Failure'
  report text,
  penalty_charge numeric(10,2) not null default 0,
  status text not null default 'Pending', -- 'Pending', 'Approved', 'Resolved', 'Waived'
  hr_sign_off uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 3. Create Indexes for Performance
create index if not exists idx_assets_assigned_to on public.assets(assigned_to);
create index if not exists idx_assets_status on public.assets(status);
create index if not exists idx_asset_incidents_asset_id on public.asset_incidents(asset_id);
create index if not exists idx_asset_incidents_employee_id on public.asset_incidents(employee_id);

-- 4. Enable Row Level Security (RLS)
alter table public.assets enable row level security;
alter table public.asset_incidents enable row level security;

-- 5. RLS Policies for Assets
drop policy if exists "assets select all" on public.assets;
create policy "assets select all" on public.assets
  for select to authenticated, anon
  using (true);

drop policy if exists "assets insert all" on public.assets;
create policy "assets insert all" on public.assets
  for insert to authenticated, anon
  with check (true);

drop policy if exists "assets update all" on public.assets;
create policy "assets update all" on public.assets
  for update to authenticated, anon
  using (true);

drop policy if exists "assets delete all" on public.assets;
create policy "assets delete all" on public.assets
  for delete to authenticated, anon
  using (true);

-- 6. RLS Policies for Asset Incidents
drop policy if exists "asset_incidents select all" on public.asset_incidents;
create policy "asset_incidents select all" on public.asset_incidents
  for select to authenticated, anon
  using (true);

drop policy if exists "asset_incidents insert all" on public.asset_incidents;
create policy "asset_incidents insert all" on public.asset_incidents
  for insert to authenticated, anon
  with check (true);

drop policy if exists "asset_incidents update all" on public.asset_incidents;
create policy "asset_incidents update all" on public.asset_incidents
  for update to authenticated, anon
  using (true);

drop policy if exists "asset_incidents delete all" on public.asset_incidents;
create policy "asset_incidents delete all" on public.asset_incidents
  for delete to authenticated, anon
  using (true);
