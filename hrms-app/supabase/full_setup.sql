-- ================================================================================
-- Oklut HRMS - FULL SETUP (run this ENTIRE file once in the SQL Editor)
-- Combines: 0001_schema.sql + 0002_seed.sql + 0003_storage.sql
-- Creates all tables, triggers, RLS policies, storage bucket, and seed data.
-- ================================================================================

-- ============================================================================
-- Oklut HRMS - Schema Migration
-- Apply with: Supabase Dashboard -> SQL Editor (or supabase db push)
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Roles & Permissions
-- ---------------------------------------------------------------------------
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  module text not null,
  description text
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

-- ---------------------------------------------------------------------------
-- Departments & Designations
-- ---------------------------------------------------------------------------
create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text unique,
  description text,
  head_id uuid,
  created_at timestamptz not null default now()
);

create table public.designations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  department_id uuid references public.departments(id) on delete set null,
  level int not null default 1,
  created_at timestamptz not null default now(),
  unique (name, department_id)
);

-- ---------------------------------------------------------------------------
-- Users (profiles) & Employees
-- ---------------------------------------------------------------------------
create table public.employees (
  id uuid primary key default gen_random_uuid(),
  employee_code text unique,
  user_id uuid unique references auth.users(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email text not null unique,
  phone text,
  gender text,
  date_of_birth date,
  address text,
  city text,
  state text,
  country text,
  postal_code text,
  marital_status text,
  blood_group text,
  joining_date date not null default current_date,
  employment_type text not null default 'Full-time',
  department_id uuid references public.departments(id) on delete set null,
  designation_id uuid references public.designations(id) on delete set null,
  manager_id uuid references public.employees(id) on delete set null,
  status text not null default 'Active',
  profile_picture_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role_id uuid not null references public.roles(id),
  employee_id uuid references public.employees(id) on delete set null,
  status text not null default 'Active',
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.departments
  add constraint departments_head_fk foreign key (head_id) references public.employees(id) on delete set null;

-- ---------------------------------------------------------------------------
-- Helper functions (defined after tables they reference exist)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select exists (
    select 1 from public.users u
    join public.roles r on r.id = u.role_id
    where u.id = auth.uid() and r.name = 'Admin'
  );
$$;

create or replace function public.is_manager()
returns boolean language sql stable as $$
  select exists (
    select 1 from public.users u
    join public.roles r on r.id = u.role_id
    where u.id = auth.uid() and r.name in ('Admin','Manager','HR')
  );
$$;

create or replace function public.current_employee_id()
returns uuid language sql stable as $$
  select employee_id from public.users where id = auth.uid();
$$;

create or replace function public.has_permission(p_name text)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.users u
    join public.role_permissions rp on rp.role_id = u.role_id
    join public.permissions perm on perm.id = rp.permission_id
    where u.id = auth.uid() and perm.name = p_name
  );
$$;

-- ---------------------------------------------------------------------------
-- Attendance
-- ---------------------------------------------------------------------------
create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  date date not null default current_date,
  check_in timestamptz,
  check_out timestamptz,
  break_in timestamptz,
  break_out timestamptz,
  working_hours numeric(6,2) default 0,
  overtime_hours numeric(6,2) default 0,
  status text not null default 'present',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, date)
);

-- ---------------------------------------------------------------------------
-- Leave
-- ---------------------------------------------------------------------------
create table public.leave_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  days_per_year numeric(6,1) not null default 12,
  is_paid boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  leave_type_id uuid not null references public.leave_types(id),
  start_date date not null,
  end_date date not null,
  days numeric(6,1) not null,
  reason text,
  status text not null default 'pending', -- pending | approved | rejected | cancelled
  admin_comment text,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  applied_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.leave_balances (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  leave_type_id uuid not null references public.leave_types(id),
  year int not null,
  allocated numeric(6,1) not null default 0,
  used numeric(6,1) not null default 0,
  created_at timestamptz not null default now(),
  unique (employee_id, leave_type_id, year)
);

-- ---------------------------------------------------------------------------
-- Payroll
-- ---------------------------------------------------------------------------
create table public.payroll_profiles (
  employee_id uuid primary key references public.employees(id) on delete cascade,
  basic_salary numeric(12,2) not null default 0,
  hra numeric(12,2) not null default 0,
  allowances numeric(12,2) not null default 0,
  bonus numeric(12,2) not null default 0,
  pf_percent numeric(5,2) not null default 12,
  tax_percent numeric(5,2) not null default 5,
  bank_name text,
  bank_account text,
  ifsc_code text,
  updated_at timestamptz not null default now()
);

