export type PersonaId =
  | 'P1'
  | 'P2'
  | 'P3'
  | 'P4'
  | 'P5'
  | 'P6'
  | 'P7'
  | 'P8'
  | 'P9'
  | 'P10'
  | 'P11'
  | 'P12'
  | 'P13'
  | 'P14'
  | 'P15'
  | 'P16'
  | 'P17'
  | 'P18'
  | 'P19'
  | 'P20';

export type TechLiteracy =
  | 'low'
  | 'medium-low'
  | 'medium'
  | 'medium-high'
  | 'high'
  | 'digital-native';

export type RiskFlag =
  | 'accessibility-needs'
  | 'adhd-planning-friction'
  | 'budget-limited'
  | 'caregiver-time-crunch'
  | 'chronic-condition'
  | 'data-export-dependence'
  | 'ed-sensitive'
  | 'injury-rehab'
  | 'language-friction'
  | 'low-connectivity'
  | 'manual-entry-only'
  | 'motivation-volatility'
  | 'night-shift'
  | 'offline-first'
  | 'performance-anxiety'
  | 'postpartum-recovery'
  | 'privacy-sensitive'
  | 'schedule-variability'
  | 'senior-accessibility'
  | 'small-screen-only'
  | 'time-poor-professional'
  | 'travel-frequent'
  | 'wearable-desync-risk';

export interface PersonaProfile {
  id: PersonaId;
  name: string;
  age: number;
  context: string;
  techLiteracy: TechLiteracy;
  hardware: string;
  wearable: string | 'none';
  primaryGoal: string;
  riskFlags: RiskFlag[];
}

