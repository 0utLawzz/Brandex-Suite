# Suite operations release — 17 October 2026

## Delivered together

1. **Case records and workflow** — canonical configurable series/client/case identity, optional six-digit TM/class, actual stage events, searchable register, calendar flags, STOPPED/restoration, certificate office receipt and courier/hand delivery.
2. **Client accounts and proof of payment** — default monthly billing, explicit Advance gate, stage charges/rates, manual multi-case allocations, advances, per-case receipts, print, edit/VOID and audit.
3. **Internal costs and case files** — Service Associate payables and partial FIFO settlements, private Drive uploads and same-folder TM rename. Admin + Viewer staff roles.
4. **Release and preservation** — hosted workflow/browser regression, retained document generation, private recovery export, old systems and original business data preserved.

Frontend release: `dpl_9wUq3fKsAzu8HQxdJ5h1B9UPSmKa`, https://brandex-suite.vercel.app. Suite database `xogbpsnsmephupbqsfgb`; operations migrations `20261017152217` and `20261017163618`; `suite-drive-upload` deployed separately. Source is committed/pushed as part of this release; check Git history for the final commit.


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

## Explicit remaining scope

- Historical Ledger/Sheets import and financial reconciliation: no guessed allocations or TM matches.
- Full mature CMS registry/journal matching, reporting/export parity and bulk data reconciliation.
- Objection resolution event returning to normal flow; reassignment/fee correction after settlement; previous-stage arrears/post-void Advance policy beyond the current entry gate.
- Ten-year renewal scheduling/charges and long-term Google OAuth publishing/refresh expiry review.

These remain visible roadmap items. The implemented normal case/account workflow is released; this is not a claim that every historical repository feature or future business edge is complete.
