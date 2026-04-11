import type { Page, TestInfo } from "@playwright/test";
import type { UatScenario } from "../../uatScenarios";
import { getDeviceProfile, type DeviceProfileFixture } from "../fixtures/deviceProfiles";
import { getNetworkProfile, type NetworkProfileFixture } from "../fixtures/networkProfiles";
import type { LifecycleCaseFixture } from "../fixtures/lifecycleCases";

export type LifecycleStepPhase = "lifecycle" | "scenario" | "network";

export interface LifecycleStepCapture {
  index: number;
  key: string;
  phase: LifecycleStepPhase;
  action: string;
  detail: string;
}

export interface LifecycleRunResult {
  lifecycleCaseId: string;
  scenarioId: string;
  deviceProfile: DeviceProfileFixture;
  networkProfile: NetworkProfileFixture;
  steps: LifecycleStepCapture[];
}

export interface LifecycleRunInput {
  page: Page;
  scenario: UatScenario;
  lifecycleCase: LifecycleCaseFixture;
  runScenario: (page: Page, scenario: UatScenario) => Promise<void>;
  testInfo?: TestInfo;
}

class DeterministicStepRecorder {
  private cursor = 0;
  private readonly records: LifecycleStepCapture[] = [];

  capture(phase: LifecycleStepPhase, action: string, detail: string): void {
    this.cursor += 1;
    this.records.push({
      index: this.cursor,
      key: `STEP-${String(this.cursor).padStart(4, "0")}`,
      phase,
      action,
      detail,
    });
  }

  all(): LifecycleStepCapture[] {
    return [...this.records];
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function stableHash(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function deterministicJitter(seed: string, jitterMs: number): number {
  if (jitterMs <= 0) {
    return 0;
  }

  return stableHash(seed) % (jitterMs + 1);
}

function isClosedLifecycleTargetError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("target page, context or browser has been closed") ||
    message.includes("browser has been closed") ||
    message.includes("context closed") ||
    message.includes("page closed")
  );
}

async function runLifecycleCleanupStep(step: () => Promise<void>): Promise<void> {
  try {
    await step();
  } catch (error) {
    if (!isClosedLifecycleTargetError(error)) {
      throw error;
    }
  }
}

async function setupNetworkLifecycle(
  page: Page,
  networkProfile: NetworkProfileFixture,
  recorder: DeterministicStepRecorder,
): Promise<() => Promise<void>> {
  const transitionTasks: Promise<void>[] = [];

  const routeHandler = async (route: { request: () => { method: () => string; url: () => string }; continue: () => Promise<void> }) => {
    const request = route.request();
    const url = request.url();
    const method = request.method();

    const artificialDelayMs = networkProfile.extraLatencyMs + deterministicJitter(`${method}:${url}`, networkProfile.jitterMs);
    if (artificialDelayMs > 0) {
      recorder.capture("network", "delay", `${artificialDelayMs}ms ${method} ${url}`);
      await wait(artificialDelayMs);
    }

    await route.continue();
  };

  await page.route("**/*", routeHandler);
  recorder.capture("network", "route-installed", networkProfile.id);

  if (networkProfile.offlineBeforeScenario) {
    await page.context().setOffline(true);
    recorder.capture("network", "set-offline", "before-scenario");
  }

  const scheduleTransition = (offline: boolean, afterMs: number, reason: string) => {
    const task = wait(afterMs).then(async () => {
      await page.context().setOffline(offline);
      recorder.capture("network", offline ? "set-offline" : "set-online", `${reason}@${afterMs}ms`);
    });

    transitionTasks.push(task);
  };

  if (typeof networkProfile.offlineAfterMs === "number") {
    scheduleTransition(true, networkProfile.offlineAfterMs, "scheduled-offline");
  }

  if (typeof networkProfile.onlineAfterMs === "number") {
    scheduleTransition(false, networkProfile.onlineAfterMs, "scheduled-online");
  }

  return async () => {
    await Promise.allSettled(transitionTasks);

    await runLifecycleCleanupStep(async () => {
      await page.context().setOffline(false);
    });

    await runLifecycleCleanupStep(async () => {
      await page.unroute("**/*", routeHandler);
    });

    recorder.capture("network", "route-removed", networkProfile.id);
  };
}

async function attachLifecycleArtifact(result: LifecycleRunResult, testInfo?: TestInfo): Promise<void> {
  if (!testInfo) {
    return;
  }

  const payload = JSON.stringify(result, null, 2);
  await testInfo.attach(`lifecycle-${result.lifecycleCaseId}-${result.scenarioId}.json`, {
    body: Buffer.from(payload, "utf8"),
    contentType: "application/json",
  });
}

export async function runLifecycleCase(input: LifecycleRunInput): Promise<LifecycleRunResult> {
  const { page, scenario, lifecycleCase, runScenario, testInfo } = input;

  const deviceProfile = getDeviceProfile(lifecycleCase.deviceProfileId);
  const networkProfile = getNetworkProfile(lifecycleCase.networkProfileId);
  const recorder = new DeterministicStepRecorder();

  recorder.capture("lifecycle", "case-start", `${lifecycleCase.id}:${scenario.id}`);

  await page.evaluate(
    ({ caseId, deviceId, networkId }) => {
      localStorage.setItem("fitone_uat_lifecycle_case", caseId);
      localStorage.setItem("fitone_uat_lifecycle_device", deviceId);
      localStorage.setItem("fitone_uat_lifecycle_network", networkId);
    },
    {
      caseId: lifecycleCase.id,
      deviceId: deviceProfile.id,
      networkId: networkProfile.id,
    },
  );

  recorder.capture("lifecycle", "profiles-applied", `${deviceProfile.id}/${networkProfile.id}`);

  const teardownNetwork = await setupNetworkLifecycle(page, networkProfile, recorder);

  try {
    recorder.capture("scenario", "scenario-start", scenario.id);
    await runScenario(page, scenario);
    recorder.capture("scenario", "scenario-complete", scenario.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    recorder.capture("scenario", "scenario-error", message);
    throw error;
  } finally {
    await teardownNetwork();
    recorder.capture("lifecycle", "case-complete", `${lifecycleCase.id}:${scenario.id}`);
  }

  const result: LifecycleRunResult = {
    lifecycleCaseId: lifecycleCase.id,
    scenarioId: scenario.id,
    deviceProfile,
    networkProfile,
    steps: recorder.all(),
  };

  await attachLifecycleArtifact(result, testInfo);

  return result;
}
