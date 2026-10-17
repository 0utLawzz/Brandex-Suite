# Suite Drive connection status

Updated 17 October 2026. Latest owner-confirmed target: Brandex-Suite `xogbpsnsmephupbqsfgb`, organization `ivndkifrndbgafxqmgdj`, frontend `https://brandex-suite.vercel.app`.

## Live configuration and implementation

- CLI access verified; four server setting digests match expected private values: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, BRANDEX_ALLOWED_ORIGINS. Values remain outside source. Browser connector is not the verified management path.
- Google consent, offline token exchange and Drive API verified.
- Suite-only migration `20261017094102_suite_private_drive_uploads.sql` applied after dry-run showed exactly one new migration. Existing case/ledger/role rows untouched; no mature CMS migrations copied.
- Function `suite-drive-upload` deployed to Suite. Admin JWT/profile checks and session-scoped RLS; no service-role client in app. Viewer reads metadata; legacy Agent has no Drive access.
- Case upload/history panel is on production deployment `dpl_H2DtADfuJ4JEcgBGW533EEa2n9v6`, URL `https://brandex-suite-63enj4onb-projectsb.vercel.app`, aliased to Suite. Vercel READY confirmed.
- Upload supports PDF/PNG/JPEG up to 20 MB, contents/type validation, per-client lease, stable upload ID and SHA-256 retry matching. Existing exact-name folders are reused, duplicate names rejected, supplied folder IDs validated under the selected parent. No public sharing is created.

## Verification and current limitation

18 hosted API checks passed on an isolated private test root, including real upload/retrieval, private permission check, repeat retry/no duplicate, mismatch rejection, folder reuse and Viewer/Agent/origin denial. Temporary test rows/users removed; only generated test folders trashed. Production browser verification is recorded in PROCESS.MD when completed.

The existing X root (`1 ALL CLIENTS`, `18T0MojE1IiT7uIz9P8Sthlamj8icR8X6`) inherits public sharing. Upload now fails closed for anyone/domain destinations before writing a file. Existing permissions were NOT changed. Owner choice pending: restrict existing roots or choose new private roots. A root (`2 CONSULTANTS`, `1Ke_B9vI_DdiiXPTTCBDtS4Ny6l73kIBU`) is seeded; do not infer its sharing from the X finding. Google staff access is separate from app roles.

Suite lacks dedicated TM/mark/class fields. Folder labels are entered at first upload, or a verified existing folder ID is used. No automatic TM folder rename, full CMS port or financial/workflow parity claim.

OAuth consent publishing/token lifetime still needs confirmation. Read PROCESS.MD and CHANGELOG.md for release evidence and next actions.

## Historical correction

Earlier attempted CMS secrets upload failed HTTP 403. That was the wrong target; no successful new release was made there. The correct Suite CLI account is available and its server settings are verified. Mature CMS candidate remains separately preserved reference work.

Production browser Admin/Viewer checks completed: 23 hosted checks passed in total. Browser screenshots visually inspected; test fixtures cleaned, seven original public tables verified unchanged. A text-encoding-only page correction was rebuilt afterward.
