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
