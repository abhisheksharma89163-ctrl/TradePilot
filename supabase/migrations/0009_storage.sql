-- ============================================================
-- 0009 — STORAGE (private document vault)
-- ============================================================

-- Private bucket for all uploaded business documents.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Files are stored under  {company_id}/{...path}.
-- Access is granted only to active members of that company.
-- The leading folder name must equal a company_id the user belongs to.

drop policy if exists "documents_read" on storage.objects;
create policy "documents_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and public.is_company_member((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "documents_insert" on storage.objects;
create policy "documents_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and public.is_company_member((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "documents_delete" on storage.objects;
create policy "documents_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and public.is_company_member((storage.foldername(name))[1]::uuid)
  );
