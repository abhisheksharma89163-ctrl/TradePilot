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
