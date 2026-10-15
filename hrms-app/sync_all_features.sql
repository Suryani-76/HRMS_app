-- =============================================================================
-- COMPLETE HRMS FEATURES & DATABASE SYNC SCRIPT
-- Project Ref: qwygpcovmlobcmwcptvz
-- URL: https://qwygpcovmlobcmwcptvz.supabase.co
--
-- INSTRUCTIONS TO APPLY IN 30 SECONDS (No password/CLI required):
-- 1. Open your Supabase Dashboard:
--    https://supabase.com/dashboard/project/qwygpcovmlobcmwcptvz/sql
-- 2. Click "New query"
-- 3. Copy & paste the entire content of this file and click "Run" (or Ctrl+Enter)
--
-- This script safely and idempotently sets up all tables, columns, indexes,
-- RLS policies, functions, triggers, storage buckets, and realtime subscriptions
-- required by the entire OKLUT HRMS application.
--
-- Tables created/verified (10 missing + all core tables):
--   1. projects
--   2. project_members
--   3. project_status_updates
--   4. service_requests
--   5. parking_passes
--   6. employee_face_credentials
--   7. recruiter_incentives
--   8. complaints
--   9. employee_bank_details
--  10. interview_slots
--  + Extended columns for: employees, candidates, job_openings, interviews,
--    offers, performance_reviews, assets, meeting_hall_bookings
--  + Storage bucket: 'documents'
--  + Project code generator (ok-ind-001)
--  + Candidate login RPC (candidate_login_simple)
--  + Realtime publications
-- =============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- =============================================================================
-- 1. EXTENDED COLUMNS ON EXISTING CORE TABLES
-- =============================================================================

-- Employees table: extended contact, address, salary, branch & identification fields
alter table public.employees
  add column if not exists employee_code text,
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
  add column if not exists branch text default 'HQ',
  add column if not exists bank_name text,
  add column if not exists bank_account_number text,
  add column if not exists ifsc_code text,
  add column if not exists pan_number text,
  add column if not exists aadhaar_number text,
  add column if not exists uan_number text;

create index if not exists idx_employees_code on public.employees(employee_code);

-- Candidates table: temp_id, exam link, ats score, category
alter table public.candidates
  add column if not exists reference_id text,
  add column if not exists temp_id text,
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists category text default 'Fresher',
  add column if not exists password text default '1234',
  add column if not exists ats_score numeric(5,2) default 80,
  add column if not exists exam_link text,
  add column if not exists current_stage text default 'Applied',
  add column if not exists experience_years int default 0;

create index if not exists idx_candidates_temp_id on public.candidates(temp_id);

-- Job Openings: exam configuration
alter table public.job_openings
  add column if not exists total_questions int not null default 30,
  add column if not exists exam_duration_mins int not null default 60,
  add column if not exists exam_passing_score int not null default 70;

-- Interviews: reschedule and malpractice flags
alter table public.interviews
  add column if not exists reschedule_requested boolean not null default false,
  add column if not exists reschedule_status text,
  add column if not exists malpractice_flag boolean not null default false;

-- Offers: candidate response, relocation and bond agreements
alter table public.offers
  add column if not exists candidate_response text,
  add column if not exists relocation_agreed boolean,
  add column if not exists bond_agreed boolean;

-- Performance Reviews: 3-level review cycle
alter table public.performance_reviews
  add column if not exists cycle_level int not null default 1 check (cycle_level in (1, 2, 3));

-- Meeting Hall Bookings: timing and description
alter table public.meeting_hall_bookings
  add column if not exists booking_date date,
  add column if not exists end_date date,
  add column if not exists hall_name text default 'Main Conference Hall';

-- Attendance indexes
create index if not exists idx_attendance_date on public.attendance(date);
create index if not exists idx_attendance_emp_date on public.attendance(employee_id, date);

