-- ============================================================
-- BOS — COMPLETE DATABASE SETUP (all migrations, in order)
-- Paste this whole file into the Supabase SQL Editor and Run.
-- Safe to re-run.
-- ============================================================


-- >>> migrations/0001_core_multitenancy.sql
-- ============================================================
-- 0001 — CORE MULTI-TENANCY
-- Companies, user profiles, members, role permissions.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- COMPANIES (multi-tenant root)
-- ------------------------------------------------------------
create table if not exists public.companies (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid references auth.users(id),
  name              text not null,
  legal_name        text,
  gst_number        text,
  pan_number        text,
  cin_number        text,
  address_line1     text,
  address_line2     text,
  city              text,
  state             text,
  state_code        text,
  pincode           text,
  phone             text,
  email             text,
  website           text,
  logo_url          text,
  currency          text default 'INR',
  fiscal_year_start integer default 4,
  is_active         boolean default true,
  settings          jsonb default '{}'::jsonb,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- ------------------------------------------------------------
-- USER PROFILES (extends auth.users)
-- ------------------------------------------------------------
create table if not exists public.user_profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  full_name          text,
  phone              text,
  avatar_url         text,
  preferred_language text default 'en',
  ui_preferences     jsonb default '{}'::jsonb,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

-- ------------------------------------------------------------
-- COMPANY MEMBERS (user <-> company many-to-many)
-- ------------------------------------------------------------
create table if not exists public.company_members (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid references public.companies(id) on delete cascade,
  user_id            uuid references auth.users(id) on delete cascade,
  role               text not null default 'operator',
  -- owner | director | manager | accountant | operator | viewer | auditor | custom
  custom_permissions jsonb default '{}'::jsonb,
  is_active          boolean default true,
  invited_at         timestamptz,
  joined_at          timestamptz,
  created_at         timestamptz default now(),
  unique(company_id, user_id)
);

-- ------------------------------------------------------------
-- ROLE PERMISSIONS (granular RBAC)
-- ------------------------------------------------------------
create table if not exists public.role_permissions (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid references public.companies(id) on delete cascade,
  role_name   text not null,
  module      text not null,
  can_view    boolean default false,
  can_create  boolean default false,
  can_edit    boolean default false,
  can_delete  boolean default false,
  can_export  boolean default false,
  can_approve boolean default false,
  created_at  timestamptz default now(),
  unique(company_id, role_name, module)
);

-- ------------------------------------------------------------
-- Auto-create a profile row when a new auth user appears.
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- >>> migrations/0002_products_inventory.sql
-- ============================================================
-- 0002 — PRODUCTS & INVENTORY
-- ============================================================

create table if not exists public.product_categories (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid references public.companies(id) on delete cascade,
  name        text not null,
  parent_id   uuid references public.product_categories(id),
  description text,
  is_active   boolean default true,
  created_at  timestamptz default now()
);

create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid references public.companies(id) on delete cascade,
  category_id   uuid references public.product_categories(id),
  name          text not null,
  code          text,
  hsn_code      text,
  unit          text default 'KG',
  unit_weight   numeric(10,3),
  gst_rate      numeric(5,2) default 0,
  description   text,
  custom_fields jsonb default '{}'::jsonb,
  is_active     boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table if not exists public.inventory (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid references public.companies(id) on delete cascade,
  product_id        uuid references public.products(id),
  warehouse_id      uuid,
  quantity          numeric(15,3) default 0,
  reserved_quantity numeric(15,3) default 0,
  avg_cost_price    numeric(15,4) default 0,
  last_updated_at   timestamptz default now(),
  unique(company_id, product_id)
);

create table if not exists public.inventory_transactions (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid references public.companies(id) on delete cascade,
  product_id       uuid references public.products(id),
  transaction_type text not null,     -- purchase | sale | adjustment | transfer
  reference_type   text,
  reference_id     uuid,
  quantity         numeric(15,3) not null,
  unit_price       numeric(15,4),
  transaction_date date not null,
  notes            text,
  created_by       uuid references auth.users(id),
  created_at       timestamptz default now()
);


-- >>> migrations/0003_parties_vehicles_weighment.sql
-- ============================================================
-- 0003 — PARTIES, VEHICLES, WEIGHMENT SLIPS
-- ============================================================

create table if not exists public.parties (
  id                   uuid primary key default gen_random_uuid(),
  company_id           uuid references public.companies(id) on delete cascade,
  type                 text[] not null,   -- {customer} | {supplier} | {customer,supplier}
  name                 text not null,
  alias                text,
  gst_number           text,
  pan_number           text,
  address_line1        text,
  address_line2        text,
  city                 text,
  state                text,
  state_code           text,
  pincode              text,
  phone                text,
  whatsapp             text,
  email                text,
  bank_name            text,
  bank_account         text,
  bank_ifsc            text,
  bank_branch          text,
  credit_limit         numeric(15,2) default 0,
  credit_days          integer default 0,
  opening_balance      numeric(15,2) default 0,
  opening_balance_type text default 'debit',  -- debit | credit
  custom_fields        jsonb default '{}'::jsonb,
  notes                text,
  is_active            boolean default true,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

create table if not exists public.vehicles (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid references public.companies(id) on delete cascade,
  vehicle_number text not null,
  vehicle_type   text,
  owner_name     text,
  owner_phone    text,
  driver_name    text,
  driver_phone   text,
  capacity_kg    numeric(10,3),
  custom_fields  jsonb default '{}'::jsonb,
  notes          text,
  is_active      boolean default true,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  unique(company_id, vehicle_number)
);

create table if not exists public.weighment_slips (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid references public.companies(id) on delete cascade,
  slip_number     text,
  slip_date       date not null,
  slip_time       time,
  vehicle_id      uuid references public.vehicles(id),
  vehicle_number  text,
  product_id      uuid references public.products(id),
  party_id        uuid references public.parties(id),
  slip_type       text not null,     -- purchase | sale
  gross_weight_kg numeric(10,3),
  tare_weight_kg  numeric(10,3),
  net_weight_kg   numeric(10,3) generated always as (
                    coalesce(gross_weight_kg, 0) - coalesce(tare_weight_kg, 0)
                  ) stored,
  moisture_pct    numeric(5,2),
  quality_grade   text,
  remarks         text,
  document_id     uuid,
  custom_fields   jsonb default '{}'::jsonb,
  linked_to       text,
  linked_id       uuid,
  created_by      uuid references auth.users(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);


-- >>> migrations/0004_purchases_sales.sql
-- ============================================================
-- 0004 — PURCHASES & SALES
-- ============================================================

create table if not exists public.purchase_entries (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid references public.companies(id) on delete cascade,
  entry_number      text not null,
  entry_date        date not null,
  supplier_id       uuid references public.parties(id),
  vehicle_id        uuid references public.vehicles(id),
  weighment_slip_id uuid references public.weighment_slips(id),
  product_id        uuid references public.products(id),
  quantity_kg       numeric(15,3),
  bags_count        integer,
  rate_per_kg       numeric(10,4),
  rate_per_bag      numeric(10,2),
  subtotal          numeric(15,2),
  freight           numeric(15,2) default 0,
  loading_charges   numeric(15,2) default 0,
  other_charges     numeric(15,2) default 0,
  discount_amount   numeric(15,2) default 0,
  taxable_amount    numeric(15,2),
  cgst_rate         numeric(5,2) default 0,
  cgst_amount       numeric(15,2) default 0,
  sgst_rate         numeric(5,2) default 0,
  sgst_amount       numeric(15,2) default 0,
  igst_rate         numeric(5,2) default 0,
  igst_amount       numeric(15,2) default 0,
  total_amount      numeric(15,2) not null,
  advance_paid      numeric(15,2) default 0,
  balance_due       numeric(15,2),
  payment_status    text default 'pending',  -- pending | partial | paid
  due_date          date,
  notes             text,
  custom_fields     jsonb default '{}'::jsonb,
  is_cancelled      boolean default false,
  cancelled_reason  text,
  created_by        uuid references auth.users(id),
  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),
  unique(company_id, entry_number)
);

create table if not exists public.purchase_attachments (
  id              uuid primary key default gen_random_uuid(),
  purchase_id     uuid references public.purchase_entries(id) on delete cascade,
  document_id     uuid,
  attachment_type text,
  created_at      timestamptz default now()
);

create table if not exists public.sale_entries (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid references public.companies(id) on delete cascade,
  entry_number      text not null,
  invoice_number    text,
  entry_date        date not null,
  customer_id       uuid references public.parties(id),
  vehicle_id        uuid references public.vehicles(id),
  weighment_slip_id uuid references public.weighment_slips(id),
  product_id        uuid references public.products(id),
  quantity_kg       numeric(15,3),
  bags_count        integer,
  rate_per_kg       numeric(10,4),
  rate_per_bag      numeric(10,2),
  subtotal          numeric(15,2),
  freight           numeric(15,2) default 0,
  unloading_charges numeric(15,2) default 0,
  other_charges     numeric(15,2) default 0,
  discount_amount   numeric(15,2) default 0,
  taxable_amount    numeric(15,2),
  cgst_rate         numeric(5,2) default 0,
  cgst_amount       numeric(15,2) default 0,
  sgst_rate         numeric(5,2) default 0,
  sgst_amount       numeric(15,2) default 0,
  igst_rate         numeric(5,2) default 0,
  igst_amount       numeric(15,2) default 0,
  total_amount      numeric(15,2) not null,
  advance_received  numeric(15,2) default 0,
  balance_due       numeric(15,2),
  payment_status    text default 'pending',
  due_date          date,
  notes             text,
  custom_fields     jsonb default '{}'::jsonb,
  is_cancelled      boolean default false,
  cancelled_reason  text,
  created_by        uuid references auth.users(id),
  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),
  unique(company_id, entry_number)
);


-- >>> migrations/0005_payments_banking_ledger_expenses.sql
-- ============================================================
-- 0005 — PAYMENTS, BANKING, LEDGER, EXPENSES
-- ============================================================

create table if not exists public.bank_accounts (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid references public.companies(id) on delete cascade,
  account_name    text not null,
  bank_name       text not null,
  account_number  text,
  ifsc_code       text,
  branch          text,
  account_type    text default 'current',  -- current | savings | overdraft
  opening_balance numeric(15,2) default 0,
  current_balance numeric(15,2) default 0,
  is_active       boolean default true,
  created_at      timestamptz default now()
);

create table if not exists public.payments (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid references public.companies(id) on delete cascade,
  payment_number   text not null,
  payment_date     date not null,
  payment_type     text not null,    -- received | made
  party_id         uuid references public.parties(id),
  bank_account_id  uuid references public.bank_accounts(id),
  amount           numeric(15,2) not null,
  payment_mode     text,             -- cash | cheque | neft | rtgs | upi | imps
  utr_number       text,
  cheque_number    text,
  cheque_date      date,
  bank_name        text,
  reference_number text,
  purpose          text,
  notes            text,
  document_id      uuid,
  is_reconciled    boolean default false,
  created_by       uuid references auth.users(id),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  unique(company_id, payment_number)
);

create table if not exists public.payment_allocations (
  id               uuid primary key default gen_random_uuid(),
  payment_id       uuid references public.payments(id) on delete cascade,
  reference_type   text not null,    -- purchase_entry | sale_entry
  reference_id     uuid not null,
  allocated_amount numeric(15,2) not null,
  created_at       timestamptz default now()
);

create table if not exists public.ledger_entries (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid references public.companies(id) on delete cascade,
  entry_date       date not null,
  account_type     text not null,    -- party | bank | gst | expense | stock | capital
  account_id       uuid not null,
  account_name     text not null,
  entry_type       text not null,    -- debit | credit
  amount           numeric(15,2) not null,
  narration        text,
  reference_type   text,
  reference_id     uuid,
  reference_number text,
  is_opening       boolean default false,
  created_by       uuid references auth.users(id),
  created_at       timestamptz default now()
);

create table if not exists public.expense_categories (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  name       text not null,
  parent_id  uuid references public.expense_categories(id),
  is_active  boolean default true
);

create table if not exists public.expenses (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid references public.companies(id) on delete cascade,
  expense_date date not null,
  category_id  uuid references public.expense_categories(id),
  amount       numeric(15,2) not null,
  paid_from    uuid references public.bank_accounts(id),
  paid_to      text,
  description  text,
  gst_amount   numeric(15,2) default 0,
  document_id  uuid,
  created_by   uuid references auth.users(id),
  created_at   timestamptz default now()
);


-- >>> migrations/0006_documents_gst_audit.sql
-- ============================================================
-- 0006 — DOCUMENT INTELLIGENCE, GST, AUDIT, NOTIFICATIONS
-- ============================================================

create table if not exists public.documents (
  id                        uuid primary key default gen_random_uuid(),
  company_id                uuid references public.companies(id) on delete cascade,
  file_name                 text not null,
  file_path                 text not null,
  file_url                  text,
  file_type                 text not null,
  file_size_bytes           bigint,
  mime_type                 text,
  document_date             date,
  upload_date               timestamptz default now(),
  uploaded_by               uuid references auth.users(id),
  -- OCR results
  ocr_status                text default 'pending',  -- pending | processing | completed | failed
  ocr_provider              text,                    -- gemini | tesseract
  ocr_confidence            numeric(5,2),
  ocr_raw_text              text,
  ocr_extracted             jsonb default '{}'::jsonb,
  ocr_flagged_fields        jsonb default '[]'::jsonb,
  ocr_processed_at          timestamptz,
  -- classification
  doc_type                  text,
  classification_confidence numeric(5,2),
  -- linking
  linked_to                 text,
  linked_id                 uuid,
  -- deduplication
  file_hash                 text,
  is_duplicate              boolean default false,
  duplicate_of              uuid references public.documents(id),
  -- dynamic
  dynamic_fields            jsonb default '{}'::jsonb,
  notes                     text,
  tags                      text[],
  created_at                timestamptz default now(),
  updated_at                timestamptz default now()
);

create table if not exists public.bulk_upload_jobs (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid references public.companies(id) on delete cascade,
  job_name        text,
  total_files     integer default 0,
  processed_files integer default 0,
  failed_files    integer default 0,
  status          text default 'queued',  -- queued | processing | completed | failed
  started_at      timestamptz,
  completed_at    timestamptz,
  error_log       jsonb default '[]'::jsonb,
  created_by      uuid references auth.users(id),
  created_at      timestamptz default now()
);

create table if not exists public.dynamic_field_definitions (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid references public.companies(id) on delete cascade,
  entity_type   text not null,
  field_key     text not null,
  field_label   text not null,
  field_type    text not null,   -- text | number | date | boolean | select
  field_options jsonb,
  is_required   boolean default false,
  is_active     boolean default true,
  created_at    timestamptz default now()
);

create table if not exists public.gst_entries (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid references public.companies(id) on delete cascade,
  entry_date     date not null,
  entry_type     text not null,   -- purchase | sale
  reference_type text,
  reference_id   uuid,
  party_id       uuid references public.parties(id),
  party_gstin    text,
  invoice_number text,
  hsn_code       text,
  taxable_amount numeric(15,2),
  cgst_rate      numeric(5,2),
  cgst_amount    numeric(15,2),
  sgst_rate      numeric(5,2),
  sgst_amount    numeric(15,2),
  igst_rate      numeric(5,2),
  igst_amount    numeric(15,2),
  total_gst      numeric(15,2),
  total_amount   numeric(15,2),
  created_at     timestamptz default now()
);

-- Immutable audit log — no updates/deletes via app role.
create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid references public.companies(id),
  user_id     uuid references auth.users(id),
  action      text not null,   -- create | update | delete | export | login
  entity_type text not null,
  entity_id   uuid,
  old_data    jsonb,
  new_data    jsonb,
  ip_address  inet,
  user_agent  text,
  created_at  timestamptz default now()
);

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  user_id    uuid references auth.users(id),
  type       text not null,
  title      text not null,
  body       text,
  data       jsonb default '{}'::jsonb,
  channel    text default 'app',  -- app | whatsapp | email | sms
  is_read    boolean default false,
  sent_at    timestamptz,
  created_at timestamptz default now()
);