create table public.payroll (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  pay_period text not null, -- e.g. '2026-07'
  basic_salary numeric(12,2) not null default 0,
  hra numeric(12,2) not null default 0,
  allowances numeric(12,2) not null default 0,
  bonus numeric(12,2) not null default 0,
  deductions numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  provident_fund numeric(12,2) not null default 0,
  present_days int not null default 0,
  total_days int not null default 0,
  net_salary numeric(12,2) not null default 0,
  status text not null default 'draft', -- draft | generated | paid
  generated_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (employee_id, pay_period)
);

-- ---------------------------------------------------------------------------
-- Documents
-- ---------------------------------------------------------------------------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  name text not null,
  doc_type text not null, -- resume | pan | aadhar | passport | certificates | offer_letter | experience_letter | payslip | other
  file_url text,
  file_size int,
  uploaded_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  assignee_id uuid references public.employees(id) on delete cascade,
  assigner_id uuid references public.employees(id) on delete set null,
  due_date date,
  priority text not null default 'medium', -- low | medium | high
  status text not null default 'todo', -- todo | in_progress | done | blocked
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Announcements
-- ---------------------------------------------------------------------------
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  audience text not null default 'all', -- all | department | employee
  department_id uuid references public.departments(id) on delete set null,
  author_id uuid references public.users(id) on delete set null,
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete cascade,
  type text not null default 'info',
  title text not null,
  message text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Holidays
-- ---------------------------------------------------------------------------
create table public.holidays (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date date not null,
  is_optional boolean not null default false,
  created_at timestamptz not null default now(),
  unique (name, date)
);

-- ---------------------------------------------------------------------------
-- Performance
-- ---------------------------------------------------------------------------
create table public.performance_goals (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  reviewer_id uuid references public.users(id) on delete set null,
  title text not null,
  description text,
  target text,
  due_date date,
  status text not null default 'pending', -- pending | in_progress | achieved | missed
  created_at timestamptz not null default now()
);

