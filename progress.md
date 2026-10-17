## 17 October 2026 - Existing Drive roots restricted and verified

Owner approved restricting original X/A roots. Removed public writer links only; three named staff grants on each root unchanged. Actual app uploads to both original roots passed and files were nonpublic. Temporary test data cleaned; seven original public tables verified unchanged. A initial 502 resolved on a later diagnostic redeploy/test; cause not asserted. Process/handoff/changelog updated. Existing child-item direct grants were not broadly changed.

## 17 October 2026 - Suite Drive port

Owner confirmed Suite target `xogbpsnsmephupbqsfgb`. Four server settings saved; additive migration and upload function deployed. 18 isolated hosted API checks passed; fixtures cleaned. Existing X root public-sharing inheritance is now blocked; owner privacy choice pending. Case upload/history panel implemented; exact frontend/browser release evidence tracked in `PROCESS.MD` and `CHANGELOG.md`. No mature CMS schema copied or existing business data reset.

## 2026-10-16 - Owner workflow reconciliation (documentation only)

- Current requirements and implementation roadmap are in `docs/SYSTEM_ROADMAP.md`; they supersede conflicting Suite phase-completion assumptions below.
- Database + Client Ledger are the operational baseline; Mail Merge separate. All clients default Monthly Billing/Credit; no 60-percent rule. Preserve real business data.
- No application, database, rollback, data import or deployment was performed. Live verification and bounded open decisions remain pending.

## 2026-10-16 — Phase 5 role workspaces

- Added role-specific `/dashboard` with RLS-scoped cases, paid/pending totals, document counts, status breakdown, recent cases, and Admin assignment queues/workloads.
- Added case/client search, origin/status/assignment filters, per-case payment totals, and pagination. Agent navigation is scoped to My Cases; Viewer has read-only screens.
- Added Admin assignment/reassignment/unassignment and Admin/assigned-Agent status/assessment forms. APIs validate current roles and stale `updated_at` versions. No core-field or stage editing added.
- Applied `20261015231711_phase5_role_dashboards.sql`: synced staff email labels, tightened case update policy for role demotion, indexed assignments, and replaced Agent core guard with an allowlist protecting all other columns.
- Database lint: no schema errors. Security advisor reports only the previously recorded platform function and leaked-password-protection notices; no new app finding.
- Local validation: 34 live Phase 5 checks passed with real Auth sessions and direct Data API denial tests; 6 existing unit tests passed. Browser confirmed sign-in routes to dashboard and status/assessment persists after save. All generated test data is removed after verification.
- Ledger regression: all 40 live checks passed. Final production build passed.
- Production release `8789ea9` / `dpl_9MNxYWEfYurLeLuqk8nKbSULb8Df` reached READY at https://brandex-suite.vercel.app. All 34 Phase 5 checks passed again against production; generated fixtures/users were removed. The three user-provisioned staff account roles remain Admin, Agent, and Viewer as requested.
- Exact statutory stage transitions and original-template page fidelity remain follow-up decisions; they are not claimed implemented by Phase 5.

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
- Deployment correction: the initial `supabase/` ignore rule also matched `lib/supabase/` in Vercel's Git build, removing app clients. Narrowed the rule to `supabase/.temp/`. Local template/integration tests were unaffected. The temporary invitation confirmation/password-setup session test also passed.
- Production deployment `dpl_BejCEZsFWdS9pLSHmjvkN4RTAVLN` reached READY from commit `266b570` at https://brandex-suite.vercel.app. Live browser preview and merge interaction verified; HTTP checks returned 200 for root/preview/login and redirected unauthenticated cases to login. No deployment protection settings were disabled.
- Reviewed and applied a sparse hosted Auth config: disabled public self-signup and changed site_url to the production domain; CLI confirmed all undeclared settings were left unchanged. Added the sparse deployment config and disabled signup in local config as well.
- Verified Auth settings now report signup disabled. Provisioned the user-selected net2outlawzz@gmail.com account as the sole permanent Admin through a private single-use invite link; no invitation email was sent and the agent did not choose a password or consume the link.
- Re-ran all 35 mail-merge integration checks against the production Vercel URL: real Word generation, Linux image rendering, private uploads/downloads, snapshots, eligibility, role denials, and archive behavior passed. Production test fixtures were removed; the two imported templates and the selected Admin remain.
- Production release `a5d981f` (`dpl_D9hTHAiSF76zLPEpbdZUL7RVZPdK`) reached READY. Nested CLI metadata is ignored and absent from current tracked source; the earlier generated metadata contained only non-secret project/organization identifiers.

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


## 17 October 2026 — Suite operations release

The current target is **Brandex Suite**, Supabase `xogbpsnsmephupbqsfgb`, Vercel team `projectsb`. Earlier mature CMS candidate location below is historical and must not be used for Suite migrations.

