import {
  FIT_TO_FIT_LIFECYCLE_CASES,
  LIFECYCLE_PHASES,
  PHASE_TO_LEGACY_UAT_IDS,
  type LifecyclePhaseId,
  type ScenarioCriticality,
  type UATScenarioCase,
} from './fit_to_fit_lifecycle';
import {
  FIT_TO_FIT_PERSONA_BY_ID,
  FIT_TO_FIT_PERSONAS,
  type PersonaId,
  type PersonaProfile,
  type RiskFlag,
} from '../personas/fit_to_fit_personas';

export interface LifecycleCaseQuery {
  personaIds?: PersonaId[];
  phaseIds?: LifecyclePhaseId[];
  tags?: string[];
  riskFlags?: RiskFlag[];
  criticalities?: ScenarioCriticality[];
  legacyUatIds?: string[];
}

export interface PersonaLifecycleMatrixRow {
  persona: PersonaProfile;
  phases: Record<LifecyclePhaseId, UATScenarioCase>;
}

export interface PhaseCoverageSummary {
  phaseId: LifecyclePhaseId;
  label: string;
  lifecycleCaseCount: number;
  criticalPathCount: number;
  highRiskCount: number;
  normalCount: number;
  legacyUatIds: readonly string[];
}

const LIFECYCLE_CASE_BY_ID: Readonly<Record<string, UATScenarioCase>> = Object.freeze(
  FIT_TO_FIT_LIFECYCLE_CASES.reduce<Record<string, UATScenarioCase>>((accumulator, scenarioCase) => {
    accumulator[scenarioCase.caseId] = scenarioCase;
    return accumulator;
  }, {})
);

function hasOverlap<T>(candidate: readonly T[], filterValues: readonly T[]): boolean {
  return filterValues.some((value) => candidate.includes(value));
}

function includesAllTags(caseTags: readonly string[], requiredTags: readonly string[]): boolean {
  return requiredTags.every((tag) => caseTags.includes(tag));
}

function getRequiredCase(personaId: PersonaId, phaseId: LifecyclePhaseId): UATScenarioCase {
  const scenarioCase = FIT_TO_FIT_LIFECYCLE_CASES.find(
    (candidate) => candidate.personaId === personaId && candidate.phaseId === phaseId
  );

  if (!scenarioCase) {
    throw new Error(`Missing lifecycle case for ${personaId}/${phaseId}.`);
  }

  return scenarioCase;
}

export function getLifecycleCase(caseId: string): UATScenarioCase | undefined {
  return LIFECYCLE_CASE_BY_ID[caseId];
}

export function listCasesForPersona(personaId: PersonaId): UATScenarioCase[] {
  return FIT_TO_FIT_LIFECYCLE_CASES.filter((scenarioCase) => scenarioCase.personaId === personaId);
}

export function listCasesForPhase(phaseId: LifecyclePhaseId): UATScenarioCase[] {
  return FIT_TO_FIT_LIFECYCLE_CASES.filter((scenarioCase) => scenarioCase.phaseId === phaseId);
}

export function listCasesForRiskFlag(flag: RiskFlag): UATScenarioCase[] {
  const matchingPersonaIds = new Set<PersonaId>(
    FIT_TO_FIT_PERSONAS.filter((persona) => persona.riskFlags.includes(flag)).map((persona) => persona.id)
  );

  return FIT_TO_FIT_LIFECYCLE_CASES.filter((scenarioCase) => matchingPersonaIds.has(scenarioCase.personaId));
}

export function listLegacyMappedCases(legacyUatId: string): UATScenarioCase[] {
  return FIT_TO_FIT_LIFECYCLE_CASES.filter((scenarioCase) => scenarioCase.legacyUatIds.includes(legacyUatId));
}

export function filterLifecycleCases(query: LifecycleCaseQuery): UATScenarioCase[] {
  return FIT_TO_FIT_LIFECYCLE_CASES.filter((scenarioCase) => {
    if (query.personaIds?.length && !query.personaIds.includes(scenarioCase.personaId)) {
      return false;
    }

    if (query.phaseIds?.length && !query.phaseIds.includes(scenarioCase.phaseId)) {
      return false;
    }

    if (query.criticalities?.length && !query.criticalities.includes(scenarioCase.criticality)) {
      return false;
    }

    if (query.tags?.length && !includesAllTags(scenarioCase.tags, query.tags)) {
      return false;
    }

    if (query.legacyUatIds?.length && !hasOverlap(scenarioCase.legacyUatIds, query.legacyUatIds)) {
      return false;
    }

    if (query.riskFlags?.length) {
      const persona = FIT_TO_FIT_PERSONA_BY_ID[scenarioCase.personaId];
      if (!hasOverlap(persona.riskFlags, query.riskFlags)) {
        return false;
      }
    }

    return true;
  });
}

export function buildPersonaLifecycleMatrix(): PersonaLifecycleMatrixRow[] {
  return FIT_TO_FIT_PERSONAS.map((persona) => ({
    persona,
    phases: {
      phase1: getRequiredCase(persona.id, 'phase1'),
      phase2: getRequiredCase(persona.id, 'phase2'),
      phase3: getRequiredCase(persona.id, 'phase3'),
      phase4: getRequiredCase(persona.id, 'phase4'),
    },
  }));
}

export function groupCasesByCriticality(): Record<ScenarioCriticality, UATScenarioCase[]> {
  return {
    'critical-path': FIT_TO_FIT_LIFECYCLE_CASES.filter((scenarioCase) => scenarioCase.criticality === 'critical-path'),
    'high-risk': FIT_TO_FIT_LIFECYCLE_CASES.filter((scenarioCase) => scenarioCase.criticality === 'high-risk'),
    normal: FIT_TO_FIT_LIFECYCLE_CASES.filter((scenarioCase) => scenarioCase.criticality === 'normal'),
  };
}

export function buildPhaseCoverageSummary(): PhaseCoverageSummary[] {
  return LIFECYCLE_PHASES.map((phase) => {
    const cases = listCasesForPhase(phase.phaseId);

    return {
      phaseId: phase.phaseId,
      label: phase.label,
      lifecycleCaseCount: cases.length,
      criticalPathCount: cases.filter((scenarioCase) => scenarioCase.criticality === 'critical-path').length,
      highRiskCount: cases.filter((scenarioCase) => scenarioCase.criticality === 'high-risk').length,
      normalCount: cases.filter((scenarioCase) => scenarioCase.criticality === 'normal').length,
      legacyUatIds: PHASE_TO_LEGACY_UAT_IDS[phase.phaseId],
    };
  });
}