-- >>> migrations/0007_functions_triggers.sql
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


-- >>> migrations/0008_indexes_rls.sql
-- ============================================================
-- 0008 — INDEXES & ROW LEVEL SECURITY
-- ============================================================

-- ------------------------------------------------------------
-- Critical indexes
-- ------------------------------------------------------------
create index if not exists idx_purchase_entries_company_date on public.purchase_entries(company_id, entry_date);
create index if not exists idx_sale_entries_company_date     on public.sale_entries(company_id, entry_date);
create index if not exists idx_payments_company_date         on public.payments(company_id, payment_date);
create index if not exists idx_documents_company_type        on public.documents(company_id, doc_type);
create index if not exists idx_documents_file_hash           on public.documents(file_hash);
create index if not exists idx_ledger_account                on public.ledger_entries(company_id, account_id, entry_date);
create index if not exists idx_inv_tx_product                on public.inventory_transactions(product_id, transaction_date);
create index if not exists idx_parties_company_name          on public.parties(company_id, name);
create index if not exists idx_vehicles_number               on public.vehicles(company_id, vehicle_number);
create index if not exists idx_audit_log_company             on public.audit_log(company_id, created_at);
create index if not exists idx_products_company_name         on public.products(company_id, name);
create index if not exists idx_company_members_user          on public.company_members(user_id, is_active);

