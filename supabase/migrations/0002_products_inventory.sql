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
