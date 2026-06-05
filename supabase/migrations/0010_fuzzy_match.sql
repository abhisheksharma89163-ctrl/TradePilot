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
