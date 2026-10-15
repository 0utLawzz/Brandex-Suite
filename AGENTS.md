# Brandex Suite — Agent Instructions

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

- Phases 1–3 are implemented. Continue with Phase 4 (mail merge/template library); do not rebuild the intake or import legacy test data.
- `/login` uses existing Supabase password Auth. Staff accounts are provisioned outside the app; no public signup or permanent test users.
- `/cases` is the ledger entry point; `/cases/[id]` displays core details, case status, paid/pending totals, and ledger entries. This is not the final role dashboard.
- Ledger writes are Admin-only in both the API and existing RLS. Agents/Viewers get read-only case-scoped views. Never use a service-role client in app code.
- A pending entry becomes paid by editing its status. Totals sum amounts per status; do not subtract paid entries from pending or invent invoice/refund/currency rules.
- Amount validation matches numeric(12,2). Validate calendar dates and scope entry updates/deletes by both case and entry ID.
- The intake cleanup migration allows Admin deletion of case-image objects while their case still exists. Remove objects before deleting a failed case; preserve and report the case ID if cleanup fails.
- `docs/BUILD_SPEC.md` records confirmed decisions, current gaps, and prior security-advisor findings. Exact origin workflows and actual mail-merge output/templates are still pending.
- Keep `asset/` conversation/CSV reference files and existing unrelated package.json changes out of feature commits. Never publish local credentials or test-session state.
- Update progress/instructions and commit/push completed modifications, per the explicit instruction in the local authoritative chat history.
