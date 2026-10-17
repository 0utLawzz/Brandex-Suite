-- Suite-native operations. Legacy ledger rows stay separate; no inferred money backfill.
create table public.case_series(code text primary key check(code ~ '^[A-Z][A-Z0-9]{0,11}$'),label text not null);
insert into public.case_series values ('X','Clients'),('A','Consultants'),('N','N series');
insert into public.case_series select distinct split_part(client_code,'-',1),'Existing series' from public.clients where client_code ~ '^[A-Z][A-Z0-9]{0,11}-[0-9]{3,6}$' on conflict do nothing;
alter table public.clients add column legacy_client_codes text[] not null default '{}';
alter table public.clients add column payment_terms text not null default 'monthly' check(payment_terms in ('monthly','advance'));
alter table public.clients add column stage_rates jsonb not null default '{}'::jsonb;
alter table public.clients add column city text not null default '';
alter table public.cases add column drive_sync_pending boolean not null default false;
alter table public.cases add column application_name text not null default '';
alter table public.cases add column tm_number text check(tm_number ~ '^[0-9]{6}$');
alter table public.cases add column nice_class integer check(nice_class between 1 and 45);
alter table public.cases add column identity_confirmed boolean not null default false;
alter table public.cases add column workflow_stage integer not null default 1 check(workflow_stage between 1 and 4);
alter table public.cases add column workflow_step text not null default 'review';
alter table public.cases add column event_date date;
alter table public.cases add column filed_on date;
alter table public.cases add column accepted_on date;
alter table public.cases add column published_on date;
alter table public.cases add column fee_submitted_on date;
alter table public.cases add column certificate_on date;
alter table public.cases add column reactivated_on date;
alter table public.cases add column resume_step text;
alter table public.cases add column restoration_approved_on date;
alter table public.cases add column restoration_filed_on date;
revoke insert,update,delete on public.ledger from authenticated;
revoke delete on public.cases from authenticated;
create unique index suite_tm_identity on public.cases(tm_number) where tm_number is not null;
alter table public.cases drop constraint cases_case_prefix_case_number_key;
create unique index suite_client_case_identity on public.cases(client_id,case_number) where identity_confirmed;
create index suite_case_workflow on public.cases(workflow_stage,workflow_step,event_date);

create table public.suite_charges(
 id uuid primary key default gen_random_uuid(),client_id uuid not null references public.clients,
 case_id uuid not null references public.cases,stage_no integer check(stage_no between 1 and 4),
 label text not null,amount numeric(12,2) check(amount>=0),voided boolean not null default false,
 created_at timestamptz not null default now(),created_by uuid references auth.users
);
create unique index suite_one_stage_charge on public.suite_charges(case_id,stage_no) where stage_no is not null;
create table public.suite_receivings(
 id uuid primary key,client_id uuid not null references public.clients,amount numeric(12,2) not null check(amount>0),
 received_on date not null,payer_name text not null default '',reference text not null default '',
 voided boolean not null default false,version integer not null default 1,created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),created_by uuid references auth.users
);
create table public.suite_allocations(
 receiving_id uuid not null references public.suite_receivings,charge_id uuid not null references public.suite_charges,
 amount numeric(12,2) not null check(amount>0),primary key(receiving_id,charge_id)
);
create table public.suite_receipts(
 id uuid primary key default gen_random_uuid(),receiving_id uuid not null references public.suite_receivings,
 case_id uuid not null references public.cases,receipt_number text not null unique default ('BR-'||upper(replace(gen_random_uuid()::text,'-',''))),
 active boolean not null default true,snapshot jsonb not null default '{}',unique(receiving_id,case_id)
);
create table public.suite_events(
 id uuid primary key default gen_random_uuid(),case_id uuid not null references public.cases,
 event text not null,event_date date not null,from_step text,to_step text,note text not null default '',
 actor uuid references auth.users,created_at timestamptz not null default now()
);
create table public.suite_audit(
 id bigint generated always as identity primary key,entity text not null,row_ref text,
 old_value jsonb,new_value jsonb,actor uuid,created_at timestamptz not null default now()
);
create table public.service_associates(
 id uuid primary key default gen_random_uuid(),name text not null,contact text not null default '',
 default_fee numeric(12,2) not null default 1000 check(default_fee>=0),active boolean not null default true
);
create table public.associate_fees(
 id uuid primary key default gen_random_uuid(),case_id uuid not null references public.cases,
 associate_id uuid not null references public.service_associates,stage_no integer not null check(stage_no between 1 and 4),
 amount numeric(12,2) not null check(amount>=0),assigned_on date not null,created_at timestamptz not null default now(),unique(case_id,stage_no)
);
create table public.associate_payments(
 id uuid primary key,associate_id uuid not null references public.service_associates,amount numeric(12,2) not null check(amount>0),
 paid_on date not null,reference text not null default '',voided boolean not null default false,version integer not null default 1,
 created_at timestamptz not null default now()
);
create table public.associate_allocations(
 payment_id uuid not null references public.associate_payments,fee_id uuid not null references public.associate_fees,
 amount numeric(12,2) not null check(amount>0),primary key(payment_id,fee_id)
);
create table public.case_delivery(
 case_id uuid primary key references public.cases,method text not null check(method in ('courier','hand')),
 company text,tracking text,destination text,dispatched_on date not null,delivered_on date,
 receipt_file_id uuid references public.drive_files(upload_id),updated_at timestamptz not null default now()
);
create index suite_charge_case on public.suite_charges(case_id);
create index suite_charge_client on public.suite_charges(client_id,created_at);
create index suite_receiving_client on public.suite_receivings(client_id,created_at);
create index suite_allocation_charge on public.suite_allocations(charge_id);
create index suite_events_case on public.suite_events(case_id,created_at);
create index suite_receipt_case on public.suite_receipts(case_id);
create index associate_fee_owner on public.associate_fees(associate_id,assigned_on);
create index associate_payment_owner on public.associate_payments(associate_id);
create index associate_allocation_fee on public.associate_allocations(fee_id);

