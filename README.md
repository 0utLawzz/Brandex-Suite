# Brandex Suite

Brandex Suite consolidates case processing, client payments, and mail-merge documents into one Next.js + Supabase application.

Phases 1–3 are implemented: database/Auth/RLS, Admin case intake, and per-case ledger management. Mail merge and role dashboards are the next phases. See [the reconciled build spec](docs/BUILD_SPEC.md) and [progress](progress.md) for the implementation audit and remaining work.

## Local setup

1. Copy `.env.example` to `.env.local` and add the Supabase project URL and anon key.
2. Apply **all** migrations in `supabase/migrations/` in order using the Supabase CLI (`supabase db push` after linking the intended project).
3. Install dependencies with `npm install`, then start with `npm run dev`.
4. Create users through Supabase Auth. The signup trigger creates a `public.profiles` row with the safe default role `viewer`.
5. Promote the first admin from the Supabase SQL editor using a narrowly scoped query such as `update public.profiles set role = 'admin' where id = '<exact-user-uuid>';`.

Open `/login` to sign in with a Supabase staff account, then `/cases` to browse accessible cases and their ledgers. Admins can create cases at `/intake`. This build does not create permanent staff accounts or provide public signup. The landing page and login configuration message can render without Supabase variables; authenticated pages require them.

## Ledger

- Admins add, edit, and delete entries inside `/cases/[id]`.
- Viewers have read-only access. Agents can read only assigned case records and ledgers.
- Each entry is an amount with a paid/pending state. Mark the same pending entry paid when payment arrives; totals sum each state independently.
- Amounts allow two decimals within the existing `numeric(12,2)` schema. Type is free text, and date is required for new/edited entries.
- Changes use the signed-in session and existing database RLS. Service keys are never used in application routes.

## Verification

`npm run build` validates the production bundle and TypeScript. `node --test scripts/ledger.test.mjs` runs money/date checks (Node 24 supports the TypeScript source import).

For live integration tests, run the app locally and execute `node scripts/verify-ledger.mjs`. This creates isolated temporary staff users and test records in the configured Supabase project and removes them in `finally`. It requires either `BRANDEX_TEST_SERVICE_KEY` in the local process environment or an authenticated Supabase CLI with project API-key access. Never put a service key in a `NEXT_PUBLIC_` variable. Set `BRANDEX_TEST_BASE_URL` to override the default `http://localhost:3000`.

The existing `npm run lint` script still uses the removed Next.js `next lint` command; it is not a passing verification command. ESLint configuration/tooling repair remains separate from this feature.

## Foundation

- Clean-start schema; no old-system data import.
- `profiles.role` is the authorization source for Admin, Viewer, and Agent.
- A private, non-exposed schema contains the role helper and Auth profile trigger; authorization does not use editable user metadata.
- Agents are constrained by both RLS and a database trigger to `status` and `assessment` on assigned cases.
- Agents can only read linked clients, assigned cases, assigned ledger rows, and assigned documents; they cannot write ledger rows or core client/case fields.
- Template categories are rows in `template_categories`, so new categories do not require a code release.
- Storage has private `case-images` and `documents` buckets.