export const FIT_TO_FIT_PERSONAS: readonly PersonaProfile[] = [
  {
    id: 'P1',
    name: 'Amira',
    age: 24,
    context: 'First-time tracker transitioning from inconsistent routines.',
    techLiteracy: 'medium',
    hardware: 'Android mid-range phone',
    wearable: 'none',
    primaryGoal: 'Build sustainable fat-loss habits with low friction.',
    riskFlags: ['motivation-volatility', 'small-screen-only'],
  },
  {
    id: 'P2',
    name: 'Noah',
    age: 31,
    context: 'Privacy-conscious software engineer who avoids cloud lock-in.',
    techLiteracy: 'high',
    hardware: 'Pixel phone + Linux laptop',
    wearable: 'none',
    primaryGoal: 'Track progress with strict local-only data control.',
    riskFlags: ['privacy-sensitive', 'data-export-dependence'],
  },
  {
    id: 'P3',
    name: 'Leo',
    age: 37,
    context: 'Office professional with narrow windows for meal and workout logging.',
    techLiteracy: 'medium-high',
    hardware: 'iPhone + work desktop browser',
    wearable: 'Apple Watch',
    primaryGoal: 'Maintain consistency during high-workload weeks.',
    riskFlags: ['time-poor-professional', 'motivation-volatility'],
  },
  {
    id: 'P4',
    name: 'Kay',
    age: 29,
    context: 'Competitive powerlifter tracking per-gym PR progression.',
    techLiteracy: 'high',
    hardware: 'Android flagship phone',
    wearable: 'Garmin',
    primaryGoal: 'Optimize strength blocks with dependable performance data.',
    riskFlags: ['performance-anxiety', 'wearable-desync-risk'],
  },
  {
    id: 'P5',
    name: 'Ravi',
    age: 33,
    context: 'Shift worker with highly irregular sleep and meal timing.',
    techLiteracy: 'medium',
    hardware: 'Android budget phone',
    wearable: 'none',
    primaryGoal: 'Log workouts reliably despite rotating shifts.',
    riskFlags: ['night-shift', 'schedule-variability'],
  },
  {
    id: 'P6',
    name: 'Mina',
    age: 35,
    context: 'Recomposition-focused user balancing scale trends with gym output.',
    techLiteracy: 'medium-high',
    hardware: 'iPhone',
    wearable: 'Fitbit',
    primaryGoal: 'Improve body composition while preserving energy and adherence.',
    riskFlags: ['motivation-volatility', 'data-export-dependence'],
  },
  {
    id: 'P7',
    name: 'Elena',
    age: 34,
    context: 'Postpartum parent restarting training with limited uninterrupted time.',
    techLiteracy: 'medium',
    hardware: 'Android phone',
    wearable: 'none',
    primaryGoal: 'Recover confidence and rebuild baseline strength safely.',
    riskFlags: ['postpartum-recovery', 'caregiver-time-crunch'],
  },
  {
    id: 'P8',
    name: 'Tomas',
    age: 62,
    context: 'Older adult managing blood pressure while increasing activity.',
    techLiteracy: 'medium-low',
    hardware: 'Large-screen Android phone',
    wearable: 'Samsung Watch',
    primaryGoal: 'Improve cardiovascular health with accessible UI guidance.',
    riskFlags: ['senior-accessibility', 'chronic-condition'],
  },
  {
    id: 'P9',
    name: 'Jada',
    age: 21,
    context: 'Student athlete tracking on a prepaid data plan and tight budget.',
    techLiteracy: 'digital-native',
    hardware: 'Android budget phone',
    wearable: 'none',
    primaryGoal: 'Stay in calorie range without premium tools or subscriptions.',
    riskFlags: ['budget-limited', 'small-screen-only'],
  },
  {
    id: 'P10',
    name: 'Omar',
    age: 40,
    context: 'Warehouse worker recovering from shoulder strain during night shifts.',
    techLiteracy: 'medium',
    hardware: 'Android phone',
    wearable: 'none',
    primaryGoal: 'Return to pain-free training while retaining routine.',
    riskFlags: ['night-shift', 'injury-rehab'],
  },
  {
    id: 'P11',
    name: 'Priya',
    age: 28,
    context: 'Runner in physiotherapy rebuilding after knee surgery.',
    techLiteracy: 'medium-high',
    hardware: 'iPhone',
    wearable: 'Garmin',
    primaryGoal: 'Progress rehab milestones without overtraining.',
    riskFlags: ['injury-rehab', 'performance-anxiety'],
  },
  {
    id: 'P12',
    name: 'Ben',
    age: 45,
    context: 'Frequent traveler alternating between airports, hotels, and client sites.',
    techLiteracy: 'high',
    hardware: 'iPhone + ultrabook',
    wearable: 'Apple Watch',
    primaryGoal: 'Keep habits stable across travel and inconsistent connectivity.',
    riskFlags: ['travel-frequent', 'low-connectivity'],
  },
  {
    id: 'P13',
    name: 'Sofia',
    age: 27,
    context: 'Neurodivergent user who needs clear chunked flows and reminders.',
    techLiteracy: 'high',
    hardware: 'Android phone',
    wearable: 'none',
    primaryGoal: 'Reduce planning overwhelm and maintain repeatable routines.',
    riskFlags: ['adhd-planning-friction', 'motivation-volatility'],
  },
  {
    id: 'P14',
    name: 'Darius',
    age: 32,
    context: 'Data-driven engineer who audits trends weekly in spreadsheets.',
    techLiteracy: 'high',
    hardware: 'Android phone + desktop',
    wearable: 'Polar',
    primaryGoal: 'Validate trends with export-ready, trustworthy metrics.',
    riskFlags: ['data-export-dependence', 'manual-entry-only'],
  },
  {
    id: 'P15',
    name: 'Hana',
    age: 30,
    context: 'Rural user with intermittent signal and mostly offline usage windows.',
    techLiteracy: 'medium',
    hardware: 'Android phone',
    wearable: 'none',
    primaryGoal: 'Log consistently even when online sync is unavailable.',
    riskFlags: ['low-connectivity', 'offline-first'],
  },
  {
    id: 'P16',
    name: 'Mateo',
    age: 36,
    context: 'Hybrid athlete relying on wearable sync for recovery decisions.',
    techLiteracy: 'medium-high',
    hardware: 'iPhone',
    wearable: 'Whoop',
    primaryGoal: 'Unify training and recovery metrics without data gaps.',
    riskFlags: ['wearable-desync-risk', 'data-export-dependence'],
  },
  {
    id: 'P17',
    name: 'Chloe',
    age: 26,
    context: 'User with prior disordered-eating history requiring gentle language.',
    techLiteracy: 'medium',
    hardware: 'iPhone',
    wearable: 'none',
    primaryGoal: 'Track wellbeing without triggering harmful perfection loops.',
    riskFlags: ['ed-sensitive', 'motivation-volatility'],
  },
  {
    id: 'P18',
    name: 'Victor',
    age: 39,
    context: 'Single parent balancing childcare and fragmented training slots.',
    techLiteracy: 'medium',
    hardware: 'Android phone',
    wearable: 'none',
    primaryGoal: 'Stay active with fast logging and rapid plan pivots.',
    riskFlags: ['caregiver-time-crunch', 'schedule-variability'],
  },
  {
    id: 'P19',
    name: 'Imani',
    age: 42,
    context: 'Adaptive athlete requiring accessible controls and robust fallback input.',
    techLiteracy: 'medium-high',
    hardware: 'Android tablet + phone',
    wearable: 'none',
    primaryGoal: 'Track progress with accessibility-first interaction patterns.',
    riskFlags: ['accessibility-needs', 'injury-rehab'],
  },
  {
    id: 'P20',
    name: 'Quinn',
    age: 30,
    context: 'QA benchmark persona stress-testing responsiveness and edge reliability.',
    techLiteracy: 'high',
    hardware: 'Desktop browser + Android phone',
    wearable: 'none',
    primaryGoal: 'Measure stability and speed under intensive usage paths.',
    riskFlags: ['manual-entry-only', 'performance-anxiety'],
  },
];

export const FIT_TO_FIT_PERSONA_BY_ID: Readonly<Record<PersonaId, PersonaProfile>> = Object.freeze(
  FIT_TO_FIT_PERSONAS.reduce<Record<PersonaId, PersonaProfile>>((accumulator, persona) => {
    accumulator[persona.id] = persona;
    return accumulator;
  }, {} as Record<PersonaId, PersonaProfile>)
);

export function getPersonaProfile(personaId: PersonaId): PersonaProfile {
  return FIT_TO_FIT_PERSONA_BY_ID[personaId];
}

export function listPersonaIds(): readonly PersonaId[] {
  return FIT_TO_FIT_PERSONAS.map((persona) => persona.id);
}

export function filterPersonasByRisk(flag: RiskFlag): PersonaProfile[] {
  return FIT_TO_FIT_PERSONAS.filter((persona) => persona.riskFlags.includes(flag));
}
