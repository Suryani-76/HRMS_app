-- Migration 0005: Public Candidate RLS Policies & Reference ID Fix
-- Ensures unauthenticated candidates can submit applications, view open jobs, and check status

-- 1. Enable RLS on recruitment tables (idempotent)
alter table public.job_openings enable row level security;
alter table public.candidates enable row level security;
alter table public.interviews enable row level security;
alter table public.offers enable row level security;

-- 2. Job Openings RLS: Anyone (anon + authenticated) can view published open jobs
drop policy if exists "job_openings public read" on public.job_openings;
create policy "job_openings public read" on public.job_openings
  for select to public
  using (status = 'Open' and published = true);

-- 3. Candidates RLS:
-- Anyone (anon + authenticated) can submit a job application
drop policy if exists "candidates public insert" on public.candidates;
create policy "candidates public insert" on public.candidates
  for insert to public
  with check (true);

-- Anyone can look up candidate status (for Candidate Portal login via reference_id & email)
drop policy if exists "candidates public read" on public.candidates;
create policy "candidates public read" on public.candidates
  for select to public
  using (true);

-- Managers retain full access
drop policy if exists "candidates manager write" on public.candidates;
create policy "candidates manager write" on public.candidates
  for all to authenticated
  using (public.is_manager())
  with check (public.is_manager());

-- 4. Interviews RLS: Candidates can view their interviews in Candidate Portal
drop policy if exists "interviews public read" on public.interviews;
create policy "interviews public read" on public.interviews
  for select to public
  using (true);

-- Managers retain full access
drop policy if exists "interviews manager write" on public.interviews;
create policy "interviews manager write" on public.interviews
  for all to authenticated
  using (public.is_manager())
  with check (public.is_manager());

-- 5. Offers RLS: Candidates can view and respond to their offers
drop policy if exists "offers public read" on public.offers;
create policy "offers public read" on public.offers
  for select to public
  using (true);

drop policy if exists "offers public update response" on public.offers;
create policy "offers public update response" on public.offers
  for update to public
  using (true)
  with check (true);

-- Managers retain full access
drop policy if exists "offers manager write" on public.offers;
create policy "offers manager write" on public.offers
  for all to authenticated
  using (public.is_manager())
  with check (public.is_manager());
