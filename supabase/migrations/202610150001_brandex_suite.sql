-- Brandex Suite: clean-start schema. No legacy data import is intended.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'viewer' check (role in ('admin', 'viewer', 'agent')),
  created_at timestamptz not null default now()
);

create or replace function public.current_brandex_role()
returns text language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  client_code text not null unique,
  trading_as text not null,
  address text not null,
  contact_info jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  case_prefix text not null,
  case_number text not null,
  origin text not null check (origin in ('fresh', 'stage2', 'stage3')),
  stage text not null default 'Filing',
  status text not null default 'Ready',
  assessment text,
  assigned_agent_id uuid references public.profiles(id) on delete set null,
  images jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (case_prefix, case_number)
);

create table public.ledger (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  type text not null default 'payment',
  status text not null default 'pending' check (status in ('paid', 'pending')),
  date date,
  created_at timestamptz not null default now()
);

create table public.template_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table public.templates (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.template_categories(id) on delete restrict,
  name text not null,
  content text not null,
  placeholders jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  template_id uuid not null references public.templates(id) on delete restrict,
  generated_file_url text not null,
  generated_at timestamptz not null default now(),
  generated_by uuid references public.profiles(id) on delete set null
);

insert into public.template_categories (name, description) values
  ('Filing', 'Initial application filing'), ('Examination', 'Examination responses'),
  ('Acknowledgment', 'Acknowledgment and notification documents'), ('Opposition', 'Opposition documents'),
  ('Counter Statement', 'Counter statement documents')
on conflict (name) do nothing;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger cases_touch_updated_at before update on public.cases
for each row execute function public.touch_updated_at();

-- Agents may update workflow fields only. This database guard protects the rule
-- even if a future client accidentally sends the full case object.
create or replace function public.prevent_agent_core_case_edits()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if public.current_brandex_role() = 'agent' then
    if old.client_id is distinct from new.client_id
      or old.case_prefix is distinct from new.case_prefix
      or old.case_number is distinct from new.case_number
      or old.origin is distinct from new.origin
      or old.assigned_agent_id is distinct from new.assigned_agent_id
      or old.images is distinct from new.images then
      raise exception 'Agents can only update case stage, status, and assessment';
    end if;
  end if;
  return new;
end $$;
create trigger cases_agent_core_guard before update on public.cases
for each row execute function public.prevent_agent_core_case_edits();

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.cases enable row level security;
alter table public.ledger enable row level security;
alter table public.template_categories enable row level security;
alter table public.templates enable row level security;
alter table public.documents enable row level security;

create policy profiles_self_read on public.profiles for select using (id = auth.uid() or public.current_brandex_role() = 'admin');
create policy profiles_admin_write on public.profiles for all using (public.current_brandex_role() = 'admin') with check (public.current_brandex_role() = 'admin');

create policy clients_read on public.clients for select using (public.current_brandex_role() in ('admin','viewer','agent'));
create policy clients_admin_write on public.clients for all using (public.current_brandex_role() = 'admin') with check (public.current_brandex_role() = 'admin');

create policy cases_read on public.cases for select using (
  public.current_brandex_role() in ('admin','viewer') or assigned_agent_id = auth.uid()
);
create policy cases_admin_insert on public.cases for insert with check (public.current_brandex_role() = 'admin');
create policy cases_update on public.cases for update using (
  public.current_brandex_role() = 'admin' or assigned_agent_id = auth.uid()
) with check (public.current_brandex_role() = 'admin' or assigned_agent_id = auth.uid());
create policy cases_admin_delete on public.cases for delete using (public.current_brandex_role() = 'admin');

create policy ledger_read on public.ledger for select using (
  public.current_brandex_role() in ('admin','viewer') or exists (select 1 from public.cases c where c.id = case_id and c.assigned_agent_id = auth.uid())
);
create policy ledger_admin_write on public.ledger for all using (public.current_brandex_role() = 'admin') with check (public.current_brandex_role() = 'admin');

create policy categories_read on public.template_categories for select using (auth.uid() is not null);
create policy categories_admin_write on public.template_categories for all using (public.current_brandex_role() = 'admin') with check (public.current_brandex_role() = 'admin');
create policy templates_read on public.templates for select using (auth.uid() is not null);
create policy templates_admin_write on public.templates for all using (public.current_brandex_role() = 'admin') with check (public.current_brandex_role() = 'admin');

create policy documents_read on public.documents for select using (
  public.current_brandex_role() in ('admin','viewer') or exists (select 1 from public.cases c where c.id = case_id and c.assigned_agent_id = auth.uid())
);
create policy documents_insert on public.documents for insert with check (
  public.current_brandex_role() = 'admin' or exists (select 1 from public.cases c where c.id = case_id and c.assigned_agent_id = auth.uid())
);

insert into storage.buckets (id, name, public) values ('case-images', 'case-images', false), ('documents', 'documents', false)
on conflict (id) do nothing;
create policy case_images_read on storage.objects for select using (bucket_id = 'case-images' and auth.uid() is not null);
create policy case_images_write on storage.objects for insert with check (bucket_id = 'case-images' and (public.current_brandex_role() = 'admin' or public.current_brandex_role() = 'agent'));
create policy documents_storage_read on storage.objects for select using (bucket_id = 'documents' and auth.uid() is not null);
create policy documents_storage_write on storage.objects for insert with check (bucket_id = 'documents' and auth.uid() is not null);
