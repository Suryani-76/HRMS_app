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
