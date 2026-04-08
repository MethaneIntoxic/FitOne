# Ulti-Plan SSOT

## 1) Objective

Close Phase 4/5 implementation and release-gate work in FitOne while preserving the local-first architecture and current Kinetic Obsidian UX language.

## 2) Current Architecture Focus

- Frontend: Vanilla JavaScript SPA (`index.html` + `src/**/*.js`)
- Persistence: localStorage entities managed via `src/dataStore.js`
- Platform layer: PWA/service worker + offline-first workflows
- Validation stack: Playwright (e2e) + Vitest (unit)

## 3) Synced Implementation Status

Recent completion highlights (now reflected in `todo.md`):
- Phase 4 data/sync platform: #35, #34, #37, #22, #23, #24 completed
- Phase 4 performance and storage: #36, #48, #49 completed
- Phase 4 architecture/tooling: #46 completed via incremental module bootstrap + Vite pipeline
- Phase 5 adaptive/engagement/polish: #51, #52, #53, #54, #55, #56, #16, #17, #20, #21, #31, #32, #33, #41, #42, #43, #44, #45, #38, #50 completed
- Unit test coverage (#47): vitest baseline plus analytics math coverage implemented (`tests/dataStore.unit.test.mjs`, `tests/unit/dataStore.analytics.test.mjs`)

## 4) Validation Snapshot (Current Turn)

- Syntax check: pass on targeted core files
- Unit tests: pass (`npm run test:unit`)
- Runtime smoke checks (interactive):
  - Settings diagnostics/PWA/backup/webhook/peer-sync controls present and functional
  - Cardio distance/pace persistence functional (`ft_workouts` + `ft_cardios` updated)
  - Weekly planner persistence functional (`ft_day_plans` updated)
  - Wearable sample import functional after connection
- Legacy Playwright UAT suite remains mostly red due stale selectors/flow assumptions (outdated against current tab structure and first-run flow)

## 5) Remaining High-Priority Work

- Full release-gate regression sweep across first-run/onboarding, tab navigation, logging flows, analytics, and settings

## 6) Guardrails

- Keep all changes backend-free and cost-free
- Preserve local data compatibility (no breaking key migrations without bridge logic)
- Avoid large visual-system drift from existing product language
- Keep ticket tracking authoritative in `todo.md`

## 7) Execution Order (Next)

1. Stabilize/modernize test layer: align Playwright UAT to current UI contract and keep the Vitest suite green
2. Run full release-gate regression pass across all tabs and first-run flows
3. Triage and close any regression defects from the sweep
4. Final release gate sweep and regression pass
