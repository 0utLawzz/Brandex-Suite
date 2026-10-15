alter table public.templates
  add column description text not null default '',
  add column allowed_origins text[] not null default array['fresh','stage2','stage3']::text[],
  add column archived boolean not null default false,
  add constraint templates_valid_origins check (cardinality(allowed_origins) > 0 and allowed_origins <@ array['fresh','stage2','stage3']::text[]);
alter table public.documents
  add column template_name text not null default '',
  add column file_name text not null default '',
  add column snapshot jsonb not null default '{}'::jsonb;
create unique index documents_storage_path_key on public.documents (generated_file_url);

-- Agents may change only case status/assessment, never templates/documents.
drop policy documents_insert on public.documents;
create policy documents_admin_write on public.documents
  for all to authenticated
  using (brandex_private.current_brandex_role() = 'admin')
  with check (brandex_private.current_brandex_role() = 'admin');
drop policy documents_storage_write on storage.objects;
create policy documents_storage_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents' and brandex_private.current_brandex_role() = 'admin'
    and exists (select 1 from public.cases c where c.id::text = (storage.foldername(name))[1]));
create policy documents_storage_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents' and brandex_private.current_brandex_role() = 'admin');

-- App-owned trigger needs no untrusted schema lookup.
alter function public.touch_updated_at() set search_path = pg_catalog, public;
