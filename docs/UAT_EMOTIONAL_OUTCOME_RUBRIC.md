# FitOne UAT Emotional Outcome Rubric

## 1) Purpose
This rubric standardizes how assessors score emotional outcomes during FitOne UAT so product decisions are based on repeatable evidence, not ad-hoc impressions.

## 2) Scoring Scale (1-5)
Use whole numbers only.

| Score | Meaning | Assessor interpretation |
| --- | --- | --- |
| 1 | Harmful | Experience creates frustration, confusion, or distrust; likely abandonment risk. |
| 2 | Weak | Outcome is inconsistent; user often needs help or workaround. |
| 3 | Acceptable | Baseline expectation met; minor friction exists but user can complete goals. |
| 4 | Strong | Experience is clear, supportive, and confidence-building with minimal friction. |
| 5 | Excellent | Experience is affirming, highly intuitive, and likely to drive repeat engagement. |

## 3) Emotional Outcome Dimensions
Assess each dimension per persona and per scenario moment.

| Dimension | Expected emotional outcome | Positive signals | Negative signals |
| --- | --- | --- | --- |
| Clarity | User feels oriented and knows what to do next. | Smooth progression, no repeated rereads, low hesitation. | Repeated backtracking, guessing, or request for instructions. |
| Confidence | User believes actions are safe and reversible. | Decisive actions, trust in saved data, no fear of loss. | Fear of breaking data, repeated verification checks. |
| Motivation | User feels encouraged to continue toward goals. | Voluntary continuation, positive language, clear goal pull. | Drop-off intent, disengagement, negative sentiment. |
| Control | User feels in command of choices and outcomes. | Effective edits/undo paths, quick correction, low anxiety. | Feeling trapped, confusion after actions, forced flow frustration. |
| Trust | User believes system outputs are accurate and useful. | Acceptance of recommendations, low skepticism. | Doubt in calculations, repeated external validation. |
| Cognitive Load | User effort feels manageable. | Stable pace, low pause overhead, easy recovery. | Mental fatigue signs, long pauses, overload complaints. |

## 4) Scoring Procedure
For each scenario:
1. Observe key moments: entry, action, feedback, recovery, completion.
2. Score each dimension from 1-5.
3. Add concise evidence note (quote, behavior, or timestamped event).
4. Mark confidence level of assessment: High, Medium, or Low.

Compute scenario emotional score:
- Dimension average = sum of six dimension scores / 6
- Confidence-adjusted score:
  - High confidence: no adjustment
  - Medium confidence: subtract 0.1
  - Low confidence: subtract 0.2

Round to one decimal.

## 5) Pass/Alert Thresholds
Use the following thresholds for governance gates:

| Adjusted score | Outcome | Required action |
| --- | --- | --- |
| 4.2-5.0 | Strong pass | Keep design direction; monitor drift only. |
| 3.6-4.1 | Pass with notes | Minor UX adjustments may be scheduled. |
| 3.0-3.5 | Conditional pass | Create tickets for observed friction and retest in next wave. |
| 2.5-2.9 | Alert | Create prioritized UX/BUG tickets and require targeted retest. |
| below 2.5 | Failing emotional outcome | Trigger stop-and-triage gate before proceeding. |

## 6) Assessor Guidance
### Before Session
- read scenario and persona context in advance
- align on expected emotional outcomes for that scenario
- prepare standardized note template

### During Session
- observe behavior first, interpret second
- capture direct signals: wording, pauses, retries, drop-off cues
- avoid coaching unless safety or completion blocker requires intervention

### After Session
- score independently before group discussion
- discuss score deltas greater than 1 point across assessors
- finalize consensus score and rationale

## 7) Inter-Rater Consistency Rules
- minimum two assessors for Wave 4 and Wave 5 emotional validation
- if assessor delta is 2 points or more on any dimension, require reconciliation note
- unresolved scoring disagreement escalates to UAT Lead for adjudication

## 8) Evidence Requirements
Every scored scenario must include:
- persona ID and scenario ID
- dimension-by-dimension scores
- confidence level
- one supporting evidence note per dimension
- linked ticket IDs for any score below 3

## 9) Ticketing Triggers from Rubric
Create or update tickets when any condition occurs:
- any dimension scored 1 or 2
- adjusted scenario score below 3.0
- repeated negative signal across two or more personas

Classification guidance:
- functional break causing emotional impact: BUG
- friction with functional correctness intact: UX
- improvement beyond current scope: ENHANCE
- net-new capability request: FEAT

## 10) Reporting Format
At wave close, publish:
- average score per dimension
- top three negative emotional drivers
- ticket linkage summary
- recommendation: Proceed, Proceed with Mitigation, or Hold
