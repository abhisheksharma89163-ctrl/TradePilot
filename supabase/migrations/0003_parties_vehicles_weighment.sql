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
