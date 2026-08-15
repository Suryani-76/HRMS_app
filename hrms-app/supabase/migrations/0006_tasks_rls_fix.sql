-- Migration 0006: Tasks RLS & Permissions Fix
-- Ensures all logged in users can create, view, and update tasks without RLS errors

alter table public.tasks enable row level security;

-- 1. Anyone authenticated can create tasks
drop policy if exists "tasks insert admin" on public.tasks;
drop policy if exists "tasks insert authenticated" on public.tasks;
create policy "tasks insert authenticated" on public.tasks
  for insert to authenticated
  with check (true);

-- 2. Read tasks: Users can see tasks assigned to them, tasks created by them, unassigned tasks, or all tasks if manager
drop policy if exists "tasks read" on public.tasks;
drop policy if exists "tasks read authenticated" on public.tasks;
create policy "tasks read authenticated" on public.tasks
  for select to authenticated
  using (
    assignee_id = public.current_employee_id()
    or assigner_id = public.current_employee_id()
    or assignee_id is null
    or public.is_manager()
  );

-- 3. Update tasks: Assignee, assigner, or manager can update task status
drop policy if exists "tasks update" on public.tasks;
drop policy if exists "tasks update authenticated" on public.tasks;
create policy "tasks update authenticated" on public.tasks
  for update to authenticated
  using (
    assignee_id = public.current_employee_id()
    or assigner_id = public.current_employee_id()
    or public.is_manager()
  )
  with check (true);

-- 4. Delete tasks: Assigner or manager can delete tasks
drop policy if exists "tasks delete" on public.tasks;
drop policy if exists "tasks delete authenticated" on public.tasks;
create policy "tasks delete authenticated" on public.tasks
  for delete to authenticated
  using (
    assigner_id = public.current_employee_id()
    or public.is_manager()
  );
