# Ulti-Plan SSOT

## 1) Vibe Translation

Goal: Continue wireframe-driven implementation in FitOne with W5.3 (Primary Activation Muscle Map) as the immediate target, while preserving the current Kinetic Obsidian UX and local-only architecture.

Chosen stack (already established in repo):
- Frontend: Vanilla JavaScript SPA
- Styling: CSS (Kinetic Obsidian design system)
- Persistence: localStorage via existing dataStore abstractions
- Assets: static SVG + existing icon system

Reference alignment used for this turn:
- MDN Web SVG guidance (SVG embedding, scripting, and standards)
- MDN localStorage behavior and origin constraints

## 2) Current System Architecture Snapshot

Relevant modules and responsibilities:
- src/views/exerciseDetailView.js
  - Renders full-screen exercise detail overlay
  - Already includes badge, title, description, PB and last-session stat circles
- src/exerciseDatabase.js
  - Canonical metadata source for exercise information
- src/prTracker.js and workout history via dataStore
  - Supplies PB and last-session values
- styles/main.css
  - Holds exercise-detail and routine-detail visual language
- index.html
  - Loads exercise detail view script globally

W5.3 required architecture extension:
- Add a muscle-map render block inside exercise detail view:
  - Left column: muscle groups with percentage bars
  - Right column: body silhouette visual target
- Data flow for muscle activations:
  1. Try explicit per-exercise muscle activation metadata (bundled map)
  2. Fallback heuristic from category/name if explicit map missing
  3. Ensure safe defaults so every exercise renders without blank sections
- Static asset:
  - assets/body-outline.svg (front/back neutral silhouette)
- UI section contract in modal:
  - renderMuscleMap(exerciseName, info) returns deterministic HTML block
  - Must remain compatible with existing modal open/close behavior

## 3) Implementation Tracking

All actionable implementation tasks are tracked in `todo.md`.

`ulti-plan.md` remains the architecture/guardrails document only.

## 4) DO NOT List

- Do not change tab structure, onboarding flow, or unrelated W phases
- Do not regress W5.1/W5.2 modal behavior (back, close overlay, PB, last session)
- Do not introduce paid APIs, backend dependencies, or new external services
- Do not alter existing data keys in localStorage in a breaking way
- Do not restyle global components outside exercise-detail scope
- Do not add placeholder TODO code; all logic must be complete and executable

## 5) Delegation Strategy

Lead (this agent):
- Final architecture decisions
- Core implementation and integration in exerciseDetailView.js and main.css
- Validation, regression check, todo synchronization

Subagent delegation (conditional):
- If needed for speed/isolation, one subagent may be used for pure SVG asset drafting
- If a subagent is used, final integration and acceptance remains with Lead
- 3-strike fix policy applies to all delegated or local changes

## 6) Acceptance Criteria Source

Acceptance criteria checklists are tracked in `todo.md` under W5.3.
