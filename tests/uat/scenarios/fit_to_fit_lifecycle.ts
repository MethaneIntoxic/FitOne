import {
  FIT_TO_FIT_PERSONAS,
  type PersonaId,
  type PersonaProfile,
  type RiskFlag,
} from '../personas/fit_to_fit_personas';

export type LifecyclePhaseId = 'phase1' | 'phase2' | 'phase3' | 'phase4';

export type LifecyclePhaseLabel =
  | 'Friction-Heavy Onboarding'
  | 'Honeymoon'
  | 'Valley of Despair'
  | 'Optimization & Transformation';

export interface LifecyclePhase {
  phaseId: LifecyclePhaseId;
  label: LifecyclePhaseLabel;
}

export type ScenarioCriticality = 'critical-path' | 'high-risk' | 'normal';

export interface UATScenarioCase {
  caseId: string;
  personaId: PersonaId;
  phaseId: LifecyclePhaseId;
  userIntent: string;
  actionPath: string[];
  edgeCase: string;
  expectedFunctional: string[];
  expectedEmotional: string[];
  tags: string[];
  criticality: ScenarioCriticality;
  legacyUatIds: string[];
}

interface PhaseScenarioBlueprint {
  userIntent: (persona: PersonaProfile) => string;
  actionPath: (persona: PersonaProfile) => string[];
  expectedFunctional: (persona: PersonaProfile) => string[];
  expectedEmotional: (persona: PersonaProfile) => string[];
  tags: readonly string[];
}

export const LIFECYCLE_PHASES: readonly LifecyclePhase[] = [
  { phaseId: 'phase1', label: 'Friction-Heavy Onboarding' },
  { phaseId: 'phase2', label: 'Honeymoon' },
  { phaseId: 'phase3', label: 'Valley of Despair' },
  { phaseId: 'phase4', label: 'Optimization & Transformation' },
];

export const PHASE_TO_LEGACY_UAT_IDS: Readonly<Record<LifecyclePhaseId, readonly string[]>> = Object.freeze({
  phase1: ['UAT-001', 'UAT-002', 'UAT-003'],
  phase2: ['UAT-004', 'UAT-005', 'UAT-006', 'UAT-007', 'UAT-009'],
  phase3: ['UAT-008', 'UAT-011', 'UAT-013'],
  phase4: ['UAT-010', 'UAT-012', 'UAT-014', 'UAT-015'],
});

const HIGH_RISK_FLAGS: readonly RiskFlag[] = [
  'accessibility-needs',
  'caregiver-time-crunch',
  'chronic-condition',
  'ed-sensitive',
  'injury-rehab',
  'low-connectivity',
  'night-shift',
  'postpartum-recovery',
  'privacy-sensitive',
  'senior-accessibility',
];

