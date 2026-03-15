# FitOne UAT Round 2 — Deep Pass (15 Personas)

Date: 2026-03-16  
Scope: Mobile-only browser UAT (390x844), live app at `http://localhost:3000`  
Method: Acceptance-step validation with pass/fail status and reproducible notes

## A) Deep Persona Set (15)

1. First-time calorie logger  
2. Parent with 10-minute windows  
3. Program template power user  
4. Busy executive fast logger  
5. Frequent traveler weak network  
6. Active senior larger-text need  
7. Reduced motor precision user  
8. ADHD minimal-step user  
9. Spreadsheet optimizer  
10. TDEE skeptic  
11. Local-only privacy user  
12. Offline-only workflow user  
13. Hydration compliance user  
14. One-handed mobile-only logger  
15. Gym beginner no macro knowledge

## B) Acceptance Matrix (strict pass/fail)

Legend: PASS = validated directly in browser, FAIL = reproducible gap, PARTIAL = functionally works but significant UX risk remains.

| Persona | Acceptance Steps | Result | Notes |
|---|---|---|---|
| First-time calorie logger | (1) Empty-state CTA to Food opens form, (2) required-name validation, (3) successful food save | PASS | Validation text clear; entry persisted and reflected on Today. |
| Parent with 10-minute windows | (1) Log workout in <1 flow, (2) no blocking interruption, (3) return to navigation quickly | FAIL | Modal-overlay interception reproduced in protocol workflow; interruption risk remains high. |
| Program template power user | (1) Create protocol, (2) add exercise, (3) save, (4) use protocol to prefill log | FAIL | Functional prefill works; main nav remains Protocols while Log content is shown (state mismatch). |
| Busy executive fast logger | (1) quick food log, (2) quick workout log, (3) immediate summary update | PASS | Fast path is workable; form density still high. |
| Frequent traveler weak network | (1) switch offline, (2) mutate water, (3) reload offline, (4) data retained | PASS | Offline mutation and offline reload retained state. |
| Active senior larger-text need | (1) readable core controls, (2) low confusion on tab transitions | PARTIAL | Core labels are readable, but dense rows/modals likely high cognitive load. |
| Reduced motor precision user | (1) avoid accidental taps, (2) controls have safe spacing | PARTIAL | Many small inline controls in exercise rows; high mis-tap risk. |
| ADHD minimal-step user | (1) direct path to log, (2) minimal context switching | PARTIAL | Quick actions exist; multiple dense sections increase attention load. |
| Spreadsheet optimizer | (1) create sample data, (2) inspect analytics consistency, (3) trust summaries | PARTIAL | Analytics render, but summary counters appear inconsistent during some transitions. |
| TDEE skeptic | (1) open TDEE tab, (2) clear precondition messaging, (3) understandable rationale | PASS | Gating message is explicit (`Need weight data spanning at least 7 days`). |
| Local-only privacy user | (1) clear local-only messaging, (2) diagnostics present, (3) no cloud dependency required | PASS | Privacy copy and controls are explicit; local-first behavior validated. |
| Offline-only workflow user | (1) continue logging offline, (2) reload without data loss | PASS | Confirmed working with water mutation + reload. |
| Hydration compliance user | (1) quick-add water, (2) percent updates, (3) undo available | PASS | +250 and progress update are immediate and reliable. |
| One-handed mobile-only logger | (1) thumb-friendly nav, (2) complete key tasks without precision taps | PARTIAL | Bottom nav is strong; dense input areas reduce one-handed reliability. |
| Gym beginner no macro knowledge | (1) complete first food log without confusion, (2) understand calories | PARTIAL | Auto-calorie behavior works but can be misunderstood without clearer helper text. |

## C) High-Confidence Defects (ticket-ready)

### T1 — Programmatic navigation state mismatch after `Use` protocol
- Severity: **High**
- Effort: **S**
- Suggested owner: **Frontend Engineer**
- Repro:
  1. Go to Protocols.
  2. Create and save a protocol.
  3. Click `Use`.
  4. Observe workout form appears, but bottom nav still marks Protocols as active.
- Expected: active nav reflects Log tab when Log content is shown.
- Actual: visual active state stays on Protocols.
- Acceptance criteria:
  - Active tab index and visible panel are always synchronized.
  - Automated UI test asserts nav-state on programmatic route changes.

