-- Allow Admin intake rollback to remove uploaded objects before deleting a case.
create policy case_images_admin_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'case-images'
    and brandex_private.current_brandex_role() = 'admin'
    and exists (
      select 1 from public.cases c
      where c.id::text = (storage.foldername(name))[1]
    )
  );
