# Brandex Suite Progress

## 2026-10-15 — Phase 4 mail merge and Vercel deployment

- Added Admin template editing/archiving, data-driven category creation, configurable origin eligibility, and case-page merge previews with core fields and required custom fields.
- Added server-side editable A4 Word generation using pinned `docx` and `sharp`, including normalized case images, authoritative server field loading, private Storage, generation snapshots, retry IDs, case-scoped signed downloads, and cleanup if logging fails.
- Tightened document generation/Storage writes to Admin-only in `20261015153344_phase4_mail_merge.sql`, matching the role contract. Fixed the app-owned updated-at helper's search path. Migration pushed; live schema lint passes.
- Used the Google Drive skill/connection to read the original TM-1/TM-48 Google Docs referenced by the legacy mail-merge source. Imported text and mapped placeholders directly into the private live template library; no old case records were imported, no original document was modified, and no private template source was committed. Word layout is rebuilt rather than an exact copy of the originals.
- Added `/preview` with fictional sample data, interactive merge text, and no anonymous data writes. Added private Admin invitation/recovery confirmation and password setup; user selected net2outlawzz@gmail.com. No setup token belongs in source or deployment configuration.
- Created and linked Vercel projectsb/brandex-suite (`prj_B2NPOn7cwD0OsRolxte2PZKWQQLW`). Configured public Supabase URL/anon variables for Production/Preview. No service key deployed. `.vercelignore` excludes local credentials, historical assets, tests/work files, and Supabase CLI state.
- Verification: production build/TypeScript and 3 merge/DOCX unit tests pass; 35 live mail-merge checks and 40 ledger regression checks pass. Browser checks verified template creation, additional-field preview, actual generation, persisted history, and no browser warnings/errors.
- Generated DOCX/XML and embedded images were inspected. Pixel render attempt failed because LibreOffice is absent; original-template page fidelity is not claimed.
- Existing lint-command repair and platform-created rls_auto_enable advisor warnings remain separate. Phase 5 dashboards are pending.

## 2026-10-15 — Handoff reconciliation and Phase 3 ledger

- Read the supplied Build Spec, authoritative Claude advice/chat exports, actual source, GitHub repository metadata, and remote Git state. `main` matched `c353179` before this continuation. The advice file is actually `asset/Claude-Meger Advice`, without `.MD`.
- Verified the linked live Supabase project `xogbpsnsmephupbqsfgb` had all three existing migrations applied. Phase 2 was already present; README's Phase 1-only wording was stale.
- Added `docs/BUILD_SPEC.md` with the implemented/pending comparison, confirmed decisions, actual ledger semantics, and remaining workflow/template/security boundaries.
- Implemented Phase 3: authenticated `/cases` browsing with pagination, `/cases/[id]` detail with case status and paid/pending totals, and a per-case ledger. Admins can add/edit/delete entries; Viewers and assigned Agents can read them. No elevated client is used in app routes.
- Ledger mutation routes validate amount precision/range, true calendar dates, type, and paid/pending status; edits/deletes match both entry ID and case ID. Money totals use integer cents, and ledger reads fetch all Data API pages.
- Added staff password sign-in and sign-out using existing Supabase Auth so protected intake/ledger screens are accessible. No permanent staff accounts or public signup were added.
- Fixed intake's `event.currentTarget` reset after await, validated images before record creation, and added the Admin-only case-image DELETE policy needed for upload rollback. Cleanup failures now report recovery IDs instead of silently claiming success.
- Browser verification caught a stale prefetched case list after intake. A router refresh still raced with immediate navigation; successful intake now opens the created case with a fresh navigation, discarding the stale prefetched workspace.
- Applied `20261015142545_phase2_image_cleanup.sql` to the linked project. Database lint passed with no schema errors.
- Validation: production build and TypeScript passed; 3 money/date tests passed; 40 live authenticated integration checks passed using isolated temporary Auth users through normal Auth APIs, app routes, Storage, and the direct Data API. Checks include Admin CRUD, non-Admin write rejection, assigned-case isolation, cross-case entry ID rejection, invalid amounts/dates/status, new/existing-client intake, image linking/deletion, and Agent core-write restrictions.
- Browser checks confirmed sign-in, Admin intake creation and form reset, ledger creation, pending-to-paid editing, updated totals, and sign-out. Browser console had no warnings/errors during those checks. Temporary users, sessions, clients, cases, ledger rows, and images were removed afterward.
- Added repeatable `scripts/ledger.test.mjs` and `scripts/verify-ledger.mjs`. Live tests require a local app and privileged test setup access; service credentials stay in memory.
- Existing security advisor warnings were recorded in the build spec; they are not new ledger-policy failures. Existing `npm run lint` still references removed `next lint`, so it is not claimed as passing.
- Mail merge/template rendering, precise origin workflows, role dashboards, and Vercel deployment remain pending. No legacy CSV import was performed. Untracked `asset/` and the user's unrelated `package.json` edit remain outside the feature commit.

## 2026-10-15 — Neo-Brutalism UI system

- Audited `Brandex-Client-Ledger` branch `design/ui-polish-v1` at commit `1ef6ad35e0e170763211e331fbfd8263a27c8e5d`.
- Confirmed the shipped ledger screen uses Google Fonts links, not self-hosted font files. The effective screen fonts are Fraunces, Manrope, and IBM Plex Mono.
- Confirmed the shipped source has no Tailwind config. Brandex Suite adds `tailwind.config.ts` as the reusable token map while keeping the current Next.js CSS pipeline stable.
- Added `.theme-neobrutalism` variables, hard bottom-right shadows, square borders, zero gradients/blur/glass effects, and exact button/input interaction rules in `app/globals.css`.
- Added reusable `Button`, `Card`, `Panel`, `Input`, `Tabs`, `Badge`, and always-dark `Navbar` primitives in `components/ui/`.
- Applied the primitives to the Phase 1 landing page and Phase 2 Admin case intake page.
- Schema, RLS, Supabase routes, image storage behavior, and workflow logic were not changed.
