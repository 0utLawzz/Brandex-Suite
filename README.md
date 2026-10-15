# Brandex Suite

Brandex Suite consolidates case processing, client payments, and mail-merge documents into one Next.js + Supabase application.

This checkout is intentionally stopped at Phase 1: Next.js setup, Supabase Auth session plumbing, the clean-start database schema, and role-based RLS. Intake, ledger screens, mail merge, and dashboards are later phases.

## Local setup

1. Copy `.env.example` to `.env.local` and add the Supabase project URL and anon key.
2. Run the migration in `supabase/migrations/202610150001_brandex_suite.sql` with the Supabase CLI or SQL editor.
3. Install dependencies with `npm install`, then start with `npm run dev`.
4. Create users through Supabase Auth. The signup trigger creates a `public.profiles` row with the safe default role `viewer`.
5. Promote the first admin from the Supabase SQL editor using a narrowly scoped query such as `update public.profiles set role = 'admin' where id = '<exact-user-uuid>';`.

Without Supabase environment variables, only the minimal Next.js Phase 1 placeholder runs; database/Auth operations are not attempted.

## Phase 1 build scope

- Clean-start schema; no old-system data import.
- `profiles.role` is the authorization source for Admin, Viewer, and Agent.
- A private, non-exposed schema contains the role helper and Auth profile trigger; authorization does not use editable user metadata.
- Agents are constrained by both RLS and a database trigger to `status` and `assessment` on assigned cases.
- Agents can only read linked clients, assigned cases, assigned ledger rows, and assigned documents; they cannot write ledger rows or core client/case fields.
- Template categories are rows in `template_categories`, so new categories do not require a code release.
- Storage has private `case-images` and `documents` buckets.