-- Active staff are Admin + Viewer; retain accounts and old assignment data as history.
update public.profiles set role='viewer' where role='agent';
alter table public.profiles add constraint suite_staff_roles check(role in ('admin','viewer'));
drop policy cases_read on public.cases;
create policy cases_read on public.cases for select to authenticated using(brandex_private.current_brandex_role() in ('admin','viewer'));
drop policy cases_update on public.cases;
create policy cases_update on public.cases for update to authenticated using(brandex_private.current_brandex_role()='admin') with check(brandex_private.current_brandex_role()='admin');

create function brandex_private.suite_audit_row() returns trigger language plpgsql security definer set search_path='' as $$
declare o jsonb;n jsonb;begin
 if tg_op<>'INSERT' then o=to_jsonb(old);end if;if tg_op<>'DELETE' then n=to_jsonb(new);end if;
 insert into public.suite_audit(entity,row_ref,old_value,new_value,actor) values(tg_table_name,coalesce(n->>'id',n->>'case_id',n->>'receiving_id',n->>'payment_id',o->>'id'),o,n,auth.uid());return coalesce(new,old);
end $$;
revoke all on function brandex_private.suite_audit_row() from public,anon,authenticated;
do $$ declare t text;begin
 foreach t in array array['case_series','suite_charges','suite_receivings','suite_allocations','suite_receipts','suite_events','suite_audit','service_associates','associate_fees','associate_payments','associate_allocations','case_delivery'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('create policy staff_read on public.%I for select to authenticated using(brandex_private.current_brandex_role() in (''admin'',''viewer''))',t);
 if t not in ('suite_audit','suite_events') then execute format('create trigger audit_row after insert or update or delete on public.%I for each row execute function brandex_private.suite_audit_row()',t);end if;
 end loop;
end $$;

create view public.suite_charge_position with(security_invoker=true) as
 select c.*,coalesce(a.received,0)::numeric(12,2) received,
 (c.amount-coalesce(a.received,0))::numeric(12,2) outstanding,
 cl.client_code||'-'||cs.case_number case_reference,cs.application_name,cs.tm_number
 from public.suite_charges c join public.cases cs on cs.id=c.case_id join public.clients cl on cl.id=c.client_id
 left join lateral(select sum(x.amount) received from public.suite_allocations x join public.suite_receivings r on r.id=x.receiving_id where x.charge_id=c.id and not r.voided)a on true;
grant select on public.suite_charge_position to authenticated;
create view public.associate_fee_position with(security_invoker=true) as
 select f.*,s.name,cl.client_code||'-'||c.case_number case_reference,coalesce(p.paid,0)::numeric(12,2) paid,
 (f.amount-coalesce(p.paid,0))::numeric(12,2) outstanding
 from public.associate_fees f join public.service_associates s on s.id=f.associate_id join public.cases c on c.id=f.case_id join public.clients cl on cl.id=c.client_id
 left join lateral(select sum(a.amount) paid from public.associate_allocations a join public.associate_payments p on p.id=a.payment_id where a.fee_id=f.id and not p.voided)p on true;
grant select on public.associate_fee_position to authenticated;

create function brandex_private.suite_stage_charge(p_case uuid,p_stage integer) returns void language plpgsql set search_path='' as $$
begin
 insert into public.suite_charges(client_id,case_id,stage_no,label,amount,created_by)
 select c.client_id,c.id,p_stage,'Stage '||p_stage,nullif(cl.stage_rates->>p_stage::text,'')::numeric,auth.uid()
 from public.cases c join public.clients cl on cl.id=c.client_id where c.id=p_case
 on conflict(case_id,stage_no) where stage_no is not null do nothing;
end $$;
revoke all on function brandex_private.suite_stage_charge(uuid,integer) from public,anon,authenticated;
create function brandex_private.suite_new_case_charge() returns trigger language plpgsql security definer set search_path='' as $$
begin if new.identity_confirmed then perform brandex_private.suite_stage_charge(new.id,new.workflow_stage);end if;return new;end $$;
revoke all on function brandex_private.suite_new_case_charge() from public,anon,authenticated;
create trigger suite_initial_charge after insert on public.cases for each row execute function brandex_private.suite_new_case_charge();

-- Operations writes are transactional RPCs; direct updates cannot skip workflow/payment checks.
create function brandex_private.suite_case_guard() returns trigger language plpgsql set search_path='' as $$
begin
 if auth.role()='service_role' then return new;end if;
 if tg_op='INSERT' then
  if (new.origin='fresh' and (new.workflow_stage<>1 or new.workflow_step<>'registered')) or (new.origin='stage2' and (new.workflow_stage<>2 or new.workflow_step<>'review')) or (new.origin='stage3' and (new.workflow_stage<>3 or new.workflow_step<>'review')) then raise exception 'Register first, then record the actual workflow event';end if;
  if not new.identity_confirmed or new.application_name='' or new.case_number !~ '^[0-9]{3,6}$' then raise exception 'Use Case Registration with a mark name and case reference';end if;
 elsif (to_jsonb(new)-array['assessment','images','updated_at','drive_sync_pending']) is distinct from (to_jsonb(old)-array['assessment','images','updated_at','drive_sync_pending'])
  and coalesce(current_setting('brandex.suite_rpc',true),'')<>'on' then raise exception 'Use the case workflow/identity action';
 end if;
 return new;
end $$;
revoke all on function brandex_private.suite_case_guard() from public,anon,authenticated;
create trigger suite_case_guard before insert or update on public.cases for each row execute function brandex_private.suite_case_guard();

create function public.suite_action(p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 c public.cases;cl public.clients;r public.suite_receivings;ch public.suite_charges;pay public.associate_payments;
 v_case uuid;v_client uuid;v_id uuid;v_assoc uuid;v_amount numeric;v_sum numeric;v_left numeric;v_due numeric;
 v_stage integer;v_date date;v_step text;v_label text;v_item jsonb;v_snapshot jsonb;v_fee public.associate_fees;
 today date:=(now() at time zone 'Asia/Karachi')::date;
begin
 if brandex_private.current_brandex_role() is distinct from 'admin' then raise exception 'Admin access required';end if;
 if jsonb_typeof(p_data)<>'object' then raise exception 'Invalid action';end if;
 perform set_config('brandex.suite_rpc','on',true);
 if p_action='series' then
  v_label=upper(trim(p_data->>'code'));if v_label is null or v_label !~ '^[A-Z][A-Z0-9]{0,11}$' then raise exception 'Enter a series code';end if;
  insert into public.case_series(code,label)values(v_label,left(coalesce(nullif(trim(p_data->>'label'),''),v_label),100));return jsonb_build_object('code',v_label);
 elsif p_action='client' then
  v_client=(p_data->>'id')::uuid;select * into cl from public.clients where id=v_client for update;if not found then raise exception 'Client not found';end if;
  if p_data->>'payment_terms' not in ('monthly','advance') then raise exception 'Choose valid payment terms';end if;
  if jsonb_typeof(p_data->'stage_rates')<>'object' then raise exception 'Set stage rates';end if;
  for v_label,v_item in select key,value from jsonb_each(p_data->'stage_rates') loop
   if v_label not in ('1','2','3','4') or jsonb_typeof(v_item)<>'number' or v_item::text::numeric<0 or v_item::text::numeric>9999999999.99 or v_item::text::numeric<>round(v_item::text::numeric,2) then raise exception 'Rates must be non-negative amounts with at most two decimals';end if;
  end loop;
  v_label=upper(trim(coalesce(p_data->>'client_code',cl.client_code)));
  if v_label !~ '^[A-Z][A-Z0-9]{0,11}-[0-9]{3,6}$' or not exists(select 1 from public.case_series where code=split_part(v_label,'-',1)) then raise exception 'Choose a configured series and client code such as X-254';end if;
  update public.clients set client_code=v_label,legacy_client_codes=case when client_code<>v_label then array_append(legacy_client_codes,client_code) else legacy_client_codes end,payment_terms=p_data->>'payment_terms',stage_rates=p_data->'stage_rates',city=left(coalesce(p_data->>'city',city),120) where id=v_client;
  insert into public.suite_audit(entity,row_ref,old_value,new_value,actor) select 'clients',v_client::text,to_jsonb(cl),to_jsonb(x),auth.uid() from public.clients x where id=v_client;
  return jsonb_build_object('id',v_client);
 elsif p_action='associate' then
  if nullif(trim(p_data->>'name'),'') is null then raise exception 'Associate name required';end if;
  v_amount=coalesce((p_data->>'default_fee')::numeric,1000);if v_amount<0 or v_amount>9999999999.99 or v_amount<>round(v_amount,2) then raise exception 'Invalid agreed fee';end if;
  insert into public.service_associates(name,contact,default_fee) values(left(trim(p_data->>'name'),200),left(coalesce(p_data->>'contact',''),300),v_amount) returning id into v_id;return jsonb_build_object('id',v_id);
 elsif p_action in ('receiving','void_receiving') then
  v_client=(p_data->>'client_id')::uuid;perform 1 from public.clients where id=v_client for update;if not found then raise exception 'Client not found';end if;
  v_id=(p_data->>'id')::uuid;select * into r from public.suite_receivings where id=v_id for update;
  if found and (r.client_id<>v_client or r.version<>coalesce((p_data->>'version')::integer,0) or r.voided) then raise exception 'Receiving changed or is VOID; reload before editing';end if;
  if p_action='void_receiving' then
   if r.id is null then raise exception 'Receiving not found';end if;
   update public.suite_receivings set voided=true,version=version+1,updated_at=now() where id=v_id;
   update public.suite_receipts set active=false where receiving_id=v_id;return jsonb_build_object('id',v_id);
  end if;
  v_amount=(p_data->>'amount')::numeric;v_date=(p_data->>'date')::date;
  if v_amount is null or v_amount<=0 or v_amount>9999999999.99 or v_amount<>round(v_amount,2) or v_date is null or v_date>today then raise exception 'Enter a valid amount/date';end if;
  if jsonb_typeof(p_data->'allocations')<>'array' or jsonb_array_length(p_data->'allocations')>200 then raise exception 'Invalid allocations';end if;
  if r.id is null then
   insert into public.suite_receivings(id,client_id,amount,received_on,payer_name,reference,created_by) values(v_id,v_client,v_amount,v_date,left(coalesce(p_data->>'payer_name',''),200),left(coalesce(p_data->>'reference',''),1000),auth.uid());
  else
   update public.suite_receivings set amount=v_amount,received_on=v_date,payer_name=left(coalesce(p_data->>'payer_name',''),200),reference=left(coalesce(p_data->>'reference',''),1000),version=version+1,updated_at=now() where id=v_id;
  end if;
  delete from public.suite_allocations where receiving_id=v_id;v_sum=0;
  for v_item in select value from jsonb_array_elements(p_data->'allocations') loop
   select * into ch from public.suite_charges where id=(v_item->>'charge_id')::uuid for update;
   if not found or ch.client_id<>v_client or ch.voided or ch.amount is null then raise exception 'Allocation charge is unavailable/unpriced or belongs to another client';end if;
   v_due=(v_item->>'amount')::numeric;
   if v_due is null or v_due<=0 or v_due<>round(v_due,2) then raise exception 'Invalid allocation amount';end if;
   select ch.amount-coalesce(sum(a.amount),0) into v_left from public.suite_allocations a join public.suite_receivings rr on rr.id=a.receiving_id where a.charge_id=ch.id and not rr.voided;
   if v_due>v_left then raise exception 'Allocation exceeds the charge balance';end if;
   v_sum=v_sum+v_due;if v_sum>v_amount then raise exception 'Allocations exceed receiving amount';end if;
   insert into public.suite_allocations values(v_id,ch.id,v_due);
  end loop;
  update public.suite_receipts set active=false where receiving_id=v_id;
  for v_case in select distinct cc.case_id from public.suite_allocations a join public.suite_charges cc on cc.id=a.charge_id where a.receiving_id=v_id loop
   select jsonb_build_object('client',to_jsonb(cll),'case_reference',cll.client_code||'-'||cs.case_number,'mark',cs.application_name,'tm',cs.tm_number,'received_on',v_date,'payer_name',p_data->>'payer_name','reference',p_data->>'reference','lines',(select jsonb_agg(jsonb_build_object('charge_id',cc.id,'label',cc.label,'amount',aa.amount)) from public.suite_allocations aa join public.suite_charges cc on cc.id=aa.charge_id where aa.receiving_id=v_id and cc.case_id=v_case)) into v_snapshot from public.cases cs join public.clients cll on cll.id=cs.client_id where cs.id=v_case;
   insert into public.suite_receipts(receiving_id,case_id,snapshot) values(v_id,v_case,v_snapshot) on conflict(receiving_id,case_id) do update set active=true,snapshot=excluded.snapshot;
  end loop;return jsonb_build_object('id',v_id);
 elsif p_action in ('settlement','void_settlement') then
  v_assoc=(p_data->>'associate_id')::uuid;perform 1 from public.service_associates where id=v_assoc for update;if not found then raise exception 'Associate not found';end if;
  v_id=(p_data->>'id')::uuid;select * into pay from public.associate_payments where id=v_id for update;
  if found and (pay.associate_id<>v_assoc or pay.version<>coalesce((p_data->>'version')::integer,0) or pay.voided) then raise exception 'Payment changed or is VOID';end if;
  if p_action='void_settlement' then
   if pay.id is null then raise exception 'Payment not found';end if;update public.associate_payments set voided=true,version=version+1 where id=v_id;return jsonb_build_object('id',v_id);
  end if;
  v_amount=(p_data->>'amount')::numeric;v_date=(p_data->>'date')::date;
  if v_amount is null or v_amount<=0 or v_amount>9999999999.99 or v_amount<>round(v_amount,2) or v_date is null or v_date>today then raise exception 'Enter valid amount/date';end if;
  if pay.id is null then insert into public.associate_payments(id,associate_id,amount,paid_on,reference) values(v_id,v_assoc,v_amount,v_date,left(coalesce(p_data->>'reference',''),1000));
  else update public.associate_payments set amount=v_amount,paid_on=v_date,reference=left(coalesce(p_data->>'reference',''),1000),version=version+1 where id=v_id;end if;
  delete from public.associate_allocations where payment_id=v_id;v_left=v_amount;
  for v_fee in select * from public.associate_fees where associate_id=v_assoc order by assigned_on,created_at,id loop
   select v_fee.amount-coalesce(sum(a.amount),0) into v_due from public.associate_allocations a join public.associate_payments pp on pp.id=a.payment_id where a.fee_id=v_fee.id and not pp.voided;
   if v_due>0 and v_left>0 then insert into public.associate_allocations values(v_id,v_fee.id,least(v_due,v_left));v_left=v_left-least(v_due,v_left);end if;
  end loop;
  if v_left>0 then raise exception 'Payment exceeds unpaid associate fees';end if;return jsonb_build_object('id',v_id);
 end if;

 v_case=(p_data->>'case_id')::uuid;select client_id into v_client from public.cases where id=v_case;if not found then raise exception 'Case not found';end if;
 select * into cl from public.clients where id=v_client for update;select * into c from public.cases where id=v_case for update;
 if p_data->>'version' is distinct from c.updated_at::text and (p_data->>'version')::timestamptz is distinct from c.updated_at then raise exception 'Case changed; reload before saving';end if;
 v_date=coalesce((p_data->>'date')::date,today);
 if (v_date>today and p_action<>'hearing') or v_date<date '1900-01-01' then raise exception 'Enter an actual date, not a future date';end if;
 if p_action='identity' then
  if cl.client_code !~ '^[A-Z][A-Z0-9]{0,11}-[0-9]{3,6}$' then raise exception 'Align client code in Client Ledger first';end if;
  if nullif(trim(p_data->>'application_name'),'') is null or trim(p_data->>'case_number') !~ '^[0-9]{1,6}$' then raise exception 'Mark name and numeric case number required';end if;
  if c.identity_confirmed and c.workflow_step not in ('registered','review') and lpad(p_data->>'case_number',3,'0')<>c.case_number then raise exception 'Case reference is locked after filing';end if;
  update public.cases set application_name=left(trim(p_data->>'application_name'),200),case_number=lpad(trim(p_data->>'case_number'),greatest(3,length(trim(p_data->>'case_number'))),'0'),tm_number=nullif(regexp_replace(coalesce(p_data->>'tm_number',''),'[[:space:]-]','','g'),''),nice_class=nullif(p_data->>'nice_class','')::integer,identity_confirmed=true,drive_sync_pending=exists(select 1 from public.drive_cases where case_id=v_case) where id=v_case;
  if c.identity_confirmed then perform brandex_private.suite_stage_charge(v_case,c.workflow_stage);end if;
 elsif p_action='prepare_stage' then
  v_stage=(p_data->>'stage')::integer;if v_stage not between 1 and 4 then raise exception 'Choose Stage 1 to Stage 4';end if;perform brandex_private.suite_stage_charge(v_case,v_stage);
 elsif p_action='charge' then
  v_amount=(p_data->>'amount')::numeric;if v_amount is null or v_amount<0 or v_amount>9999999999.99 or v_amount<>round(v_amount,2) then raise exception 'Enter a valid fee';end if;
  if nullif(p_data->>'charge_id','') is not null then
   update public.suite_charges set amount=v_amount where id=(p_data->>'charge_id')::uuid and case_id=v_case and amount is null;
   if not found then raise exception 'Only an unpriced charge can be priced here; rate settings affect future charges';end if;
  else
   if nullif(trim(p_data->>'label'),'') is null then raise exception 'Charge description required';end if;
   insert into public.suite_charges(client_id,case_id,label,amount,created_by) values(v_client,v_case,left(trim(p_data->>'label'),200),v_amount,auth.uid());
  end if;
 elsif p_action='assign' then
  if c.workflow_step='stopped' then raise exception 'Reactivate before assigning new work';end if;
  v_stage=coalesce((p_data->>'stage')::integer,c.workflow_stage);v_assoc=(p_data->>'associate_id')::uuid;
  select default_fee into v_amount from public.service_associates where id=v_assoc and active;if not found then raise exception 'Choose an active Service Associate';end if;
  v_amount=coalesce((p_data->>'amount')::numeric,v_amount);if v_amount<0 or v_amount>9999999999.99 or v_amount<>round(v_amount,2) then raise exception 'Invalid assignment fee';end if;
  select * into v_fee from public.associate_fees where case_id=v_case and stage_no=v_stage;
  if cl.payment_terms='advance' and not exists(select 1 from public.suite_charge_position where case_id=v_case and stage_no=v_stage and amount is not null and outstanding=0 and not voided) then raise exception 'Advance terms require the stage fee before assignment';end if;
  if found then if v_fee.associate_id<>v_assoc or v_fee.amount<>v_amount then raise exception 'Existing assignment needs fee reconciliation before reassignment';end if;
  else insert into public.associate_fees(case_id,associate_id,stage_no,amount,assigned_on) values(v_case,v_assoc,v_stage,v_amount,v_date);end if;
 elsif p_action='hearing' then
  v_date=(p_data->>'date')::date;if v_date is null then raise exception 'Hearing date required';end if;
  insert into public.suite_events(case_id,event,event_date,from_step,to_step,note,actor) values(v_case,'Hearing diary',v_date,c.workflow_step,c.workflow_step,left(coalesce(p_data->>'note',''),5000),auth.uid());return jsonb_build_object('id',v_case);
 elsif p_action='delivery' then
  if c.workflow_step='stopped' then raise exception 'Reactivate before dispatch/delivery';end if;
  if c.certificate_on is null then raise exception 'Record certificate office receipt first';end if;
  if v_date<c.certificate_on then raise exception 'Dispatch/collection cannot precede office receipt';end if;
  if p_data->>'method' not in ('courier','hand') then raise exception 'Choose courier or hand collection';end if;
  if p_data->>'method'='courier' and (nullif(trim(p_data->>'company'),'') is null or nullif(trim(p_data->>'tracking'),'') is null or nullif(trim(p_data->>'destination'),'') is null) then raise exception 'Courier, tracking and destination required';end if;
  if nullif(p_data->>'delivered_on','') is not null and ((p_data->>'delivered_on')::date<v_date or (p_data->>'delivered_on')::date>today) then raise exception 'Invalid delivery confirmation date';end if;
  if nullif(p_data->>'receipt_file_id','') is not null and not exists(select 1 from public.drive_files where upload_id=(p_data->>'receipt_file_id')::uuid and case_id=v_case) then raise exception 'Receipt must be uploaded to this case';end if;
  insert into public.case_delivery(case_id,method,company,tracking,destination,dispatched_on,delivered_on,receipt_file_id)
   values(v_case,p_data->>'method',left(p_data->>'company',200),left(p_data->>'tracking',200),left(p_data->>'destination',1000),v_date,case when p_data->>'method'='hand' then v_date else nullif(p_data->>'delivered_on','')::date end,nullif(p_data->>'receipt_file_id','')::uuid)
   on conflict(case_id) do update set method=excluded.method,company=excluded.company,tracking=excluded.tracking,destination=excluded.destination,dispatched_on=excluded.dispatched_on,delivered_on=excluded.delivered_on,receipt_file_id=excluded.receipt_file_id,updated_at=now();
  if p_data->>'method'='courier' then v_date=coalesce(nullif(p_data->>'delivered_on','')::date,v_date);end if;
  update public.cases set workflow_step=case when p_data->>'method'='hand' or nullif(p_data->>'delivered_on','') is not null then 'delivered' else 'dispatched' end,event_date=v_date where id=v_case;
 elsif p_action='event' then
  if not c.identity_confirmed then raise exception 'Confirm case identity first';end if;
  v_step=p_data->>'event';v_stage=c.workflow_stage;
  if v_step='stopped' then
   if c.event_date is not null and v_date<c.event_date then raise exception 'STOPPED date precedes the latest event';end if;
   if c.workflow_step='stopped' then raise exception 'Already stopped';end if;update public.cases set resume_step=c.workflow_step,workflow_step='stopped',event_date=v_date where id=v_case;
  elsif v_step='reactivated' then
   if c.event_date is not null and v_date<c.event_date then raise exception 'Reactivation precedes STOPPED date';end if;
   if c.workflow_step<>'stopped' or c.resume_step is null then raise exception 'Case is not stopped';end if;
   v_amount=(p_data->>'restoration_fee')::numeric;if v_amount is null or v_amount<0 or v_amount<>round(v_amount,2) then raise exception 'Enter the separate TM-57 fee';end if;
   insert into public.suite_charges(client_id,case_id,label,amount,created_by) values(v_client,v_case,'TM-57 restoration',v_amount,auth.uid());
   update public.cases set workflow_step=resume_step,reactivated_on=v_date,restoration_filed_on=v_date,event_date=v_date where id=v_case;
  elsif v_step='restoration_approved' then
   if c.restoration_filed_on is null then raise exception 'No restoration submission recorded';end if;update public.cases set restoration_approved_on=v_date where id=v_case;
  else
   if c.workflow_step='stopped' then raise exception 'Reactivate with TM-57 before proceeding';end if;
   if c.event_date is not null and v_date<c.event_date then raise exception 'Event date precedes the previous recorded event';end if;
   if c.workflow_step<>'review' and not (
    (c.workflow_step='registered' and v_step='filed') or
    (c.workflow_step='filed' and v_step in ('examination','acknowledged')) or
    (c.workflow_step='examination' and v_step='acknowledged') or
    (c.workflow_step='acknowledged' and v_step='assigned') or
    (c.workflow_step='assigned' and v_step in ('accepted','hearing')) or
    (c.workflow_step='hearing' and v_step='accepted') or
    (c.workflow_step='accepted' and v_step='published') or
    (c.workflow_step='published' and v_step in ('demand_received','objection')) or
    (c.workflow_step='demand_received' and v_step='fee_submitted') or
    (c.workflow_step='fee_submitted' and v_step='certificate_office')) then raise exception 'This transition is not allowed; record the intervening event';end if;
   v_stage=case when v_step in ('filed','examination','acknowledged') then 1 when v_step in ('assigned','accepted','hearing') then 2 when v_step in ('published','demand_received','objection') then 3 when v_step in ('fee_submitted','certificate_office') then 4 else null end;
   if v_stage is null then raise exception 'Choose a workflow event';end if;
   if c.workflow_step='review' and v_stage<c.workflow_stage then if v_step='accepted' and c.workflow_stage=3 then v_stage=3;else raise exception 'Review the actual starting stage; earlier stages are not backfilled';end if;end if;
   perform brandex_private.suite_stage_charge(v_case,v_stage);
   if cl.payment_terms='advance' and (v_stage>c.workflow_stage or v_step='filed') and not exists(select 1 from public.suite_charge_position where case_id=v_case and stage_no=v_stage and not voided and amount is not null and outstanding=0) then raise exception 'Advance terms: prepare and fully allocate this stage charge before proceeding';end if;
   if v_step='assigned' and not exists(select 1 from public.associate_fees where case_id=v_case and stage_no=2) then raise exception 'Assign the Stage 2 Service Associate before recording Assigned';end if;
   if v_step='accepted' then perform brandex_private.suite_stage_charge(v_case,3);end if;
   update public.cases set workflow_stage=v_stage,workflow_step=v_step,event_date=v_date,reactivated_on=null,
    filed_on=case when v_step='filed' then v_date else filed_on end,accepted_on=case when v_step='accepted' then v_date else accepted_on end,
    published_on=case when v_step='published' then v_date else published_on end,fee_submitted_on=case when v_step='fee_submitted' then v_date else fee_submitted_on end,
    certificate_on=case when v_step='certificate_office' then v_date else certificate_on end where id=v_case;
  end if;
 else raise exception 'Unknown action';end if;
 -- Keep compatibility labels readable; historical free-text status is no longer the workflow authority.
 update public.cases set stage='Stage '||workflow_stage,status=initcap(replace(workflow_step,'_',' ')) where id=v_case;
 if p_action in ('event','assign','identity','delivery') then
 insert into public.suite_events(case_id,event,event_date,from_step,to_step,note,actor)
  select v_case,p_action||coalesce(': '||(p_data->>'event'),''),v_date,c.workflow_step,workflow_step,left(coalesce(p_data->>'note',''),5000),auth.uid() from public.cases where id=v_case;
 end if;
 insert into public.suite_audit(entity,row_ref,old_value,new_value,actor) select 'cases',v_case::text,to_jsonb(c),to_jsonb(x),auth.uid() from public.cases x where id=v_case;
 return jsonb_build_object('id',v_case);
end $$;
revoke all on function public.suite_action(text,jsonb) from public,anon;
grant execute on function public.suite_action(text,jsonb) to authenticated;

create function public.suite_followup(p_step text,p_event date,p_accepted date,p_published date,p_fee date,p_restored date,p_today date default (now() at time zone 'Asia/Karachi')::date)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare d date;b date:=coalesce(p_restored,p_event);tone text;reason text;elapsed integer:=p_today-b;
begin
 if p_step in ('stopped','certificate_office','dispatched','delivered','registered') then return null;end if;
 if p_step='review' or (p_step='accepted' and p_restored is not null) then return jsonb_build_object('tone','review','reason','Workflow/date review required');end if;
 if p_step='filed' then d=b+15;reason='Filing follow-up overdue';
 elsif p_step='examination' then d=b+7;reason='Acknowledgement pending after submitted reply';
 elsif p_step='assigned' then return jsonb_build_object('tone',case when elapsed>=10 then 'red' when elapsed>=8 then 'yellow' else 'green' end,'due',b+10,'days',elapsed,'reason','Assignment outcome pending');
 elsif p_step='accepted' then d=(date_trunc('month',p_accepted)+case when extract(day from p_accepted)>20 then interval '1 month' else interval '0 month' end+interval '28 days')::date;reason='Expected journal publication';
 elsif p_step='published' then d=(coalesce(p_restored,p_published)+interval '2 months')::date;reason='Demand Note pending after publication';
 elsif p_step='fee_submitted' then d=(coalesce(p_restored,p_fee)+interval '1 month')::date;reason='Certificate pending at office';
 elsif p_step in ('hearing','objection') then return null;
 end if;
 if d is null or p_today<d then return null;end if;
 return jsonb_build_object('tone','red','reason',reason,'due',d,'days',elapsed);
end $$;
revoke all on function public.suite_followup(text,date,date,date,date,date,date) from public;
grant execute on function public.suite_followup(text,date,date,date,date,date,date) to authenticated;
create view public.suite_case_register with(security_invoker=true) as
 select c.*,cl.client_code,cl.trading_as,cl.city,cl.payment_terms,cl.client_code||'-'||c.case_number case_reference,
 coalesce(p.billed,0)::numeric(12,2) billed,coalesce(p.received,0)::numeric(12,2) received,coalesce(p.outstanding,0)::numeric(12,2) outstanding,
 coalesce(p.unpriced,0) unpriced,public.suite_followup(c.workflow_step,c.event_date,c.accepted_on,c.published_on,c.fee_submitted_on,c.reactivated_on) followup
 from public.cases c join public.clients cl on cl.id=c.client_id
 left join lateral(select sum(amount) billed,sum(received) received,sum(outstanding) outstanding,count(*)filter(where amount is null)unpriced from public.suite_charge_position where case_id=c.id and not voided)p on true;
grant select on public.suite_case_register to authenticated;
create function public.suite_case_list(p_filter jsonb default '{}',p_page integer default 1) returns jsonb language sql stable security invoker set search_path='' as $$
 with filtered as(select * from public.suite_case_register cr where
 (coalesce(p_filter->>'q','')='' or concat_ws(' ',case_reference,application_name,tm_number,trading_as) ilike '%'||left(p_filter->>'q',200)||'%') and
 (coalesce(p_filter->>'stage','')='' or workflow_stage::text=p_filter->>'stage') and
 (coalesce(p_filter->>'step','')='' or workflow_step=p_filter->>'step') and
 (coalesce(p_filter->>'series','')='' or split_part(client_code,'-',1)=p_filter->>'series') and
 (coalesce(p_filter->>'flag','')='' or followup->>'tone'=p_filter->>'flag') and
 (coalesce(p_filter->>'class','')='' or nice_class::text=p_filter->>'class') and
 (coalesce(p_filter->>'city','')='' or city ilike '%'||left(p_filter->>'city',120)||'%') and
 (coalesce(p_filter->>'origin','')='' or origin=p_filter->>'origin') and
 (coalesce(p_filter->>'associate','')='' or exists(select 1 from public.associate_fees f where f.case_id=cr.id and f.associate_id::text=p_filter->>'associate')) and
 (coalesce(p_filter->>'from','')='' or filed_on>=nullif(p_filter->>'from','')::date) and
 (coalesce(p_filter->>'to','')='' or filed_on<=nullif(p_filter->>'to','')::date) and
 (coalesce(p_filter->>'terms','')='' or payment_terms=p_filter->>'terms') and
 (coalesce(p_filter->>'balance','')='' or (p_filter->>'balance'='due' and outstanding>0) or (p_filter->>'balance'='unpriced' and unpriced>0))),
 page as(select * from filtered order by client_code,case_number,id limit 30 offset ((greatest(1,least(coalesce(p_page,1),100000))-1)*30))
 select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(page)-'images'-'assessment') from page),'[]'::jsonb),'total',(select count(*) from filtered));