create table public.performance_reviews (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  reviewer_id uuid references public.users(id) on delete set null,
  period text not null, -- e.g. '2026-Q1'
  goals text,
  strengths text,
  improvements text,
  rating numeric(3,1),
  comments text,
  status text not null default 'draft', -- draft | submitted | acknowledged
  review_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Recruitment
-- ---------------------------------------------------------------------------
create table public.job_openings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  department_id uuid references public.departments(id) on delete set null,
  location text,
  openings_count int not null default 1,
  description text,
  requirements text,
  employment_type text not null default 'Full-time',
  status text not null default 'Open', -- Open | Closed
  published boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  job_opening_id uuid references public.job_openings(id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  resume_url text,
  cover_letter text,
  status text not null default 'applied', -- applied | screening | interview | offer | selected | rejected | hired
  source text,
  converted_employee_id uuid references public.employees(id) on delete set null,
  applied_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.interviews (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  job_opening_id uuid references public.job_openings(id) on delete set null,
  interviewer_id uuid references public.employees(id) on delete set null,
  round text not null default 'Technical',
  scheduled_at timestamptz not null,
  mode text not null default 'online',
  meeting_link text,
  status text not null default 'scheduled', -- scheduled | completed | cancelled
  feedback text,
  rating numeric(3,1),
  created_at timestamptz not null default now()
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  job_opening_id uuid references public.job_openings(id) on delete set null,
  offer_letter_url text,
  salary_offered numeric(12,2),
  joining_date date,
  status text not null default 'draft', -- draft | sent | accepted | rejected
  issued_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Audit logs
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_employees_department on public.employees(department_id);
create index if not exists idx_attendance_employee_date on public.attendance(employee_id, date);
create index if not exists idx_leave_employee on public.leave_requests(employee_id, status);
create index if not exists idx_payroll_period on public.payroll(pay_period);
create index if not exists idx_notifications_user on public.notifications(user_id, is_read);
create index if not exists idx_tasks_assignee on public.tasks(assignee_id, status);
create index if not exists idx_audit_user on public.audit_logs(user_id);

-- ============================================================================
-- Triggers
-- ============================================================================

-- new employee -> leave balances + payroll profile + welcome notification
create or replace function public.handle_new_employee()
returns trigger language plpgsql security definer as $$
begin
  -- Payroll profile: idempotent - safe to re-run
  insert into public.payroll_profiles (employee_id)
  values (new.id)
  on conflict (employee_id) do nothing;

  -- Leave balances: idempotent - safe to re-run
  insert into public.leave_balances (employee_id, leave_type_id, year, allocated)
  select new.id, lt.id, extract(year from coalesce(new.joining_date, current_date))::int, lt.days_per_year
  from public.leave_types lt
  on conflict (employee_id, leave_type_id, year) do nothing;

  -- Welcome notification: only if user row already exists in public.users (FK safety)
  if new.user_id is not null and exists (select 1 from public.users where id = new.user_id) then
    insert into public.notifications (user_id, employee_id, type, title, message, link)
    values (new.user_id, new.id, 'success', 'Welcome to Oklut!',
            'Your employee profile, leave balance and payroll profile have been created.',
            '/employees/' || new.id);
  end if;

  -- Notify all admins about new employee
  insert into public.notifications (user_id, employee_id, type, title, message, link)
  select u.id, new.id, 'info', 'New employee joined',
         new.first_name || ' ' || new.last_name || ' has been onboarded.', '/employees/' || new.id
  from public.users u join public.roles r on r.id = u.role_id where r.name = 'Admin';

  return new;
end; $$;

create trigger trg_employee_created
  after insert on public.employees
  for each row execute function public.handle_new_employee();

-- leave approved -> reduce balance + notify
create or replace function public.handle_leave_approved()
returns trigger language plpgsql security definer as $$
declare v_lt_is_paid boolean;
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    update public.leave_balances
       set used = used + new.days
     where employee_id = new.employee_id
       and leave_type_id = new.leave_type_id
       and year = extract(year from new.start_date)::int;

    insert into public.notifications (user_id, employee_id, type, title, message, link)
    select u.id, new.employee_id, 'success', 'Leave Approved',
           'Your leave request (' || coalesce(new.days,0) || ' day(s)) has been approved.', '/leave'
    from public.users u where u.employee_id = new.employee_id;
  end if;

  if new.status = 'rejected' and old.status is distinct from 'rejected' then
    insert into public.notifications (user_id, employee_id, type, title, message, link)
    select u.id, new.employee_id, 'error', 'Leave Rejected',
           'Your leave request (' || coalesce(new.days,0) || ' day(s)) was rejected.', '/leave'
    from public.users u where u.employee_id = new.employee_id;
  end if;

  return new;
end; $$;

create trigger trg_leave_status_changed
  after insert or update on public.leave_requests
  for each row execute function public.handle_leave_approved();

-- notification on new tasks
create or replace function public.handle_new_task()
returns trigger language plpgsql security definer as $$
begin
  if new.assignee_id is not null then
    insert into public.notifications (user_id, employee_id, type, title, message, link)
    select u.id, new.assignee_id, 'info', 'New Task Assigned',
           new.title, '/tasks'
    from public.users u where u.employee_id = new.assignee_id;
  end if;
  return new;
end; $$;

create trigger trg_task_created
  after insert on public.tasks
  for each row execute function public.handle_new_task();

-- notification on announcements
create or replace function public.handle_new_announcement()
returns trigger language plpgsql security definer as $$
begin
  if new.audience = 'all' then
    insert into public.notifications (user_id, employee_id, type, title, message, link)
    select u.id, u.employee_id, 'info', 'Announcement: ' || new.title, left(new.content, 160), '/announcements'
    from public.users u where u.status = 'Active';
  end if;
  return new;
end; $$;

create trigger trg_announcement_created
  after insert on public.announcements
  for each row execute function public.handle_new_announcement();

-- audit trigger helper for payroll generation
create or replace function public.write_audit_log(p_user uuid, p_action text, p_entity text, p_entity_id text, p_details jsonb default null)
returns void language plpgsql security definer as $$
begin
  insert into public.audit_logs (user_id, action, entity_type, entity_id, details)
  values (p_user, p_action, p_entity, p_entity_id, p_details);
end; $$;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.departments enable row level security;
alter table public.designations enable row level security;
alter table public.users enable row level security;
alter table public.employees enable row level security;
alter table public.attendance enable row level security;
alter table public.leave_types enable row level security;
alter table public.leave_requests enable row level security;
alter table public.leave_balances enable row level security;
alter table public.payroll_profiles enable row level security;
alter table public.payroll enable row level security;
alter table public.documents enable row level security;
alter table public.tasks enable row level security;
alter table public.announcements enable row level security;
alter table public.notifications enable row level security;
alter table public.holidays enable row level security;
alter table public.performance_goals enable row level security;
alter table public.performance_reviews enable row level security;
alter table public.job_openings enable row level security;
alter table public.candidates enable row level security;
alter table public.interviews enable row level security;
alter table public.offers enable row level security;
alter table public.audit_logs enable row level security;

-- Reference tables: readable by any authenticated user
create policy "roles read" on public.roles for select to authenticated using (true);
create policy "permissions read" on public.permissions for select to authenticated using (true);
create policy "role_permissions read" on public.role_permissions for select to authenticated using (true);
create policy "leave_types read" on public.leave_types for select to authenticated using (true);
create policy "leave_types write admin" on public.leave_types for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "holidays read" on public.holidays for select to authenticated using (true);
create policy "holidays write admin" on public.holidays for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Users: own row or admin
create policy "users read own or admin" on public.users
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "users insert admin" on public.users
  for insert to authenticated with check (public.is_admin() or id = auth.uid());
create policy "users update own or admin" on public.users
  for update to authenticated using (id = auth.uid() or public.is_admin());

-- Employees
create policy "employees read admin" on public.employees
  for select to authenticated using (public.is_manager() or user_id = auth.uid());
create policy "employees insert admin" on public.employees
  for insert to authenticated with check (public.is_admin());
create policy "employees update admin" on public.employees
  for update to authenticated using (public.is_admin());
create policy "employees delete admin" on public.employees
  for delete to authenticated using (public.is_admin());

-- Departments / Designations
create policy "dept read" on public.departments for select to authenticated using (true);
create policy "dept admin write" on public.departments for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "desig read" on public.designations for select to authenticated using (true);
create policy "desig admin write" on public.designations for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Attendance
create policy "attendance read own or admin" on public.attendance
  for select to authenticated using (employee_id = public.current_employee_id() or public.is_manager());
create policy "attendance insert own or admin" on public.attendance
  for insert to authenticated with check (employee_id = public.current_employee_id() or public.is_admin());
create policy "attendance update own or admin" on public.attendance
  for update to authenticated using (employee_id = public.current_employee_id() or public.is_admin());

-- Leave
create policy "leave_requests read own or admin" on public.leave_requests
  for select to authenticated using (employee_id = public.current_employee_id() or public.is_manager());
create policy "leave_requests insert own" on public.leave_requests
  for insert to authenticated with check (employee_id = public.current_employee_id() or public.is_admin());
create policy "leave_requests update admin" on public.leave_requests
  for update to authenticated using (public.is_manager());
create policy "leave_balances read own or admin" on public.leave_balances
  for select to authenticated using (employee_id = public.current_employee_id() or public.is_manager());
create policy "leave_balances write admin" on public.leave_balances
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Payroll
create policy "payroll_profiles read own or admin" on public.payroll_profiles
  for select to authenticated using (employee_id = public.current_employee_id() or public.is_admin());
create policy "payroll_profiles write admin" on public.payroll_profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "payroll read own or admin" on public.payroll
  for select to authenticated using (employee_id = public.current_employee_id() or public.is_admin());
create policy "payroll write admin" on public.payroll
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Documents
create policy "documents read own or admin" on public.documents
  for select to authenticated using (employee_id = public.current_employee_id() or public.is_admin());
create policy "documents insert own or admin" on public.documents
  for insert to authenticated with check (employee_id = public.current_employee_id() or public.is_admin());
create policy "documents delete own or admin" on public.documents
  for delete to authenticated using (employee_id = public.current_employee_id() or public.is_admin());

-- Tasks
create policy "tasks read" on public.tasks
  for select to authenticated using (assignee_id = public.current_employee_id() or public.is_manager() or assigner_id = public.current_employee_id() or assignee_id is null);
create policy "tasks insert authenticated" on public.tasks
  for insert to authenticated with check (true);
create policy "tasks update" on public.tasks
  for update to authenticated using (assignee_id = public.current_employee_id() or assigner_id = public.current_employee_id() or public.is_manager());
create policy "tasks delete" on public.tasks
  for delete to authenticated using (assigner_id = public.current_employee_id() or public.is_manager());

-- Announcements
create policy "announcements read" on public.announcements for select to authenticated using (true);
create policy "announcements write admin" on public.announcements for all to authenticated using (public.is_manager()) with check (public.is_manager());

-- Notifications
create policy "notifications read own" on public.notifications
  for select to authenticated using (user_id = auth.uid() or employee_id = public.current_employee_id());
create policy "notifications insert" on public.notifications
  for insert to authenticated with check (true);
create policy "notifications update own" on public.notifications
  for update to authenticated using (user_id = auth.uid() or employee_id = public.current_employee_id());
create policy "notifications delete own" on public.notifications
  for delete to authenticated using (user_id = auth.uid() or employee_id = public.current_employee_id());

-- Performance
create policy "performance read own or admin" on public.performance_goals
  for select to authenticated using (employee_id = public.current_employee_id() or public.is_manager());
create policy "performance write admin" on public.performance_goals
  for all to authenticated using (public.is_manager()) with check (public.is_manager());
create policy "reviews read own or admin" on public.performance_reviews
  for select to authenticated using (employee_id = public.current_employee_id() or public.is_manager());
create policy "reviews write admin" on public.performance_reviews
  for all to authenticated using (public.is_manager()) with check (public.is_manager());

-- Recruitment
create policy "job_openings read" on public.job_openings for select to public using (true);
create policy "job_openings write admin" on public.job_openings for all to authenticated using (public.is_manager()) with check (public.is_manager());

create policy "candidates insert public" on public.candidates for insert to public with check (true);
create policy "candidates read public" on public.candidates for select to public using (true);
create policy "candidates write admin" on public.candidates for all to authenticated using (public.is_manager()) with check (public.is_manager());

create policy "interviews read public" on public.interviews for select to public using (true);
create policy "interviews write admin" on public.interviews for all to authenticated using (public.is_manager()) with check (public.is_manager());

create policy "offers read public" on public.offers for select to public using (true);
create policy "offers update public" on public.offers for update to public using (true) with check (true);
create policy "offers write admin" on public.offers for all to authenticated using (public.is_manager()) with check (public.is_manager());

-- Audit logs
create policy "audit read admin" on public.audit_logs for select to authenticated using (public.is_admin());
create policy "audit insert" on public.audit_logs for insert to authenticated with check (true);


-- ================================================================================
-- PART 2: SEED DATA (0002_seed.sql)
-- ================================================================================

-- ============================================================================
-- Oklut HRMS - Seed Migration
-- Admin login: ceo@oklut.com / 1234
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------------
insert into public.roles (id, name, description) values
  ('00000000-0000-4000-8000-0000000000a1', 'Admin', 'Full system administrator'),
  ('00000000-0000-4000-8000-0000000000a2', 'HR', 'Human resource management'),
  ('00000000-0000-4000-8000-0000000000a3', 'Manager', 'Department manager'),
  ('00000000-0000-4000-8000-0000000000a4', 'Employee', 'Regular employee')
on conflict (id) do update set name = excluded.name, description = excluded.description;

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------
insert into public.permissions (name, module, description) values
  ('dashboard.view', 'Dashboard', 'View dashboards'),
  ('employees.read', 'Employees', 'View employees'),
  ('employees.write', 'Employees', 'Create/update employees'),
  ('employees.delete', 'Employees', 'Delete employees'),
  ('departments.read', 'Departments', 'View departments'),
  ('departments.write', 'Departments', 'Manage departments'),
  ('designations.read', 'Designations', 'View designations'),
  ('designations.write', 'Designations', 'Manage designations'),
  ('attendance.read', 'Attendance', 'View attendance'),
  ('attendance.write', 'Attendance', 'Mark attendance'),
  ('attendance.manage', 'Attendance', 'Manage attendance for others'),
  ('leave.read', 'Leave', 'View leave'),
  ('leave.apply', 'Leave', 'Apply for leave'),
  ('leave.approve', 'Leave', 'Approve/reject leave'),
  ('payroll.read', 'Payroll', 'View payroll'),
  ('payroll.generate', 'Payroll', 'Generate payroll'),
  ('documents.read', 'Documents', 'View documents'),
  ('documents.upload', 'Documents', 'Upload documents'),
  ('tasks.read', 'Tasks', 'View tasks'),
  ('tasks.manage', 'Tasks', 'Assign/manage tasks'),
  ('announcements.read', 'Announcements', 'View announcements'),
  ('announcements.write', 'Announcements', 'Publish announcements'),
  ('holidays.read', 'Holidays', 'View holidays'),
  ('holidays.write', 'Holidays', 'Manage holidays'),
  ('performance.read', 'Performance', 'View performance'),
  ('performance.manage', 'Performance', 'Manage reviews and goals'),
  ('recruitment.read', 'Recruitment', 'View recruitment'),
  ('recruitment.write', 'Recruitment', 'Manage recruitment'),
  ('reports.read', 'Reports', 'View and export reports'),
  ('notifications.read', 'Notifications', 'View notifications'),
  ('audit.read', 'Audit', 'View audit logs')
on conflict (name) do update set module = excluded.module, description = excluded.description;

-- Admin: all permissions
insert into public.role_permissions (role_id, permission_id)
select '00000000-0000-4000-8000-0000000000a1', id from public.permissions
on conflict (role_id, permission_id) do nothing;

-- HR
insert into public.role_permissions (role_id, permission_id)
select '00000000-0000-4000-8000-0000000000a2', id from public.permissions
where name not in ('audit.read')
on conflict (role_id, permission_id) do nothing;

-- Manager
insert into public.role_permissions (role_id, permission_id)
select '00000000-0000-4000-8000-0000000000a3', id from public.permissions
where name in ('dashboard.view','employees.read','attendance.read','attendance.manage','leave.read','leave.approve','payroll.read','tasks.read','tasks.manage','performance.read','performance.manage','reports.read','announcements.read','holidays.read','documents.read','notifications.read')
on conflict (role_id, permission_id) do nothing;

-- Employee
insert into public.role_permissions (role_id, permission_id)
select '00000000-0000-4000-8000-0000000000a4', id from public.permissions
where name in ('dashboard.view','attendance.read','attendance.write','leave.read','leave.apply','documents.read','documents.upload','tasks.read','announcements.read','holidays.read','performance.read','notifications.read')
on conflict (role_id, permission_id) do nothing;

-- ---------------------------------------------------------------------------
-- Admin auth user (ceo@oklut.com / 1234)
-- ---------------------------------------------------------------------------
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values (
  '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'ceo@oklut.com', crypt('1234', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"System Admin","role":"Admin"}'
) on conflict (id) do nothing;

insert into public.users (id, email, role_id, status)
values ('00000000-0000-0000-0000-000000000001', 'ceo@oklut.com',
        '00000000-0000-4000-8000-0000000000a1', 'Active')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Departments
-- ---------------------------------------------------------------------------
insert into public.departments (id, name, code, description) values
  ('00000000-0000-4000-8000-0000000000d1', 'IT', 'IT', 'Information Technology'),
  ('00000000-0000-4000-8000-0000000000d2', 'HR', 'HR', 'Human Resources'),
  ('00000000-0000-4000-8000-0000000000d3', 'Design', 'DES', 'Design & Creative'),
  ('00000000-0000-4000-8000-0000000000d4', 'Finance', 'FIN', 'Finance & Accounts'),
  ('00000000-0000-4000-8000-0000000000d5', 'Marketing', 'MKT', 'Marketing & Sales')
on conflict (id) do update set name = excluded.name, code = excluded.code, description = excluded.description;

-- ---------------------------------------------------------------------------
-- Designations
-- ---------------------------------------------------------------------------
insert into public.designations (id, name, department_id, level) values
  ('00000000-0000-4000-8000-0000000000e1', 'Software Engineer', '00000000-0000-4000-8000-0000000000d1', 3),
  ('00000000-0000-4000-8000-0000000000e2', 'Senior Software Engineer', '00000000-0000-4000-8000-0000000000d1', 4),
  ('00000000-0000-4000-8000-0000000000e3', 'Engineering Manager', '00000000-0000-4000-8000-0000000000d1', 5),
  ('00000000-0000-4000-8000-0000000000e4', 'HR Executive', '00000000-0000-4000-8000-0000000000d2', 3),
  ('00000000-0000-4000-8000-0000000000e5', 'HR Manager', '00000000-0000-4000-8000-0000000000d2', 5),
  ('00000000-0000-4000-8000-0000000000e6', 'UI Designer', '00000000-0000-4000-8000-0000000000d3', 3),
  ('00000000-0000-4000-8000-0000000000e7', 'Accountant', '00000000-0000-4000-8000-0000000000d4', 3),
  ('00000000-0000-4000-8000-0000000000e8', 'Marketing Lead', '00000000-0000-4000-8000-0000000000d5', 5)
on conflict (id) do update set name = excluded.name, level = excluded.level;

-- ---------------------------------------------------------------------------
-- Leave types
-- ---------------------------------------------------------------------------
insert into public.leave_types (id, name, days_per_year, is_paid) values
  ('00000000-0000-4000-8000-0000000000f1', 'Casual Leave', 12, true),
  ('00000000-0000-4000-8000-0000000000f2', 'Sick Leave', 12, true),
  ('00000000-0000-4000-8000-0000000000f3', 'Earned Leave', 15, true),
  ('00000000-0000-4000-8000-0000000000f4', 'Unpaid Leave', 0, false)
on conflict (id) do update set name = excluded.name, days_per_year = excluded.days_per_year, is_paid = excluded.is_paid;

-- ---------------------------------------------------------------------------
-- Holidays
-- ---------------------------------------------------------------------------
insert into public.holidays (name, date, is_optional) values
  ('Republic Day', '2026-01-26', false),
  ('Holi', '2026-03-04', false),
  ('Independence Day', '2026-08-15', false),
  ('Diwali', '2026-11-08', false),
  ('Christmas', '2026-12-25', false)
on conflict (name, date) do nothing;

-- ---------------------------------------------------------------------------
-- Demo employees (delete these in production if desired)
-- ---------------------------------------------------------------------------
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'hr@oklut.com', crypt('1234', gen_salt('bf')),
   now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Aarav Patel"}'),
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'employee@oklut.com', crypt('1234', gen_salt('bf')),
   now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Meera Sharma"}'),
  ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'designer@oklut.com', crypt('1234', gen_salt('bf')),
   now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Rohan Iyer"}')
on conflict (id) do nothing;

insert into public.employees (
  id, employee_code, user_id, first_name, last_name, email, phone, gender, date_of_birth,
  city, state, joining_date, employment_type, department_id, designation_id, status
) values
  ('00000000-0000-0000-0000-000000000010', 'EMP-0001', '00000000-0000-0000-0000-000000000010',
   'Aarav', 'Patel', 'hr@oklut.com', '+91 98450 10001', 'Male', '1992-04-12',
   'Hyderabad', 'Telangana', '2023-06-01', 'Full-time',
   '00000000-0000-4000-8000-0000000000d2', '00000000-0000-4000-8000-0000000000e5', 'Active'),
  ('00000000-0000-0000-0000-000000000020', 'EMP-0002', '00000000-0000-0000-0000-000000000020',
   'Meera', 'Sharma', 'employee@oklut.com', '+91 98450 10002', 'Female', '1995-08-04',
   'Hyderabad', 'Telangana', '2024-02-15', 'Full-time',
   '00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000e1', 'Active'),
  ('00000000-0000-0000-0000-000000000030', 'EMP-0003', '00000000-0000-0000-0000-000000000030',
   'Rohan', 'Iyer', 'designer@oklut.com', '+91 98450 10003', 'Male', '1990-12-19',
   'Bangalore', 'Karnataka', '2025-10-01', 'Full-time',
   '00000000-0000-4000-8000-0000000000d3', '00000000-0000-4000-8000-0000000000e6', 'Active')
on conflict (id) do nothing;

-- payroll profiles for seeded employees
-- Use DO UPDATE so salary data is applied even if the trigger already created the empty row
insert into public.payroll_profiles (employee_id, basic_salary, hra, allowances, bonus, pf_percent, tax_percent, bank_name, bank_account, ifsc_code) values
  ('00000000-0000-0000-0000-000000000010', 80000, 32000, 12000, 10000, 12, 5, 'HDFC Bank', '5021001XXXX', 'HDFC0001234'),
  ('00000000-0000-0000-0000-000000000020', 60000, 24000, 10000, 8000, 12, 5, 'ICICI Bank', '6022002XXXX', 'ICIC0005678'),
  ('00000000-0000-0000-0000-000000000030', 55000, 22000, 9000, 6000, 12, 5, 'SBI Bank', '1023003XXXX', 'SBIN0009012')
on conflict (employee_id) do update set
  basic_salary = excluded.basic_salary,
  hra = excluded.hra,
  allowances = excluded.allowances,
  bonus = excluded.bonus,
  pf_percent = excluded.pf_percent,
  tax_percent = excluded.tax_percent,
  bank_name = excluded.bank_name,
  bank_account = excluded.bank_account,
  ifsc_code = excluded.ifsc_code,
  updated_at = now();

-- users profiles for demo employees
insert into public.users (id, email, role_id, employee_id, status) values
  ('00000000-0000-0000-0000-000000000010', 'hr@oklut.com', '00000000-0000-4000-8000-0000000000a2', '00000000-0000-0000-0000-000000000010', 'Active'),
  ('00000000-0000-0000-0000-000000000020', 'employee@oklut.com', '00000000-0000-4000-8000-0000000000a4', '00000000-0000-0000-0000-000000000020', 'Active'),
  ('00000000-0000-0000-0000-000000000030', 'designer@oklut.com', '00000000-0000-4000-8000-0000000000a4', '00000000-0000-0000-0000-000000000030', 'Active')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Sample job openings
-- ---------------------------------------------------------------------------
insert into public.job_openings (id, title, department_id, location, openings_count, description, requirements, employment_type, status, published) values
  ('00000000-0000-4000-8000-0000000000b1', 'PHP Developer', '00000000-0000-4000-8000-0000000000d1', 'Hyderabad', 2,
   'Develop robust server-side logic, integrate front-end elements and build reusable, testable code.',
   '2+ years of PHP (Laravel)\nSolid HTML, CSS, JavaScript\nPostgreSQL/MySQL experience', 'Full-time', 'Open', true),
  ('00000000-0000-4000-8000-0000000000b2', 'UI Designer', '00000000-0000-4000-8000-0000000000d3', 'Hyderabad', 1,
   'Design clean, modern interfaces for our platform. Build design systems and prototypes.',
   '2+ years UI/UX design\nFigma proficiency\nStrong portfolio', 'Full-time', 'Open', true)
on conflict (id) do nothing;

insert into public.candidates (id, job_opening_id, name, email, phone, status, source) values
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b1', 'Kavya Reddy', 'kavya@email.com', '+91 90000 11111', 'screening', 'Website'),
  ('00000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-0000000000b2', 'Siddharth Rao', 'sidd@email.com', '+91 90000 22222', 'applied', 'Referral')
on conflict (id) do nothing;


-- ================================================================================
-- PART 3: STORAGE (0003_storage.sql)
-- ================================================================================

-- ============================================================================
-- Oklut HRMS - Storage Migration
-- Creates the 'documents' bucket and storage RLS policies for the Documents module.
-- ============================================================================

-- Public bucket so uploaded document links (file_url) work directly in the browser.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

-- Upload / download / delete access for authenticated users
create policy "documents storage read" on storage.objects
  for select to authenticated using (bucket_id = 'documents');

create policy "documents storage insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'documents');

create policy "documents storage delete" on storage.objects
  for delete to authenticated using (bucket_id = 'documents');
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
-- Phase 2 Logic Updates for OKLUT Roadmap

-- 1. Attendance Deduction Trigger
create or replace function public.process_attendance_deduction()
returns trigger language plpgsql as $$
declare
  v_start_time time := '09:00:00'; -- Standard start time
  v_check_in_time time;
  v_minutes_late int;
  v_basic_salary numeric;
  v_daily_rate numeric;
  v_deduction numeric := 0;
  v_pay_period text;
begin
  -- Only process if check_in is provided
  if new.check_in is not null then
    -- Get local time from check_in timestamp
    v_check_in_time := (new.check_in AT TIME ZONE 'Asia/Kolkata')::time;
    
    if v_check_in_time > v_start_time then
      -- Calculate minutes late
      v_minutes_late := extract(epoch from (v_check_in_time - v_start_time))/60;
      
      -- Get employee's basic salary
      select basic_salary into v_basic_salary
      from public.payroll_profiles
      where employee_id = new.employee_id;
      
      if found then
        -- Daily rate = basic_salary / 30
        v_daily_rate := v_basic_salary / 30;
        
        -- Rule: 30 mins late -> 1/4 day salary deducted
        if v_minutes_late >= 30 and v_minutes_late < 60 then
          v_deduction := v_daily_rate * 0.25;
        -- Rule: 1 hour late -> additional fixed deduction (500) + 1/4 day
        elsif v_minutes_late >= 60 then
          v_deduction := (v_daily_rate * 0.25) + 500;
        end if;
        
        -- Add deduction to payroll for the current month
        if v_deduction > 0 then
          v_pay_period := to_char(new.date, 'YYYY-MM');
          
          -- Try to update existing payroll draft
          update public.payroll
          set deductions = deductions + v_deduction,
              updated_at = now()
          where employee_id = new.employee_id and pay_period = v_pay_period and status = 'draft';
        end if;
      end if;
    end if;
  end if;
  
  return new;
end;
$$;

drop trigger if exists trg_attendance_deduction on public.attendance;
create trigger trg_attendance_deduction
  after insert or update of check_in on public.attendance
  for each row execute function public.process_attendance_deduction();

-- 2. Performance Auto-Exit Flagging
create or replace function public.check_performance_exits()
returns void language plpgsql as $$
begin
  -- Notify HR about employees reaching Level 3 (decline)
  insert into public.notifications (user_id, employee_id, type, title, message, link)
  select 
    u.id, 
    e.id,
    'warning', 
    'Performance Alert: ' || e.first_name || ' ' || e.last_name,
    'Employee has reached Performance Level 3 (decline). Review for potential exit according to policy.',
    '/employees/' || e.id
  from public.employees e
  cross join public.users u
  join public.roles r on u.role_id = r.id
  where r.name = 'HR'
  and exists (
    select 1 from public.performance_reviews pr
    where pr.employee_id = e.id
    and pr.cycle_level = 3
    and pr.created_at >= (now() - interval '30 days')
  )
  on conflict do nothing;
end;
$$;