-- Full-text search over OCR'd document text
create index if not exists idx_documents_fts
  on public.documents using gin(to_tsvector('english', coalesce(ocr_raw_text, '')));

-- ------------------------------------------------------------
-- Enable RLS on every company-scoped table
-- ------------------------------------------------------------
do $$
declare
  t text;
  tables text[] := array[
    'companies','company_members','role_permissions',
    'product_categories','products','inventory','inventory_transactions',
    'parties','vehicles','weighment_slips',
    'purchase_entries','purchase_attachments','sale_entries',
    'bank_accounts','payments','payment_allocations',
    'ledger_entries','expense_categories','expenses',
    'documents','bulk_upload_jobs','dynamic_field_definitions',
    'gst_entries','audit_log','notifications'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- Company-scoped policy on tables that carry company_id
-- (read/write gated on active membership).
-- ------------------------------------------------------------
do $$
declare
  t text;
  tables text[] := array[
    'role_permissions',
    'product_categories','products','inventory','inventory_transactions',
    'parties','vehicles','weighment_slips',
    'purchase_entries','sale_entries',
    'bank_accounts','payments',
    'ledger_entries','expense_categories','expenses',
    'documents','bulk_upload_jobs','dynamic_field_definitions',
    'gst_entries','notifications'
  ];
begin
  foreach t in array tables loop
    execute format('drop policy if exists company_member_access on public.%I;', t);
    execute format(
      'create policy company_member_access on public.%I
         using (public.is_company_member(company_id))
         with check (public.is_company_member(company_id));', t);
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- COMPANIES — members can read; only the owner mutates.
-- ------------------------------------------------------------
drop policy if exists companies_select on public.companies;
create policy companies_select on public.companies
  for select using (public.is_company_member(id) or owner_id = auth.uid());

drop policy if exists companies_insert on public.companies;
create policy companies_insert on public.companies
  for insert with check (owner_id = auth.uid());

drop policy if exists companies_update on public.companies;
create policy companies_update on public.companies
  for update using (owner_id = auth.uid());

-- ------------------------------------------------------------
-- COMPANY_MEMBERS — a user can see their own membership rows;
-- owners can see all members of their companies.
-- ------------------------------------------------------------
drop policy if exists members_select on public.company_members;
create policy members_select on public.company_members
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.companies c
                where c.id = company_members.company_id and c.owner_id = auth.uid())
  );

