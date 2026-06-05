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
