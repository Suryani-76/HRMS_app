-- =============================================================================
-- MIGRATION 0016 — MASTER DATABASE SYNC
-- Project: OKLUT HRMS | Supabase: qwygpcovmlobcmwcptvz
--
-- HOW TO APPLY:
--   1. Go to: https://supabase.com/dashboard/project/qwygpcovmlobcmwcptvz/sql
--   2. Click "New query"
--   3. Paste this entire file and press Run (Ctrl+Enter)
--
-- WHAT THIS FIXES:
--   A. Missing columns on documents, attendance, performance_goals,
--      insurance_enrollments, offers, interviews, job_openings
--   B. Missing table: employee_assessments (performanceAssessment.ts)
--   C. Missing columns on candidates (dob, cheating_detected, etc.)
--   D. Ensures all tables have open RLS policies for anon + authenticated
--   E. Adds missing indexes for performance
--   F. Re-creates/ensures all storage bucket policies
--   G. Fixes documents table: ensures project_id, project_name, project_code
--   H. Fixes attendance: verification_method, verification_status columns
--   I. Insurance enrollments: nominee2 columns, current/permanent address split
--   J. Projects: ensures remote DB has all project columns
--   K. All localStorage-backed modules (parking, complaints, service_requests,
--      bank_details, projects) get fully correct RLS so they work via Supabase
-- =============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- =============================================================================
-- A. DOCUMENTS TABLE — Add missing project linkage columns
-- =============================================================================
alter table public.documents
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists project_name text,
  add column if not exists project_code text,
  add column if not exists uploaded_by uuid references public.users(id) on delete set null;

-- Relax doc_type to allow nulls (code inserts without doc_type sometimes)
alter table public.documents
  alter column doc_type drop not null,
  alter column doc_type set default null;

create index if not exists idx_documents_project_id   on public.documents(project_id);
create index if not exists idx_documents_project_code on public.documents(project_code);
create index if not exists idx_documents_employee_id  on public.documents(employee_id);
create index if not exists idx_documents_created_at   on public.documents(created_at desc);

-- RLS: open for all authenticated (managers see all, employees filtered in app layer)
alter table public.documents enable row level security;
drop policy if exists "documents_select_all"  on public.documents;
drop policy if exists "documents_insert_all"  on public.documents;
drop policy if exists "documents_update_all"  on public.documents;
drop policy if exists "documents_delete_all"  on public.documents;
create policy "documents_select_all"  on public.documents for select using (true);
create policy "documents_insert_all"  on public.documents for insert with check (true);
create policy "documents_update_all"  on public.documents for update using (true);
create policy "documents_delete_all"  on public.documents for delete using (true);

-- =============================================================================
-- B. ATTENDANCE TABLE — Add verification columns used by biometric attendance
-- =============================================================================
alter table public.attendance
  add column if not exists verification_method  text,   -- 'FACE_ID' | 'MANUAL' | 'SECURE_FALLBACK_PIN'
  add column if not exists verification_status  text;   -- 'VERIFIED' | 'FAILED' | 'PENDING'

-- Extended notes field already exists but make sure it's text (not varchar)
alter table public.attendance
  alter column notes type text;

create index if not exists idx_attendance_status      on public.attendance(status);
create index if not exists idx_attendance_created     on public.attendance(created_at desc);

alter table public.attendance enable row level security;
drop policy if exists "attendance_select_all" on public.attendance;
drop policy if exists "attendance_insert_all" on public.attendance;
drop policy if exists "attendance_update_all" on public.attendance;
drop policy if exists "attendance_delete_all" on public.attendance;
create policy "attendance_select_all" on public.attendance for select using (true);
create policy "attendance_insert_all" on public.attendance for insert with check (true);
create policy "attendance_update_all" on public.attendance for update using (true);
create policy "attendance_delete_all" on public.attendance for delete using (true);

-- =============================================================================
-- C. PERFORMANCE_GOALS — Add document_url & document_name columns
-- =============================================================================
alter table public.performance_goals
  add column if not exists document_url  text,
  add column if not exists document_name text;

alter table public.performance_goals enable row level security;
drop policy if exists "perf_goals_select_all" on public.performance_goals;
drop policy if exists "perf_goals_all"        on public.performance_goals;
create policy "perf_goals_select_all" on public.performance_goals for select using (true);
create policy "perf_goals_all"        on public.performance_goals for all using (true) with check (true);