### T2 — Modal overlay intercepts interactions and blocks taps
- Severity: **High**
- Effort: **M**
- Suggested owner: **Frontend Engineer**
- Repro:
  1. Open protocol modal.
  2. Attempt to tap other underlying controls.
  3. Interactions are intercepted until modal close.
- Expected: clear and deterministic dismissal path with no hidden blocking state.
- Actual: overlay blocks pointer events; dismissal flow depends on hidden context.
- Acceptance criteria:
  - Every overlay has explicit close button and backdrop-dismiss behavior (when safe).
  - No stale overlay remains after modal close (verified by pointer-events test).

### T3 — Mobile exercise row control density causes high mis-tap risk
- Severity: **Medium**
- Effort: **M**
- Suggested owner: **UX + Frontend**
- Repro: Log workout → Add exercise → many adjacent small controls appear in one block.
- Expected: beginner-friendly, low-error mobile input.
- Actual: crowded controls increase accidental input/deletion risk.
- Acceptance criteria:
  - Progressive disclosure: advanced fields collapsed by default.
  - Minimum touch target size meets mobile accessibility baseline.

### T4 — Auto-calorie source-of-truth is ambiguous for beginners
- Severity: **Medium**
- Effort: **S**
- Suggested owner: **UX Writer + Frontend**
- Repro: Enter macros in food form; calories auto-populate while calories field remains editable.
- Expected: users understand which value is final and when auto-calc applies.
- Actual: behavior works but can be interpreted as conflicting/manual override unclear.
- Acceptance criteria:
  - Helper text: “Leave calories empty to auto-calculate from macros.”
  - If calories edited manually, show “manual override” indicator.

### T5 — Analytics and summary counters can appear inconsistent during transitions
- Severity: **Medium**
- Effort: **M**
- Suggested owner: **Frontend Engineer**
- Repro: mutate data across tabs quickly; summary micro-cards occasionally lag expected values.
- Expected: deterministic consistency after each mutation.
- Actual: transient mismatch observed in compact counters vs underlying logs.
- Acceptance criteria:
  - Centralized post-mutation recompute event (`dataChanged`) updates all dependent widgets.
  - Add regression test: mutate data on one tab and assert counters in Today/Analytics.

## D) Prioritized Sprint Slice (recommended)

1. **T1 Nav-state sync** (High, S)  
2. **T2 Overlay interception cleanup** (High, M)  
3. **T4 Auto-calorie microcopy + override cue** (Medium, S)  
4. **T3 Exercise row simplification** (Medium, M)  
5. **T5 Counter consistency eventing** (Medium, M)

## E) Suggested ownership map

- Frontend Engineer: T1, T2, T5  
- UX Designer/Writer: T3, T4  
- QA Engineer: regression scripts for overlay/nav-state/offline and summary consistency

## F) Next-round verification criteria

- `Use Protocol` always switches active nav to Log.  
- No modal overlay blocks taps after dismissal.  
- Food form clearly communicates auto-calorie vs manual override.  
- Exercise row is operable one-handed on mobile without frequent mis-taps.  
- All summary counters reflect data mutations within the same render cycle.

## G) Implementation + Verification Status (2026-03-16)

Legend: DONE = implemented and browser-validated, PARTIAL = implemented with constrained validation.

| Ticket | Status | Verification Notes |
|---|---|---|
| T1 Nav-state sync after protocol use | DONE | Programmatic tab activation now synchronizes active tab/panel/ARIA; browser flow confirms Log state is active after protocol use. |
| T2 Modal overlay interception | DONE | Modal close button, backdrop-close behavior, and Escape dismissal path are active; no stale blocking overlay reproduced in validation pass. |
| T3 Exercise row density / progressive disclosure | DONE | Workout exercise rows now expose advanced fields behind a toggle; browser check confirms advanced panel is collapsed by default and expands on toggle. |
| T4 Auto-calorie clarity and manual override | DONE | Food form helper text and override cue logic added; browser check confirms guidance appears and updates with manual calorie edit path. |
| T5 Counter consistency after mutations | DONE | Centralized `fitone:dataChanged` flow implemented for post-mutation refresh across Today/Log/Analytics dependent widgets. |

Additional accessibility hardening (post-ticket pass):
- Dense workout row controls now enforce 44px minimum touch target size in mobile form rows.
- Analytics charts render non-color status cues (`▲`, `✓`, `•`) and macro legend initials (`Protein (P)`, `Carbs (C)`, `Fat (F)`).
- Browser instrumentation captured chart canvas text including glyph key output (`▲ above  ✓ on target  • near`) and macro initial labels.
