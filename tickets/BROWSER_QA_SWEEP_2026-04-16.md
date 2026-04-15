# FitOne Browser QA Sweep - 2026-04-16

## Scope
- Manual browser-first audit on the live app at http://127.0.0.1:4173/
- Focus: real clickable controls, visible buttons, primary flows, shortcuts, logging, analytics, settings, and data tools
- Method: live interaction plus targeted Playwright-driven browser probes

## Confirmed Working
- Header bell opens Pulse Center
- Dashboard Activity Feed OPEN launches a real overlay
- Dashboard VIEW ALL routes to Protocols/Workout Library
- IGNITE SESSION routes into Workouts -> Workout
- Water quick-add updates hydration state
- Wellness check-in saves and updates recovery state
- Food recipe builder opens
- Food barcode scan opens a fallback modal for manual lookup
- Minimal food logging persists to dashboard
- Minimal workout logging persists to dashboard
- Rest timer launches overlay and countdown
- Body measurements save and appear in history/dashboard
- Progress photo flow opens a real modal
- Profile save persists after reload
- Data Syncing routes to Data Studio
- Stats subviews Performance/Diet/Body/Old Workouts switch correctly

## Closure Status
- QA-001 Fixed and verified: the workout exercise browser is now local-only and no longer touches the blocked `wger.de` path.
- QA-002 Fixed and verified: dashboard and shell shortcuts now land users in the correct tab/subtab targets.
- QA-003 Fixed and verified: workout settings reset now reverts unsaved changes back to persisted values.
- QA-004 Fixed and verified: the header avatar is now a real settings entry point.
- QA-005 Fixed and verified: JSON, CSV, and backup exports now emit explicit artifact-prepared proof.
- QA-006 Fixed and verified: destructive row actions now confirm clearly and provide undo feedback.
- QA-007 Fixed and verified: report exports now create deterministic summary/image artifacts instead of ambiguous print-only behavior.
- QA-008 Fixed and verified: app-shell interaction is held until handlers are bound.
- QA-009 Fixed and verified: the fake coming-soon banner was removed from the shipped surface.
- QA-010 Fixed and verified: duplicate CTA clutter was reduced on secondary workout logging surfaces.

## Wave 8 Utility Validation
- Backup Now: verified via artifact-prepared backup export and backup status refresh.
- Install App: button now disables when install is unavailable and reflects runtime status truthfully.
- Check App Update: verified explicit ready/no-update feedback.
- Webhook test and flush: now warn on missing configuration instead of falsely claiming success.
- Wearable Import Sample: relabeled and verified as demo-data import only.
- Peer Sync code: create/apply flow verified locally.
- Print templates: workout and nutrition buttons both generate printable HTML documents.

## Verification Proof
- Unit tests: 9/9 passed
- Focused Playwright: `browser truth critical controls` passed
- Focused Playwright: `browser truth utility controls` passed
- Full UAT: 17/17 passed
- Production build: passed

## Confirmed Broken Or Unacceptable

### QA-001 - Exercise Browser Blocked By CSP
- Severity: Sev-1
- Type: BUG
- Area: Workouts -> Workout -> Browse
- Evidence:
  - Repeated console errors: blocked `https://wger.de/api/v2/exerciseinfo/?limit=120&language=2`
  - CSP `connect-src 'self'` rejects the request
  - Browse click produced no usable modal or exercise-pick flow
- User impact:
  - The most important assisted workout-building path is effectively non-functional
- Action:
  - Either remove the external dependency and ship a local exercise source, or hide/disable Browse until it is truly functional

### QA-002 - Dashboard Shortcut Buttons Do Not Navigate
- Severity: Sev-1
- Type: BUG
- Area: Dashboard shortcut rail
- Controls:
  - `Quick add food`
  - `Log workout`
  - `Quick add bodyweight`
- Evidence:
  - Clicking these controls left the active main tab on Dashboard and did not reveal the target forms
- User impact:
  - High-frequency shortcuts look alive but do not move the user to the intended task
- Action:
  - Fix routing immediately or remove the shortcut rail from Dashboard until it is trustworthy

