-- Migration 0014: Half Day Leave Support
-- First Half: 9:30 AM to 1:30 PM
-- Second Half: 2:30 PM to 6:30 PM

alter table if exists public.leave_requests 
  add column if not exists is_half_day boolean not null default false,
  add column if not exists half_day_session text;
