# Brandex Suite — Agent Instructions

## Current owner direction - 17 October 2026

Read `docs/SYSTEM_ROADMAP.md` before further implementation. Latest explicit owner decisions supersede conflicting historical Mail Merge, Agent-login, data-wipe, payment and workflow assumptions below. Owner authorized coding and Drive integration. Confirmed hosted target is Brandex-Suite `xogbpsnsmephupbqsfgb`, frontend `https://brandex-suite.vercel.app`. Preserve other repos/live data. Never apply the separate mature CMS candidate migrations directly to Suite.

This file is read by any AI coding assistant working in this repo (Claude Code, Codex, GPT-based assistants, etc.). Follow it before making changes, so work stays consistent across tools and sessions.

## What this project is
A single consolidated web app replacing three separate legacy systems: Brandex EMS (case/client database), a standalone client ledger, and a standalone mail merge tool. All three are being merged into one app. **No data migration** — old systems only had test data, this is a fresh build.

## Stack
- **Frontend/Backend**: Next.js
- **Database/Auth/Storage**: Supabase (Postgres + Auth + Storage, Row-Level Security for roles)
- **Deployment**: Vercel

## Roles (enforce via Supabase RLS)
- **Admin** — full read/write, all tables
- **Viewer** — read-only, all tables
- **Agent** — read/write ONLY on cases where `assigned_agent_id` matches their user id; can update status/assessment fields only, never core client/case/ledger data

## Core schema
- `clients` — client_code, trading_as, address, contact_info
- `cases` — client_id, case_prefix, case_number, `origin` (`fresh` | `stage2` | `stage3`), stage/status, assigned_agent_id, images
- `ledger` — case_id, amount, type, status (`paid`/`pending`), date
- `templates` — name, category (Filing, Examination, Acknowledgment, Opposition, Counter Statement, +more — keep this as data, not hardcoded, since more categories get added)
- `documents` — case_id, template_id, generated_file_url, generated_at

## Key workflow concept: entry point = max input
The case intake form captures everything up front (client code, trading-as, address, case prefix/number, images) because **later stages don't allow editing these fields**. An `origin` marker (`fresh` vs `stage2`/`stage3`) on the case determines which workflow branch and which document types apply next. `stage2`/`stage3` = client applied independently via IPO, got stuck after acknowledgement/notification, and is now engaging Brandex to take over the case.

## Mail merge module
Not a separate tool — lives inside the case page. User picks a template category, the system auto-fills placeholders from the linked client + case record, saves the generated file to Supabase Storage, and logs it in `documents` linked to that case.

## Ledger
Lives in the same database as cases, not standalone — payment status should always be visible alongside case status since they're coupled in the real workflow.

## Build order
1. Schema + Supabase Auth + RLS roles
2. Case entry point (intake form with origin toggle)
3. Ledger
4. Mail merge module + template library
5. Role-specific dashboards

## Working conventions

## UI theme implementation notes

- The Neo-Brutalism source was audited from `Brandex-Client-Ledger` at `design/ui-polish-v1` commit `1ef6ad35e0e170763211e331fbfd8263a27c8e5d` in a clean detached worktree.
- The ledger branch ships CSS rather than Tailwind. Its screen layer loads Google Fonts (`Fraunces`, `Manrope`, and `IBM Plex Mono`) with Google-hosted links; it does not self-host fonts.
- The shipped screen values use cream `#F0E8D0`, panel `#FAF6EE`, black `#0C0C0C`, orange `#C94A00`, teal `#0D9970`, and gold `#D4A800`. The older README wording mentioning maroon and the base Bebas/Space Grotesk/DM Mono layer does not describe the final screen override.
- Brandex Suite now exposes those values as `.theme-neobrutalism` tokens and reusable primitives under `components/ui/`. This pass is UI-only; schema, RLS, API routes, storage behavior, and workflow logic are unchanged.
- Keep scope to what's described here — don't expand beyond this spec without flagging it first.
- Full build spec with more detail: see `/docs/BUILD_SPEC.md` in this repo (or the linked Claude Doc).
- When committing, use clear commit messages describing what changed, e.g. `feat: add case intake form with origin toggle`.
- Case creation is Admin-only — update RLS insert policy on cases and clients accordingly. Agents and Viewers cannot create cases.

## Continuation notes — 15 October 2026

- Phases 1–4 are implemented. Continue with Phase 5 (role dashboards); do not rebuild intake/ledger/mail merge or import legacy test records.
- `/login` uses existing Supabase password Auth. Staff accounts are provisioned outside the app; no public signup or permanent test users.
- `/cases` is the ledger entry point; `/cases/[id]` displays core details, case status, paid/pending totals, and ledger entries. `/dashboard` is the role-specific landing page after sign-in.
- Ledger writes are Admin-only in both the API and existing RLS. Agents/Viewers get read-only case-scoped views. Never use a service-role client in app code.
- A pending entry becomes paid by editing its status. Totals sum amounts per status; do not subtract paid entries from pending or invent invoice/refund/currency rules.
- Amount validation matches numeric(12,2). Validate calendar dates and scope entry updates/deletes by both case and entry ID.
- The intake cleanup migration allows Admin deletion of case-image objects while their case still exists. Remove objects before deleting a failed case; preserve and report the case ID if cleanup fails.
- `docs/BUILD_SPEC.md` records confirmed decisions, current gaps, and security-advisor findings. Exact origin stage transitions remain pending; template eligibility is Admin-configured data.
- Keep `asset/` conversation/CSV reference files and existing unrelated package.json changes out of feature commits. Never publish local credentials or test-session state.
- Update progress/instructions and commit/push completed modifications, per the explicit instruction in the local authoritative chat history.

