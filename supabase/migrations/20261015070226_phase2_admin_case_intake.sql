-- Phase 2: case intake creation and image upload are Admin-only.
-- Keep the restriction in both the public tables and Storage policies.

drop policy if exists clients_admin_write on public.clients;
create policy clients_admin_write on public.clients
  for all to authenticated
  using (brandex_private.current_brandex_role() = 'admin')
  with check (brandex_private.current_brandex_role() = 'admin');

drop policy if exists cases_admin_insert on public.cases;
create policy cases_admin_insert on public.cases
  for insert to authenticated
  with check (brandex_private.current_brandex_role() = 'admin');

drop policy if exists case_images_write on storage.objects;
create policy case_images_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'case-images'
    and brandex_private.current_brandex_role() = 'admin'
    and exists (
      select 1 from public.cases c
      where c.id::text = (storage.foldername(name))[1]
    )
  );
