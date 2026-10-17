-- Additive Suite-only Drive records. No existing case, ledger or role data changed.
create table public.drive_series (
 code text primary key check (code ~ '^[A-Z][A-Z0-9]{0,11}$'),
 root_folder_id text not null check (root_folder_id ~ '^[A-Za-z0-9_-]{10,200}$')
);
insert into public.drive_series values
 ('X','18T0MojE1IiT7uIz9P8Sthlamj8icR8X6'),('A','1Ke_B9vI_DdiiXPTTCBDtS4Ny6l73kIBU');
create table public.drive_clients (
 client_id uuid primary key references public.clients on delete restrict,
 series text not null references public.drive_series,
 folder_id text not null check (folder_id ~ '^[A-Za-z0-9_-]{10,200}$')
);
create table public.drive_cases (
 case_id uuid primary key references public.cases on delete restrict,
 folder_id text not null unique check (folder_id ~ '^[A-Za-z0-9_-]{10,200}$')
);
create table public.drive_files (
 upload_id uuid primary key,
 case_id uuid not null references public.cases on delete restrict,
 file_id text not null unique,
 file_name text not null,
 mime_type text not null check (mime_type in ('application/pdf','image/png','image/jpeg')),
 byte_size integer not null check (byte_size between 1 and 20971520),
 sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
 uploaded_by uuid not null references auth.users,
 created_at timestamptz not null default now()
);
create index drive_files_case_date on public.drive_files(case_id,created_at desc);
create table brandex_private.drive_leases (
 client_id uuid primary key references public.clients on delete cascade,
 operation uuid not null,
 expires_at timestamptz not null
);
alter table brandex_private.drive_leases enable row level security;
revoke all on brandex_private.drive_leases from public,anon,authenticated;

create function public.claim_suite_drive(p_client uuid,p_operation uuid)
returns boolean language plpgsql security definer set search_path=''
as $$
declare won boolean;
begin
 if brandex_private.current_brandex_role() is distinct from 'admin' then raise exception 'Admin required'; end if;
 insert into brandex_private.drive_leases values(p_client,p_operation,now()+interval '10 minutes')
 on conflict(client_id) do update set operation=excluded.operation,expires_at=excluded.expires_at
 where brandex_private.drive_leases.expires_at < now()
 returning true into won;
 return coalesce(won,false);
end $$;
create function public.release_suite_drive(p_client uuid,p_operation uuid)
returns void language plpgsql security definer set search_path=''
as $$ begin
 if brandex_private.current_brandex_role() is distinct from 'admin' then raise exception 'Admin required'; end if;
 delete from brandex_private.drive_leases where client_id=p_client and operation=p_operation;
end $$;
revoke all on function public.claim_suite_drive(uuid,uuid),public.release_suite_drive(uuid,uuid) from public,anon;
grant execute on function public.claim_suite_drive(uuid,uuid),public.release_suite_drive(uuid,uuid) to authenticated;

do $$ declare t text; begin
 foreach t in array array['drive_series','drive_clients','drive_cases','drive_files'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant select,insert on public.%I to authenticated',t);
 execute format('create policy staff_read on public.%I for select to authenticated using (brandex_private.current_brandex_role() in (''admin'',''viewer''))',t);
 execute format('create policy admin_insert on public.%I for insert to authenticated with check (brandex_private.current_brandex_role() = ''admin'')',t);
 end loop;
end $$;
-- File history and folder bindings are append-only through the app. No destructive API.
create policy own_upload on public.drive_files as restrictive for insert to authenticated
 with check (uploaded_by=auth.uid());