## Phase 4 and deployment notes

- Word output is generated server-side using `docx`; `sharp` normalizes private intake images to embedded PNGs. Source templates are plain text with core fields, required `custom.field_name` fields, and a standalone `case_images` marker. Never evaluate template code or render raw template HTML.
- Library writes and document generation are Admin-only, including RLS and Storage upload policies. Viewer reads all case documents; Agent reads assigned-case documents only. Do not re-enable Agent generation based on the superseded Phase 1 documents-insert policy.
- Categories and `allowed_origins` remain database data. Imported templates default to all origins until Admin configures eligibility; do not infer statutory stage transitions.
- Generated documents store a private bucket path in `generated_file_url`, plus a name and immutable generation snapshot. Short-lived signed downloads are created only after case-scoped RLS lookup. Archive templates rather than deleting referenced history.
- Original TM-1/TM-48 text was read through the user's Drive connection and imported directly into the live database. The original files were not changed and their private content is not committed. Word page layout is rebuilt; the original formatting is not claimed preserved.
- Vercel target: team `projectsb` (`team_yojHGKDK8OPASQSirQfdzT5J`), project `brandex-suite` (`prj_B2NPOn7cwD0OsRolxte2PZKWQQLW`), Node 24. Only public Supabase URL/anon config is required by the deployed app. No service-role key is deployed.
- `.vercelignore` excludes credentials, history/assets, test scripts, local work, and Supabase CLI state. Keep all `.vercel` and generated setup tokens untracked.
- The user selected `net2outlawzz@gmail.com` as the first Admin email. Private invitation/recovery links are single-use and must never be committed, published on a preview page, or consumed during agent testing. The user chooses their password.
- Hosted Auth must stay invitation-only (`enable_signup = false`), including the direct Supabase signup API; hiding signup UI alone is insufficient. `deployment/supabase/config.toml` is the sparse hosted config. Diff it before pushing, leaving undeclared project settings unchanged.

## Phase 5 notes — 16 October 2026

- `/dashboard` and `/cases` fetch session-scoped data through RLS; Agents see assigned cases and matching payment/document totals only. Reads paginate past the Data API limit.
- Admin assigns, reassigns, and unassigns from case detail. Agent targets must have the current Agent role. Account email labels are synced from Auth into profiles; do not widen roster access beyond Admin.
- Admin and assigned Agents edit status/assessment. Core data and stage remain read-only here; no statutory stage rules have been invented. Viewer has no write controls.
- Assignment/workflow APIs require `expected_updated_at` and return 409 for stale edits. Keep both API authorization and direct-Data-API RLS/trigger protections.
- `scripts/verify-phase5.mjs` uses temporary real Auth sessions to test dashboards, filters, assignments, role demotion, stale edits, and protected core columns. Cleanup is scoped to exact generated IDs.


## Drive continuation - 17 October 2026

- Read `PROCESS.MD`, `AGENT.MD`, `CHANGELOG.md`, `docs/DRIVE_CONNECTION_STATUS.md` before continuing.

- Suite-only additive migration `20261017094102` and `suite-drive-upload` function deployed to the confirmed Suite project. Do not confuse it with `jzcrfbyypbbbittzbyyx`.

- OAuth credentials are server secrets only. Private local configuration is outside the repo; never log/copy values, callback codes or sessions.

- Drive uploads are Admin-only. Viewer can read file history. Legacy Agent authorization elsewhere in Suite has not been removed by this bounded change; Agents have no new Drive access.

- X/A existing roots are seeded. On 17 October owner explicitly authorized restricting these exact roots: public writer links removed, three named staff grants per root preserved. Private destination validation continues to reject anyone/domain access. Other sharing changes need separate authorization.

- Files upload directly to Edge Function (up to 20 MB); no Next.js proxy body-limit workaround. Use per-client leases, SHA-256 and stable upload ID for retries; immutable history and folder bindings.

- Folder labels are explicitly editable at first upload because Suite lacks dedicated TM/mark/class fields. Existing folder IDs may be supplied and are checked against their selected parent. No existing folder renaming or TM-sync parity claim.

- Hosted API verification passed 18 checks against isolated fixtures/private test root; fixture records/users removed and test Drive folders trashed. Browser/deployment evidence is recorded separately.

- Final hosted verification: 23 API/browser checks, including Admin upload and Viewer history/no upload controls; seven original public tables match pre-change export after fixture cleanup. Deployment identifiers and completed root privacy verification are in PROCESS.MD.
