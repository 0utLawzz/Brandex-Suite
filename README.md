# Brandex Suite

Brandex trademark case management and client accounts. Next.js, Supabase and Vercel.

Production: [brandex-suite.vercel.app](https://brandex-suite.vercel.app). Current database: `xogbpsnsmephupbqsfgb`. Other Brandex CMS, Ledger and Sheets systems remain preserved and are not silently merged or imported.

## Working modules

- **New Case / Case Registration**: repeat-client search, configurable series, manual client/case reference, separate six-digit TM, mark/class, images and takeover origin. `/intake` redirects to `/new-case`.
- **Case Register**: searchable server-paginated records, workflow/stage/payment filters and calendar focus flags.
- **Client Ledger**: stage charges at preset rates, manual allocations, advance balances, case receipts, print, edit/void and old/new audit history. Monthly Billing is the default; explicit Advance terms require full stage allocation. No 60% rule.
- **Case workspace**: staff-recorded workflow events, optional examination, Hearing/Accepted, publication, Demand Note, ten-year fee, certificate office receipt and delivery. STOPPED/TM-57 handled separately; no automatic stage movement.
- **Service Associates**: contacts/payees without logins, assignment liabilities and partial FIFO settlements separate from client fees.
- **Private Drive files**: X/A roots, folder reuse, authenticated uploads, same-folder TM rename and Viewer history. Named Google access remains necessary to open private files.
- **Document generation**: retained as a separate collapsible case function. Editable Word output, private short-lived downloads, template/category controls and immutable generation snapshots.

Admin manages the app. Viewer is read-only. Historical Agent accounts are retained as Viewer. The old paid/pending ledger is read-only history, excluded from new financial totals until explicitly reconciled.

The app includes [How to use](https://brandex-suite.vercel.app/guide): Roman Urdu examples and the working flow. Editorial screens use a compact 90% desktop scale; mobile and print stay full size.

## Documentation

- [Daily working guide](docs/USER_GUIDE.md)
- [Roadmap and confirmed business decisions](docs/SYSTEM_ROADMAP.md)
- [Current release evidence and remaining scope](docs/RELEASE_STATUS.md)
- [Process checklist](PROCESS.MD)
- [Contributor instructions](AGENTS.md) and [handoff](AGENT.MD)
- [Change history](CHANGELOG.md)
- [Verification scripts](scripts/README.md)

The historical build spec and chronological notes are references. Latest owner-confirmed roadmap decisions and current release notes supersede old Agent-login, paid/pending entry and data-wipe assumptions.

## Local development

Install with `npm ci`, configure the public Supabase URL/anon key in an ignored local environment file, then use `npm run dev`. `npm run build` validates the Next.js production bundle and TypeScript. No service-role key belongs in the app or public environment.

`npm test` runs six money/date and document-generation checks. `npm run test:operations` runs the full ordered migration chain and transaction/workflow/security checks in isolated PGlite without live writes. Hosted tests are documented separately and create only temporary fixtures. Never run superseded pre-operations scripts against the current schema.

Production is Vercel team `projectsb`, project `brandex-suite`. Main branch pushes use Git deployment. Edge Function and database migrations are separate release steps: verify the exact Suite target, review/apply migrations, deploy `suite-drive-upload`, then deploy the frontend and run hosted acceptance. The source-only frontend configuration contains public Supabase settings; Google OAuth secrets belong only to server secrets and private local recovery configuration outside this repository.

Staff provisioning is invitation-only in Supabase Auth; no public signup or permanent test accounts. `deployment/supabase/config.toml` manages only explicitly declared Auth settings: review a hosted diff before applying it.

Current limitations and wider security-advisor findings are recorded in the release notes. A ready deployment/build does not prove workflow acceptance, import reconciliation or complete mature CMS parity. The inherited `npm run lint` command is not a passing check because Next.js 15 removed `next lint`; lint-tooling repair is separate.
