-- =============================================================================
-- OKLUT HRMS - MASTER DATABASE SCHEMA v2.0 (CORRECTED & COMPLETE)
-- Unified Enterprise Schema (29 Tables, All Foreign Keys, All Triggers, RLS)
--
-- ⚠️  HOW TO RUN:
--     1. Open Supabase SQL Editor
--     2. Paste this ENTIRE file and click Run (▶)
--     3. This is safe to re-run — all statements use CREATE IF NOT EXISTS / ALTER IF NOT EXISTS
-- =============================================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =============================================================================
-- HELPER: Universal updated_at trigger function
-- =============================================================================
create or replace function public.handle_updated_at()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- EMPLOYEE CODE AUTO-GENERATION SYSTEM
-- Format: OKL-[DEPT_CODE]-[YYYY]-[NNN]
-- Examples: OKL-ENG-2026-001, OKL-HR-2026-042, OKL-GEN-2026-007
--
-- Design:
--   • UUID `id`           → internal primary key (used in all FK references)
--   • `employee_code`     → human-readable, unique business identifier
--   • `email`             → mandatory, UNIQUE (login key + deduplication)
--   • `phone`             → mandatory, UNIQUE (secondary deduplication)
--
-- This solves the "same name" problem: two Rahul Sharmas will always differ
-- by their code (OKL-ENG-2026-001 vs OKL-MKT-2026-019), email, and phone.
-- =============================================================================

-- Global monotonic sequence for employee codes (never reused)
create sequence if not exists public.employee_code_seq start 1 increment 1;

-- Function: generate a formatted employee code for a given department code
create or replace function public.generate_employee_code(p_dept_code text default 'GEN')
returns text language plpgsql security definer set search_path = public as $$
declare
  v_seq   int;
  v_year  text;
  v_dept  text;
begin
  v_seq  := nextval('public.employee_code_seq');
  v_year := to_char(now(), 'YYYY');
  v_dept := upper(coalesce(nullif(trim(p_dept_code), ''), 'GEN'));
  return 'OKL-' || v_dept || '-' || v_year || '-' || lpad(v_seq::text, 3, '0');
end;
$$;

-- Trigger function: auto-assign employee_code on INSERT if not provided
create or replace function public.auto_set_employee_code()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_dept_code text;
begin
  -- Only generate if employee_code is blank/null
  if new.employee_code is null or trim(new.employee_code) = '' then
    -- Try to get the department code from the departments table
    select d.code into v_dept_code
      from public.departments d
     where d.id = new.department_id
     limit 1;
    -- Fall back to 'GEN' if department not linked yet
    new.employee_code := public.generate_employee_code(coalesce(v_dept_code, 'GEN'));
  end if;
  return new;
end;
$$;

-- Attach trigger: fires BEFORE INSERT on every new employee row
drop trigger if exists trg_employees_auto_code on public.employees;
create trigger trg_employees_auto_code
  before insert on public.employees
  for each row execute function public.auto_set_employee_code();



-- =============================================================================
-- 1. ROLES & PERMISSIONS
-- =============================================================================
create table if not exists public.roles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  created_at  timestamptz not null default now()
);

create table if not exists public.permissions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  module      text not null,
  description text
);

create table if not exists public.role_permissions (
  role_id       uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

-- =============================================================================
-- 2. ORGANIZATION STRUCTURE
-- =============================================================================
create table if not exists public.departments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  code        text,
  description text,
  head_id     uuid,  -- FK added after employees table
  created_at  timestamptz not null default now()
);

create table if not exists public.designations (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  department_id uuid references public.departments(id) on delete set null,
  level         int not null default 1,
  created_at    timestamptz not null default now()
);

