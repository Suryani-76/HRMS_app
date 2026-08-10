-- ============================================================================
-- Oklut HRMS - Schema Migration
-- Apply with: Supabase Dashboard -> SQL Editor (or supabase db push)
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Helper functions
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
declare v_user_id uuid;
begin
  insert into public.payroll_profiles (employee_id) values (new.id);

  insert into public.leave_balances (employee_id, leave_type_id, year, allocated)
  select new.id, lt.id, extract(year from coalesce(new.joining_date, current_date))::int, lt.days_per_year
  from public.leave_types lt;

  if new.user_id is not null then
    insert into public.notifications (user_id, employee_id, type, title, message, link)
    values (new.user_id, new.id, 'success', 'Welcome to Oklut!',
            'Your employee profile, leave balance and payroll profile have been created.',
            '/employees/' || new.id);
  end if;

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
create policy "holidays read" on public.holidays for select to authenticated using (true);

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
  for select to authenticated using (assignee_id = public.current_employee_id() or public.is_manager() or assigner_id = public.current_employee_id());
create policy "tasks insert admin" on public.tasks
  for insert to authenticated with check (public.is_manager());
create policy "tasks update" on public.tasks
  for update to authenticated using (assignee_id = public.current_employee_id() or public.is_manager());

-- Announcements
create policy "announcements read" on public.announcements for select to authenticated using (true);
create policy "announcements write admin" on public.announcements for all to authenticated using (public.is_manager()) with check (public.is_manager());

-- Notifications
create policy "notifications read own" on public.notifications
  for select to authenticated using (user_id = auth.uid() or employee_id = public.current_employee_id());
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
create policy "job_openings read" on public.job_openings for select to authenticated using (true);
create policy "job_openings write admin" on public.job_openings for all to authenticated using (public.is_manager()) with check (public.is_manager());
create policy "candidates read" on public.candidates for select to authenticated using (public.is_manager());
create policy "candidates write admin" on public.candidates for all to authenticated using (public.is_manager()) with check (public.is_manager());
create policy "interviews read" on public.interviews for select to authenticated using (public.is_manager());
create policy "interviews write admin" on public.interviews for all to authenticated using (public.is_manager()) with check (public.is_manager());
create policy "offers read" on public.offers for select to authenticated using (public.is_manager());
create policy "offers write admin" on public.offers for all to authenticated using (public.is_manager()) with check (public.is_manager());

-- Audit logs
create policy "audit read admin" on public.audit_logs for select to authenticated using (public.is_admin());
create policy "audit insert" on public.audit_logs for insert to authenticated with check (true);