-- Performance reviews open RLS
alter table public.performance_reviews enable row level security;
drop policy if exists "perf_reviews_select_all" on public.performance_reviews;
drop policy if exists "perf_reviews_all"        on public.performance_reviews;
create policy "perf_reviews_select_all" on public.performance_reviews for select using (true);
create policy "perf_reviews_all"        on public.performance_reviews for all using (true) with check (true);

-- =============================================================================
-- D. EMPLOYEE ASSESSMENTS TABLE (performanceAssessment.ts)
--    This table stores the detailed IT/NON-IT assessment forms
-- =============================================================================
create table if not exists public.employee_assessments (
  id              uuid primary key default gen_random_uuid(),
  employee_id     uuid not null references public.employees(id) on delete cascade,
  employee_name   text,
  employee_code   text,
  role            text,
  department      text,
  track           text not null default 'IT' check (track in ('IT', 'NON_IT')),
  review_period   text not null,                        -- e.g. '2026-Q3'
  status          text not null default 'draft'
                    check (status in ('draft', 'submitted', 'reviewed')),
  items           jsonb not null default '[]'::jsonb,   -- AssessmentItem[]
  total_goals_reached  int not null default 0,
  total_goals_count    int not null default 0,
  overall_score        numeric(6,2),
  overall_percentage   numeric(5,2),
  performance_band     text,
  reviewer_id          uuid references public.employees(id) on delete set null,
  reviewer_name        text,
  reviewer_feedback    text,
  submitted_at         timestamptz,
  reviewed_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (employee_id, review_period)
);

create index if not exists idx_assessments_employee on public.employee_assessments(employee_id);
create index if not exists idx_assessments_status   on public.employee_assessments(status);
create index if not exists idx_assessments_period   on public.employee_assessments(review_period);

alter table public.employee_assessments enable row level security;
drop policy if exists "assessments_select_all" on public.employee_assessments;
drop policy if exists "assessments_all"        on public.employee_assessments;
create policy "assessments_select_all" on public.employee_assessments for select using (true);
create policy "assessments_all"        on public.employee_assessments for all using (true) with check (true);

-- Auto-update updated_at
create or replace function public.trg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end; $$;

drop trigger if exists trg_assessments_updated_at on public.employee_assessments;
create trigger trg_assessments_updated_at
  before update on public.employee_assessments
  for each row execute function public.trg_set_updated_at();

-- =============================================================================
-- E. INSURANCE ENROLLMENTS — Add missing nominee2, current/permanent address columns
-- =============================================================================
alter table public.insurance_enrollments
  add column if not exists current_address      text,
  add column if not exists permanent_address    text,
  add column if not exists nominee2_name        text,
  add column if not exists nominee2_relation    text,
  add column if not exists nominee2_dob         date,
  add column if not exists nominee2_share       numeric(5,2),
  add column if not exists bank_ifsc            text,
  add column if not exists declaration_signature text,
  add column if not exists emergency_contact_relation text;

alter table public.insurance_enrollments enable row level security;
drop policy if exists "insurance_select_all" on public.insurance_enrollments;
drop policy if exists "insurance_all"        on public.insurance_enrollments;
create policy "insurance_select_all" on public.insurance_enrollments for select using (true);
create policy "insurance_all"        on public.insurance_enrollments for all using (true) with check (true);

-- =============================================================================
-- F. CANDIDATES TABLE — Add all missing columns from code
-- =============================================================================
alter table public.candidates
  add column if not exists date_of_birth          date,
  add column if not exists dob                    date,
  add column if not exists cheating_detected      boolean default false,
  add column if not exists exam_score             numeric(5,2),
  add column if not exists exam_started_at        timestamptz,
  add column if not exists exam_completed_at      timestamptz,
  add column if not exists exam_feedback          text,
  add column if not exists technical_interview_status   text,
  add column if not exists technical_interview_feedback text,
  add column if not exists technical_interview_date     timestamptz,
  add column if not exists hr_interview_status          text,
  add column if not exists hr_interview_feedback        text,
  add column if not exists hr_interview_date            timestamptz,
  add column if not exists disqualified_at         timestamptz,
  add column if not exists disqualified_reason     text,
  add column if not exists candidate_id            text,
  add column if not exists password               text default '1234';

