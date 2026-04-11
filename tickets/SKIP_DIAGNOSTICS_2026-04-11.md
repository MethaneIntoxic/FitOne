# Skip Diagnostics - 2026-04-11

## Scope
Reduce orchestration skip noise in UAT matrix runs without removing coverage.

## Baseline Evidence (Before)
Source: `tickets/BASELINE_RUN_MANIFEST_20260411-170042.md`

- Unit: 9 passed, 0 failed
- UAT matrix (legacy fixture mode): 31 passed, 62 skipped, 0 failed

## Changes Implemented
- `tests/uat.spec.ts`
  - Added lifecycle device-to-tag mapping for collection-time routing.
  - Tagged lifecycle describe blocks with `@matrix-only` and device tags (`@matrix-desktop`, `@matrix-mobile`).
  - Removed runtime `test.skip` routing in test bodies.
  - Replaced project mismatch skips in `beforeEach` with hard guard errors (to catch config drift).
- `playwright.config.ts`
  - Added project-level filtering:
    - `chromium`: `grepInvert: /@matrix-only/`
    - `matrix-desktop-chrome`: `grep: /@matrix-desktop/`
    - `matrix-mobile-pixel-7`: `grep: /@matrix-mobile/`

## Verification Runs (After)

### Run A: Baseline-equivalent matrix mode
- Command env:
  - `FITONE_UAT_MATRIX=1`
  - `FITONE_UAT_MATRIX_REUSE_SERVER=0`
  - `FITONE_UAT_USE_20X4_LIFECYCLE=0`
- Commands:
  - `npm run test:unit`
  - `npx playwright test tests/uat.spec.ts --config=playwright.config.ts --retries=0 --reporter=list,./tests/TicketReporter.ts`
- Result:
  - Unit: 9 passed, 0 failed
  - UAT matrix: 31 passed, 0 skipped, 0 failed

### Run B: Full 20x4 lifecycle matrix mode
- Command env:
  - `FITONE_UAT_MATRIX=1`
  - `FITONE_UAT_MATRIX_REUSE_SERVER=0`
  - `FITONE_UAT_USE_20X4_LIFECYCLE=1`
- Command:
  - `npx playwright test tests/uat.spec.ts --config=playwright.config.ts --retries=0 --reporter=list,./tests/TicketReporter.ts`
- Result:
  - UAT matrix: 95 passed, 0 skipped, 0 failed

## Delta
- Baseline-equivalent UAT skips reduced from 62 to 0.
- Executed baseline-equivalent population remained 31 passing scenarios.
- 20x4 lifecycle execution remained healthy and fully passing.

## Guardrail Recommendation
Keep project-level grep routing as the primary mechanism and treat any project/test mismatch guard error in `beforeEach` as a CI-breaking configuration drift signal.