-- =============================================================================
-- 2. PROJECTS MANAGEMENT MODULE (Projects, Members, Status Updates)
-- =============================================================================

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  project_code varchar(50) not null unique,
  project_name varchar(255) not null,
  description text,
  client_name varchar(255),
  department_id uuid references public.departments(id) on delete set null,
  priority varchar(20) not null default 'Medium' check (priority in ('Low', 'Medium', 'High', 'Critical')),
  project_head_id uuid references public.employees(id) on delete set null,
  team_lead_id uuid references public.employees(id) on delete set null,
  status varchar(30) not null default 'Not Started' check (status in ('Not Started', 'Planning', 'In Progress', 'On Hold', 'At Risk', 'Completed', 'Cancelled')),
  progress_percentage integer not null default 0 check (progress_percentage >= 0 and progress_percentage <= 100),
  start_date date not null,
  expected_end_date date not null,
  actual_completion_date date,
  created_by uuid references public.employees(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  project_role varchar(50) not null default 'Member' check (project_role in ('Head', 'Lead', 'Member', 'Consultant', 'QA', 'Developer', 'Designer')),
  assignment_status varchar(30) not null default 'Active' check (assignment_status in ('Active', 'Removed', 'Completed')),
  assigned_at timestamptz not null default now(),
  constraint uq_project_employee unique (project_id, employee_id)
);