- Visible Intake renamed **Case Registration / New Case** at `/new-case`; old `/intake` redirects.
- Native client/case/TM identity, configurable series, default Monthly Billing, explicit Advance full-allocation gate, preset stage charges, receiving allocations, stable case receipts, edit/void audit.
- Staff-driven stage events and calendar flags; Accepted creates Stage 3 charge; STOPPED pauses flags; TM-57 reactivation separate charge. Certificate office receipt and delivery tracking are separate.
- Service Associate contact/payee (no login), assignment liability and partial FIFO settlements. Staff roles Admin + Viewer; historical Agent accounts become Viewer, retained.
- Original legacy ledger stays read-only and excluded from new financial totals. Existing records require identity/workflow review; no guessed backfill.
- Migration `20261017152217_suite_case_accounts_workflow.sql` applied to Suite; updated `suite-drive-upload` deployed for same-folder identity sync. Production `dpl_9wUq3fKsAzu8HQxdJ5h1B9UPSmKa` READY at https://brandex-suite.vercel.app.
- Verified locally: production build, TypeScript, Deno, six unit checks and 45 Postgres operation checks. Hosted acceptance is complete: 24 operation + 7 Drive identity + 9 browser writes + 35 document-generation checks; see `PROCESS.MD`.
- Private recovery export of 11 existing public tables saved before migration; not a full Auth/Storage backup. Original live data preserved.

Still pending: legacy Ledger/Sheets reconciliation/import; full mature registry/journal/export parity; objection resolution return path; paid associate reassignment rules; renewal automation; long-term OAuth expiry review. These are not claimed complete by this release.


### Release acceptance — 17 October 2026

- [x] Complete ordered Suite migrations: **45 local Postgres checks**, including reference-length correction, monetary transactions, flags/calendar boundaries, STOPPED/TM-57, delivery and permissions.
- [x] **24 hosted API/browser operation checks**: actual registration, multi-case allocations/receipt revisions, Viewer denials, Accepted charge, partial associate settlement, void without workflow rollback and all operational pages.
- [x] **7 hosted Drive identity checks**: actual browser PDF upload under Restricted X, private file, same-folder TM rename, unchanged file/parent, no duplicate charge and Viewer denial.
- [x] **9 browser write-flow checks**: Case Registration redirect/form, new client/rates, unpaid Advance gate, allocation/unallocated advance, receipt print/PDF, paid filing, persisted event and mobile containment.
- [x] **35 document-generation regression checks** with current Admin/Viewer roles. Private downloads, image embedding, retries, origin restrictions and historical snapshots preserved.
- [x] Production build/TypeScript, Deno Edge Function check and six existing unit checks passed. Receipt rendered as a legible one-page PDF; case/receipt visuals inspected.
- [x] Temporary operation/merge users and operation clients verified zero after cleanup. Created Drive test folder only was trashed; original Drive mappings/files retained.
- [x] Original rows/fields from 11 pre-change public table snapshots verified preserved; one expected Agent-to-Viewer role conversion. Recovery export is private and not a complete Auth/Storage backup.
- [x] Follow-up migration `20261017163618_suite_case_reference_correction.sql` applied to the same Suite target; locked six-digit manual references compare without truncation.

Security advisor: guarded authenticated `suite_action` and upload-lease definer RPCs remain intentional warnings; Viewer RPC denial and direct financial-write denial were exercised. Existing `rls_auto_enable` public/authenticated execution and disabled leaked-password protection remain wider findings. No all-clear security claim.

Use `docs/USER_GUIDE.md` for the actual working flow and `docs/RELEASE_STATUS.md` for release scope. Historical pre-operations test scripts are blocked before creating obsolete Agent fixtures.


## 17 October 2026 — Editorial UI and working guide

Owner requested the Client Ledger PR review/merge, its preferred visual direction in Suite, stronger colour/action hierarchy and an approximately 90% desktop display.

- Reviewed exact Client Ledger PR #1 head `1ef6ad35e0e170763211e331fbfd8263a27c8e5d`: markup/CSS/display escaping/dialog behavior only. Four changed JavaScript files pass syntax checks; whitespace validation and Vercel status pass. Old/new local client screens used synthetic data with network writes disabled.
- Marked PR ready and merged as `91aa9ab8d59cd44fafc767c1bd081d41a99d6237`. GitHub rejected author's self-APPROVE (422); a review COMMENT records evidence and owner merge authorization. No fake second reviewer or approval claim.
- Ledger production `dpl_2QfUokPYfv6JJRKpYzEPpUx2mwmv` READY. Served editorial CSS, interaction JS and brand patch match the reviewed source after line-ending normalization. The original preview URL also identifies the reviewed commit; unauthenticated browser preview navigation timed out, so browser screenshots use the exact local source instead.
- Suite applies editorial serif headings, client cards, compact tables, clear section headers, coloured financial/status cards and payment actions. Unknown stage rates remain explicitly marked; no financial calculation/migration changed.
- Desktop screen only uses 90% density at widths >=1024px; mobile and print remain full scale. Browser zoom preference itself is not changed.
- Navigation now shows active Client Ledger/Service Associates and keeps Sign out on authenticated pages. Added `/guide` (How to use) with Roman Urdu explanations, reference breakdown, payment example, stage path, associates/files/delivery and flag timings.
- Local production build and TypeScript passed. 40 initial Admin/Viewer UI checks passed at 1280px/390px: register/account/case/associate/guide layouts contained, desktop/mobile scale, full print scale, correct account navigation/Sign out and no uncaught browser errors. Final hosted rerun includes unpriced-account presentation.
- Existing local Client Ledger logo deletion/new stamp and Supabase CLI state remain untouched. No old-system records, Auth settings or database rules changed for this visual pass.