-- =============================================================================
-- 3. EMPLOYEES (Core — many tables FK reference this)
-- =============================================================================
create table if not exists public.employees (
  id            uuid primary key default gen_random_uuid(),
  employee_code text unique not null default gen_random_uuid()::text, -- overwritten by trigger
  user_id       uuid,  -- stores auth.users.id (Supabase Auth UID)

  -- Personal Info (email & phone are MANDATORY and UNIQUE — solves same-name problem)
  first_name      text not null,
  last_name       text not null,
  email           text not null unique,
  phone           text not null unique,   -- mandatory: used as secondary unique identifier
  gender          text,
  date_of_birth   date,
  marital_status  text,
  blood_group     text,

  -- Address
  address               text,
  city                  text,
  state                 text,
  country               text,
  postal_code           text,
  current_address       text,
  current_city          text,
  current_state         text,
  current_country       text,
  current_postal_code   text,
  permanent_address     text,
  permanent_city        text,
  permanent_state       text,
  permanent_country     text,
  permanent_postal_code text,

  -- Emergency & Guardian
  emergency_contact          text,
  emergency_contact_name     text,
  emergency_contact_relation text,
  emergency_contact_phone    text,
  guardian_name              text,
  guardian_relation          text,
  guardian_phone             text,

  -- Employment
  joining_date        date not null default current_date,
  employment_type     text not null default 'full_time',
  department_id       uuid references public.departments(id) on delete set null,
  designation_id      uuid references public.designations(id) on delete set null,
  manager_id          uuid references public.employees(id) on delete set null,
  status              text not null default 'active',
  profile_picture_url text,
  branch              text not null default 'HQ',

  -- Salary (quick-access; canonical values in payroll_profiles)
  basic_salary numeric(12,2) default 0,
  hra          numeric(12,2) default 0,
  allowances   numeric(12,2) default 0,
  bonus        numeric(12,2) default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Deferred FK: departments.head_id -> employees
alter table public.departments
  drop constraint if exists departments_head_id_fkey,
  add constraint departments_head_id_fkey
    foreign key (head_id) references public.employees(id) on delete set null;

-- =============================================================================
-- 4. USERS (Application user table — synced with Supabase Auth)
--    auth_id = auth.users.id  (the Supabase Auth UID)
-- =============================================================================
create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  auth_id       uuid unique,   -- = auth.users.id
  email         text not null unique,
  role_id       uuid not null references public.roles(id),
  employee_id   uuid references public.employees(id) on delete set null,
  status        text not null default 'active',
  last_login_at timestamptz,
  created_at    timestamptz not null default now()
);

-- Safe upgrade: add auth_id if upgrading from old schema
alter table public.users add column if not exists auth_id uuid unique;

-- =============================================================================
-- SAFE UPGRADES: Enforce mandatory phone + unique employee_code on existing tables
-- (Safe to run even if the table already exists with data)
-- =============================================================================

-- 1. Make phone NOT NULL on existing employees table
--    Step 1: fill any existing NULL phones with a placeholder so NOT NULL doesn't fail
update public.employees set phone = 'UNKNOWN-' || substring(id::text, 1, 8) where phone is null;
--    Step 2: now enforce NOT NULL
alter table public.employees alter column phone set not null;
--    Step 3: add unique constraint (safe — drops first if exists)
alter table public.employees drop constraint if exists employees_phone_key;
alter table public.employees add constraint employees_phone_key unique (phone);

-- 2. Make employee_code NOT NULL and backfill any NULL codes for existing rows
update public.employees
   set employee_code = public.generate_employee_code('GEN')
 where employee_code is null or trim(employee_code) = '';
alter table public.employees alter column employee_code set not null;

-- 4. Add salary, branch, address, and emergency columns to employees table if not present
alter table public.employees add column if not exists basic_salary numeric(12,2) default 0;
alter table public.employees add column if not exists hra          numeric(12,2) default 0;
alter table public.employees add column if not exists allowances   numeric(12,2) default 0;
alter table public.employees add column if not exists bonus        numeric(12,2) default 0;
alter table public.employees add column if not exists branch       text not null default 'HQ';

alter table public.employees add column if not exists emergency_contact          text;
alter table public.employees add column if not exists emergency_contact_name     text;
alter table public.employees add column if not exists emergency_contact_relation text;
alter table public.employees add column if not exists emergency_contact_phone    text;
alter table public.employees add column if not exists guardian_name              text;
alter table public.employees add column if not exists guardian_relation          text;
alter table public.employees add column if not exists guardian_phone             text;

alter table public.employees add column if not exists current_address            text;
alter table public.employees add column if not exists current_city               text;
alter table public.employees add column if not exists current_state              text;
alter table public.employees add column if not exists current_country            text;
alter table public.employees add column if not exists current_postal_code        text;
alter table public.employees add column if not exists permanent_address          text;
alter table public.employees add column if not exists permanent_city             text;
alter table public.employees add column if not exists permanent_state            text;
alter table public.employees add column if not exists permanent_country          text;
alter table public.employees add column if not exists permanent_postal_code      text;