const PHASE_SCENARIO_BLUEPRINTS: Readonly<Record<LifecyclePhaseId, PhaseScenarioBlueprint>> = Object.freeze({
  phase1: {
    userIntent: (persona) =>
      `${persona.name} wants to complete setup quickly and safely for ${persona.primaryGoal.toLowerCase()}.`,
    actionPath: (persona) => [
      `Open FitOne and begin onboarding on ${persona.hardware}.`,
      'Set baseline profile details, onboarding mode, and primary goal.',
      'Configure privacy and notification preferences for daily usage.',
      'Reload app shell and verify onboarding data persistence.',
    ],
    expectedFunctional: (persona) => [
      'Onboarding mode and profile preferences persist after reload.',
      'First-day logging shortcuts are visible in Today and Log contexts.',
      `Setup content reflects persona context: ${persona.context}.`,
    ],
    expectedEmotional: (persona) => [
      `${persona.name} feels guided rather than overwhelmed during first-run setup.`,
      'Language remains supportive and non-judgmental.',
      'The app creates confidence in completing the first day.',
    ],
    tags: ['lifecycle', 'phase1', 'onboarding', 'first-run'],
  },
  phase2: {
    userIntent: (persona) =>
      `${persona.name} wants reliable daily momentum while early motivation is high.`,
    actionPath: (persona) => [
      'Log hydration and at least one meal using quick actions.',
      'Log a workout or body check-in in the same day session.',
      'Edit one recently logged row and verify no duplicate artifacts.',
      `Review day summary and streak progress aligned to ${persona.primaryGoal.toLowerCase()}.`,
    ],
    expectedFunctional: () => [
      'Daily logs persist in recent history and update summary cards immediately.',
      'Edit flows mutate the intended row exactly once with no ghost entries.',
      'Quick actions and manual entry paths produce consistent totals.',
    ],
    expectedEmotional: (persona) => [
      `${persona.name} feels momentum and sees that effort is being captured accurately.`,
      'Progress surfaces reward consistency without adding pressure.',
      'Interaction flow feels fast enough for real-life routines.',
    ],
    tags: ['lifecycle', 'phase2', 'daily-tracking', 'consistency'],
  },
  phase3: {
    userIntent: (persona) =>
      `${persona.name} needs a safe recovery path when routine disruption happens.`,
    actionPath: (persona) => [
      'Simulate a missed day or interrupted logging window.',
      'Resume logging with a catch-up entry and verify timestamp handling.',
      'Trigger a resilience path: offline window, import restore, or delayed sync.',
      `Confirm analytics and history continuity for ${persona.primaryGoal.toLowerCase()}.`,
    ],
    expectedFunctional: () => [
      'Recovery logging path preserves data integrity through interruption.',
      'Offline and restore behaviors do not corrupt existing trend history.',
      'Compassionate prompts appear when consistency drops.',
    ],
    expectedEmotional: (persona) => [
      `${persona.name} feels supported during setbacks instead of punished.`,
      'Recovery messaging lowers guilt and encourages re-entry.',
      'The app remains trustworthy under stressful conditions.',
    ],
    tags: ['lifecycle', 'phase3', 'resilience', 'recovery'],
  },
  phase4: {
    userIntent: (persona) =>
      `${persona.name} wants to optimize outcomes and validate long-term progress.`,
    actionPath: (persona) => [
      'Open analytics and compare trends across nutrition, training, and body markers.',
      'Adjust goals or targets and verify downstream recalculation in Today and Log.',
      'Run a data portability action (export/report/backup) for long-term tracking.',
      `Capture a milestone checkpoint tied to ${persona.primaryGoal.toLowerCase()}.`,
    ],
    expectedFunctional: () => [
      'Analytics views render non-empty trend summaries from historical entries.',
      'Optimization setting changes propagate consistently across core surfaces.',
      'Export and backup artifacts include stable identifiers and expected fields.',
    ],
    expectedEmotional: (persona) => [
      `${persona.name} feels ownership over progress through clear trend visibility.`,
      'Insights are actionable without requiring expert interpretation.',
      'Milestone reflection reinforces long-term adherence.',
    ],
    tags: ['lifecycle', 'phase4', 'optimization', 'analytics'],
  },
});

function buildCaseId(
  personaIndex: number,
  phaseIndex: number,
  personaId: PersonaId,
  phaseId: LifecyclePhaseId
): string {
  const numericId = personaIndex * LIFECYCLE_PHASES.length + phaseIndex + 1;
  return `TC${numericId.toString().padStart(3, '0')}-${personaId}-${phaseId}`;
}

