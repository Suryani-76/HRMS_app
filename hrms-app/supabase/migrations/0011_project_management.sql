-- =============================================================================
-- Migration 0011: Project Management Module Schema
-- Provides projects, project_members, and project_status_updates tables
-- with auto-generated collision-free Project Codes (PRJ-YYYY-NNN),
-- role assignments, status history audit trail, and RLS policies.
-- =============================================================================

-- 1. Create Projects Table
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

-- 2. Create Project Members Table (team assignments)
create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  project_role varchar(50) not null default 'Member' check (project_role in ('Head', 'Lead', 'Member', 'Consultant', 'QA', 'Developer', 'Designer')),
  assignment_status varchar(30) not null default 'Active' check (assignment_status in ('Active', 'Removed', 'Completed')),
  assigned_at timestamptz not null default now(),
  constraint uq_project_employee unique (project_id, employee_id)
);

-- 3. Create Project Status Updates Table (audit trail & status history)
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

-- 4. Indexes for Performance and Lookup
create index if not exists idx_projects_code on public.projects(project_code);
create index if not exists idx_projects_status on public.projects(status);
create index if not exists idx_projects_head on public.projects(project_head_id);
create index if not exists idx_projects_lead on public.projects(team_lead_id);
create index if not exists idx_projects_department on public.projects(department_id);
create index if not exists idx_projects_created_at on public.projects(created_at desc);

create index if not exists idx_project_members_project on public.project_members(project_id);
create index if not exists idx_project_members_employee on public.project_members(employee_id);

create index if not exists idx_project_status_updates_proj on public.project_status_updates(project_id);
create index if not exists idx_project_status_updates_created on public.project_status_updates(created_at desc);

-- 5. Safe Sequence Code Generator Function: PRJ-YYYY-NNN
create or replace function public.generate_project_code()
returns text as $$
declare
  v_year text;
  v_prefix text;
  v_max_num int;
  v_new_code text;
begin
  v_year := to_char(current_date, 'YYYY');
  v_prefix := 'PRJ-' || v_year || '-';
  
  -- Query max sequence for the current calendar year
  select coalesce(max(substring(project_code from '\d+$')::int), 0)
  into v_max_num
  from public.projects
  where project_code like v_prefix || '%';
  
  v_new_code := v_prefix || lpad((v_max_num + 1)::text, 3, '0');
  return v_new_code;
end;
$$ language plpgsql;

-- 6. Trigger to ensure project_code is populated and updated_at maintained
create or replace function public.trg_projects_before_insert_or_update()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    if new.project_code is null or trim(new.project_code) = '' then
      new.project_code := public.generate_project_code();
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_projects_biu on public.projects;
create trigger trg_projects_biu
  before insert or update on public.projects
  for each row execute function public.trg_projects_before_insert_or_update();

-- 7. Enable Row Level Security (RLS)
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_status_updates enable row level security;

-- Permissive and Authenticated Policies
drop policy if exists "projects select all" on public.projects;
create policy "projects select all" on public.projects
  for select to authenticated, anon
  using (true);

drop policy if exists "projects insert all" on public.projects;
create policy "projects insert all" on public.projects
  for insert to authenticated, anon
  with check (true);

drop policy if exists "projects update all" on public.projects;
create policy "projects update all" on public.projects
  for update to authenticated, anon
  using (true);

drop policy if exists "projects delete all" on public.projects;
create policy "projects delete all" on public.projects
  for delete to authenticated, anon
  using (true);

-- project_members policies
drop policy if exists "project_members select all" on public.project_members;
create policy "project_members select all" on public.project_members
  for select to authenticated, anon
  using (true);

drop policy if exists "project_members insert all" on public.project_members;
create policy "project_members insert all" on public.project_members
  for insert to authenticated, anon
  with check (true);

drop policy if exists "project_members update all" on public.project_members;
create policy "project_members update all" on public.project_members
  for update to authenticated, anon
  using (true);

drop policy if exists "project_members delete all" on public.project_members;
create policy "project_members delete all" on public.project_members
  for delete to authenticated, anon
  using (true);

-- project_status_updates policies (append-only)
drop policy if exists "project_status_updates select all" on public.project_status_updates;
create policy "project_status_updates select all" on public.project_status_updates
  for select to authenticated, anon
  using (true);

drop policy if exists "project_status_updates insert all" on public.project_status_updates;
create policy "project_status_updates insert all" on public.project_status_updates
  for insert to authenticated, anon
  with check (true);
