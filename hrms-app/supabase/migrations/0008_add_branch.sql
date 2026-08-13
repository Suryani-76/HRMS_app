-- Add missing branch column to employees table if it doesn't exist
alter table public.employees add column if not exists branch text default 'HQ';
