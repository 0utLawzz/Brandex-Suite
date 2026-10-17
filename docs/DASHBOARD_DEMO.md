# Neo-Brutalism dashboard demo — 18 October 2026

- Route: `/dashboard-demo`; isolated fictional data in browser memory. No database calls, sign-in, or external authorization. Middleware excludes this route from session refresh.
- Source: owner's `Neo-Brutalism Theme.pdf`, version 1.0. Bebas Neue / Space Grotesk / DM Mono; exact source colors; 3px panel borders; 5px hard shadows; 6px card/button corners; square inputs; lift/press states.
- Source ambiguity: palette labels #232323 as Off-White, but explicit card/input/button rules specify #FAF6EE. Use #FAF6EE for those components, #232323 only in dark navbar secondary elements.
- Includes search, filters, case detail dialogs, attention queue, ledger view, document preview/download, sample registration with existing-client suggestions, CSV export, Admin/Viewer presentation switch, and reset. Demo role switch is presentation only, never authorization.
- Existing dashboard, live workflows, financial operations, Auth/RLS and production data remain unchanged. This is an interactive design prototype, not a replacement for the full registration, document generation, or associate payment workflows.
- Demo registration origin sets only the initial illustrative stage; it does not introduce automatic live workflow transitions.