$$;
revoke all on function public.suite_case_list(jsonb,integer) from public;
grant execute on function public.suite_case_list(jsonb,integer) to authenticated;
create function public.suite_charge_search(p_client uuid,p_q text default '') returns setof public.suite_charge_position language sql stable security invoker set search_path='' as $$
 select * from public.suite_charge_position where client_id=p_client and not voided and
 (coalesce(p_q,'')='' or concat_ws(' ',case_reference,application_name,tm_number,label) ilike '%'||left(p_q,200)||'%') order by created_at desc,id limit 50;
$$;
revoke all on function public.suite_charge_search(uuid,text) from public;
grant execute on function public.suite_charge_search(uuid,text) to authenticated;

create function public.suite_dashboard() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('cases',(select count(*)from public.cases),'clients',(select count(*)from public.clients),'documents',(select count(*)from public.documents),
 'billed',(select coalesce(sum(amount),0)from public.suite_charge_position where not voided),
 'allocated',(select coalesce(sum(received),0)from public.suite_charge_position where not voided),
 'outstanding',(select coalesce(sum(outstanding),0)from public.suite_charge_position where not voided),
 'unpriced',(select count(*)from public.suite_charges where amount is null and not voided),
 'received',(select coalesce(sum(amount),0)from public.suite_receivings where not voided),
 'overdue',(select count(*)from public.suite_case_register where followup->>'tone'='red'),
 'review',(select count(*)from public.suite_case_register where followup->>'tone'='review'),
 'associate_due',(select coalesce(sum(outstanding),0)from public.associate_fee_position),
 'legacy_entries',(select count(*)from public.ledger));
