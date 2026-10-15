-- Phase 1 hardening: keep authorization helpers private and align policies
-- exactly with the Admin / Viewer / Agent contract in AGENTS.md.

create schema if not exists brandex_private;
revoke all on schema brandex_private from public;

create or replace function brandex_private.current_brandex_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role from public.profiles where id = (select auth.uid());
$$;
revoke all on function brandex_private.current_brandex_role() from public;
grant execute on function brandex_private.current_brandex_role() to authenticated;

-- A profile is created automatically for every Auth user. Role defaults to
-- viewer; promotion to admin/agent is an explicit admin/service operation.
create or replace function brandex_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function brandex_private.handle_new_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function brandex_private.handle_new_user();

-- Replace the initial policies with explicit authenticated targets and the
-- private role helper. This also avoids recursive profiles-policy lookups.
drop policy if exists profiles_self_read on public.profiles;
drop policy if exists profiles_admin_write on public.profiles;
drop policy if exists clients_read on public.clients;
drop policy if exists clients_admin_write on public.clients;
drop policy if exists cases_read on public.cases;
drop policy if exists cases_admin_insert on public.cases;
drop policy if exists cases_update on public.cases;
drop policy if exists cases_admin_delete on public.cases;
drop policy if exists ledger_read on public.ledger;
drop policy if exists ledger_admin_write on public.ledger;
drop policy if exists categories_read on public.template_categories;
drop policy if exists categories_admin_write on public.template_categories;
drop policy if exists templates_read on public.templates;
drop policy if exists templates_admin_write on public.templates;
drop policy if exists documents_read on public.documents;
drop policy if exists documents_insert on public.documents;
drop policy if exists case_images_read on storage.objects;
drop policy if exists case_images_write on storage.objects;
drop policy if exists documents_storage_read on storage.objects;
drop policy if exists documents_storage_write on storage.objects;

drop function if exists public.current_brandex_role();

create policy profiles_self_read on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or brandex_private.current_brandex_role() = 'admin');
create policy profiles_admin_write on public.profiles
  for all to authenticated
  using (brandex_private.current_brandex_role() = 'admin')
  with check (brandex_private.current_brandex_role() = 'admin');

create policy clients_read on public.clients
  for select to authenticated
  using (
    brandex_private.current_brandex_role() in ('admin', 'viewer')
    or exists (
      select 1 from public.cases c
      where c.client_id = clients.id and c.assigned_agent_id = (select auth.uid())
    )
  );
create policy clients_admin_write on public.clients
  for all to authenticated
  using (brandex_private.current_brandex_role() = 'admin')
  with check (brandex_private.current_brandex_role() = 'admin');

create policy cases_read on public.cases
  for select to authenticated
  using (
    brandex_private.current_brandex_role() in ('admin', 'viewer')
    or assigned_agent_id = (select auth.uid())
  );
create policy cases_admin_insert on public.cases
  for insert to authenticated
  with check (brandex_private.current_brandex_role() = 'admin');
create policy cases_update on public.cases
  for update to authenticated
  using (
    brandex_private.current_brandex_role() = 'admin'
    or assigned_agent_id = (select auth.uid())
  )
  with check (
    brandex_private.current_brandex_role() = 'admin'
    or assigned_agent_id = (select auth.uid())
  );
create policy cases_admin_delete on public.cases
  for delete to authenticated
  using (brandex_private.current_brandex_role() = 'admin');

create policy ledger_read on public.ledger
  for select to authenticated
  using (
    brandex_private.current_brandex_role() in ('admin', 'viewer')
    or exists (
      select 1 from public.cases c
      where c.id = ledger.case_id and c.assigned_agent_id = (select auth.uid())
    )
  );
create policy ledger_admin_write on public.ledger
  for all to authenticated
  using (brandex_private.current_brandex_role() = 'admin')
  with check (brandex_private.current_brandex_role() = 'admin');

create policy categories_read on public.template_categories
  for select to authenticated using (true);
create policy categories_admin_write on public.template_categories
  for all to authenticated
  using (brandex_private.current_brandex_role() = 'admin')
  with check (brandex_private.current_brandex_role() = 'admin');
create policy templates_read on public.templates
  for select to authenticated using (true);
create policy templates_admin_write on public.templates
  for all to authenticated
  using (brandex_private.current_brandex_role() = 'admin')
  with check (brandex_private.current_brandex_role() = 'admin');

create policy documents_read on public.documents
  for select to authenticated
  using (
    brandex_private.current_brandex_role() in ('admin', 'viewer')
    or exists (
      select 1 from public.cases c
      where c.id = documents.case_id and c.assigned_agent_id = (select auth.uid())
    )
  );
create policy documents_insert on public.documents
  for insert to authenticated
  with check (
    brandex_private.current_brandex_role() = 'admin'
    or exists (
      select 1 from public.cases c
      where c.id = documents.case_id and c.assigned_agent_id = (select auth.uid())
    )
  );

-- Agents may change status and assessment only. In particular, stage is a
-- protected case field under the Phase 1 contract.
drop trigger if exists cases_agent_core_guard on public.cases;
drop function if exists public.prevent_agent_core_case_edits();

create or replace function brandex_private.prevent_agent_core_case_edits()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if brandex_private.current_brandex_role() = 'agent' then
    if old.client_id is distinct from new.client_id
      or old.case_prefix is distinct from new.case_prefix
      or old.case_number is distinct from new.case_number
      or old.origin is distinct from new.origin
      or old.stage is distinct from new.stage
      or old.assigned_agent_id is distinct from new.assigned_agent_id
      or old.images is distinct from new.images then
      raise exception 'Agents can only update case status and assessment';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function brandex_private.prevent_agent_core_case_edits() from public;
create trigger cases_agent_core_guard before update on public.cases
for each row execute function brandex_private.prevent_agent_core_case_edits();

drop policy if exists case_images_read on storage.objects;
drop policy if exists case_images_write on storage.objects;
drop policy if exists documents_storage_read on storage.objects;
drop policy if exists documents_storage_write on storage.objects;

create policy case_images_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'case-images' and (
      brandex_private.current_brandex_role() in ('admin', 'viewer')
      or exists (
        select 1 from public.cases c
        where c.id::text = (storage.foldername(name))[1]
          and c.assigned_agent_id = (select auth.uid())
      )
    )
  );
create policy case_images_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'case-images' and (
      brandex_private.current_brandex_role() = 'admin'
      or exists (
        select 1 from public.cases c
        where c.id::text = (storage.foldername(name))[1]
          and c.assigned_agent_id = (select auth.uid())
      )
    )
  );
create policy documents_storage_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents' and (
      brandex_private.current_brandex_role() in ('admin', 'viewer')
      or exists (
        select 1 from public.cases c
        where c.id::text = (storage.foldername(name))[1]
          and c.assigned_agent_id = (select auth.uid())
      )
    )
  );
create policy documents_storage_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents' and (
      brandex_private.current_brandex_role() = 'admin'
      or exists (
        select 1 from public.cases c
        where c.id::text = (storage.foldername(name))[1]
          and c.assigned_agent_id = (select auth.uid())
      )
    )
  );