drop policy if exists members_write on public.company_members;
create policy members_write on public.company_members
  for all using (
    exists (select 1 from public.companies c
             where c.id = company_members.company_id and c.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.companies c
             where c.id = company_members.company_id and c.owner_id = auth.uid())
  );

-- ------------------------------------------------------------
-- USER_PROFILES — a user sees/edits only their own profile.
-- ------------------------------------------------------------
alter table public.user_profiles enable row level security;
drop policy if exists profiles_self on public.user_profiles;
create policy profiles_self on public.user_profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- ------------------------------------------------------------
-- PURCHASE_ATTACHMENTS & PAYMENT_ALLOCATIONS — gate via parent.
-- ------------------------------------------------------------
drop policy if exists pa_access on public.purchase_attachments;
create policy pa_access on public.purchase_attachments
  using (exists (select 1 from public.purchase_entries pe
                  where pe.id = purchase_attachments.purchase_id
                    and public.is_company_member(pe.company_id)))
  with check (exists (select 1 from public.purchase_entries pe
                  where pe.id = purchase_attachments.purchase_id
                    and public.is_company_member(pe.company_id)));

drop policy if exists alloc_access on public.payment_allocations;
create policy alloc_access on public.payment_allocations
  using (exists (select 1 from public.payments p
                  where p.id = payment_allocations.payment_id
                    and public.is_company_member(p.company_id)))
  with check (exists (select 1 from public.payments p
                  where p.id = payment_allocations.payment_id
                    and public.is_company_member(p.company_id)));