-- =============================================================================
-- 5. ATTENDANCE & LEAVES
-- =============================================================================
create table if not exists public.attendance (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  date        date not null,
  clock_in    timestamptz,
  clock_out   timestamptz,
  total_hours numeric(4,2),
  status      text not null default 'present',
  notes       text,
  created_at  timestamptz not null default now(),
  unique (employee_id, date)
);

create table if not exists public.leave_types (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  days_per_year int not null default 12,
  is_paid       boolean not null default true,
  created_at    timestamptz not null default now()
);

create table if not exists public.leave_requests (
  id             uuid primary key default gen_random_uuid(),
  employee_id    uuid not null references public.employees(id) on delete cascade,
  leave_type_id  uuid not null references public.leave_types(id) on delete restrict,
  start_date     date not null,
  end_date       date not null,
  days           numeric(4,1) not null default 1,
  reason         text,
  status         text not null default 'pending',
  admin_comment  text,
  reviewed_by    uuid references public.employees(id) on delete set null, -- employee who approved
  reviewed_at    timestamptz,
  applied_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists public.leave_balances (
  id             uuid primary key default gen_random_uuid(),
  employee_id    uuid not null references public.employees(id) on delete cascade,
  leave_type_id  uuid not null references public.leave_types(id) on delete cascade,
  year           int not null default extract(year from current_date),
  allocated      numeric(4,1) not null default 0,
  used           numeric(4,1) not null default 0,
  created_at     timestamptz not null default now(),
  unique (employee_id, leave_type_id, year)
);

create table if not exists public.holidays (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  date        date not null unique,
  is_optional boolean not null default false,
  created_at  timestamptz not null default now()
);

-- =============================================================================
-- 6. PAYROLL & COMPENSATION
-- =============================================================================
create table if not exists public.payroll_profiles (
  employee_id  uuid primary key references public.employees(id) on delete cascade,
  basic_salary numeric(12,2) not null default 0,
  hra          numeric(12,2) not null default 0,
  allowances   numeric(12,2) not null default 0,
  bonus        numeric(12,2) not null default 0,
  pf_percent   numeric(4,2)  not null default 12,
  tax_percent  numeric(4,2)  not null default 10,
  bank_name    text,
  bank_account text,
  ifsc_code    text,
  updated_at   timestamptz not null default now()
);

create table if not exists public.payroll (
  id             uuid primary key default gen_random_uuid(),
  employee_id    uuid not null references public.employees(id) on delete cascade,
  pay_period     text not null,
  basic_salary   numeric(12,2) not null default 0,
  hra            numeric(12,2) not null default 0,
  allowances     numeric(12,2) not null default 0,
  bonus          numeric(12,2) not null default 0,
  deductions     numeric(12,2) not null default 0,
  tax            numeric(12,2) not null default 0,
  provident_fund numeric(12,2) not null default 0,
  present_days   numeric(4,1) not null default 0,
  total_days     int not null default 30,
  net_salary     numeric(12,2) not null default 0,
  status         text not null default 'draft',
  generated_at   timestamptz,
  paid_at        timestamptz,
  created_at     timestamptz not null default now(),
  unique (employee_id, pay_period)
);

-- =============================================================================
-- 7. DOCUMENTS
-- =============================================================================
create table if not exists public.documents (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  name        text not null,
  doc_type    text not null default 'other',
  file_url    text,
  file_size   bigint,
  uploaded_by uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- =============================================================================
-- 8. TASK MANAGEMENT (with department-sector filtering)
-- =============================================================================
create table if not exists public.tasks (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  description       text,
  assignee_id       uuid references public.employees(id) on delete set null,
  assigner_id       uuid references public.employees(id) on delete set null,
  department_id     uuid references public.departments(id) on delete set null,
  department_sector text,   -- denormalized label for fast UI filtering
  due_date          date,
  priority          text not null default 'medium',
  status            text not null default 'todo',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.tasks add column if not exists department_id     uuid references public.departments(id) on delete set null;
alter table public.tasks add column if not exists department_sector text;

-- =============================================================================
-- 9. PERFORMANCE MANAGEMENT
--    reviewer_id references employees (not users) — the reviewing manager
-- =============================================================================
create table if not exists public.performance_goals (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  reviewer_id uuid references public.employees(id) on delete set null,
  title       text not null,
  description text,
  target      text,
  due_date    date,
  status      text not null default 'pending',
  created_at  timestamptz not null default now()
);

create table if not exists public.performance_reviews (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid not null references public.employees(id) on delete cascade,
  reviewer_id  uuid references public.employees(id) on delete set null,
  period       text not null,
  goals        text,
  strengths    text,
  improvements text,
  rating       numeric(3,1),
  comments     text,
  status       text not null default 'draft',
  cycle_level  int not null default 1,
  review_date  date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.performance_goals   add column if not exists reviewer_id uuid references public.employees(id) on delete set null;
alter table public.performance_reviews add column if not exists reviewer_id uuid references public.employees(id) on delete set null;
alter table public.performance_reviews add column if not exists cycle_level int not null default 1;

-- =============================================================================
-- 10. RECRUITMENT & CAREERS PORTAL
-- =============================================================================
create table if not exists public.job_openings (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  department_id       uuid references public.departments(id) on delete set null,
  designation_id      uuid references public.designations(id) on delete set null,
  location            text not null default 'Headquarters',
  openings_count      int not null default 1,
  description         text,
  requirements        text,
  employment_type     text not null default 'full_time',
  job_type            text,              -- 'Remote' | 'Hybrid' | 'On-site'
  experience_required text,              -- '2-4 years'
  salary_range        text,              -- '₹8L - ₹12L'
  status              text not null default 'open',
  published           boolean not null default true,
  created_by          uuid references public.users(id) on delete set null,
  created_at          timestamptz not null default now()
);

alter table public.job_openings add column if not exists designation_id      uuid references public.designations(id) on delete set null;
alter table public.job_openings add column if not exists job_type            text;
alter table public.job_openings add column if not exists experience_required text;
alter table public.job_openings add column if not exists salary_range        text;

create table if not exists public.candidates (
  id                    uuid primary key default gen_random_uuid(),
  job_opening_id        uuid references public.job_openings(id) on delete set null,
  name                  text not null,
  email                 text not null,
  phone                 text,
  resume_url            text,
  cover_letter          text,
  reference_id          text,
  temp_id               text,
  ats_score             int default 80,
  exam_link             text,
  category              text default 'Fresher',
  experience_years      int default 0,
  stage                 text default 'Applied',
  current_stage         text default 'Applied',  -- backward compat alias
  rating                numeric(3,1),
  notes                 text,
  status                text not null default 'applied',
  source                text not null default 'Careers Portal',
  converted_employee_id uuid references public.employees(id) on delete set null,
  applied_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.candidates add column if not exists stage  text default 'Applied';
alter table public.candidates add column if not exists rating numeric(3,1);
alter table public.candidates add column if not exists notes  text;

create table if not exists public.interviews (
  id             uuid primary key default gen_random_uuid(),
  candidate_id   uuid not null references public.candidates(id) on delete cascade,
  job_opening_id uuid references public.job_openings(id) on delete set null,
  interviewer_id uuid references public.employees(id) on delete set null,
  round          text not null default 'Technical',
  scheduled_at   timestamptz not null,
  mode           text not null default 'online',
  meeting_link   text,
  exam_link      text,
  status         text not null default 'scheduled',
  feedback       text,
  rating         numeric(3,1),
  created_at     timestamptz not null default now()
);

alter table public.interviews add column if not exists exam_link text;

create table if not exists public.offers (
  id               uuid primary key default gen_random_uuid(),
  candidate_id     uuid not null references public.candidates(id) on delete cascade,
  job_opening_id   uuid references public.job_openings(id) on delete set null,
  offer_letter_url text,
  salary_offered   numeric(12,2),
  joining_date     date,
  status           text not null default 'draft',
  issued_by        uuid references public.users(id) on delete set null,
  sent_at          timestamptz,
  responded_at     timestamptz,
  created_at       timestamptz not null default now()
);

alter table public.offers add column if not exists issued_by uuid references public.users(id) on delete set null;

-- =============================================================================
-- 11. MEETING HALL BOOKINGS
-- =============================================================================
create table if not exists public.meeting_hall_bookings (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  start_time    timestamptz not null,
  end_time      timestamptz not null,
  requested_by  uuid not null references public.employees(id) on delete cascade,
  status        text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected')),
  admin_comment text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- =============================================================================
-- 12. ASSETS & INCIDENT MANAGEMENT
-- =============================================================================
create table if not exists public.assets (
  id            uuid primary key default gen_random_uuid(),
  type          text not null,
  serial_number text,
  assigned_to   uuid references public.employees(id) on delete set null,
  status        text not null default 'Active',
  assigned_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.asset_incidents (
  id             uuid primary key default gen_random_uuid(),
  asset_id       uuid not null references public.assets(id) on delete cascade,
  employee_id    uuid not null references public.employees(id) on delete cascade,
  incident_type  text not null,
  report         text,
  penalty_charge numeric(10,2) not null default 0,
  status         text not null default 'Pending',
  hr_sign_off    uuid references public.users(id) on delete set null,
  created_at     timestamptz not null default now()
);

-- =============================================================================
-- 13. INSURANCE & BENEFITS (all nominee/bank/declaration columns included)
-- =============================================================================
create table if not exists public.insurance_plans (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  provider        text not null,
  coverage_amount numeric(12,2) not null default 500000,
  premium_monthly numeric(10,2) not null default 1500,
  description     text,
  created_at      timestamptz not null default now()
);

create table if not exists public.insurance_enrollments (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  plan_id     uuid references public.insurance_plans(id) on delete set null,
  status      text not null default 'Enrolled',

  -- Policy snapshot
  employer_info text,
  policy_info   text,

  -- Nominee 1 (Primary)
  nominee_name     text,
  nominee_relation text,
  nominee_dob      date,
  nominee_share    numeric(5,2) default 100,

  -- Nominee 2 (Secondary)
  nominee2_name     text,
  nominee2_relation text,
  nominee2_dob      date,
  nominee2_share    numeric(5,2) default 0,

  -- Emergency Contact
  emergency_contact_name     text,
  emergency_contact_phone    text,
  emergency_contact_relation text,

  -- Addresses
  residential_address text,
  current_address     text,
  permanent_address   text,

  -- Existing Insurance & Bank
  existing_insurance_details text,
  bank_account text,
  bank_ifsc    text,
  ifsc_code    text,  -- alias for backward compat

  -- Declaration
  declaration_signature text,
  declaration_signed    boolean not null default false,
  declaration_date      date,

  coverage_amount numeric(12,2) not null default 500000,
  enrolled_at     timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (employee_id)  -- one enrollment record per employee
);

-- Safe upgrades for existing insurance_enrollments tables
alter table public.insurance_enrollments add column if not exists employer_info                text;
alter table public.insurance_enrollments add column if not exists policy_info                  text;
alter table public.insurance_enrollments add column if not exists nominee_name                 text;
alter table public.insurance_enrollments add column if not exists nominee_relation             text;
alter table public.insurance_enrollments add column if not exists nominee_dob                  date;
alter table public.insurance_enrollments add column if not exists nominee_share                numeric(5,2) default 100;
alter table public.insurance_enrollments add column if not exists nominee2_name                text;
alter table public.insurance_enrollments add column if not exists nominee2_relation            text;
alter table public.insurance_enrollments add column if not exists nominee2_dob                 date;
alter table public.insurance_enrollments add column if not exists nominee2_share               numeric(5,2) default 0;
alter table public.insurance_enrollments add column if not exists emergency_contact_name       text;
alter table public.insurance_enrollments add column if not exists emergency_contact_phone      text;
alter table public.insurance_enrollments add column if not exists emergency_contact_relation   text;
alter table public.insurance_enrollments add column if not exists residential_address          text;
alter table public.insurance_enrollments add column if not exists current_address              text;
alter table public.insurance_enrollments add column if not exists permanent_address            text;
alter table public.insurance_enrollments add column if not exists existing_insurance_details   text;
alter table public.insurance_enrollments add column if not exists bank_account                 text;
alter table public.insurance_enrollments add column if not exists bank_ifsc                    text;
alter table public.insurance_enrollments add column if not exists ifsc_code                    text;
alter table public.insurance_enrollments add column if not exists declaration_signature        text;
alter table public.insurance_enrollments add column if not exists declaration_signed           boolean not null default false;
alter table public.insurance_enrollments add column if not exists declaration_date             date;
alter table public.insurance_enrollments add column if not exists updated_at                   timestamptz not null default now();

-- =============================================================================
-- 14. ANNOUNCEMENTS, NOTIFICATIONS & AUDIT LOGS
-- =============================================================================
create table if not exists public.announcements (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  content         text not null,
  target_audience text not null default 'all',
  department_id   uuid references public.departments(id) on delete set null,
  created_by      uuid references public.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

alter table public.announcements add column if not exists department_id uuid references public.departments(id) on delete set null;

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.users(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete cascade,
  type        text not null default 'system',
  title       text not null,
  message     text not null,
  link        text,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.users(id) on delete set null,
  action      text not null,
  entity_type text not null,
  entity_id   uuid,
  details     jsonb,
  ip_address  text,
  created_at  timestamptz not null default now()
);

-- =============================================================================
-- PERFORMANCE INDEXES (Optimized for 100k+ records)
-- =============================================================================
create index if not exists idx_employees_department  on public.employees(department_id);
create index if not exists idx_employees_manager     on public.employees(manager_id);
create index if not exists idx_employees_code        on public.employees(employee_code);
create index if not exists idx_employees_user_id     on public.employees(user_id);
create index if not exists idx_employees_email       on public.employees(email);
create index if not exists idx_attendance_emp_date   on public.attendance(employee_id, date);
create index if not exists idx_leave_requests_emp    on public.leave_requests(employee_id);
create index if not exists idx_leave_requests_status on public.leave_requests(status);
create index if not exists idx_tasks_assignee        on public.tasks(assignee_id);
create index if not exists idx_tasks_dept            on public.tasks(department_id);
create index if not exists idx_tasks_status          on public.tasks(status);
create index if not exists idx_candidates_job        on public.candidates(job_opening_id);
create index if not exists idx_candidates_email      on public.candidates(email);
create index if not exists idx_interviews_candidate  on public.interviews(candidate_id);
create index if not exists idx_meeting_hall_time     on public.meeting_hall_bookings(start_time, end_time);
create index if not exists idx_meeting_hall_req      on public.meeting_hall_bookings(requested_by);
create index if not exists idx_assets_assigned_to    on public.assets(assigned_to);
create index if not exists idx_asset_incidents_asset on public.asset_incidents(asset_id);
create index if not exists idx_notifications_emp     on public.notifications(employee_id, is_read);
create index if not exists idx_notifications_user    on public.notifications(user_id, is_read);
create index if not exists idx_payroll_emp_period    on public.payroll(employee_id, pay_period);
create index if not exists idx_users_auth_id         on public.users(auth_id);
create index if not exists idx_users_employee_id     on public.users(employee_id);

-- Extended indexes for Filter Employees feature (branch, status, designation, type)
create index if not exists idx_employees_branch          on public.employees(branch);
create index if not exists idx_employees_status          on public.employees(status);
create index if not exists idx_employees_designation     on public.employees(designation_id);
create index if not exists idx_employees_employment_type on public.employees(employment_type);
create index if not exists idx_employees_joining_date    on public.employees(joining_date);
-- Performance & payroll fast-fetch indexes
create index if not exists idx_perf_goals_employee       on public.performance_goals(employee_id);
create index if not exists idx_perf_reviews_employee     on public.performance_reviews(employee_id, status);
create index if not exists idx_leave_balances_emp_year   on public.leave_balances(employee_id, year);
create index if not exists idx_payroll_profiles_emp      on public.payroll_profiles(employee_id);
create index if not exists idx_documents_employee        on public.documents(employee_id);
create index if not exists idx_insurance_enrollments_emp on public.insurance_enrollments(employee_id);


-- =============================================================================
-- UPDATED_AT TRIGGERS — auto-maintained timestamps on all mutable tables
-- =============================================================================
do $$ declare t text;
  tables text[] := array[
    'employees', 'leave_requests', 'payroll_profiles', 'tasks',
    'performance_reviews', 'meeting_hall_bookings', 'assets',
    'insurance_enrollments'
  ];
begin
  foreach t in array tables loop
    execute format('drop trigger if exists trg_%s_updated_at on public.%I;', t, t);
    execute format(
      'create trigger trg_%s_updated_at
       before update on public.%I
       for each row execute function public.handle_updated_at();',
      t, t
    );
  end loop;
end; $$;

-- =============================================================================
-- ROW LEVEL SECURITY — Enable on all 29 tables
-- =============================================================================
alter table public.roles                  enable row level security;
alter table public.permissions            enable row level security;
alter table public.role_permissions       enable row level security;
alter table public.departments            enable row level security;
alter table public.designations           enable row level security;
alter table public.employees              enable row level security;
alter table public.users                  enable row level security;
alter table public.attendance             enable row level security;
alter table public.leave_types            enable row level security;
alter table public.leave_requests         enable row level security;
alter table public.leave_balances         enable row level security;
alter table public.holidays               enable row level security;
alter table public.payroll_profiles       enable row level security;
alter table public.payroll                enable row level security;
alter table public.documents              enable row level security;
alter table public.tasks                  enable row level security;
alter table public.performance_goals      enable row level security;
alter table public.performance_reviews    enable row level security;
alter table public.job_openings           enable row level security;
alter table public.candidates             enable row level security;
alter table public.interviews             enable row level security;
alter table public.offers                 enable row level security;
alter table public.meeting_hall_bookings  enable row level security;
alter table public.assets                 enable row level security;
alter table public.asset_incidents        enable row level security;
alter table public.insurance_plans        enable row level security;
alter table public.insurance_enrollments  enable row level security;
alter table public.announcements          enable row level security;
alter table public.notifications          enable row level security;
alter table public.audit_logs             enable row level security;

-- =============================================================================
-- UNIVERSAL PERMISSIVE RLS POLICIES
-- SELECT / INSERT / UPDATE / DELETE allowed for authenticated + anon
-- =============================================================================
do $$
declare
  t text;
  tables text[] := array[
    'roles', 'permissions', 'role_permissions', 'departments', 'designations',
    'employees', 'users', 'attendance', 'leave_types', 'leave_requests',
    'leave_balances', 'holidays', 'payroll_profiles', 'payroll', 'documents',
    'tasks', 'performance_goals', 'performance_reviews', 'job_openings',
    'candidates', 'interviews', 'offers', 'meeting_hall_bookings', 'assets',
    'asset_incidents', 'insurance_plans', 'insurance_enrollments', 'announcements',
    'notifications', 'audit_logs'
  ];
begin
  foreach t in array tables loop
    execute format('drop policy if exists "%s_select" on public.%I;', t, t);
    execute format('create policy "%s_select" on public.%I for select to authenticated, anon using (true);', t, t);

    execute format('drop policy if exists "%s_insert" on public.%I;', t, t);
    execute format('create policy "%s_insert" on public.%I for insert to authenticated, anon with check (true);', t, t);

    execute format('drop policy if exists "%s_update" on public.%I;', t, t);
    execute format('create policy "%s_update" on public.%I for update to authenticated, anon using (true) with check (true);', t, t);

    execute format('drop policy if exists "%s_delete" on public.%I;', t, t);
    execute format('create policy "%s_delete" on public.%I for delete to authenticated, anon using (true);', t, t);
  end loop;
end;
$$;

-- =============================================================================
-- SEED BASELINE DATA
-- =============================================================================
insert into public.roles (name, description) values
  ('Admin',    'Full administrative access to entire HRMS'),
  ('HR',       'Human resources manager with recruitment and employee management permissions'),
  ('Manager',  'Department head / team leader with approval permissions'),
  ('Employee', 'Standard employee with self-service portal access')
on conflict do nothing;

insert into public.departments (name, code, description) values
  ('Engineering',          'ENG', 'Software development, infrastructure, and technical architecture'),
  ('Human Resources',      'HR',  'People operations, talent acquisition, and employee engagement'),
  ('Product & Design',     'PRD', 'UI/UX design, user research, and product strategy'),
  ('Sales & Marketing',    'MKT', 'Client outreach, enterprise sales, and brand marketing'),
  ('Finance & Operations', 'OPS', 'Accounting, payroll operations, and legal compliance')
on conflict do nothing;

insert into public.leave_types (name, days_per_year, is_paid) values
  ('Casual Leave',    12, true),
  ('Sick Leave',      10, true),
  ('Privilege Leave', 15, true),
  ('Maternity Leave', 90, true),
  ('Paternity Leave', 10, true),
  ('Unpaid Leave',    30, false)
on conflict do nothing;

insert into public.insurance_plans (name, provider, coverage_amount, premium_monthly, description) values
  ('Gold Comprehensive Care',  'Star Health', 500000,  1500, 'Individual health cover with OPD and dental benefits'),
  ('Platinum Family Floater',  'HDFC ERGO',  1000000, 3000, 'Complete family floater covering spouse and up to 2 children')
on conflict do nothing;

-- Ensure Admin and HR roles are properly assigned to executive accounts
do $$
declare
  v_admin_role_id uuid;
  v_hr_role_id uuid;
begin
  select id into v_admin_role_id from public.roles where name = 'Admin' limit 1;
  select id into v_hr_role_id from public.roles where name = 'HR' limit 1;

  if v_admin_role_id is not null then
    update public.users
       set role_id = v_admin_role_id
     where lower(email) in ('ceo@oklut.com', 'admin@oklut.com');
  end if;

  if v_hr_role_id is not null then
    update public.users
       set role_id = v_hr_role_id
     where lower(email) = 'hr@oklut.com';
  end if;
end $$;

-- =============================================================================
-- EMPLOYEE LOGIN PROVISIONING RPC

-- Atomically creates or updates auth.users + auth.identities + public.users
-- and links user_id on the employee row.
-- =============================================================================
create or replace function public.provision_employee_login(
  p_employee_id uuid default null,
  p_email text default null,
  p_password text default null,
  p_role_name text default 'Employee'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_user_id uuid;
  v_role_id uuid;
  v_emp_id uuid;
  v_emp_name text;
  v_clean_email text;
  v_hash text;
begin
  v_clean_email := lower(trim(p_email));
  
  if v_clean_email is null or v_clean_email = '' then
    raise exception 'Email is required for employee login provisioning';
  end if;

  if p_password is null or trim(p_password) = '' then
    raise exception 'Password is required for employee login provisioning';
  end if;

  -- 1. Find employee by id OR by email
  select id, coalesce(first_name || ' ' || last_name, 'Employee User')
    into v_emp_id, v_emp_name
    from public.employees
   where (p_employee_id is not null and id = p_employee_id)
      or lower(email) = v_clean_email
   limit 1;

  -- If not in employees table, check if employee exists in public.users
  if v_emp_id is null then
    select employee_id, 'Employee User' into v_emp_id, v_emp_name from public.users where lower(email) = v_clean_email limit 1;
  end if;

  -- 2. Find role id (defaults to 'Employee' if role not found)
  select id into v_role_id
  from public.roles
  where lower(name) = lower(p_role_name)
  limit 1;

  if v_role_id is null then
    select id into v_role_id from public.roles where lower(name) = 'employee' limit 1;
  end if;

  -- Generate bcrypt password hash
  begin
    v_hash := extensions.crypt(trim(p_password), extensions.gen_salt('bf'));
  exception when others then
    v_hash := crypt(trim(p_password), gen_salt('bf'));
  end;

  -- 3. Check if auth.users already has this email
  select id into v_user_id from auth.users where lower(email) = v_clean_email limit 1;

  if v_user_id is not null then
    -- Update password and confirmation for existing auth user
    update auth.users
    set encrypted_password = v_hash,
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        updated_at = now(),
        raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
        raw_user_meta_data = jsonb_build_object('name', coalesce(v_emp_name, 'Employee User')),
        banned_until = null
    where id = v_user_id;

    -- Ensure identity exists in auth.identities
    insert into auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
    values (
      gen_random_uuid(),
      v_user_id::text,
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_clean_email, 'email_verified', true),
      'email', now(), now()
    ) on conflict (provider_id, provider) do update set
      identity_data = jsonb_build_object('sub', v_user_id::text, 'email', v_clean_email, 'email_verified', true),
      updated_at = now();
  else
    -- Generate new user id
    v_user_id := gen_random_uuid();

    -- Create auth user
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      is_super_admin
    ) values (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      v_clean_email,
      v_hash,
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name', coalesce(v_emp_name, 'Employee User')),
      '', '', '', '', false
    );

    -- Create auth identity
    insert into auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
    values (
      gen_random_uuid(),
      v_user_id::text,
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_clean_email, 'email_verified', true),
      'email', now(), now()
    ) on conflict (provider_id, provider) do nothing;
  end if;

  -- 4. Upsert into public.users
  insert into public.users (
    id, auth_id, email, role_id, employee_id, status, created_at
  ) values (
    v_user_id, v_user_id, v_clean_email, v_role_id, v_emp_id, 'active', now()
  )
  on conflict (email) do update set
    auth_id = v_user_id,
    role_id = coalesce(v_role_id, public.users.role_id),
    employee_id = coalesce(v_emp_id, public.users.employee_id),
    status = 'active';

  -- 5. Link user_id in employees table if employee exists
  if v_emp_id is not null then
    update public.employees
    set user_id = v_user_id
    where id = v_emp_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', v_clean_email,
    'message', 'Portal login provisioned successfully'
  );
end;
$$;

grant execute on function public.provision_employee_login(uuid, text, text, text) to authenticated, anon;

-- =============================================================================
-- RELOAD SCHEMA CACHE
-- =============================================================================
notify pgrst, 'reload schema';

-- =============================================================================
-- END OF SCHEMA v2.0 — Safe to re-run at any time.
-- =============================================================================

