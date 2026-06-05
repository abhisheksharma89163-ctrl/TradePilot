-- ============================================================
-- 0007 — FUNCTIONS & TRIGGERS
-- updated_at maintenance, membership helper, document-style
-- sequential entry numbers (PUR-2026-00001 etc.), audit logging.
-- ============================================================

-- ------------------------------------------------------------
-- Generic updated_at maintainer
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
  tables text[] := array[
    'companies','user_profiles','products','parties','vehicles',
    'weighment_slips','purchase_entries','sale_entries','payments',
    'documents'
  ];
begin
  foreach t in array tables loop
    execute format('drop trigger if exists trg_set_updated_at on public.%I;', t);
    execute format(
      'create trigger trg_set_updated_at before update on public.%I
         for each row execute function public.set_updated_at();', t);
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- Membership helper — used by every RLS policy.
-- SECURITY DEFINER avoids recursive RLS on company_members.
-- ------------------------------------------------------------
create or replace function public.is_company_member(target_company uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.company_members cm
    where cm.company_id = target_company
      and cm.user_id = auth.uid()
      and cm.is_active = true
  );
$$;

-- ------------------------------------------------------------
-- Sequential per-company, per-year entry numbers.
-- prefix: PUR | SAL | PAY  ->  PUR-2026-00001
-- ------------------------------------------------------------
create or replace function public.next_entry_number(
  p_company uuid,
  p_prefix  text,
  p_table   text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year  text := to_char(now(), 'YYYY');
  v_count integer;
begin
  execute format(
    'select count(*) from public.%I
       where company_id = $1
         and entry_number like $2',
    p_table
  )
  into v_count
  using p_company, p_prefix || '-' || v_year || '-%';

  return p_prefix || '-' || v_year || '-' || lpad((v_count + 1)::text, 5, '0');
end;
$$;

-- ------------------------------------------------------------
-- Audit logging — capture create/update/delete on key tables.
-- ------------------------------------------------------------
create or replace function public.log_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company uuid;
  v_entity  uuid;
begin
  if (tg_op = 'DELETE') then
    v_company := old.company_id;
    v_entity  := old.id;
  else
    v_company := new.company_id;
    v_entity  := new.id;
  end if;

  insert into public.audit_log (company_id, user_id, action, entity_type, entity_id, old_data, new_data)
  values (
    v_company,
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    v_entity,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );

  if (tg_op = 'DELETE') then return old; else return new; end if;
end;
$$;

do $$
declare
  t text;
  tables text[] := array[
    'parties','products','vehicles','weighment_slips',
    'purchase_entries','sale_entries','payments','expenses'
  ];
begin
  foreach t in array tables loop
    execute format('drop trigger if exists trg_audit on public.%I;', t);
    execute format(
      'create trigger trg_audit
         after insert or update or delete on public.%I
         for each row execute function public.log_audit();', t);
  end loop;
end;
$$;
