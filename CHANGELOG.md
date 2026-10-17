# Brandex Suite changelog

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
