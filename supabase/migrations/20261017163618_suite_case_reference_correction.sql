-- Preserve manual case numbers longer than three digits when comparing locked references.
do $migration$
declare definition text; original text:='lpad(p_data->>''case_number'',3,''0'')<>c.case_number';
begin
 select pg_get_functiondef('public.suite_action(text,jsonb)'::regprocedure) into definition;
 if position(original in definition)=0 then raise exception 'Expected Suite reference guard was not found';end if;
 definition=replace(definition,original,'lpad(trim(p_data->>''case_number''),greatest(3,length(trim(p_data->>''case_number''))),''0'')<>c.case_number');
 execute definition;
end $migration$;
