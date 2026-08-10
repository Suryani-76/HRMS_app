-- Migration: 0006_meeting_hall
-- Description: Adds Meeting Hall Booking module tables, policies, and realtime support.

-- Create meeting_hall_bookings table
create table public.meeting_hall_bookings (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  requested_by uuid references public.employees(id) not null,
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected')),
  admin_comment text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Indexes for performance on queries
create index if not exists idx_meeting_hall_time on public.meeting_hall_bookings(start_time, end_time);
create index if not exists idx_meeting_hall_status on public.meeting_hall_bookings(status);

-- Enable Row Level Security
alter table public.meeting_hall_bookings enable row level security;

-- Policy: Everyone can read bookings
create policy "meeting_hall_bookings read all" on public.meeting_hall_bookings
  for select using (true);

-- Policy: Authenticated users can insert
create policy "meeting_hall_bookings insert authenticated" on public.meeting_hall_bookings
  for insert with check (auth.uid() is not null);

-- Policy: Admins can update and delete
create policy "meeting_hall_bookings update admin" on public.meeting_hall_bookings
  for update using (
    exists (
      select 1 from public.users u
      join public.roles r on u.role_id = r.id
      where u.id = auth.uid() and r.name = 'Admin'
    )
  );

create policy "meeting_hall_bookings delete admin" on public.meeting_hall_bookings
  for delete using (
    exists (
      select 1 from public.users u
      join public.roles r on u.role_id = r.id
      where u.id = auth.uid() and r.name = 'Admin'
    )
  );

-- Trigger to automatically update the 'updated_at' column
create trigger handle_updated_at_meeting_hall
  after update on public.meeting_hall_bookings
  for each row
  execute procedure public.handle_updated_at();

-- Add table to realtime publication
alter publication supabase_realtime add table public.meeting_hall_bookings;
