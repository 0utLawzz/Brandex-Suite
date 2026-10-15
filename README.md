# Brandex Suite

Brandex Suite consolidates case processing, client payments, and mail-merge documents into one Next.js + Supabase application.

Phases 1–4 are implemented: database/Auth/RLS, Admin case intake, per-case ledger management, and the template library/mail merge. Role dashboards are the next phase. See [the reconciled build spec](docs/BUILD_SPEC.md) and [progress](progress.md) for the implementation audit and remaining work.

## Local setup

1. Copy `.env.example` to `.env.local` and add the Supabase project URL and anon key.
2. Apply **all** migrations in `supabase/migrations/` in order using the Supabase CLI (`supabase db push` after linking the intended project).
3. Install dependencies with `npm install`, then start with `npm run dev`.
4. Create users through Supabase Auth. The signup trigger creates a `public.profiles` row with the safe default role `viewer`.
5. Promote the first admin from the Supabase SQL editor using a narrowly scoped query such as `update public.profiles set role = 'admin' where id = '<exact-user-uuid>';`.

Open `/preview` for a fictional sample workspace or `/login` to sign in with a Supabase staff account. `/dashboard` opens the role-specific overview after login. `/cases` shows accessible cases and their ledgers/documents. Admins create cases at `/intake` and manage templates at `/templates`. There is no public signup. Staff provisioning is an explicit administration operation; the selected first Admin receives a private setup link and chooses their own password.

## Role workspaces

- Admin dashboard shows all cases, payments, document totals, unassigned queue, and Agent workloads. Assign/reassign/unassign from case detail.
- Agents see only assigned cases and can save status/assessment. Viewer reads all cases without write controls.
- Case search covers case code, client code, and trading name; filters cover origin/status and Admin assignments.
- Concurrent edits are rejected with a reload prompt rather than silently overwriting newer changes.
- `node scripts/verify-phase5.mjs` tests role dashboards, filters, assignments, stale edits, direct API restrictions, and role demotion using isolated temporary users.

## Templates and mail merge

- Admins create/edit/archive templates, add categories, and configure eligible case origins. Viewers and Agents can read the library.
- Use core placeholders such as `{{trading_as}}`, `{{address}}`, and `{{case_code}}`. Extra required fields use `{{custom.field_name}}`. `{{case_images}}` must be on its own line and requires intake images.
- Inside a case, select a template, enter additional values, inspect merged text, and generate an editable A4 `.docx`. The server reloads authoritative case/client/template data, checks origin eligibility, embeds images, saves the private file, and logs its immutable content/field snapshot.
- Generation is Admin-only. Viewer downloads cover all cases; Agent downloads cover assigned cases. Downloads redirect to a signed URL valid for 60 seconds. Stored references are bucket paths, not permanent public URLs.
- Template edits/archiving preserve historical documents. Repeat requests with the same generation ID reuse the existing document.
- The live library contains TM-1/TM-48 text imported from the user's original Google Docs. Their layouts are rebuilt, not exact DOCX copies of those originals. Originals remain unchanged. A fresh database starts with categories; add templates through the library rather than importing old case data.
- `/preview` uses fictional data and the same text merge component. It has no access to live case data and cannot save or generate documents anonymously.

## Ledger

- Admins add, edit, and delete entries inside `/cases/[id]`.
- Viewers have read-only access. Agents can read only assigned case records and ledgers.
- Each entry is an amount with a paid/pending state. Mark the same pending entry paid when payment arrives; totals sum each state independently.
- Amounts allow two decimals within the existing `numeric(12,2)` schema. Type is free text, and date is required for new/edited entries.
- Changes use the signed-in session and existing database RLS. Service keys are never used in application routes.

## Verification

`npm run build` validates the production bundle and TypeScript. `node --test scripts/ledger.test.mjs scripts/mail-merge.test.mjs` runs money/date, placeholder, DOCX/XML, and image checks (Node 24 supports the TypeScript source imports).

For live integration tests, run the app locally and execute `node scripts/verify-ledger.mjs`. This creates isolated temporary staff users and test records in the configured Supabase project and removes them in `finally`. It requires either `BRANDEX_TEST_SERVICE_KEY` in the local process environment or an authenticated Supabase CLI with project API-key access. Never put a service key in a `NEXT_PUBLIC_` variable. Set `BRANDEX_TEST_BASE_URL` to override the default `http://localhost:3000`.

`node scripts/verify-mail-merge.mjs` uses the same setup to verify template/category writes, generation, private downloads, RLS, origin restrictions, snapshots, and archive behavior. It leaves a sample generated file under ignored `work/` for inspection and removes all remote test fixtures.

## Deployment

The Vercel project is `projectsb/brandex-suite`; the production URL is [brandex-suite.vercel.app](https://brandex-suite.vercel.app). Pushes to `main` deploy through the Git integration. Production/Preview need only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Staff access is invitation-only in Supabase Auth, including the direct signup API. `deployment/supabase/config.toml` contains only the hosted Auth properties managed by this repo. Review `supabase --workdir deployment config diff --project-ref xogbpsnsmephupbqsfgb` before applying them with `config push`; unrelated remote settings must remain unchanged.

The existing `npm run lint` script still uses the removed Next.js `next lint` command; it is not a passing verification command. ESLint configuration/tooling repair remains separate from this feature.

## Foundation

- Clean-start schema; no old-system data import.
- `profiles.role` is the authorization source for Admin, Viewer, and Agent.
- A private, non-exposed schema contains the role helper and Auth profile trigger; authorization does not use editable user metadata.
- Agents are constrained by both RLS and a database trigger to `status` and `assessment` on assigned cases.
- Agents can only read linked clients, assigned cases, assigned ledger rows, and assigned documents; they cannot write ledger rows or core client/case fields.
- Template categories are rows in `template_categories`, so new categories do not require a code release.
- Storage has private `case-images` and `documents` buckets.