create table if not exists public.project_status_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  previous_status varchar(30) not null,
  new_status varchar(30) not null,
  previous_progress integer not null default 0,
  new_progress integer not null default 0,
  work_completed text,
  work_in_progress text,
  pending_tasks text,
  blockers text,
  risks text,
  delay_reason text,
  next_steps text,
  expected_completion_date date,
  update_type varchar(30) not null default 'Official' check (update_type in ('Official', 'Team Lead Report')),
  updated_by uuid references public.employees(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_projects_code on public.projects(project_code);
create index if not exists idx_projects_status on public.projects(status);
create index if not exists idx_projects_head on public.projects(project_head_id);
create index if not exists idx_projects_lead on public.projects(team_lead_id);
create index if not exists idx_project_members_project on public.project_members(project_id);
create index if not exists idx_project_members_employee on public.project_members(employee_id);
create index if not exists idx_project_status_updates_proj on public.project_status_updates(project_id);

-- Project Code Generator: ok-ind-001 format
create or replace function public.generate_project_code()
returns text as $$
declare
  v_prefix text := 'ok-ind-';
  v_max_num int;
  v_new_code text;
begin
  select coalesce(max(substring(project_code from '\d+$')::int), 0)
  into v_max_num
  from public.projects
  where lower(project_code) like v_prefix || '%';

  v_new_code := v_prefix || lpad((v_max_num + 1)::text, 3, '0');
  return v_new_code;
end;
$$ language plpgsql;

create or replace function public.trg_projects_before_insert_or_update()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    if new.project_code is null or trim(new.project_code) = '' or new.project_code like 'PRJ-%' then
      new.project_code := public.generate_project_code();
    else
      new.project_code := lower(trim(new.project_code));
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_projects_before_insert on public.projects;
create trigger trg_projects_before_insert
  before insert or update on public.projects
  for each row execute function public.trg_projects_before_insert_or_update();

alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_status_updates enable row level security;

drop policy if exists "projects_select_policy" on public.projects;
create policy "projects_select_policy" on public.projects for select using (true);
drop policy if exists "projects_insert_policy" on public.projects;
create policy "projects_insert_policy" on public.projects for insert with check (true);
drop policy if exists "projects_update_policy" on public.projects;
create policy "projects_update_policy" on public.projects for update using (true);
drop policy if exists "projects_delete_policy" on public.projects;
create policy "projects_delete_policy" on public.projects for delete using (true);

drop policy if exists "project_members_select_policy" on public.project_members;
create policy "project_members_select_policy" on public.project_members for select using (true);
drop policy if exists "project_members_all_policy" on public.project_members;
create policy "project_members_all_policy" on public.project_members for all using (true) with check (true);

drop policy if exists "project_status_updates_select_policy" on public.project_status_updates;
create policy "project_status_updates_select_policy" on public.project_status_updates for select using (true);
drop policy if exists "project_status_updates_all_policy" on public.project_status_updates;
create policy "project_status_updates_all_policy" on public.project_status_updates for all using (true) with check (true);

-- =============================================================================
-- 3. SERVICE REQUESTS MODULE
-- =============================================================================

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
  status text not null default 'pending',
  action_notes text,
  action_by_name text,
  action_by_email text,
  action_at timestamptz,
  action_attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_service_requests_emp on public.service_requests(employee_id);
create index if not exists idx_service_requests_status on public.service_requests(status);
create index if not exists idx_service_requests_created on public.service_requests(created_at desc);

alter table public.service_requests enable row level security;
drop policy if exists "service_requests read policy" on public.service_requests;
create policy "service_requests read policy" on public.service_requests for select using (true);
drop policy if exists "service_requests insert policy" on public.service_requests;
create policy "service_requests insert policy" on public.service_requests for insert with check (true);
drop policy if exists "service_requests update policy" on public.service_requests;
create policy "service_requests update policy" on public.service_requests for update using (true);
drop policy if exists "service_requests delete policy" on public.service_requests;
create policy "service_requests delete policy" on public.service_requests for delete using (true);

-- =============================================================================
-- 4. PARKING PASSES & QR VERIFICATION MODULE
-- =============================================================================

create table if not exists public.parking_passes (
  id uuid primary key default gen_random_uuid(),
  employee_id text not null,
  employee_code text not null,
  employee_name text not null,
  employee_email text not null,
  vehicle_type text not null default '2-Wheeler' check (vehicle_type in ('2-Wheeler', '4-Wheeler')),
  vehicle_number text not null,
  vehicle_model text,
  license_number text,
  emergency_phone text,
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected', 'Revoked')),
  allocated_sector text,
  allocated_slot text,
  rejection_reason text,
  approved_by text,
  approved_at timestamptz,
  qr_code_data text,
  qr_code_image text,
  is_checked_in boolean not null default false,
  last_check_in timestamptz,
  last_check_out timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_parking_passes_emp on public.parking_passes(employee_id);
create index if not exists idx_parking_passes_email on public.parking_passes(employee_email);
create index if not exists idx_parking_passes_status on public.parking_passes(status);
create index if not exists idx_parking_passes_vehicle on public.parking_passes(vehicle_number);

alter table public.parking_passes enable row level security;
drop policy if exists "parking_passes select all" on public.parking_passes;
create policy "parking_passes select all" on public.parking_passes for select using (true);
drop policy if exists "parking_passes insert all" on public.parking_passes;
create policy "parking_passes insert all" on public.parking_passes for insert with check (true);
drop policy if exists "parking_passes update all" on public.parking_passes;
create policy "parking_passes update all" on public.parking_passes for update using (true);
drop policy if exists "parking_passes delete all" on public.parking_passes;
create policy "parking_passes delete all" on public.parking_passes for delete using (true);

-- =============================================================================
-- 5. EMPLOYEE FACE ID BIOMETRIC CREDENTIALS MODULE
-- =============================================================================

create table if not exists public.employee_face_credentials (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  biometric_template text not null,
  model_version text not null default 'v4-contour-lbp-aes',
  registration_status text not null default 'registered' check (registration_status in ('registered', 'revoked', 'locked')),
  registered_at timestamptz not null default now(),
  last_verified_at timestamptz,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_employee_face_credential unique (employee_id)
);

create index if not exists idx_face_credentials_emp on public.employee_face_credentials(employee_id);
create index if not exists idx_face_credentials_status on public.employee_face_credentials(registration_status);

alter table public.employee_face_credentials enable row level security;
drop policy if exists "face_credentials select all" on public.employee_face_credentials;
create policy "face_credentials select all" on public.employee_face_credentials for select using (true);
drop policy if exists "face_credentials all policy" on public.employee_face_credentials;
create policy "face_credentials all policy" on public.employee_face_credentials for all using (true) with check (true);

-- =============================================================================
-- 6. HR RECRUITER INCENTIVES MODULE
-- =============================================================================

create table if not exists public.recruiter_incentives (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid not null references public.users(id) on delete cascade,
  month text not null,
  it_hires int not null default 0,
  non_it_hires int not null default 0,
  salary_bonus numeric(10,2) not null default 0,
  gift_points int not null default 0,
  created_at timestamptz not null default now(),
  unique (recruiter_id, month)
);

alter table public.recruiter_incentives enable row level security;
drop policy if exists "recruiter_incentives select all" on public.recruiter_incentives;
create policy "recruiter_incentives select all" on public.recruiter_incentives for select using (true);
drop policy if exists "recruiter_incentives write all" on public.recruiter_incentives;
create policy "recruiter_incentives write all" on public.recruiter_incentives for all using (true) with check (true);

-- =============================================================================
-- 7. COMPLAINTS & GRIEVANCE MANAGEMENT MODULE
-- =============================================================================

create table if not exists public.complaints (
  id text primary key,
  ticket_number text not null unique,
  employee_id text,
  employee_name text not null,
  employee_code text,
  employee_email text,
  department text,
  is_anonymous boolean default false,
  category text not null,
  custom_subject text,
  description text not null,
  word_count integer default 0,
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  status text default 'pending' check (status in ('pending', 'under_review', 'resolved', 'dismissed')),
  resolution_note text,
  resolved_by text,
  resolved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_complaints_ticket on public.complaints(ticket_number);
create index if not exists idx_complaints_emp on public.complaints(employee_id);
create index if not exists idx_complaints_status on public.complaints(status);
create index if not exists idx_complaints_created on public.complaints(created_at desc);

alter table public.complaints enable row level security;
drop policy if exists "complaints select all" on public.complaints;
create policy "complaints select all" on public.complaints for select using (true);
drop policy if exists "complaints insert all" on public.complaints;
create policy "complaints insert all" on public.complaints for insert with check (true);
drop policy if exists "complaints update all" on public.complaints;
create policy "complaints update all" on public.complaints for update using (true);
drop policy if exists "complaints delete all" on public.complaints;
create policy "complaints delete all" on public.complaints for delete using (true);

-- =============================================================================
-- 8. EMPLOYEE BANK DETAILS MODULE
-- =============================================================================

create table if not exists public.employee_bank_details (
  id text primary key,
  employee_id text not null,
  employee_code text,
  employee_name text,
  employee_email text,
  phone text,
  department text,
  designation text,
  bank_name text not null,
  account_holder_name text not null,
  account_number text not null,
  ifsc_code text not null,
  branch_name text,
  account_type text default 'Salary',
  upi_id text,
  pan_number text,
  document_proof_name text,
  document_proof_type text,
  document_proof_data text,
  status text default 'pending' check (status in ('pending', 'verified', 'rejected')),
  verified_by text,
  verified_at timestamptz,
  rejection_reason text,
  admin_note text,
  submitted_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_bank_details_emp on public.employee_bank_details(employee_id);
create index if not exists idx_bank_details_status on public.employee_bank_details(status);

alter table public.employee_bank_details enable row level security;
drop policy if exists "bank_details select all" on public.employee_bank_details;
create policy "bank_details select all" on public.employee_bank_details for select using (true);
drop policy if exists "bank_details insert all" on public.employee_bank_details;
create policy "bank_details insert all" on public.employee_bank_details for insert with check (true);
drop policy if exists "bank_details update all" on public.employee_bank_details;
create policy "bank_details update all" on public.employee_bank_details for update using (true);
drop policy if exists "bank_details delete all" on public.employee_bank_details;
create policy "bank_details delete all" on public.employee_bank_details for delete using (true);

-- =============================================================================
-- 9. INTERVIEW SLOTS MODULE (Candidate Portal Scheduling)
-- =============================================================================

create table if not exists public.interview_slots (
  id uuid primary key default gen_random_uuid(),
  job_opening_id uuid references public.job_openings(id) on delete cascade,
  round text not null,
  scheduled_at timestamptz not null,
  meeting_link text,
  max_candidates integer default 1,
  status text default 'open',
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_interview_slots_job on public.interview_slots(job_opening_id);
create index if not exists idx_interview_slots_status on public.interview_slots(status);

alter table public.interview_slots enable row level security;
drop policy if exists "interview_slots select all" on public.interview_slots;
create policy "interview_slots select all" on public.interview_slots for select using (true);
drop policy if exists "interview_slots insert all" on public.interview_slots;
create policy "interview_slots insert all" on public.interview_slots for insert with check (true);
drop policy if exists "interview_slots update all" on public.interview_slots;
create policy "interview_slots update all" on public.interview_slots for update using (true);
drop policy if exists "interview_slots delete all" on public.interview_slots;
create policy "interview_slots delete all" on public.interview_slots for delete using (true);

-- =============================================================================
-- 10. ASSETS & INCIDENT MANAGEMENT (With Barcode & Seating support)
-- =============================================================================

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  serial_number text,
  assigned_to uuid references public.employees(id) on delete set null,
  status text not null default 'Active',
  barcode_code text,
  barcode_image text,
  seating_number text,
  assigned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.assets
  add column if not exists barcode_code text,
  add column if not exists barcode_image text,
  add column if not exists seating_number text;

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

alter table public.assets enable row level security;
alter table public.asset_incidents enable row level security;

drop policy if exists "assets_select_all" on public.assets;
create policy "assets_select_all" on public.assets for select using (true);
drop policy if exists "assets_all" on public.assets;
create policy "assets_all" on public.assets for all using (true) with check (true);

drop policy if exists "asset_incidents_all" on public.asset_incidents;
create policy "asset_incidents_all" on public.asset_incidents for all using (true) with check (true);

-- =============================================================================
-- 11. MEETING HALL BOOKINGS MODULE
-- =============================================================================

create table if not exists public.meeting_hall_bookings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  requested_by uuid references public.employees(id),
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected')),
  admin_comment text,
  booking_date date,
  end_date date,
  hall_name text default 'Main Conference Hall',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_meeting_hall_time on public.meeting_hall_bookings(start_time, end_time);
create index if not exists idx_meeting_hall_status on public.meeting_hall_bookings(status);

alter table public.meeting_hall_bookings enable row level security;
drop policy if exists "meeting_hall_all" on public.meeting_hall_bookings;
create policy "meeting_hall_all" on public.meeting_hall_bookings for all using (true) with check (true);

-- =============================================================================
-- 12. CANDIDATE PORTAL HELPER FUNCTIONS
-- =============================================================================

create or replace function public.generate_candidate_temp_id()
returns trigger language plpgsql as $$
begin
  if new.status = 'Shortlisted'
     and (old.status is distinct from 'Shortlisted')
     and (new.temp_id is null or new.temp_id = '') then
    new.temp_id := 'CAND-' || upper(substring(gen_random_uuid()::text, 1, 6));
    new.reference_id := new.temp_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_candidate_temp_id on public.candidates;
create trigger trg_candidate_temp_id
  before update on public.candidates
  for each row execute function public.generate_candidate_temp_id();

create or replace function public.candidate_login_simple(
  p_temp_id text,
  p_email text
)
returns table (
  authenticated boolean,
  candidate_data jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cand public.candidates%rowtype;
begin
  select * into v_cand
  from public.candidates c
  where lower(c.temp_id) = lower(p_temp_id)
    and lower(c.email) = lower(p_email)
  limit 1;

  if not found then
    return query select false, null::jsonb;
    return;
  end if;

  return query
  select
    true,
    (to_jsonb(v_cand) || jsonb_build_object(
      'job_opening', (
        select to_jsonb(jo)
        from public.job_openings jo
        where jo.id = v_cand.job_opening_id
      )
    ))::jsonb;
end;
$$;

-- =============================================================================
-- 13. STORAGE BUCKET FOR DOCUMENTS & ATTACHMENTS
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

drop policy if exists "documents storage public read" on storage.objects;
create policy "documents storage public read" on storage.objects
  for select using (bucket_id = 'documents');

drop policy if exists "documents storage public insert" on storage.objects;
create policy "documents storage public insert" on storage.objects
  for insert with check (bucket_id = 'documents');

drop policy if exists "documents storage public update" on storage.objects;
create policy "documents storage public update" on storage.objects
  for update using (bucket_id = 'documents');

drop policy if exists "documents storage public delete" on storage.objects;
create policy "documents storage public delete" on storage.objects
  for delete using (bucket_id = 'documents');

-- =============================================================================
-- 14. REALTIME PUBLICATIONS
-- =============================================================================

do $$
begin
  alter publication supabase_realtime add table public.projects;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.project_members;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.project_status_updates;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.service_requests;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.parking_passes;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.meeting_hall_bookings;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.employee_face_credentials;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.complaints;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.employee_bank_details;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.interview_slots;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when others then null;
end $$;
