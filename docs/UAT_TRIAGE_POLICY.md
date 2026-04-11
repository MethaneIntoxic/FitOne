# FitOne UAT Triage Policy

## 1) Purpose
This policy defines how FitOne UAT issues are classified, prioritized, routed, and resolved with consistent severity and SLA expectations.

## 2) Classification Types
Use one primary type per ticket:

| Type | Definition | Typical example |
| --- | --- | --- |
| BUG | Intended behavior is broken or regressed. | Data fails to save, crash, incorrect totals. |
| UX | Function works but causes avoidable friction or confusion. | Unclear labels, poor discoverability, error-prone flow. |
| ENHANCE | Improvement to existing behavior within current feature boundaries. | Better defaults, smarter sorting, stronger feedback copy. |
| FEAT | New capability outside current implemented scope. | New integration, new analytics module, new workflow. |

## 3) Severity Policy
Severity reflects user and business impact.

| Severity | Impact definition | Examples |
| --- | --- | --- |
| Sev-1 Critical | Blocks core workflow, data loss risk, or severe trust/safety issue. | App unusable path, irreversible corruption, crash loop. |
| Sev-2 High | Major degradation with workaround or limited scope block. | Core step unreliable, repeated failure in key path. |
| Sev-3 Medium | Noticeable issue with moderate impact; workflow still possible. | Partial miscalculation with fallback, confusing but recoverable flow. |
| Sev-4 Low | Cosmetic/minor friction with little immediate risk. | Alignment issues, minor text/copy inconsistencies. |

## 4) Priority Policy
Priority controls execution order and is set from severity plus delivery context.

| Priority | Handling intent | Typical source |
| --- | --- | --- |
| P0 | Immediate stop-and-fix | Usually Sev-1 in active wave |
| P1 | Fix in current cycle | Sev-1/Sev-2 with release risk |
| P2 | Schedule soon | Sev-2/Sev-3 with medium impact |
| P3 | Backlog candidate | Sev-3/Sev-4 low urgency |

Priority override conditions:
- high-visibility demo or release gate risk
- repeated issue across multiple personas
- regulatory, trust, or data-integrity concerns

## 5) Severity x Priority Defaults
Use defaults unless triage lead documents an override rationale.

| Severity | Default priority |
| --- | --- |
| Sev-1 | P0 |
| Sev-2 | P1 |
| Sev-3 | P2 |
| Sev-4 | P3 |

## 6) SLA Guidance
SLA clock starts when ticket is created with required reproduction details.

| Level | Acknowledge target | First action target | Resolution or mitigation target |
| --- | --- | --- | --- |
| Sev-1 / P0 | 15 minutes | 30 minutes | 4 hours |
| Sev-2 / P1 | 1 hour | 4 hours | 1 business day |
| Sev-3 / P2 | 4 business hours | 1 business day | 3 business days |
| Sev-4 / P3 | 1 business day | 3 business days | next planned cycle |

If SLA is at risk:
- update ticket with ETA and blocker reason
- re-confirm owner
- notify UAT lead and product owner

## 7) Required Ticket Fields
A ticket is not triage-ready unless it includes:
- ticket ID using UAT naming pattern
- classification: BUG, UX, ENHANCE, or FEAT
- severity and priority
- environment/context
- reproducible steps
- expected vs actual result
- evidence attachment or link
- owner and next action

## 8) Ticket States
Use these states only:

| State | Meaning |
| --- | --- |
| NEW | Reported, not yet triaged. |
| TRIAGED | Type/severity/priority assigned and owner set. |
| IN_PROGRESS | Fix or mitigation work underway. |
| FIXED_PENDING_VERIFICATION | Change delivered, waiting UAT retest. |
| VERIFIED | UAT confirmed resolved. |
| DEFERRED | Accepted not to fix in current cycle, with rationale. |
| DUPLICATE | Covered by another active ticket ID. |
| REJECTED | Not actionable as filed, with reason. |
| CLOSED | Finalized after verification/defer/reject outcome. |

State transition constraints:
- NEW must move to TRIAGED before engineering execution
- FIXED_PENDING_VERIFICATION must not move to CLOSED without verification evidence
- DEFERRED requires explicit target cycle or decision owner

## 9) Decision Tree: BUG vs ENHANCE vs FEAT vs UX
Use this order to classify:
1. Does the implemented behavior fail expected results or regress prior behavior?
   - Yes: classify as BUG.
2. If behavior works, is the primary problem confusion/friction/usability burden?
   - Yes: classify as UX.
3. If requested change improves existing behavior without adding a new capability boundary?
   - Yes: classify as ENHANCE.
4. If request introduces a new capability, surface, or integration not currently present?
   - Yes: classify as FEAT.
5. If still uncertain, set provisional type and escalate during daily triage for final classification.

## 10) Daily Triage Cadence
- hold a fixed triage session each UAT day
- review all NEW and TRIAGED tickets
- verify Sev-1/Sev-2 ownership and SLA health
- reconcile duplicates and stale IN_PROGRESS items

## 11) Governance Rules
- Sev-1 without owner is an immediate governance failure
- any ticket reopened twice requires root-cause note
- repeated issue across two waves requires prevention action item
- 3-strike execution blocks must map to a priority ticket before wave continuation

## 12) Reporting Outputs
At end of each UAT day publish:
- open ticket count by type, severity, and priority
- SLA compliance summary
- reopened and deferred ticket list with rationale
- top risk themes for next wave planning

## 13) Infrastructure-Flake Classification
When a failure is caused by test environment reachability and not product behavior,
classify it as infra-flake and avoid treating it as a product defect.

Infra-flake indicators:
- `ERR_CONNECTION_REFUSED`
- `ECONNREFUSED`
- `server unavailable`
- explicit setup annotation marker: `INFRA:SERVER_UNREACHABLE`

Handling rules:
- Do not count infra-flakes against product quality burn-down.
- Route to platform/test-infra owner first.
- Keep scenario ticket linkage, but mark evidence with `infra-flake` tag.
- Close as product only if reproduced with healthy server and stable setup.

## 14) Local-Only Launch Policy (Current)
FitOne is currently in local-only launch mode.

Required gate conditions:
- No open product Sev-1 defects.
- All release-blocking UAT scenarios pass on `chromium` and matrix projects relevant to their lifecycle case.
- Remaining intermittent failures are proven infra-flake with owner and mitigation.
- Privacy copy and local-storage behavior remain consistent with local-only positioning.
