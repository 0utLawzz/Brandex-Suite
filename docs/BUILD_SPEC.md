# Brandex Suite — Build Spec

Reconciled on 15 October 2026 from the supplied Build Spec, `AGENTS.md`, local
`asset/Claude-Meger Advice` (the actual file has no extension), and
`asset/Chat-history.txt`. The local exports are context, not application code or
mail-merge templates. They remain untracked because they include conversation
and testing details that do not belong in the public repository.

## Confirmed decisions

- One Next.js application replaces EMS, the standalone ledger, and mail merge.
- Supabase supplies Postgres, Auth, private Storage, and RLS; Vercel is the deployment target.
- Start fresh. Do not import legacy test records or merge legacy application code wholesale.
- Admin has full operational access. Viewer is read-only. Agent reads assigned cases
  and linked records and may change only assigned case status and assessment.
- Only Admin creates clients/cases and uploads images at intake.
- Search existing clients by client code or trading-as first; create a new client inline when needed.
- Intake captures client code, trading-as, address, case prefix/number, images,
  and origin (`fresh`, `stage2`, `stage3`). Subsequent case pages do not edit core identity fields.
- Stage 2/3 origins mean an independently filed IPO case taken over by Brandex.
- Ledger belongs to each case in the same application; payment status appears with case status.
- Mail merge will live inside the case page. Choose a category/template, fill client/case
  placeholders, save the output in private Storage, and log it in `documents`.
- Categories are database rows, initially Filing, Examination, Acknowledgment,
  Opposition, and Counter Statement; adding categories must not require a release.
- Retain the audited Neo-Brutalism design system from the ledger design branch:
  cream/panel/black/orange/teal/gold, Fraunces/Manrope/IBM Plex Mono, square borders,
  bottom-right hard shadows, all-caps labels; no gradients, blur, or glass effects.
- Record important changes in `progress.md` and `AGENTS.md`, commit and push completed changes.

## Existing schema

`profiles` contains the authoritative staff role. `clients` contains client_code,
trading_as, address, and contact_info. `cases` links the client, case prefix/number,
origin, stage, status, assessment, assigned agent, and image references.
`ledger` links a case with amount, type, paid/pending status, and date.
`template_categories`, `templates`, and `documents` support the later document module.
Storage buckets `case-images` and `documents` are private.

## Implementation reconciliation

| Area | State before this continuation | State after this continuation |
| --- | --- | --- |
| Phase 1: schema/Auth/RLS | Three migrations present; prior 15 real-token checks documented; no staff sign-in UI | Existing schema preserved; staff password sign-in/sign-out added; real-token regression checks pass |
| Phase 2: intake | Admin page and APIs, client search/create, origin toggle, image upload; live migration applied | Preserved; fixed form reset after await, image prevalidation, Admin image deletion policy and explicit cleanup failures; successful intake opens the new case |
| Shared theme | Already implemented at `c353179`; README incorrectly claimed Phase 1 only | Reused throughout new pages |
| Phase 3: ledger | Database table and RLS only; no case pages or ledger API/UI | Case list/detail, Admin entry CRUD, paid/pending summaries, read-only Viewer/assigned-Agent access |
| Phase 4: mail merge | Schema/category seeds/buckets only | Implemented: Admin library/editor, data-driven categories/origin eligibility, merge preview, custom fields, Word output with images, private Storage/logging and protected downloads |
| Phase 5: role dashboards | Not implemented | Pending; case browsing is a minimal ledger entry point, not the final dashboard |
| Vercel deployment | Target chosen; no deployment evidence in checkout | Deployment now targets projectsb/brandex-suite; live release evidence is recorded in progress.md |

## Ledger behavior

Each entry represents an amount with a paid or pending state. Mark a pending
entry paid to move its amount between totals; do not add a duplicate payment
to offset it. Pending total is the sum of pending entries, not pending minus
paid. No currency, invoice, refund, tax, or accounting model was specified;
amounts remain neutrally labeled, and type is editable text rather than an enum.
Dates use the supplied date; new-entry defaults use Asia/Karachi.
The API accepts exact amounts within `numeric(12,2)`, validates real dates,
and scopes every change to both case and entry ID. Database RLS remains active.

## Remaining boundaries and decisions

- Exact origin-to-stage transitions are still not specified. Document eligibility
  now uses each template's Admin-configured allowed_origins. Do not invent an IPO
  workflow from origin labels alone. Existing case defaults still use Filing/Ready.
- `asset/TM-*.csv` are reference exports, not renderable mail-merge templates.
  They are not imported as templates. The original TM-1/TM-48 Google Docs were
  accessible through the user's Drive connection; their text was imported into
  the live library with core/custom placeholder mapping. Original formatting is
  not copied: output is a rebuilt editable A4 Word document. Descriptions record
  this limitation and retain links to the unchanged originals.
- The user selected net2outlawzz@gmail.com for the first Admin. Provision this
  account through Supabase Auth with a private setup link; do not create a public
  demo Admin, embed credentials, or send an unsolicited invitation email.
- Core fields are read-only on later app pages; current database policy still
  gives Admin core-write access, as the full-access role requires.
- `profiles` currently allows self/Admin reads rather than all-profile Viewer
  reads. The literal all-tables spec is not fully reflected there; revisit with
  staff administration, without broadening access as part of ledger work.
- Phase 4 now gives Admin full document-row writes and private file insert/delete;
  Agent/Viewer document writes are denied. App history is immutable, while
  templates support editing and archival.
- The app-owned `public.touch_updated_at` search path was fixed in Phase 4.
  Remaining existing advisor warnings concern public execute privileges on the
  platform-created `public.rls_auto_enable` event-trigger function. They are
  recorded rather than silently changing unrelated platform objects.
- The final advisor run also reported leaked-password protection disabled in
  Supabase Auth settings. This continuation did not change that project setting.
- Partial intake cleanup is compensating work across database/Storage, not a
  transaction. Failures now retain the case when image cleanup fails and report
  the recovery ID. Cross-service interruption/retry handling remains a future
  hardening concern.

Phase 4 validation: 35 live mail-merge checks and 40 ledger regression checks
passed, alongside unit and production-build checks. Generated DOCX archives
were inspected for merged XML and embedded images; pixel rendering could not
run because LibreOffice is not installed in this Windows environment.

Next implementation phase: Phase 5, role-specific dashboards. Exact statutory
workflow rules and pixel-faithful imports of original document layouts remain
separate follow-up work.
