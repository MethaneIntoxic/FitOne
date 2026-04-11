# FitOne UAT Extreme Execution Runbook

## 1) Purpose
This runbook defines how FitOne executes extreme UAT in controlled waves, records objective evidence, and escalates blockers without losing delivery pace.

This document is used by:
- UAT Lead
- Test Operators
- Product/Design Reviewers
- Engineering On-Call
- Ticket Reporter Owners

## 2) Scope
This runbook applies to all FitOne UAT rounds that include:
- multi-persona execution
- stress-path or edge-case validation
- governance checkpoints with go/no-go gates

## 3) Wave Model
Execute UAT in increasing-intensity waves. Do not skip a wave without explicit lead approval.

### Wave 0: Environment and Data Readiness
Objective:
- confirm environment, seed data, and device/browser readiness

Entry criteria:
- latest branch deployed or local build confirmed
- required test personas defined
- ticket reporter path validated

Exit criteria:
- no setup blockers
- execution roster and schedule published

### Wave 1: Core Path Confidence
Objective:
- validate daily happy-path flows for each primary persona

Entry criteria:
- Wave 0 passed

Execution focus:
- onboarding flow
- primary workout flow
- core tracking and persistence

Exit criteria:
- no open Sev-1 defects
- no more than 2 open Sev-2 defects without approved workaround

### Wave 2: High-Variance Behavior
Objective:
- validate unusual combinations, interrupted tasks, and recovery paths

Entry criteria:
- Wave 1 passed

Execution focus:
- interrupted sessions
- navigation churn
- rapid data edits and reversals
- cross-view consistency checks

Exit criteria:
- critical data integrity preserved
- evidence captured for all failed scenarios

### Wave 3: Extreme Reliability Session
Objective:
- run long-session and repeated-action stress scenarios

Entry criteria:
- Wave 2 passed

Execution focus:
- sustained interaction windows
- repeated create/edit/delete loops
- retry/error state resilience

Exit criteria:
- no unresolved Sev-1/Sev-2 regressions introduced in wave

### Wave 4: Emotional Outcome Validation
Objective:
- validate expected emotional outcomes across personas and moments

Entry criteria:
- Wave 3 passed or waived with documented rationale
- assessor roster assigned

Execution focus:
- confidence, clarity, motivation, and control outcomes
- guided scoring per emotional rubric

Exit criteria:
- emotional score threshold met
- unresolved sentiment risks converted to tickets

### Wave 5: Release Readiness Gate
Objective:
- final cross-functional sign-off with explicit residual risk statement

Entry criteria:
- Waves 0-4 completed

Exit criteria:
- sign-off recorded
- deferred risks documented and assigned

## 4) Standard Execution Loop (Per Scenario)
For each UAT scenario:
1. Announce scenario ID, persona ID, and wave.
2. Run command set for the wave.
3. Execute manual steps exactly once before retries.
4. Capture evidence regardless of pass/fail.
5. File or update ticket with classification and severity.
6. Mark scenario status: PASS, FAIL, BLOCKED, or WAIVED.

## 5) Command Matrix
Use the primary command where available. If the script is missing, use the fallback command. Record the command and output summary in wave evidence.

| Goal | Primary command | Fallback command | Expected output |
| --- | --- | --- | --- |
| Install dependencies | npm ci | npm install | clean dependency install |
| Unit regression check | npm run test:unit | npx vitest run | unit suite result |
| UAT automation sweep | npm run test:uat | npx playwright test tests/uat.spec.ts | UAT test report |
| Full automation smoke | npm test | npx playwright test | pass/fail with failures listed |
| Syntax safety scan | node syntax-check.js | syntax-check-all.bat | syntax pass report |
| Build viability | npm run build | vite build | build success artifact |
| Local manual session | npm run dev | vite | reachable local test session |

Command governance:
- Every wave must include at least one automated check plus manual scenario execution.
- Failed command output must be attached to the wave evidence package.