-- ------------------------------------------------------------
-- AUDIT_LOG — read-only for members; inserts only via SECURITY
-- DEFINER trigger. No update/delete policy => immutable.
-- ------------------------------------------------------------
drop policy if exists audit_select on public.audit_log;
create policy audit_select on public.audit_log
  for select using (public.is_company_member(company_id));


-- >>> migrations/0009_storage.sql
-- ============================================================
-- 0009 — STORAGE (private document vault)
-- ============================================================

-- Private bucket for all uploaded business documents.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Files are stored under  {company_id}/{...path}.
-- Access is granted only to active members of that company.
-- The leading folder name must equal a company_id the user belongs to.

drop policy if exists "documents_read" on storage.objects;
create policy "documents_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and public.is_company_member((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "documents_insert" on storage.objects;
create policy "documents_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and public.is_company_member((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "documents_delete" on storage.objects;
create policy "documents_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and public.is_company_member((storage.foldername(name))[1]::uuid)
  );


-- >>> migrations/0010_fuzzy_match.sql
-- ============================================================
-- 0010 — FUZZY PARTY MATCHING (smart de-duplication of names)
-- Recognizes "Satish Sharma" / "Satish Sarma" / "सतीश शर्मा" as the
-- same party so ledgers don't fragment on spelling/handwriting.
-- ============================================================

