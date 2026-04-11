import type { UatScenario } from "../../uatScenarios";
import type { DeviceProfileId } from "./deviceProfiles";
import type { NetworkProfileId } from "./networkProfiles";

export type LifecycleCaseId =
  | "baseline-online"
  | "slow3g-read-heavy"
  | "spotty-mutation"
  | "offline-recovery";

export interface LifecycleCaseFixture {
  id: LifecycleCaseId;
  label: string;
  description: string;
  deviceProfileId: DeviceProfileId;
  networkProfileId: NetworkProfileId;
  includeScenarioIds: string[];
}

const LIFECYCLE_CASES: Record<LifecycleCaseId, LifecycleCaseFixture> = {
  "baseline-online": {
    id: "baseline-online",
    label: "Baseline stable execution",
    description: "Desktop stable run used for deterministic baseline captures.",
    deviceProfileId: "desktop-chrome",
    networkProfileId: "online",
    includeScenarioIds: ["UAT-001", "UAT-005", "UAT-010", "UAT-015"],
  },
  "slow3g-read-heavy": {
    id: "slow3g-read-heavy",
    label: "Slow 3G read-heavy flow",
    description: "Mobile read-heavy flows under sustained latency.",
    deviceProfileId: "mobile-pixel-7",
    networkProfileId: "slow-3g",
    includeScenarioIds: ["UAT-001", "UAT-004", "UAT-010", "UAT-015"],
  },
  "spotty-mutation": {
    id: "spotty-mutation",
    label: "Spotty mutation stress",
    description: "Desktop write paths while network intermittently drops.",
    deviceProfileId: "desktop-chrome",
    networkProfileId: "spotty",
    includeScenarioIds: ["UAT-005", "UAT-007", "UAT-011", "UAT-012"],
  },
  "offline-recovery": {
    id: "offline-recovery",
    label: "Offline window recovery",
    description: "Mobile run with initial offline window and reconnection recovery.",
    deviceProfileId: "mobile-pixel-7",
    networkProfileId: "offline-window",
    includeScenarioIds: ["UAT-009", "UAT-013", "UAT-014", "UAT-015"],
  },
};

export const lifecycleCases: LifecycleCaseFixture[] = Object.values(LIFECYCLE_CASES);

export function getLifecycleCase(caseId: LifecycleCaseId): LifecycleCaseFixture {
  return LIFECYCLE_CASES[caseId];
}

export function isLifecycleCaseId(value: string): value is LifecycleCaseId {
  return value in LIFECYCLE_CASES;
}

export function getScenariosForLifecycleCase(
  lifecycleCase: LifecycleCaseFixture,
  scenarios: UatScenario[],
): UatScenario[] {
  const byId = new Map(scenarios.map((scenario) => [scenario.id, scenario]));
  return lifecycleCase.includeScenarioIds
    .map((scenarioId) => byId.get(scenarioId))
    .filter((scenario): scenario is UatScenario => Boolean(scenario));
}
