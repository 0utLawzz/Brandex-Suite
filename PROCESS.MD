# Brandex Suite execution checklist

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

## Root destination decision pending

X = `1 ALL CLIENTS`, folder `18T0MojE1IiT7uIz9P8Sthlamj8icR8X6`.
A = `2 CONSULTANTS`, folder `1Ke_B9vI_DdiiXPTTCBDtS4Ny6l73kIBU`.

Real test found inherited public access from X. App now rejects public/domain-shared destinations before upload. Do not call X operational for private uploads until owner chooses Restricted existing roots or new private upload roots. Do not infer A sharing from the X finding. Staff also need appropriate Google account folder access; app Viewer permission does not grant Google access automatically.

## Next checks

- [x] Vercel production READY: `dpl_H2DtADfuJ4JEcgBGW533EEa2n9v6`, aliased to Suite.
- [x] Production browser Admin upload/history, Viewer history/no-upload controls and no uncaught JS errors verified. Total: 23 hosted API/browser checks. Screenshots are private local test evidence under `work/drive-verification`.
- [x] After fixture cleanup, all seven original public tables exactly match the private pre-change row export.
- [ ] Owner selects root privacy approach; verify permissions and map final destinations.
- [ ] Verify X/A uploads in final approved destinations after privacy setup.
- [ ] Confirm OAuth publishing/refresh-token expiry behavior; Testing consent may require renewal.
- [ ] Review wider roadmap as separate work: dedicated case identity fields, billing/workflow integration and mature feature parity. Never silently copy CMS migrations into Suite.

## Private materials

Private config and row export are outside this repo in workspace `private-config`. Do not print/upload them or include them in Vercel packages. No full Storage binary backup or Auth recovery claim. Function uses only session-scoped DB client; no service-role key in app. The verification script obtains its temporary test-admin key in memory and logs only test results.

## Change discipline

Update this checklist, `CHANGELOG.md`, current agent notes and connection status with date, exact target, evidence, blockers and next action. Check off only verified outcomes. Preserve historical logs in `progress.md`.

## Security advisor review

17 October CLI security advisor reports intentional authenticated SECURITY DEFINER warnings for the two upload-lease RPCs. Their strict Admin profile guards, empty search_path and revoked anonymous/public execution were reviewed; Viewer denial was exercised. Existing `rls_auto_enable` execution warnings and disabled Auth leaked-password protection remain wider-project findings, not resolved by this upload change. No all-clear security claim.

References: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable and https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.
