# Brandex Suite execution checklist


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


Updated 17 October 2026 (Asia/Karachi).

## Confirmed targets

- Repository: Brandex-Suite (this repo). Next.js; existing Suite schema retained.
- Supabase: `xogbpsnsmephupbqsfgb`, organization `ivndkifrndbgafxqmgdj`.
- Vercel: `brandex-suite`, team `projectsb`, project `prj_B2NPOn7cwD0OsRolxte2PZKWQQLW`.
- Production: `https://brandex-suite.vercel.app`.
- Separate mature CMS implementation is reference/candidate work, not this schema or deployment.

## Completed

- [x] Target corrected from mature CMS to owner-confirmed Suite.
- [x] CLI account/project access verified; six existing migration versions matched before adding Drive.
- [x] Google OAuth consent, offline credentials and Drive account API verified privately.
- [x] Four server settings saved to Suite and names/digests checked. No credentials committed.
- [x] Existing X/A roots found; IDs seeded in migration.
- [x] Private pre-change JSON export of seven public tables verified. This is a row recovery export, NOT a complete Auth/Storage/database backup.
- [x] Additive Suite migration `20261017094102_suite_private_drive_uploads.sql` applied. Existing cases/ledger/roles not rewritten.
- [x] `suite-drive-upload` deployed with JWT/user/profile checks, Admin-only uploads, RLS, private-folder validation, client lease, stable upload ID/hash and retry recovery.
- [x] Case upload/history UI implemented: PDF/PNG/JPEG up to 20 MB, explicit case folder label, existing folder IDs, X/A default mappings, add-series/root control.
- [x] 18 isolated hosted API checks passed: actual upload/retrieval, nonpublic file, replay, content mismatch, folder reuse, concurrent lease and role/origin denial.
- [x] API test records/users removed; only test folders trashed. Original business files unchanged.
- [x] TypeScript/Next production build and six existing unit checks passed; Deno function type check passed after null guard fix.

## Root privacy - owner approved and applied 17 October

Owner explicitly chose Restricted existing X/A roots. Removed only the `anyoneWithLink` writer permission on these two exact roots:

- X: `1 ALL CLIENTS`, `18T0MojE1IiT7uIz9P8Sthlamj8icR8X6`.
- A: `2 CONSULTANTS`, `1Ke_B9vI_DdiiXPTTCBDtS4Ny6l73kIBU`.

Fresh permission lists contain no anyone/domain grants. All three named user/group permissions per root retain identical IDs, types and roles. Before/after permission evidence is private outside source. No other folder's permissions were modified. Existing child items with separately granted public access were not broadly scanned or changed; the upload function still checks destination folders and rejects public/domain sharing.

App Viewer role does not grant Google access automatically; intended staff need their named Google permission.

## Next checks

- [x] Vercel production READY: `dpl_H2DtADfuJ4JEcgBGW533EEa2n9v6`, aliased to Suite.
- [x] Production browser Admin upload/history, Viewer history/no-upload controls and no uncaught JS errors verified. Total: 23 hosted API/browser checks. Screenshots are private local test evidence under `work/drive-verification`.
- [x] After fixture cleanup, all seven original public tables exactly match the private pre-change row export.
- [x] Owner approved Restricted existing roots; both root permission lists verified, named staff access preserved.
- [x] Real app uploads under both original X/A roots succeeded after restriction; each uploaded file had no public/domain permission. Only test folders trashed and fixtures removed.
- [ ] Confirm OAuth publishing/refresh-token expiry behavior; Testing consent may require renewal.
- [ ] Review wider roadmap as separate work: dedicated case identity fields, billing/workflow integration and mature feature parity. Never silently copy CMS migrations into Suite.

## Private materials

Private config and row export are outside this repo in workspace `private-config`. Do not print/upload them or include them in Vercel packages. No full Storage binary backup or Auth recovery claim. Function uses only session-scoped DB client; no service-role key in app. The verification script obtains its temporary test-admin key in memory and logs only test results.

## Change discipline

Update this checklist, `CHANGELOG.md`, current agent notes and connection status with date, exact target, evidence, blockers and next action. Check off only verified outcomes. Preserve historical logs in `progress.md`.

## Security advisor review

17 October CLI security advisor reports intentional authenticated SECURITY DEFINER warnings for the two upload-lease RPCs. Their strict Admin profile guards, empty search_path and revoked anonymous/public execution were reviewed; Viewer denial was exercised. Existing `rls_auto_enable` execution warnings and disabled Auth leaked-password protection remain wider-project findings, not resolved by this upload change. No all-clear security claim.

References: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable and https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.

17 October follow-through: A initially returned generic Drive 502 despite valid named write capability. Added non-sensitive operation/status diagnostics to the Edge Function and redeployed; a subsequent actual A upload succeeded. Cause of the initial failure is not established; no public sharing restored. X actual upload also passed. Seven original public tables match the pre-change export after cleanup.


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
