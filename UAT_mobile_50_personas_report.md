# FitOne UAT (Mobile) — 50 Persona Coverage

Date: 2026-03-16  
Environment: `http://localhost:3000` (`npm run dev`, `serve .`)  
Device mode: Mobile viewport (390x844), browser-tool interaction runs

## 1) What was actually executed in browser

Executed concise end-to-end checks (real interactions):
1. Today: quick water add and undo.
2. Today: save wellness check-in and persistence badge.
3. Log > Food: required validation (empty name), add meal, delete, undo.
4. Log > Workout: required validation (empty workout name), add session with exercise row.
5. Workout post-submit: cooldown modal handling and close path.
6. Log > Body: required validation (missing weight), save measurement.
7. Analytics: Calories/Weight/Workouts/TDEE sub-tabs switched and rendered from live data.
8. Protocols: create protocol in modal and save.
9. Protocols: use protocol to prefill workout form.
10. Data: export JSON + CSV actions trigger success toasts.
11. Settings: theme toggle, goal edit (calories 2000→2300), Today values reflect update.
12. Offline simulation: set offline, mutate water, reload offline, state preserved.

## 2) Direct findings (from executed tests)

### Critical
1. **Navigation blocked by workout cooldown overlay**
   - Repro: Log workout → cooldown modal appears → try switching tab/sub-tab directly.
   - Observed: click interception until modal is dismissed; this is a mobile flow blocker.
   - Impact: high abandonment risk for fast loggers.
   - Fix: add clear close affordance (`X`) + backdrop-tap close + timeout auto-dismiss after explicit CTA.

2. **Main nav selected-state mismatch after “Use Protocol”**
   - Repro: Protocols → `Use`.
   - Observed: content switches to Log/Workout form, but main nav still shows Protocols selected.
   - Impact: orientation confusion; users think navigation is broken.
   - Fix: synchronize route/tab state when programmatic navigation occurs.

### High
3. **Settings diagnostics initially inconsistent for Service Worker status**
   - Observed once as “Not registered”, then later “Registered and active” on same run.
   - Impact: trust issue for offline-first users.
   - Fix: compute diagnostics lazily on settings open and subscribe to SW lifecycle events.

4. **Auto-calorie affordance could be misread**
   - Observed: Calories label changes to `auto: X kcal` while manual calories field remains editable.
   - Impact: precision users may not know final source-of-truth.
   - Fix: add explicit helper text: “Leave calories empty to use macro-derived calories”.

### Medium
5. **Workout summary cards showed stale compact metrics until refresh cycle**
   - Observed brief mismatch in mini-stat cards vs full sections after multiple transitions.
   - Fix: centralize stats recompute event after any mutation.

6. **Modal-heavy flows on small screens create tap target congestion**
   - Observed in protocol + exercise row edit.
   - Fix: reduce inline controls, collapse advanced fields by default.

## 3) Improvement backlog (implementation-ready)

### Quick Wins (<=1 day)
1. Add cooldown modal close button + backdrop dismiss + keyboard escape fallback.
2. Fix `Use Protocol` tab-state sync to highlight Log tab when workout form opens.
3. Add Food form microcopy clarifying auto-calorie behavior.
4. Force diagnostics refresh when entering Settings.

### Short Sprint (2–5 days)
5. Refactor modal state management to prevent invisible overlays intercepting taps.
6. Simplify mobile exercise-row layout (progressive disclosure for advanced fields).
7. Add deterministic post-mutation event bus (`dataChanged`) for all summary cards/charts.
8. Add explicit offline badge + last-sync/local-only indicator in header.

### Structural (>1 sprint)
9. Add robust import/export validation report (new vs skipped vs invalid rows).
10. Add accessibility pass for larger touch targets and non-color-only chart cues.

## 4) Persona matrix (50 unique personas) with UAT comments

Legend:  
- **Validated** = directly covered by executed browser flow.  
- **Partial** = behavior inferred from closely related executed flow.  
- **Risk** = not directly executed; risk-mapped recommendation attached.