function resolveEdgeCase(phaseId: LifecyclePhaseId, persona: PersonaProfile): string {
  const flags = new Set<RiskFlag>(persona.riskFlags);

  if (phaseId === 'phase1') {
    if (flags.has('low-connectivity') || flags.has('offline-first')) {
      return 'Onboarding starts with intermittent network and must retain setup state after reconnect.';
    }
    if (flags.has('privacy-sensitive')) {
      return 'Persona enables strict local-only controls and expects no cloud-side side effects.';
    }
    if (flags.has('senior-accessibility') || flags.has('accessibility-needs')) {
      return 'Large tap targets and readable onboarding copy are required to avoid setup abandonment.';
    }
    return 'Persona exits onboarding midway, reopens app, and expects continuation without data loss.';
  }

  if (phaseId === 'phase2') {
    if (flags.has('night-shift') || flags.has('schedule-variability')) {
      return 'Entries are logged at non-standard hours and must still map to the intended day window.';
    }
    if (flags.has('time-poor-professional') || flags.has('caregiver-time-crunch')) {
      return 'Persona has under 2 minutes per interaction and depends on quick-action logging paths.';
    }
    if (flags.has('wearable-desync-risk')) {
      return 'Wearable sync lags and manual correction should not duplicate or overwrite logs.';
    }
    return 'Persona edits and undoes a same-day entry to confirm stable list ordering and totals.';
  }

  if (phaseId === 'phase3') {
    if (flags.has('injury-rehab') || flags.has('chronic-condition')) {
      return 'Reduced training volume week must not trigger punitive streak language or broken suggestions.';
    }
    if (flags.has('ed-sensitive')) {
      return 'High-variance intake days should surface supportive coaching copy without trigger phrases.';
    }
    if (flags.has('low-connectivity') || flags.has('offline-first')) {
      return 'Offline logging across multiple sessions must reconcile safely after reconnect.';
    }
    return 'A two-day lapse is followed by catch-up logging and trend continuity checks.';
  }

  if (flags.has('data-export-dependence')) {
    return 'Persona validates exports against external analysis workflow and expects stable field schema.';
  }
  if (flags.has('manual-entry-only')) {
    return 'No wearable sync available; optimization must rely entirely on manual logs without degraded insights.';
  }
  if (flags.has('performance-anxiety')) {
    return 'High-stakes progress check must present objective trends without alarmist framing.';
  }
  return 'Long-range trend review with target adjustment should remain responsive on mobile and desktop.';
}

function resolveCriticality(phaseId: LifecyclePhaseId, persona: PersonaProfile): ScenarioCriticality {
  if (phaseId === 'phase1') {
    return 'critical-path';
  }

  if (phaseId === 'phase3') {
    return 'high-risk';
  }

  const hasHighRiskFlag = persona.riskFlags.some((flag) => HIGH_RISK_FLAGS.includes(flag));
  if (hasHighRiskFlag) {
    return 'high-risk';
  }

  return phaseId === 'phase2' ? 'critical-path' : 'normal';
}

export const FIT_TO_FIT_LIFECYCLE_CASES: readonly UATScenarioCase[] = FIT_TO_FIT_PERSONAS.flatMap(
  (persona, personaIndex) =>
    LIFECYCLE_PHASES.map((phase, phaseIndex) => {
      const blueprint = PHASE_SCENARIO_BLUEPRINTS[phase.phaseId];

      return {
        caseId: buildCaseId(personaIndex, phaseIndex, persona.id, phase.phaseId),
        personaId: persona.id,
        phaseId: phase.phaseId,
        userIntent: blueprint.userIntent(persona),
        actionPath: blueprint.actionPath(persona),
        edgeCase: resolveEdgeCase(phase.phaseId, persona),
        expectedFunctional: blueprint.expectedFunctional(persona),
        expectedEmotional: blueprint.expectedEmotional(persona),
        tags: [...blueprint.tags, ...persona.riskFlags, persona.id.toLowerCase()],
        criticality: resolveCriticality(phase.phaseId, persona),
        legacyUatIds: [...PHASE_TO_LEGACY_UAT_IDS[phase.phaseId]],
      };
    })
);

export function getLifecycleCaseById(caseId: string): UATScenarioCase | undefined {
  return FIT_TO_FIT_LIFECYCLE_CASES.find((scenarioCase) => scenarioCase.caseId === caseId);
}

export function listLifecycleCasesByPersona(personaId: PersonaId): UATScenarioCase[] {
  return FIT_TO_FIT_LIFECYCLE_CASES.filter((scenarioCase) => scenarioCase.personaId === personaId);
}

export function listLifecycleCasesByPhase(phaseId: LifecyclePhaseId): UATScenarioCase[] {
  return FIT_TO_FIT_LIFECYCLE_CASES.filter((scenarioCase) => scenarioCase.phaseId === phaseId);
}
