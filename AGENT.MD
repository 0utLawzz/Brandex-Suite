# Brandex Suite handoff


## 17 October 2026 — Suite operations release

The current target is **Brandex Suite**, Supabase `xogbpsnsmephupbqsfgb`, Vercel team `projectsb`. Earlier mature CMS candidate location below is historical and must not be used for Suite migrations.

- Visible Intake renamed **Case Registration / New Case** at `/new-case`; old `/intake` redirects.
- Native client/case/TM identity, configurable series, default Monthly Billing, explicit Advance full-allocation gate, preset stage charges, receiving allocations, stable case receipts, edit/void audit.
- Staff-driven stage events and calendar flags; Accepted creates Stage 3 charge; STOPPED pauses flags; TM-57 reactivation separate charge. Certificate office receipt and delivery tracking are separate.
- Service Associate contact/payee (no login), assignment liability and partial FIFO settlements. Staff roles Admin + Viewer; historical Agent accounts become Viewer, retained.
- Original legacy ledger stays read-only and excluded from new financial totals. Existing records require identity/workflow review; no guessed backfill.
- Migration `20261017152217_suite_case_accounts_workflow.sql` applied to Suite; updated `suite-drive-upload` deployed for same-folder identity sync. Production `dpl_9wUq3fKsAzu8HQxdJ5h1B9UPSmKa` READY at https://brandex-suite.vercel.app.
- Verified locally: production build, TypeScript, Deno, six unit checks and 45 Postgres operation checks. Hosted acceptance completed: 75 checks across operations, Drive identity, browser writes and document generation; see `PROCESS.MD`.
- Private recovery export of 11 existing public tables saved before migration; not a full Auth/Storage backup. Original live data preserved.

Still pending: legacy Ledger/Sheets reconciliation/import; full mature registry/journal/export parity; objection resolution return path; paid associate reassignment rules; renewal automation; long-term OAuth expiry review. These are not claimed complete by this release.


17 October 2026. Canonical contributor rules remain in `AGENTS.md`.

Read `PROCESS.MD`, `AGENTS.md`, `CHANGELOG.md`, `docs/DRIVE_CONNECTION_STATUS.md`, then `docs/SYSTEM_ROADMAP.md`.

Target: Suite `xogbpsnsmephupbqsfgb`, not mature CMS. Use verified Supabase CLI access when the connector is unavailable. Keep real data and other repos untouched.

Drive source and isolated hosted API checks are implemented. Owner approved restricting existing X/A roots; their public writer links are removed and named access is preserved. Uploads continue to fail closed at public/domain destinations. Do not change other permissions without authorization. Dedicated TM/mark/class fields, automatic renaming and the full mature CMS/Ledger candidate are outside this bounded Drive port.

Never print private config values. Record exact evidence and deployed/pending state in the checklist/changelog on each change. Source commits/build success alone do not prove browser or hosted acceptance.

## Current visual direction

17 October: Ledger PR #1 merged as 91aa9ab. Suite uses that editorial direction with stronger colour/action hierarchy. Desktop screen density is 90%; mobile/print 100%. `/guide` explains the actual flow. Keep payment calculations, permissions and Drive/workflow behavior unchanged during visual work. Review PROCESS.MD for evidence.
