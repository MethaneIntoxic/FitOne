export type NetworkProfileId = "online" | "slow-3g" | "spotty" | "offline-window";

export interface NetworkProfileFixture {
  id: NetworkProfileId;
  label: string;
  offlineBeforeScenario: boolean;
  offlineAfterMs: number | null;
  onlineAfterMs: number | null;
  extraLatencyMs: number;
  jitterMs: number;
}

const NETWORK_PROFILES: Record<NetworkProfileId, NetworkProfileFixture> = {
  online: {
    id: "online",
    label: "Online (stable)",
    offlineBeforeScenario: false,
    offlineAfterMs: null,
    onlineAfterMs: null,
    extraLatencyMs: 0,
    jitterMs: 0,
  },
  "slow-3g": {
    id: "slow-3g",
    label: "Slow 3G",
    offlineBeforeScenario: false,
    offlineAfterMs: null,
    onlineAfterMs: null,
    extraLatencyMs: 450,
    jitterMs: 180,
  },
  spotty: {
    id: "spotty",
    label: "Spotty network",
    offlineBeforeScenario: false,
    offlineAfterMs: 1800,
    onlineAfterMs: 3200,
    extraLatencyMs: 120,
    jitterMs: 650,
  },
  "offline-window": {
    id: "offline-window",
    label: "Offline burst",
    offlineBeforeScenario: true,
    offlineAfterMs: null,
    onlineAfterMs: 2200,
    extraLatencyMs: 0,
    jitterMs: 0,
  },
};

export const networkProfiles: NetworkProfileFixture[] = Object.values(NETWORK_PROFILES);

export function getNetworkProfile(profileId: NetworkProfileId): NetworkProfileFixture {
  return NETWORK_PROFILES[profileId];
}

export function isNetworkProfileId(value: string): value is NetworkProfileId {
  return value in NETWORK_PROFILES;
}
