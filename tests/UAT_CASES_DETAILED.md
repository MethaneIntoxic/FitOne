# FitOne — 15 Detailed & Rigorous UAT Cases

This catalog defines rigorous UAT coverage for FitOne and maps directly to `tests/uatScenarios.ts` / `tests/uat.spec.ts`.

## UAT-001 — Install & First-Run (Beginner, Android PWA)
- Persona: Amira — new to tracking
- Category: Onboarding
- Preconditions:
  - App served and reachable at configured base URL.
  - Browser supports service-worker API.
  - Clean local state.
- Steps:
  1. Open app root.
  2. Verify manifest link and service-worker capability.
  3. Navigate to Settings and set Beginner onboarding mode.
  4. Reload app.
  5. Open Today tab.
- Expected:
  - Manifest/service-worker signals are valid.
  - Beginner mode persists after reload.
  - Today logging entry points are visible.

## UAT-002 — Privacy-First Setup (Local-only + Strict)
- Persona: Noah — privacy focused
- Category: Privacy
- Preconditions:
  - Settings tab reachable.
  - Data & Privacy card rendered.
- Steps:
  1. Open Settings.
  2. Enable Local-only mode.
  3. Enable Local-only strict mode.
  4. Validate privacy copy.
- Expected:
  - Toggles remain enabled.
  - Privacy text confirms on-device-only storage behavior.

## UAT-003 — First Body Check-in + Goal Alignment
- Persona: Amira — new to tracking
- Category: Onboarding
- Preconditions:
  - Log > Body sub-tab available.
- Steps:
  1. Set body goal in Settings.
  2. Open Log > Body.
  3. Enter weight/body-fat/circumference/notes.
  4. Save measurements.
  5. Validate history row.
- Expected:
  - Body data persists and appears in history.

## UAT-004 — Hydration Quick Actions + Undo
- Persona: Leo — office professional
- Category: Daily Tracking
- Preconditions:
  - Today hydration card available.
- Steps:
  1. Add +250ml.
  2. Add +500ml.
  3. Add custom amount.
  4. Undo last hydration action.
- Expected:
  - Totals and percentage update deterministically.
  - Undo reverts last action only.

## UAT-005 — Beginner Macro Auto-Calc Integrity
- Persona: Amira — new to tracking
- Category: Nutrition
- Preconditions:
  - Log > Food form active.
- Steps:
  1. Enter protein/carbs/fat without manual calories.
  2. Assert calories auto-fill using 4/4/9 formula.
  3. Assert auto-calc hint references computed kcal.
  4. Submit meal.
  5. Add additional meals for same day.
- Expected:
  - Auto-calc value is mathematically correct.
  - Meal list persists expected rows.

## UAT-006 — Full Beginner Day Food Logging + Edit
- Persona: Amira — new to tracking
- Category: Nutrition
- Preconditions:
  - Recent food list supports edit controls.
- Steps:
  1. Log breakfast, lunch, dinner.
  2. Edit one row serving size.
  3. Save edit.
  4. Verify edited row exists exactly once.
- Expected:
  - No duplicate/ghost rows.
  - Edited row text persists.

## UAT-007 — Per-Gym PR Baseline Path
- Persona: Kay — powerlifter
- Category: Strength
- Preconditions:
  - Gym profile controls and workout logging available.
- Steps:
  1. Add gym profile.
  2. Log strength workout with 2+ exercise rows.
  3. Validate recent workouts.
  4. Open workout analytics.
- Expected:
  - Gym profile retained.
  - Workout stats card renders correctly.

## UAT-008 — Routine Versioning Stability
- Persona: Kay — powerlifter
- Category: Strength
- Preconditions:
  - Protocol workspace reachable.
- Steps:
  1. Open Protocols tab.
  2. Log routine-change workout.
  3. If modal appears, validate control path.
- Expected:
  - No blocked interaction state.
  - App remains consistent post-flow.

## UAT-009 — Time-Flexible Session Logging
- Persona: Ravi — shift worker
- Category: Strength
- Preconditions:
  - Fast workout logging path available.
- Steps:
  1. Log short session with minimal fields.
  2. Validate recent list.
  3. Validate Today workout card updates.
- Expected:
  - Session visible across Log and Today views.

## UAT-010 — Recomposition Trend Validation
- Persona: Mina — body recomposition
- Category: Analytics
- Preconditions:
  - Analytics sub-tabs available.
- Steps:
  1. Log food/workout/body data.
  2. Open calories analytics and summary card.
  3. Open workout analytics.
  4. Open weight analytics.
- Expected:
  - All charts/stats render with non-empty trend context.

## UAT-011 — JSON Backup/Restore Integrity
- Persona: Noah — privacy focused
- Category: Export
- Preconditions:
  - Download events supported.
  - Data Studio import controls available.
- Steps:
  1. Export global JSON.
  2. Validate download filename.
  3. Upload valid food-log JSON payload.
  4. Commit import.
  5. Verify imported row appears in food list.
- Expected:
  - Export + import flow is fully functional.

## UAT-012 — CSV Export/Import Mapping Integrity
- Persona: Ravi — spreadsheet user
- Category: Export
- Preconditions:
  - CSV import parser/mapping UI available.
- Steps:
  1. Export CSV.
  2. Upload workouts CSV.
  3. Validate commit control and import summary.
  4. Verify imported workout appears in recent list.
- Expected:
  - CSV flows are functional end-to-end.

## UAT-013 — Offline Logging Resilience
- Persona: Kay — low connectivity gym
- Category: Offline
- Preconditions:
  - Browser context supports offline emulation.
- Steps:
  1. Set context offline.
  2. Log workout.
  3. Restore online mode.
  4. Validate workout still present.
- Expected:
  - Local persistence survives offline/online transition.

## UAT-014 — Assisted Pull-Up Effective Load
- Persona: Kay — powerlifter
- Category: Strength
- Preconditions:
  - Advanced exercise settings visible via toggle.
- Steps:
  1. Log assisted workout using advanced toggle.
  2. Save and open workout analytics.
  3. Verify effective-load summary appears.
- Expected:
  - Assisted data path is accepted and reflected in analytics.

## UAT-015 — Performance Baseline (UI Responsiveness)
- Persona: QA benchmark runner
- Category: Performance
- Preconditions:
  - Main tab navigation available.
- Steps:
  1. Start timing after shell renders.
  2. Traverse Log → Analytics → Settings.
  3. Check elapsed interaction time.
- Expected:
  - Navigation sequence completes within budget threshold.