alter table public.candidates enable row level security;
drop policy if exists "candidates_select_all" on public.candidates;
drop policy if exists "candidates_all"        on public.candidates;
create policy "candidates_select_all" on public.candidates for select using (true);
create policy "candidates_all"        on public.candidates for all using (true) with check (true);

-- =============================================================================
-- G. JOB OPENINGS — Add exam window, slot config and exam_link columns
-- =============================================================================
alter table public.job_openings
  add column if not exists exam_window_start        timestamptz,
  add column if not exists exam_window_end          timestamptz,
  add column if not exists exam_start_date          date,
  add column if not exists exam_end_date            date,
  add column if not exists technical_slot_1_max_count int,
  add column if not exists technical_slot_2_max_count int,
  add column if not exists technical_slot_3_max_count int,
  add column if not exists hr_slot_1_max_count      int,
  add column if not exists hr_slot_2_max_count      int,
  add column if not exists hr_slot_3_max_count      int,
  add column if not exists exam_link                text;

alter table public.job_openings enable row level security;
drop policy if exists "job_openings_select_all" on public.job_openings;
drop policy if exists "job_openings_all"        on public.job_openings;
create policy "job_openings_select_all" on public.job_openings for select using (true);
create policy "job_openings_all"        on public.job_openings for all using (true) with check (true);

-- =============================================================================
-- H. INTERVIEWS TABLE — Add all extended columns
-- =============================================================================
alter table public.interviews
  add column if not exists exam_link                text,
  add column if not exists candidate_confirmed      boolean default false,
  add column if not exists reschedule_requested     boolean default false,
  add column if not exists reschedule_status        text,
  add column if not exists reschedule_reason        text,
  add column if not exists reschedule_preferred_time timestamptz,
  add column if not exists reschedule_admin_note    text,
  add column if not exists attended_at              timestamptz,
  add column if not exists slot_key                 text,
  add column if not exists metrics                  jsonb;

alter table public.interviews enable row level security;
drop policy if exists "interviews_select_all" on public.interviews;
drop policy if exists "interviews_all"        on public.interviews;
create policy "interviews_select_all" on public.interviews for select using (true);
create policy "interviews_all"        on public.interviews for all using (true) with check (true);

-- =============================================================================
-- I. OFFERS TABLE — Add extended fields
-- =============================================================================
alter table public.offers
  add column if not exists pdf_url                  text,
  add column if not exists terms_conditions         text,
  add column if not exists service_bond_years       int,
  add column if not exists relocation_required      boolean,
  add column if not exists relocation_location      text,
  add column if not exists salary_breakdown         jsonb,
  add column if not exists bond_terms               text,
  add column if not exists relocation_support       text;

alter table public.offers enable row level security;
drop policy if exists "offers_select_all" on public.offers;
drop policy if exists "offers_all"        on public.offers;
create policy "offers_select_all" on public.offers for select using (true);
create policy "offers_all"        on public.offers for all using (true) with check (true);

-- =============================================================================
-- J. TASKS TABLE — Add project association columns
-- =============================================================================
alter table public.tasks
  add column if not exists project_id      uuid references public.projects(id) on delete set null,
  add column if not exists project_code    text,
  add column if not exists department_id   uuid references public.departments(id) on delete set null,
  add column if not exists department_sector text;

create index if not exists idx_tasks_project on public.tasks(project_id);

alter table public.tasks enable row level security;
drop policy if exists "tasks_select_all" on public.tasks;
drop policy if exists "tasks_all"        on public.tasks;
create policy "tasks_select_all" on public.tasks for select using (true);
create policy "tasks_all"        on public.tasks for all using (true) with check (true);

-- =============================================================================
-- K. LEAVE_REQUESTS — Add half-day fields
-- =============================================================================
alter table public.leave_requests
  add column if not exists is_half_day        boolean default false,
  add column if not exists half_day_session   text;   -- 'first_half' | 'second_half'

alter table public.leave_requests enable row level security;
drop policy if exists "leave_requests_select_all" on public.leave_requests;
drop policy if exists "leave_requests_all"        on public.leave_requests;
create policy "leave_requests_select_all" on public.leave_requests for select using (true);
create policy "leave_requests_all"        on public.leave_requests for all using (true) with check (true);