| # | Persona | Coverage | Key Result / Comment |
|---|---|---|---|
| 1 | First-time calorie logger | Validated | Food required-field error is clear; onboarding still text-heavy. |
| 2 | Gym beginner no macro knowledge | Validated | Can log food/workout; needs clearer macro guidance. |
| 3 | Streak-driven newcomer | Partial | Streak updates visible; add streak-preserve recovery UX after misses. |
| 4 | Parent with 10-minute windows | Validated | Fast logging works; cooldown modal blocker is high-friction. |
| 5 | Shift worker irregular sleep | Partial | Wellness save works; no explicit shift-aware readiness context. |
| 6 | Intermediate hypertrophy trainee | Validated | Protocol create/use works; tab-state mismatch causes confusion. |
| 7 | Powerlifter | Partial | Exercise detail inputs exist; compact mobile layout is dense. |
| 8 | Home-gym dumbbell-only user | Partial | Custom exercise logging works; advanced machine fields feel excessive. |
| 9 | Hybrid cross-trainer | Partial | Multi-type workout support visible; analytics context still strength-heavy. |
| 10 | Program template power user | Validated | Template save/use works; needs route-state fix. |
| 11 | Office professional | Validated | Core flows are quick; modal interruptions reduce speed. |
| 12 | Frequent traveler weak network | Validated | Offline mutation + reload retained data successfully. |
| 13 | Student variable schedule | Partial | Date-based logs function; no schedule-adaptive nudges. |
| 14 | Freelancer multitasker | Partial | Context survives tab switching; overlay interruptions can derail flow. |
| 15 | Executive fast logger | Validated | Quick add works; should minimize confirmation modals/toasts. |
| 16 | Post-injury rehab user | Partial | Protocol support exists; missing rehab/pain semantics. |
| 17 | Chronic soreness manager | Partial | Wellness sliders work; soreness interpretation lacks guidance text. |
| 18 | Low-readiness cautious trainer | Partial | Readiness shown; action recommendations could be more explicit. |
| 19 | Comeback after long break | Partial | Validation is friendly; empty-state coaching can be stronger. |
| 20 | PT-guided protocol follower | Partial | Protocol structure helpful; export summary should be more therapist-ready. |
| 21 | Active senior larger-text need | Risk | Needs larger default touch/typography and reduced control density. |
| 22 | Senior low digital confidence | Risk | Navigation labels are clear; modal stacks likely overwhelming. |
| 23 | Reduced motor precision user | Risk | Small inline controls in exercise rows raise mis-tap risk. |
| 24 | Low-vision contrast-sensitive user | Risk | Requires contrast audit in charts and tertiary text. |
| 25 | Screen-reader pattern user | Risk | Needs semantic labels on canvas/chart outputs and icon-only buttons. |
| 26 | ADHD minimal-step user | Partial | Quick actions helpful; too many concurrent options on forms. |
| 27 | Anxiety-prone perfectionist | Partial | Validation tone is non-hostile; add “good enough” progress cues. |
| 28 | Miss-and-abandon risk user | Partial | Undo helps safety; add grace-day/streak recovery affordance. |
| 29 | Mindfulness/yoga-first tracker | Risk | Needs simpler non-load workout templates (mobility/yoga presets). |
| 30 | Mood-sensitive habit builder | Partial | Positive toasts exist; could over-notify under stress. |
| 31 | Spreadsheet optimizer | Partial | Exports succeed; needs richer export integrity summary. |
| 32 | TDEE skeptic | Validated | TDEE view shows requirements; add formula explanation tooltip. |
| 33 | Macro precision perfectionist | Validated | Auto-calorie behavior is functional but ambiguous in UI. |
| 34 | Weight trend interpreter | Validated | Weight analytics loads from saved data; trend explanations minimal. |
| 35 | Workout adherence analyst | Validated | Workout analytics/adherence visible with logged sample data. |
| 36 | Local-only privacy user | Validated | Local-only messaging clear; diagnostics should always be consistent. |
| 37 | Cloud-distrust user | Partial | Privacy copy is strong; clarify what never leaves device in export flow. |
| 38 | Frequent cache-clearing user | Risk | Needs proactive backup reminder and restore education. |
| 39 | Explicit data-control user | Partial | Data Studio provides controls; add import conflict preview. |
| 40 | Offline-only workflow user | Validated | Offline reload retained state successfully in this run. |
| 41 | Vegan nutrition tracker | Risk | No tested food taxonomy depth; requires custom-food workflow check. |
| 42 | High-protein cutting user | Partial | Protein insight triggers correctly from low intake state. |
| 43 | Hydration compliance user | Validated | Water quick-add and undo are smooth and reliable. |
| 44 | Meal-timing experimenter | Risk | Requires dedicated timing workflow validation with multiple meals/day. |
| 45 | Special-character food-entry user | Risk | CSV/JSON export clicked, but Unicode roundtrip not yet validated. |
| 46 | Wearable-expectation manual fallback user | Risk | Integration area present; no wearable flow validated in this pass. |
| 47 | Metric/imperial switcher | Risk | Units controls present; downstream analytics conversion not validated. |
| 48 | Dark-mode-only nighttime user | Partial | Theme toggle works; contrast in all chart states unverified. |
| 49 | One-handed mobile-only logger | Partial | Bottom nav + quick actions helpful; dense forms still two-handed in practice. |
| 50 | Frequent accidental-navigation user | Partial | Undo protects deletes; back-navigation resilience needs explicit test script. |

## 5) Priority actions to implement next (recommended order)

1. **Fix overlay interception + add deterministic close behaviors** (highest UX blocker).  
2. **Fix protocol-use route/tab synchronization** (navigation trust).  
3. **Add microcopy + hints for auto-calorie and readiness formulas** (analytics trust).  
4. **Implement consistent diagnostics refresh for SW/offline/storage** (privacy/offline trust).  
5. **Mobile simplification of exercise row fields** (speed + accessibility).

## 6) Exit criteria for next UAT round

- No overlay blocks any tab/sub-tab navigation.  
- Programmatic nav always updates active tab highlight correctly.  
- Service worker status remains consistent across route switches and reloads.  
- Auto-calorie source is unambiguous in form UX.  
- At least 10 accessibility-focused personas move from Risk/Partial to Validated.
