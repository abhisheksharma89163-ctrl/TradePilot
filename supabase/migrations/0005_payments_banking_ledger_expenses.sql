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
