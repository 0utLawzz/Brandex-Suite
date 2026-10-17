# Neo-Brutalism dashboard demo — 18 October 2026

**Retired:** Owner approved the main application design on 18 October. `/dashboard-demo` and its fictional data were removed. The following records the historical prototype only. Current rules live in `docs/BRANDING.md`.

- Route: `/dashboard-demo`; isolated fictional data in browser memory. No database calls, sign-in, or external authorization. Middleware excludes this route from session refresh.
- Source: owner's `Neo-Brutalism Theme.pdf`, version 1.0. Bebas Neue / Space Grotesk / DM Mono; exact source colors; 3px panel borders; 5px hard shadows; 6px card/button corners; square inputs; lift/press states.
- Source ambiguity: palette labels #232323 as Off-White, but explicit card/input/button rules specify #FAF6EE. Use #FAF6EE for those components, #232323 only in dark navbar secondary elements.
- Includes search, filters, case detail dialogs, attention queue, ledger view, document preview/download, sample registration with existing-client suggestions, CSV export, Admin/Viewer presentation switch, and reset. Demo role switch is presentation only, never authorization.
- Existing dashboard, live workflows, financial operations, Auth/RLS and production data remain unchanged. This is an interactive design prototype, not a replacement for the full registration, document generation, or associate payment workflows.
- Demo registration origin sets only the initial illustrative stage; it does not introduce automatic live workflow transitions.

Verification: production build and TypeScript passed. Browser checks covered search, overdue filtering, case/document preview, registration, reset, Viewer presentation and stage-2 sample origin. No browser console errors observed. Mobile 390px check confirmed no page-level horizontal overflow after the containment fix; wide tables retain their own scroll region. Final preview uses the development server at http://localhost:3100/dashboard-demo. Source pushed on the separate demo branch; production dashboard not replaced.

## 18 October 2026 - pending design changes synchronized

Owner requested committing and pushing the existing local demo edits: Polymnia Framed typography, purple navigation accents, wordmark and application icons, and an illustrative A4 report view with colour selection and print styles. Font preview assets and their supplied license files are included. The report uses hard-coded fictional data; this is not a verified accounting report. Changes stay on the design/neo-dashboard-demo branch. The operational dashboard is not replaced by this sync.
