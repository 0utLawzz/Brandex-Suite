-- Staff email is a display label only. Authorization still uses profiles.role.
alter table public.profiles add column email text;
update public.profiles p set email = u.email from auth.users u where u.id = p.id;
create or replace function brandex_private.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$ begin
  insert into public.profiles (id, full_name, email)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''), new.email)
  on conflict (id) do nothing;
  return new;
end $$;
revoke all on function brandex_private.handle_new_user() from public;
create function brandex_private.sync_profile_email()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$ begin update public.profiles set email = new.email where id = new.id; return new; end $$;
revoke all on function brandex_private.sync_profile_email() from public;
create trigger brandex_profile_email_sync after update of email on auth.users
  for each row execute function brandex_private.sync_profile_email();

-- Assignment alone must not give a demoted Viewer write access.
drop policy cases_update on public.cases;
create policy cases_update on public.cases for update to authenticated
  using (brandex_private.current_brandex_role() = 'admin'
    or (brandex_private.current_brandex_role() = 'agent' and assigned_agent_id = (select auth.uid())))
  with check (brandex_private.current_brandex_role() = 'admin'
    or (brandex_private.current_brandex_role() = 'agent' and assigned_agent_id = (select auth.uid())));

-- A whitelist also protects id, created_at, and future case columns.
create or replace function brandex_private.prevent_agent_core_case_edits()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$ begin
  if brandex_private.current_brandex_role() = 'agent'
    and (to_jsonb(old) - array['status','assessment','updated_at'])
      is distinct from (to_jsonb(new) - array['status','assessment','updated_at']) then
    raise exception 'Agents can only update case status and assessment';
  end if;
  return new;
end $$;
revoke all on function brandex_private.prevent_agent_core_case_edits() from public;
create index if not exists cases_assigned_agent_idx on public.cases(assigned_agent_id);
