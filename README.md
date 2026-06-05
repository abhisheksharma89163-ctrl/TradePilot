# BOS — Business Operating System

AI-powered Trading Company ERP. Multi-company, multi-user, GST-aware, document-first.

This repository is the **MVP foundation**: project scaffold, the complete database schema, auth + multi-tenancy, the dashboard shell, and two fully-built reference modules — **Parties** and **Products** (full CRUD, server-side Zod validation, audit logging, soft-delete). Every other module has its schema and RLS already migrated and follows the same pattern.

---

## Tech stack

Next.js 14 (App Router) · React 18 · TypeScript (strict) · Tailwind + shadcn-style UI · TanStack Query/Table · React Hook Form + Zod · Zustand · Supabase (Postgres + Auth + Storage + RLS).

---

## 1. Prerequisites

- Node.js 18.18+ (20+ recommended)
- A free [Supabase](https://supabase.com) project
- (Phase 2) A [Google Gemini](https://ai.google.dev) API key for OCR

---

## 2. Install

```bash
npm install
```

## 3. Environment

```bash
cp .env.example .env.local
```

Fill `.env.local` from **Supabase → Project Settings → API**:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; used by future Edge Functions / bulk jobs)

`GEMINI_API_KEY` is only needed once you build the OCR module (Phase 2).

## 4. Apply the database schema

The migrations in `supabase/migrations/` are ordered and idempotent.

**Option A — Supabase CLI (recommended)**

```bash
npm i -g supabase
supabase link --project-ref <your-project-ref>
supabase db push
```

**Option B — SQL editor**

Open each file in `supabase/migrations/` in numeric order (0001 → 0009) and run it in the Supabase SQL editor.

Then regenerate the typed client (replaces the hand-written stub):

```bash
npm run db:types
```

## 5. Run

```bash
npm run dev
```

Open http://localhost:3000 → register → sign in → create your company → use **Parties** and **Products**.

> Email confirmation: if Supabase Auth has "Confirm email" enabled, confirm via the link before signing in, or disable it under **Auth → Providers → Email** for local development.

---

## What's in the box

| Area | Status |
|---|---|
| Project scaffold, Tailwind, UI primitives | ✅ Built |
| Supabase client / server / middleware + route guard | ✅ Built |
| Full Postgres schema (25+ tables) | ✅ Migrated |
| Indexes, RLS on every table, audit triggers, entry-number fn | ✅ Migrated |
| Private document storage bucket + policies | ✅ Migrated |
| Auth (register / login / sign-out) | ✅ Built |
| Multi-company onboarding + active-company resolver | ✅ Built |
| Dashboard shell (sidebar, topbar, dark mode, mobile nav) | ✅ Built |
| **Parties** module (CRUD, validation, audit, search) | ✅ Built |
| **Products** module (CRUD, categories, validation, search) | ✅ Built |
| Purchases, Sales, Inventory, Vehicles | 🚧 Schema ready · UI pending (MVP Wk 3–4) |
| Payments, Bank, Ledger, Reports | 🚧 Schema ready · UI pending (MVP Wk 5–6) |
| Document OCR (Gemini + Tesseract), GST, AI assistant | 🚧 Schema ready · Phase 2 |

---

## Architecture notes

- **Multi-tenancy** is enforced at the database via RLS. Every company-scoped table has a `company_member_access` policy gated on `is_company_member(company_id)`, a `SECURITY DEFINER` helper that avoids recursive RLS. The app *also* filters by `company_id` for clarity, but the DB is the real boundary.
- **Active company** lives in the `bos_active_company` cookie and is re-validated against membership on every server request (`lib/auth/company.ts`).
- **Audit trail** is automatic: an `AFTER INSERT/UPDATE/DELETE` trigger on key tables writes old/new JSON to the immutable `audit_log` table (no UPDATE/DELETE policy → tamper-resistant).
- **Soft delete**: parties and products set `is_active = false` rather than hard-deleting, preserving downstream ledger/inventory references.
- **Server Actions** do the writes; Zod schemas in `lib/validations/` validate on both client (RHF) and server.

## Adding the next module (the pattern)

1. The table already exists in `supabase/migrations/`.
2. Add a Zod schema in `lib/validations/<entity>.ts`.
3. Add `app/(dashboard)/<entity>/actions.ts` (create/update/delete server actions).
4. Add `<entity>-form.tsx` (client, RHF + dialog) and `<entity>-table.tsx` (client).
5. Wire the server `page.tsx`. Replace the `ComingSoon` placeholder.

Parties is the most complete reference (array field, GST validation, bank + opening balance).

## Project layout

```
app/(auth)/            login, register
app/(dashboard)/       shell + all module pages
  parties/             ✅ reference module
  products/            ✅ reference module
components/ui/          shadcn-style primitives
components/layout/      sidebar, topbar
lib/supabase/          client, server, middleware, types
lib/auth/              active-company resolver
lib/validations/       Zod schemas
lib/constants/         states, units, GST, regex
supabase/migrations/   ordered SQL (0001–0009)
```
