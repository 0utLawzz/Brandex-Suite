# Brandex Suite changelog

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


## 17 October 2026 - Suite Drive integration

- Corrected target to owner-confirmed `xogbpsnsmephupbqsfgb`; CLI access and server secret names verified.
- Added migration `20261017094102`: series roots, immutable client/case bindings and file history, private client leases and explicit Admin/Viewer RLS. Existing business rows/roles untouched.
- Added authenticated `suite-drive-upload`: content/type/size checks, per-client serialization, SHA-256/idempotent retries, exact-name folder reuse/duplicate rejection and existing-parent checks. No public sharing creation.
- Added case-page upload/history panel; Admin-only upload, Viewer read-only; optional verified existing folder IDs and configurable new-series roots.
- Real upload test exposed inherited public sharing on X. Test files were cleaned; added fail-closed public/domain permission validation. Owner destination choice remains pending.
- 18 hosted API checks passed using a separate private disposable root. Test records/users removed and test folders trashed. Existing six unit checks, Next build and function Deno check passed.
- Added Suite process/handoff docs; historical CMS notes are not Suite deployment status.

- Vercel production READY: `dpl_3xqq2cRFwVRyfpq8oXaNbRQgZq9r`, aliased to `https://brandex-suite.vercel.app`; browser evidence tracked separately from build/API checks.

Production browser Admin/Viewer checks completed: 23 hosted checks passed in total. Browser screenshots visually inspected; test fixtures cleaned, seven original public tables verified unchanged. A text-encoding-only page correction was rebuilt afterward.

- Final text-encoding-only rebuild READY: `dpl_H2DtADfuJ4JEcgBGW533EEa2n9v6` (`https://brandex-suite-63enj4onb-projectsb.vercel.app`), aliased to production; same upload behavior verified by the preceding 23-check browser/API run.

## 17 October 2026 - Owner-approved root restriction

- Explicit owner choice: restrict existing X/A roots.
- Removed direct `anyoneWithLink` writer grants from the two verified roots only.
- Re-read permissions: no public/domain grants on either root; three named user/group permissions per root exactly preserved.
- Before/after evidence saved privately. No renaming, moving, content deletion or other sharing changes.
- No frontend/database/function redeployment needed for Drive permission changes.

- Post-restriction actual app uploads verified under both original X/A roots; uploaded files had no public/domain grants. Test folders trashed and temporary rows/login removed; original seven public tables unchanged.
- Improved Edge Function failure messages/logs with operation category and HTTP status only (no token, path, filename or private response contents). A initially failed 502; subsequent upload passed after diagnostic redeploy. Root cause not asserted.


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
