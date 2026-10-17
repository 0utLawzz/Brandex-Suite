# Current verification

- `npm test`: money conversion and document generation unit checks.
- `npm run test:operations`: complete ordered migrations in isolated PGlite, transactions, permissions, receipt revisions, flags and workflow boundaries. No live writes.
- `node scripts/verify-operations-live.mjs`: actual production registration/API/Admin/Viewer browser acceptance. Uses only isolated IDs and temporary Auth users; cleanup in finally.
- `node scripts/verify-operations-browser.mjs`: actual browser registration, Advance gate, receiving allocation, receipt PDF, event persistence and mobile ledger containment.
- `node scripts/verify-drive-identity.mjs`: actual browser upload to restricted X root, same-folder TM rename, preserved file and role denial. Trashes only the created test client folder and removes its exact database fixtures.
- `BRANDEX_TEST_BASE_URL=https://brandex-suite.vercel.app node scripts/verify-mail-merge.mjs`: preserved document-generation regression with current Admin/Viewer roles.

Hosted tests obtain CLI service access in memory for isolated fixture setup/cleanup only. Never print credentials. Google test credentials stay outside the repository. Headless browser checks currently use the local Codex Playwright runtime and installed Chrome; adapt the executable/runtime paths on another machine.

The historical ledger, Phase 5 and initial Drive scripts are intentionally disabled before fixture setup because their Agent role and old financial write assumptions no longer apply. Their source is retained as history. Passing an old test is not current release evidence.

- `node scripts/verify-editorial-ui.mjs`: Admin/Viewer desktop/mobile page containment, 90% desktop/100% mobile and print scale, active navigation, signed-in controls and explicit unpriced-account styling. Uses isolated temporary fixtures only.