### QA-003 - Settings Reset Does Not Reset Unsaved Changes
- Severity: Sev-2
- Type: BUG
- Area: Profile -> Workout Settings
- Evidence:
  - Changed `settingDisplayName` to `Unsaved Reset Check`
  - Clicked `RESET`
  - Value remained `Unsaved Reset Check`
- User impact:
  - Reset button is misleading and breaks user trust
- Action:
  - Fix reset behavior or relabel/remove the control until its scope is correct

### QA-004 - Header Avatar / Profile Entry Is Inert
- Severity: Sev-2
- Type: BUG
- Area: App shell header
- Evidence:
  - Clicking the visible profile/avatar affordance did not switch to Profile or open a panel
- User impact:
  - Common shell affordance reads as interactive but does nothing
- Action:
  - Route to Profile or remove pointer affordance

### QA-005 - Export Utilities Are Not Producing Verifiable Downloads
- Severity: Sev-2
- Type: BUG
- Area: Data Studio
- Controls:
  - `Export Global JSON`
  - `Export All CSV Files`
- Evidence:
  - No browser download event was emitted during live testing
  - CSV path also failed to produce a visible export result
- User impact:
  - Data portability cannot be trusted
- Action:
  - Treat export as release-blocking until verified with actual downloaded artifacts

### QA-006 - Recent Food Row Delete Affordance Does Not Produce A Clear Result
- Severity: Sev-3
- Type: BUG
- Area: Workouts -> Food -> Recent Food row actions
- Evidence:
  - Row delete click changed page state but did not remove the item and did not show a clear confirmation path
- User impact:
  - Destructive micro-action is ambiguous and feels broken
- Action:
  - Fix deletion or replace with explicit confirmation flow

### QA-007 - Report Export Is Not Verifiably Completing
- Severity: Sev-3
- Type: BUG
- Area: Stats
- Controls:
  - `DOWNLOAD REPORT`
  - `SAVE REPORT AS IMAGE`
- Evidence:
  - No browser download event observed for top-level report export
  - Control does not provide clear visible completion feedback in the current browser sweep
- User impact:
  - Reporting/export promise is weak and uncertain
- Action:
  - Verify the actual file generation path and add explicit success/failure UX

### QA-008 - Startup Interaction Readiness Feels Fragile
- Severity: Sev-3
- Type: UX
- Area: App shell navigation
- Evidence:
  - Main tab switching was unreliable until the app had fully settled after load
  - Programmatic click after full initialization worked consistently
- User impact:
  - App feels clunky and inconsistent immediately after load
- Action:
  - Add deterministic interaction readiness, skeleton/loading guard, or delay affordance activation until handlers are guaranteed bound

## Takedown Candidates

### QA-009 - `Try & switch (coming soon)` Banner
- Severity: Sev-4
- Type: UX
- Area: Dashboard shell
- Reason:
  - Explicitly advertises unfinished functionality in the current product surface
- Recommendation:
  - Remove or hide until the layout switch actually exists

### QA-010 - Duplicate Empty-State CTA Surface
- Severity: Sev-4
- Type: UX
- Area: Dashboard and Workouts -> Food/Workout recent lists
- Reason:
  - Multiple `Log your first meal` / `Log your first workout` prompts duplicate the same intent and clutter the experience
- Recommendation:
  - Keep one primary CTA per task and downgrade the rest to text-only guidance or contextual links

## Secondary Risks Requiring Validation In The Next Execution Wave
- Dashboard delete affordances for logged cards still warrant a dedicated destructive-action stress pass beyond the current regression lane.
- Filesystem-level validation of export artifacts outside embedded browser automation remains worth doing in a final ship rehearsal.

## Recommended Priority Order
1. QA-001 Exercise browser / CSP failure
2. QA-002 Dashboard shortcut routing
3. QA-005 Export reliability
4. QA-003 Reset behavior
5. QA-004 Inert avatar affordance
6. QA-007 Report export completion
7. QA-006 Ambiguous row delete behavior
8. QA-008 Interaction readiness / clunkiness
9. QA-009 unfinished banner takedown
10. QA-010 duplicate CTA cleanup
11. Completed: deep utility-control validation and truthfulness hardening

## Current State
- The original browser-QA sweep is no longer triage-only. The tracked issues above have been fixed and reverified against the live browser flows plus the UAT harness.