$$;
revoke all on function public.suite_dashboard() from public;
grant execute on function public.suite_dashboard() to authenticated;

create function public.suite_account_summary(p_client uuid)returns jsonb language sql stable security invoker set search_path=''as $$
 select jsonb_build_object('billed',(select coalesce(sum(amount),0)from public.suite_charge_position where client_id=p_client and not voided),
 'allocated',(select coalesce(sum(received),0)from public.suite_charge_position where client_id=p_client and not voided),
 'outstanding',(select coalesce(sum(outstanding),0)from public.suite_charge_position where client_id=p_client and not voided),
 'received',(select coalesce(sum(amount),0)from public.suite_receivings where client_id=p_client and not voided),
 'unpriced',(select count(*)from public.suite_charges where client_id=p_client and not voided and amount is null),
 'legacy_entries',(select count(*)from public.ledger l join public.cases c on c.id=l.case_id where c.client_id=p_client));
$$;
revoke all on function public.suite_account_summary(uuid)from public;
grant execute on function public.suite_account_summary(uuid)to authenticated;

create view public.suite_client_position with(security_invoker=true) as
 select cl.*,coalesce(b.billed,0)::numeric(12,2)billed,coalesce(b.received,0)::numeric(12,2)allocated,coalesce(b.outstanding,0)::numeric(12,2)outstanding,coalesce(b.unpriced,0)unpriced,coalesce(r.received,0)::numeric(12,2)received
 from public.clients cl left join lateral(select sum(amount)billed,sum(received)received,sum(outstanding)outstanding,count(*)filter(where amount is null)unpriced from public.suite_charge_position where client_id=cl.id and not voided)b on true
 left join lateral(select sum(amount)received from public.suite_receivings where client_id=cl.id and not voided)r on true;
grant select on public.suite_client_position to authenticated;
create function public.suite_client_list(p_q text default '',p_page integer default 1)returns jsonb language sql stable security invoker set search_path=''as $$
 with filtered as(select * from public.suite_client_position where concat_ws(' ',client_code,trading_as,city) ilike '%'||left(coalesce(p_q,''),200)||'%'),
 page as(select * from filtered order by client_code,id limit 30 offset((greatest(1,least(coalesce(p_page,1),100000))-1)*30))
 select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(page))from page),'[]'::jsonb),'total',(select count(*)from filtered));
$$;
revoke all on function public.suite_client_list(text,integer)from public;
grant execute on function public.suite_client_list(text,integer)to authenticated;

create function public.suite_associate_summary(p_associate uuid)returns jsonb language sql stable security invoker set search_path=''as $$
 select jsonb_build_object('billed',coalesce(sum(amount),0),'paid',coalesce(sum(paid),0),'outstanding',coalesce(sum(outstanding),0))from public.associate_fee_position where associate_id=p_associate;
$$;
revoke all on function public.suite_associate_summary(uuid)from public;
grant execute on function public.suite_associate_summary(uuid)to authenticated;
