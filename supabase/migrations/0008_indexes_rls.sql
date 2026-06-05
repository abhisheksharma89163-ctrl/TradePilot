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