create extension if not exists pg_trgm;

-- Trigram index for fast similarity search on party names.
create index if not exists idx_parties_name_trgm
  on public.parties using gin (name gin_trgm_ops);

-- Returns the best-matching active party id for a name, or NULL.
-- Uses trigram similarity; threshold 0.45 is permissive enough for
-- handwriting/spelling variants but avoids merging unrelated names.
create or replace function public.match_party(
  p_company uuid,
  p_name    text
)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id
  from public.parties
  where company_id = p_company
    and is_active = true
    and similarity(lower(name), lower(p_name)) > 0.45
  order by similarity(lower(name), lower(p_name)) desc
  limit 1;
$$;


-- >>> migrations/0011_edit_and_payables.sql
-- ============================================================
-- 0011 — EDIT/TRASH support + payables helpers
-- Adds soft-cancel to slips & payments (trash/restore), a payee
-- column on payments, and indexes for the "To Pay" view.
-- ============================================================

alter table public.weighment_slips
  add column if not exists is_cancelled boolean default false;

alter table public.payments
  add column if not exists is_cancelled boolean default false;

-- Full free-text payee line from a cheque (e.g. "Self / NEFT — Jagannath Adwar").
alter table public.payments
  add column if not exists paid_to text;

-- Fast lookups for outstanding balances and trash filters.
create index if not exists idx_purchase_outstanding
  on public.purchase_entries(company_id, payment_status)
  where balance_due > 0;

create index if not exists idx_purchase_due
  on public.purchase_entries(company_id, due_date);

create index if not exists idx_weighment_active
  on public.weighment_slips(company_id, is_cancelled);

create index if not exists idx_payments_active
  on public.payments(company_id, is_cancelled);

