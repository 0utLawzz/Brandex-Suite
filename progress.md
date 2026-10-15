# Brandex Suite Progress

## 2026-10-15 — Neo-Brutalism UI system

- Audited `Brandex-Client-Ledger` branch `design/ui-polish-v1` at commit `1ef6ad35e0e170763211e331fbfd8263a27c8e5d`.
- Confirmed the shipped ledger screen uses Google Fonts links, not self-hosted font files. The effective screen fonts are Fraunces, Manrope, and IBM Plex Mono.
- Confirmed the shipped source has no Tailwind config. Brandex Suite adds `tailwind.config.ts` as the reusable token map while keeping the current Next.js CSS pipeline stable.
- Added `.theme-neobrutalism` variables, hard bottom-right shadows, square borders, zero gradients/blur/glass effects, and exact button/input interaction rules in `app/globals.css`.
- Added reusable `Button`, `Card`, `Panel`, `Input`, `Tabs`, `Badge`, and always-dark `Navbar` primitives in `components/ui/`.
- Applied the primitives to the Phase 1 landing page and Phase 2 Admin case intake page.
- Schema, RLS, Supabase routes, image storage behavior, and workflow logic were not changed.
