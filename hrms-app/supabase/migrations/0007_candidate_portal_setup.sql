-- ============================================================================
-- 0007: Candidate Portal Full Setup
-- • Adds temp_id / user_id / category / password columns to candidates
-- • Adds exam config columns to job_openings
-- • Adds reschedule columns to interviews
-- • Trigger: auto-generate temp_id when status → Shortlisted
-- • RPC: candidate_login(temp_id, password) — no auth.users needed
-- • RPC: create_candidate_with_auth() — creates candidate + portal login
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Schema additions (idempotent)
-- ---------------------------------------------------------------------------
alter table public.candidates
  add column if not exists temp_id text unique,
  add column if not exists user_id uuid references auth.users(id),
  add column if not exists category text default 'Fresher',
  add column if not exists password text default '1234';

alter table public.job_openings
  add column if not exists total_questions int not null default 30,
  add column if not exists exam_duration_mins int not null default 60,
  add column if not exists exam_passing_score int not null default 70;

alter table public.interviews
  add column if not exists reschedule_requested boolean not null default false,
  add column if not exists reschedule_status text;

-- ---------------------------------------------------------------------------
-- 2. Trigger: auto-generate temp_id + sync reference_id when Shortlisted
-- ---------------------------------------------------------------------------
create or replace function public.generate_candidate_temp_id()
returns trigger language plpgsql as $$
begin
  if new.status = 'Shortlisted'
     and (old.status is distinct from 'Shortlisted')
     and (new.temp_id is null or new.temp_id = '') then
    new.temp_id := 'CAND-' || upper(substring(gen_random_uuid()::text, 1, 6));
    -- keep reference_id in sync for backward compatibility
    new.reference_id := new.temp_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_candidate_temp_id on public.candidates;
create trigger trg_candidate_temp_id
  before update on public.candidates
  for each row execute function public.generate_candidate_temp_id();

-- ---------------------------------------------------------------------------
-- 3. candidate_login RPC
-- Candidate enters their temp_id (e.g. CAND-AB1CD2) + email
-- No auth.users session required — purely DB lookup
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 4. create_candidate_with_auth RPC
-- Creates candidate row + auth.users in one atomic call.
-- Returns the generated temp_id so HR can share it with the candidate.
-- ---------------------------------------------------------------------------
create or replace function public.create_candidate_with_auth(
  p_name text,
  p_email text,
  p_phone text default null,
  p_job_opening_id uuid default null,
  p_source text default null,
  p_resume_url text default null,
  p_cover_letter text default null,
  p_category text default 'Fresher'
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_temp_id text;
  v_existing_cand uuid;
begin
  -- Check if candidate already exists for this job+email
  select id into v_existing_cand
  from public.candidates
  where email = p_email
    and (p_job_opening_id is null or job_opening_id = p_job_opening_id)
  limit 1;

  if v_existing_cand is not null then
    -- Return existing temp_id
    select temp_id into v_temp_id from public.candidates where id = v_existing_cand;
    if v_temp_id is not null then
      return v_temp_id;
    end if;
  end if;

  v_temp_id := 'CAND-' || upper(substring(gen_random_uuid()::text, 1, 6));

  -- Create auth.users entry so candidate can optionally sign into Supabase Auth
  begin
    insert into auth.users (
      id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, role, aud,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) values (
      gen_random_uuid(),
      p_email,
      extensions.crypt('1234', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name', p_name, 'is_candidate', true),
      'authenticated', 'authenticated',
      now(), now(), '', '', '', ''
    )
    returning id into v_user_id;
  exception when unique_violation then
    -- auth.users already has this email — look up existing user
    select id into v_user_id from auth.users where email = p_email limit 1;
  end;

  -- Insert candidate row (or update existing one without temp_id)
  if v_existing_cand is not null then
    update public.candidates
    set temp_id = v_temp_id,
        reference_id = v_temp_id,
        user_id = v_user_id
    where id = v_existing_cand;
  else
    insert into public.candidates (
      name, email, phone, job_opening_id, source,
      resume_url, cover_letter, category, status,
      temp_id, reference_id, user_id,
      ats_score, created_at
    ) values (
      p_name, p_email, p_phone, p_job_opening_id, p_source,
      p_resume_url, p_cover_letter, p_category, 'Applied',
      v_temp_id, v_temp_id, v_user_id,
      floor(random() * 41 + 60)::int, now()
    );
  end if;

  return v_temp_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Grant execute on RPCs to public (anon candidates can call them)
-- ---------------------------------------------------------------------------
grant execute on function public.candidate_login_simple(text, text) to public;
grant execute on function public.create_candidate_with_auth(text, text, text, uuid, text, text, text, text) to public;
