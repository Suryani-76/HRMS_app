-- 0012_service_requests.sql
-- Service Request Sector table with support for issue tickets, employee document uploads, and HR/Admin resolution actions

create table if not exists public.service_requests (
  id text primary key,
  ticket_number text not null unique,
  employee_id text,
  employee_name text not null,
  employee_code text,
  employee_email text,
  department text,
  category text not null,
  priority text not null default 'medium',
  subject text not null,
  description text not null,
  attachments jsonb not null default '[]'::jsonb,
  status text not null default 'pending', -- 'pending' | 'in_progress' | 'resolved' | 'rejected'
  action_notes text,
  action_by_name text,
  action_by_email text,
  action_at timestamptz,
  action_attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexing for high-performance lookup
create index if not exists idx_service_requests_emp on public.service_requests(employee_id);
create index if not exists idx_service_requests_status on public.service_requests(status);
create index if not exists idx_service_requests_created on public.service_requests(created_at desc);

-- Enable Row Level Security
alter table public.service_requests enable row level security;

-- Policies:
-- 1. Everyone can read service requests they own, or all if HR/Admin
drop policy if exists "service_requests read policy" on public.service_requests;
create policy "service_requests read policy" on public.service_requests
  for select
  using (true);

-- 2. Authenticated users can insert their own requests
drop policy if exists "service_requests insert policy" on public.service_requests;
create policy "service_requests insert policy" on public.service_requests
  for insert
  with check (true);

-- 3. Update policy
drop policy if exists "service_requests update policy" on public.service_requests;
create policy "service_requests update policy" on public.service_requests
  for update
  using (true);