-- =============================================================================
-- L. PROJECTS — ensure open RLS (already created in 0013 but re-enforce)
-- =============================================================================
alter table public.projects enable row level security;
drop policy if exists "projects_select_all" on public.projects;
drop policy if exists "projects_all"        on public.projects;
create policy "projects_select_all" on public.projects for select using (true);
create policy "projects_all"        on public.projects for all using (true) with check (true);

alter table public.project_members enable row level security;
drop policy if exists "project_members_select_all" on public.project_members;
drop policy if exists "project_members_all"        on public.project_members;
create policy "project_members_select_all" on public.project_members for select using (true);
create policy "project_members_all"        on public.project_members for all using (true) with check (true);

alter table public.project_status_updates enable row level security;
drop policy if exists "psu_select_all" on public.project_status_updates;
drop policy if exists "psu_all"        on public.project_status_updates;
create policy "psu_select_all" on public.project_status_updates for select using (true);
create policy "psu_all"        on public.project_status_updates for all using (true) with check (true);

-- =============================================================================
-- M. PARKING PASSES — ensure table + open RLS
-- =============================================================================
create table if not exists public.parking_passes (
  id              uuid primary key default gen_random_uuid(),
  employee_id     text not null,
  employee_code   text not null,
  employee_name   text not null,
  employee_email  text not null,
  vehicle_type    text not null default '2-Wheeler' check (vehicle_type in ('2-Wheeler', '4-Wheeler')),
  vehicle_number  text not null,
  vehicle_model   text,
  license_number  text,
  emergency_phone text,
  status          text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected', 'Revoked')),
  allocated_sector text,
  allocated_slot  text,
  rejection_reason text,
  approved_by     text,
  approved_at     timestamptz,
  qr_code_data    text,
  qr_code_image   text,
  is_checked_in   boolean not null default false,
  last_check_in   timestamptz,
  last_check_out  timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_parking_emp    on public.parking_passes(employee_id);
create index if not exists idx_parking_email  on public.parking_passes(employee_email);
create index if not exists idx_parking_status on public.parking_passes(status);

alter table public.parking_passes enable row level security;
drop policy if exists "parking_select_all" on public.parking_passes;
drop policy if exists "parking_all"        on public.parking_passes;
create policy "parking_select_all" on public.parking_passes for select using (true);
create policy "parking_all"        on public.parking_passes for all using (true) with check (true);

-- =============================================================================
-- N. COMPLAINTS — ensure table + open RLS
-- =============================================================================
create table if not exists public.complaints (
  id              text primary key,
  ticket_number   text not null unique,
  employee_id     text,
  employee_name   text not null,
  employee_code   text,
  employee_email  text,
  department      text,
  is_anonymous    boolean default false,
  category        text not null,
  custom_subject  text,
  description     text not null,
  word_count      int default 0,
  priority        text default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  status          text default 'pending' check (status in ('pending', 'under_review', 'resolved', 'dismissed')),
  resolution_note text,
  resolved_by     text,
  resolved_at     timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists idx_complaints_ticket  on public.complaints(ticket_number);
create index if not exists idx_complaints_emp     on public.complaints(employee_id);
create index if not exists idx_complaints_status  on public.complaints(status);
create index if not exists idx_complaints_created on public.complaints(created_at desc);

alter table public.complaints enable row level security;
drop policy if exists "complaints_select_all" on public.complaints;
drop policy if exists "complaints_all"        on public.complaints;
create policy "complaints_select_all" on public.complaints for select using (true);
create policy "complaints_all"        on public.complaints for all using (true) with check (true);

-- =============================================================================
-- O. SERVICE REQUESTS — ensure table + open RLS
-- =============================================================================
create table if not exists public.service_requests (
  id              text primary key,
  ticket_number   text not null unique,
  employee_id     text,
  employee_name   text not null,
  employee_code   text,
  employee_email  text,
  department      text,
  category        text not null,
  priority        text not null default 'medium',
  subject         text not null,
  description     text not null,
  attachments     jsonb not null default '[]'::jsonb,
  status          text not null default 'pending',
  action_notes    text,
  action_by_name  text,
  action_by_email text,
  action_at       timestamptz,
  action_attachments jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_sr_emp     on public.service_requests(employee_id);
create index if not exists idx_sr_status  on public.service_requests(status);
create index if not exists idx_sr_created on public.service_requests(created_at desc);

alter table public.service_requests enable row level security;
drop policy if exists "sr_select_all" on public.service_requests;
drop policy if exists "sr_all"        on public.service_requests;
create policy "sr_select_all" on public.service_requests for select using (true);
create policy "sr_all"        on public.service_requests for all using (true) with check (true);

-- =============================================================================
-- P. EMPLOYEE BANK DETAILS — ensure table + open RLS
-- =============================================================================
create table if not exists public.employee_bank_details (
  id                    text primary key,
  employee_id           text not null,
  employee_code         text,
  employee_name         text,
  employee_email        text,
  phone                 text,
  department            text,
  designation           text,
  bank_name             text not null,
  account_holder_name   text not null,
  account_number        text not null,
  ifsc_code             text not null,
  branch_name           text,
  account_type          text default 'Salary',
  upi_id                text,
  pan_number            text,
  document_proof_name   text,
  document_proof_type   text,
  document_proof_data   text,
  status                text default 'pending' check (status in ('pending', 'verified', 'rejected')),
  verified_by           text,
  verified_at           timestamptz,
  rejection_reason      text,
  admin_note            text,
  submitted_at          timestamptz default now(),
  updated_at            timestamptz default now()
);

create index if not exists idx_bank_emp    on public.employee_bank_details(employee_id);
create index if not exists idx_bank_status on public.employee_bank_details(status);

alter table public.employee_bank_details enable row level security;
drop policy if exists "bank_select_all" on public.employee_bank_details;
drop policy if exists "bank_all"        on public.employee_bank_details;
create policy "bank_select_all" on public.employee_bank_details for select using (true);
create policy "bank_all"        on public.employee_bank_details for all using (true) with check (true);

-- =============================================================================
-- Q. EMPLOYEE FACE CREDENTIALS — ensure table + open RLS
-- =============================================================================
create table if not exists public.employee_face_credentials (
  id                  uuid primary key default gen_random_uuid(),
  employee_id         uuid not null references public.employees(id) on delete cascade,
  biometric_template  text not null,
  model_version       text not null default 'v4-contour-lbp-aes',
  registration_status text not null default 'registered'
                        check (registration_status in ('registered', 'revoked', 'locked')),
  registered_at       timestamptz not null default now(),
  last_verified_at    timestamptz,
  failed_attempts     int not null default 0,
  locked_until        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (employee_id)
);

create index if not exists idx_face_emp    on public.employee_face_credentials(employee_id);
create index if not exists idx_face_status on public.employee_face_credentials(registration_status);

alter table public.employee_face_credentials enable row level security;
drop policy if exists "face_select_all" on public.employee_face_credentials;
drop policy if exists "face_all"        on public.employee_face_credentials;
create policy "face_select_all" on public.employee_face_credentials for select using (true);
create policy "face_all"        on public.employee_face_credentials for all using (true) with check (true);

-- =============================================================================
-- R. INTERVIEW SLOTS — ensure table + open RLS
-- =============================================================================
create table if not exists public.interview_slots (
  id              uuid primary key default gen_random_uuid(),
  job_opening_id  uuid references public.job_openings(id) on delete cascade,
  round           text not null,
  scheduled_at    timestamptz not null,
  meeting_link    text,
  max_candidates  int default 1,
  status          text default 'open',
  created_by      uuid references public.users(id) on delete set null,
  created_at      timestamptz default now()
);

create index if not exists idx_slots_job    on public.interview_slots(job_opening_id);
create index if not exists idx_slots_status on public.interview_slots(status);

alter table public.interview_slots enable row level security;
drop policy if exists "slots_select_all" on public.interview_slots;
drop policy if exists "slots_all"        on public.interview_slots;
create policy "slots_select_all" on public.interview_slots for select using (true);
create policy "slots_all"        on public.interview_slots for all using (true) with check (true);

-- =============================================================================
-- S. ASSETS & INCIDENTS — ensure open RLS
-- =============================================================================
create table if not exists public.assets (
  id            uuid primary key default gen_random_uuid(),
  type          text not null,
  serial_number text,
  assigned_to   uuid references public.employees(id) on delete set null,
  status        text not null default 'Active',
  barcode_code  text,
  barcode_image text,
  seating_number text,
  assigned_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.assets
  add column if not exists barcode_code   text,
  add column if not exists barcode_image  text,
  add column if not exists seating_number text,
  add column if not exists updated_at     timestamptz default now();

alter table public.assets enable row level security;
drop policy if exists "assets_select_all" on public.assets;
drop policy if exists "assets_all"        on public.assets;
create policy "assets_select_all" on public.assets for select using (true);
create policy "assets_all"        on public.assets for all using (true) with check (true);

create table if not exists public.asset_incidents (
  id            uuid primary key default gen_random_uuid(),
  asset_id      uuid not null references public.assets(id) on delete cascade,
  employee_id   uuid not null references public.employees(id) on delete cascade,
  incident_type text not null,
  report        text,
  penalty_charge numeric(10,2) not null default 0,
  status        text not null default 'Pending',
  hr_sign_off   uuid references public.users(id),
  created_at    timestamptz not null default now()
);

alter table public.asset_incidents enable row level security;
drop policy if exists "incidents_select_all" on public.asset_incidents;
drop policy if exists "incidents_all"        on public.asset_incidents;
create policy "incidents_select_all" on public.asset_incidents for select using (true);
create policy "incidents_all"        on public.asset_incidents for all using (true) with check (true);

-- =============================================================================
-- T. MEETING HALL BOOKINGS — ensure table + open RLS
-- =============================================================================
create table if not exists public.meeting_hall_bookings (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  start_time    timestamptz not null,
  end_time      timestamptz not null,
  requested_by  uuid references public.employees(id) on delete set null,
  status        text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected')),
  admin_comment text,
  booking_date  date,
  end_date      date,
  hall_name     text default 'Main Conference Hall',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_mhb_time   on public.meeting_hall_bookings(start_time, end_time);
create index if not exists idx_mhb_status on public.meeting_hall_bookings(status);

alter table public.meeting_hall_bookings enable row level security;
drop policy if exists "mhb_select_all" on public.meeting_hall_bookings;
drop policy if exists "mhb_all"        on public.meeting_hall_bookings;
create policy "mhb_select_all" on public.meeting_hall_bookings for select using (true);
create policy "mhb_all"        on public.meeting_hall_bookings for all using (true) with check (true);

-- =============================================================================
-- U. RECRUITER INCENTIVES — ensure open RLS
-- =============================================================================
alter table public.recruiter_incentives enable row level security;
drop policy if exists "incentives_select_all" on public.recruiter_incentives;
drop policy if exists "incentives_all"        on public.recruiter_incentives;
create policy "incentives_select_all" on public.recruiter_incentives for select using (true);
create policy "incentives_all"        on public.recruiter_incentives for all using (true) with check (true);

-- =============================================================================
-- V. NOTIFICATIONS — ensure open RLS (needed for anon read in email daemon)
-- =============================================================================
alter table public.notifications enable row level security;
drop policy if exists "notifications_select_all" on public.notifications;
drop policy if exists "notifications_all"        on public.notifications;
create policy "notifications_select_all" on public.notifications for select using (true);
create policy "notifications_all"        on public.notifications for all using (true) with check (true);

-- =============================================================================
-- W. AUDIT LOGS — ensure open RLS + add new action types
-- =============================================================================
alter table public.audit_logs enable row level security;
drop policy if exists "audit_select_all" on public.audit_logs;
drop policy if exists "audit_all"        on public.audit_logs;
create policy "audit_select_all" on public.audit_logs for select using (true);
create policy "audit_all"        on public.audit_logs for all using (true) with check (true);

-- =============================================================================
-- X. EMPLOYEES — Ensure all extended columns exist + open RLS
-- =============================================================================
alter table public.employees
  add column if not exists emergency_contact          text,
  add column if not exists emergency_contact_name     text,
  add column if not exists emergency_contact_relation text,
  add column if not exists emergency_contact_phone    text,
  add column if not exists guardian_name              text,
  add column if not exists guardian_relation          text,
  add column if not exists guardian_phone             text,
  add column if not exists current_address            text,
  add column if not exists current_city               text,
  add column if not exists current_state              text,
  add column if not exists current_country            text,
  add column if not exists current_postal_code        text,
  add column if not exists permanent_address          text,
  add column if not exists permanent_city             text,
  add column if not exists permanent_state            text,
  add column if not exists permanent_country          text,
  add column if not exists permanent_postal_code      text,
  add column if not exists branch                     text default 'HQ',
  add column if not exists employee_code              text;

create index if not exists idx_employees_code on public.employees(employee_code);

alter table public.employees enable row level security;
drop policy if exists "employees_select_all" on public.employees;
drop policy if exists "employees_all"        on public.employees;
create policy "employees_select_all" on public.employees for select using (true);
create policy "employees_all"        on public.employees for all using (true) with check (true);

-- Departments
alter table public.departments enable row level security;
drop policy if exists "departments_select_all" on public.departments;
drop policy if exists "departments_all"        on public.departments;
create policy "departments_select_all" on public.departments for select using (true);
create policy "departments_all"        on public.departments for all using (true) with check (true);

-- Designations
alter table public.designations enable row level security;
drop policy if exists "designations_select_all" on public.designations;
drop policy if exists "designations_all"        on public.designations;
create policy "designations_select_all" on public.designations for select using (true);
create policy "designations_all"        on public.designations for all using (true) with check (true);

-- Leave Types
alter table public.leave_types enable row level security;
drop policy if exists "leave_types_select_all" on public.leave_types;
drop policy if exists "leave_types_all"        on public.leave_types;
create policy "leave_types_select_all" on public.leave_types for select using (true);
create policy "leave_types_all"        on public.leave_types for all using (true) with check (true);

-- Leave Balances
alter table public.leave_balances enable row level security;
drop policy if exists "leave_balances_select_all" on public.leave_balances;
drop policy if exists "leave_balances_all"        on public.leave_balances;
create policy "leave_balances_select_all" on public.leave_balances for select using (true);
create policy "leave_balances_all"        on public.leave_balances for all using (true) with check (true);

-- Payroll Profiles
alter table public.payroll_profiles enable row level security;
drop policy if exists "payroll_profiles_select_all" on public.payroll_profiles;
drop policy if exists "payroll_profiles_all"        on public.payroll_profiles;
create policy "payroll_profiles_select_all" on public.payroll_profiles for select using (true);
create policy "payroll_profiles_all"        on public.payroll_profiles for all using (true) with check (true);

-- Payroll
alter table public.payroll enable row level security;
drop policy if exists "payroll_select_all" on public.payroll;
drop policy if exists "payroll_all"        on public.payroll;
create policy "payroll_select_all" on public.payroll for select using (true);
create policy "payroll_all"        on public.payroll for all using (true) with check (true);

-- Announcements
alter table public.announcements enable row level security;
drop policy if exists "announcements_select_all" on public.announcements;
drop policy if exists "announcements_all"        on public.announcements;
create policy "announcements_select_all" on public.announcements for select using (true);
create policy "announcements_all"        on public.announcements for all using (true) with check (true);

-- Holidays
alter table public.holidays enable row level security;
drop policy if exists "holidays_select_all" on public.holidays;
drop policy if exists "holidays_all"        on public.holidays;
create policy "holidays_select_all" on public.holidays for select using (true);
create policy "holidays_all"        on public.holidays for all using (true) with check (true);

-- =============================================================================
-- Y. STORAGE BUCKET — documents (ensure policies)
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

drop policy if exists "docs_storage_read"   on storage.objects;
drop policy if exists "docs_storage_insert" on storage.objects;
drop policy if exists "docs_storage_update" on storage.objects;
drop policy if exists "docs_storage_delete" on storage.objects;

create policy "docs_storage_read"   on storage.objects for select using (bucket_id = 'documents');
create policy "docs_storage_insert" on storage.objects for insert with check (bucket_id = 'documents');
create policy "docs_storage_update" on storage.objects for update using (bucket_id = 'documents');
create policy "docs_storage_delete" on storage.objects for delete using (bucket_id = 'documents');

-- =============================================================================
-- Z. PROJECT CODE GENERATOR (safe re-creation)
-- =============================================================================
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

create or replace function public.get_next_project_code()
returns text as $$
begin
  return public.generate_project_code();
end;
$$ language plpgsql;

-- =============================================================================
-- AA. REALTIME PUBLICATIONS (add all new tables)
-- =============================================================================
do $$ begin alter publication supabase_realtime add table public.employee_assessments; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.documents;            exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.attendance;           exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.tasks;                exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.leave_requests;       exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.announcements;        exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.projects;             exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.project_members;      exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.service_requests;     exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.parking_passes;       exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.complaints;           exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.employee_bank_details;exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.meeting_hall_bookings;exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.notifications;        exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.insurance_enrollments;exception when others then null; end $$;

-- =============================================================================
-- Done! All tables, columns, indexes, RLS and realtime are now in sync.
-- =============================================================================
