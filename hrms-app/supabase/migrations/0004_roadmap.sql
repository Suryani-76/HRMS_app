-- Phase 1 Schema Updates for OKLUT Roadmap

-- Recruitment
alter table public.candidates
  add column if not exists reference_id text unique,
  add column if not exists referred_by uuid references public.users(id) on delete set null,
  add column if not exists ats_score numeric(5,2);

alter table public.interviews
  add column if not exists malpractice_flag boolean not null default false;

alter table public.offers
  add column if not exists candidate_response text, -- 'accept', 'discuss', 'reject'
  add column if not exists relocation_agreed boolean,
  add column if not exists bond_agreed boolean;

-- HR Incentives
create table if not exists public.recruiter_incentives (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid not null references public.users(id) on delete cascade,
  month text not null, -- e.g. '2026-07'
  it_hires int not null default 0,
  non_it_hires int not null default 0,
  salary_bonus numeric(10,2) not null default 0,
  gift_points int not null default 0,
  created_at timestamptz not null default now(),
  unique (recruiter_id, month)
);
alter table public.recruiter_incentives enable row level security;
drop policy if exists "recruiter_incentives read admin" on public.recruiter_incentives;
create policy "recruiter_incentives read admin" on public.recruiter_incentives for select to authenticated using (public.is_admin() or public.is_manager() or recruiter_id = auth.uid());
drop policy if exists "recruiter_incentives write admin" on public.recruiter_incentives;
create policy "recruiter_incentives write admin" on public.recruiter_incentives for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Performance Management
alter table public.performance_reviews
  add column if not exists cycle_level int not null default 1 check (cycle_level in (1, 2, 3));

-- Insurance Enrollment
create table if not exists public.insurance_enrollments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  employer_info text,
  policy_info text,
  residential_address text,
  nominee_name text,
  nominee_relation text,
  nominee_dob date,
  nominee_share numeric(5,2),
  existing_insurance_details text,
  emergency_contact_name text,
  emergency_contact_phone text,
  bank_name text,
  bank_account text,
  ifsc_code text,
  declaration_signed boolean not null default false,
  declaration_date date,
  created_at timestamptz not null default now()
);
alter table public.insurance_enrollments enable row level security;
drop policy if exists "insurance read admin" on public.insurance_enrollments;
create policy "insurance read admin" on public.insurance_enrollments for select to authenticated using (public.is_admin() or public.is_manager() or employee_id = public.current_employee_id());
drop policy if exists "insurance insert" on public.insurance_enrollments;
create policy "insurance insert" on public.insurance_enrollments for insert to authenticated with check (employee_id = public.current_employee_id() or public.is_admin());
drop policy if exists "insurance update" on public.insurance_enrollments;
create policy "insurance update" on public.insurance_enrollments for update to authenticated using (employee_id = public.current_employee_id() or public.is_admin());

-- Asset Management
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  type text not null, -- 'Laptop', 'ID Card', 'Charger'
  serial_number text,
  assigned_to uuid references public.employees(id) on delete set null,
  status text not null default 'Active', -- 'Active', 'Lost', 'Damaged', 'Returned'
  assigned_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.assets enable row level security;
drop policy if exists "assets read admin" on public.assets;
create policy "assets read admin" on public.assets for select to authenticated using (public.is_admin() or public.is_manager() or assigned_to = public.current_employee_id());
drop policy if exists "assets write admin" on public.assets;
create policy "assets write admin" on public.assets for all to authenticated using (public.is_admin() or public.is_manager()) with check (public.is_admin() or public.is_manager());

create table if not exists public.asset_incidents (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  incident_type text not null, -- 'Lost', 'Damaged'
  report text,
  penalty_charge numeric(10,2) not null default 0,
  status text not null default 'Pending', -- 'Pending', 'Approved', 'Resolved'
  hr_sign_off uuid references public.users(id),
  created_at timestamptz not null default now()
);
alter table public.asset_incidents enable row level security;
drop policy if exists "incidents read admin" on public.asset_incidents;
create policy "incidents read admin" on public.asset_incidents for select to authenticated using (public.is_admin() or public.is_manager() or employee_id = public.current_employee_id());
drop policy if exists "incidents insert" on public.asset_incidents;
create policy "incidents insert" on public.asset_incidents for insert to authenticated with check (employee_id = public.current_employee_id() or public.is_admin());
drop policy if exists "incidents update admin" on public.asset_incidents;
create policy "incidents update admin" on public.asset_incidents for update to authenticated using (public.is_admin() or public.is_manager());

-- Employee ID Generation
alter table public.employees
  add column if not exists branch text default 'HQ';

create sequence if not exists employee_id_seq;

create or replace function generate_employee_code(p_country text, p_state text, p_city text, p_branch text, p_department text)
returns text language plpgsql as $$
declare
  seq_val int;
  code text;
begin
  seq_val := nextval('employee_id_seq');
  
  -- Fallbacks if null
  p_country := coalesce(nullif(trim(p_country), ''), 'IND');
  p_state := coalesce(nullif(trim(p_state), ''), 'ST');
  p_city := coalesce(nullif(trim(p_city), ''), 'CTY');
  p_branch := coalesce(nullif(trim(p_branch), ''), 'HQ');
  p_department := coalesce(nullif(trim(p_department), ''), 'GEN');
  
  -- Extract first 2-3 letters for each
  code := upper(substring(p_country from 1 for 2)) || '-' ||
          upper(substring(p_state from 1 for 2)) || '-' ||
          upper(substring(p_city from 1 for 3)) || '-' ||
          upper(substring(p_branch from 1 for 2)) || '-' ||
          upper(substring(p_department from 1 for 3)) || '-' ||
          lpad(seq_val::text, 4, '0');
          
  return code;
end;
$$;