## 6) Evidence Expectations
Evidence is mandatory for PASS and FAIL outcomes.

Required evidence per scenario:
- scenario metadata: wave, persona, tester, timestamp
- execution result: PASS/FAIL/BLOCKED/WAIVED
- ticket linkage: UAT ticket ID(s)
- command summary: command, status, short output notes
- visual proof: screenshot or recording where behavior is visible

Required evidence per wave:
- wave summary markdown
- ticket delta list (new, closed, deferred)
- risk statement with explicit owner
- go/no-go decision log

### Evidence Naming Convention
Use stable, sortable names:
- W{wave}-P{persona}-S{scenario}-PASS-{timestamp}.png
- W{wave}-P{persona}-S{scenario}-FAIL-{timestamp}.png
- UAT-{ticketNumber}-{timestamp}.md
- UAT-{ticketNumber}-{timestamp}.json

Example:
- W3-P08-S014-FAIL-2026-04-10T19-22-40Z.png
- UAT-047-2026-04-10T19-24-03Z.md

## 7) Three-Strike Rule (Mandatory)
The three-strike rule prevents repeated churn on the same blocker.

A strike is counted when:
- the same blocker causes repeated execution failure
- a fix attempt does not resolve the blocker
- the scenario remains blocked after rerun

Rules:
1. Strike 1: log blocker details, assign owner, attempt targeted fix.
2. Strike 2: escalate to UAT Lead and engineering on-call, retry with guided debug.
3. Strike 3: stop scenario execution immediately and mark BLOCKED-3STRIKE.

After Strike 3:
- do not continue retries in the same wave
- create or update a priority ticket
- record explicit unblock condition and decision owner
- move to next independent scenario only if risk isolation is confirmed

## 8) Governance Checkpoints
At the end of each wave, run a 15-minute checkpoint:
- confirm wave pass/fail status
- review new Sev-1/Sev-2 issues
- approve carry-forward risk list
- approve entry into next wave

No checkpoint approval means no wave advancement.

## 9) Required Reporting Outputs
At round close, publish:
- UAT wave summary report
- open issue ledger by severity and type
- emotional outcome score summary
- release recommendation: GO, GO-WITH-RISK, or NO-GO

## 10) Cross-Document References
This runbook should be used with:
- UAT_EMOTIONAL_OUTCOME_RUBRIC.md
- UAT_TRIAGE_POLICY.md

## 11) April 2026 Launch Gate Checklist (Local-Only)
Release decision uses the gates below. A gate is `PASS`, `CONDITIONAL`, or `BLOCKED`.

1. Reliability Gate
- Threshold: No open product Sev-1 defects.
- Evidence: Full UAT matrix run summary and resolved ticket references.

2. Infra Separation Gate
- Threshold: Any remaining connection/setup failures are tagged infra-flake with explicit owner.
- Evidence: Test annotations and triage tags (`INFRA:SERVER_UNREACHABLE`, `infra-flake`).

3. Data Integrity Gate
- Threshold: JSON/CSV import/export paths pass scenario checks (`UAT-011`, `UAT-012`) and show no schema-loss regression.
- Evidence: scenario pass logs plus import summary assertions.

4. Analytics Consistency Gate
- Threshold: Weekly summary and analytics cards render non-empty deterministic content (`UAT-010`).
- Evidence: scenario pass logs and screenshot artifacts.

5. Local-Only Trust Gate
- Threshold: Settings and privacy messaging clearly state on-device/local-only posture.
- Evidence: `UAT-002` verification and privacy copy review.

## 12) Owner and SLA Map
- Test infra owner: Playwright server lifecycle, environment reachability, runner stability.
- Product owner: feature behavior defects, UX regressions, acceptance criteria decisions.
- QA lead: scenario evidence quality, ticket hygiene, closure verification integrity.

SLA reminders:
- Sev-1/P0 product blockers: acknowledge 15m, mitigation or fix path within 4h.
- Infra-flake blockers: acknowledge 30m, owner assignment same day.
