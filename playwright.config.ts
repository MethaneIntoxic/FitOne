import { defineConfig, devices } from "@playwright/test";

function readBooleanEnv(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function readPositiveIntEnv(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

const matrixEnabled = readBooleanEnv(process.env.FITONE_UAT_MATRIX);
const webServerHost = (process.env.FITONE_UAT_HOST || "127.0.0.1").trim() || "127.0.0.1";
const webServerPort = readPositiveIntEnv(process.env.FITONE_UAT_PORT, 4173);
const baseURL = `http://${webServerHost}:${webServerPort}`;
const matrixReuseExistingServer = readBooleanEnv(process.env.FITONE_UAT_MATRIX_REUSE_SERVER);
const reuseExistingServer = matrixEnabled ? matrixReuseExistingServer : true;
const webServerTimeout = matrixEnabled ? 180_000 : 120_000;

const defaultProjects = [
  {
    name: "chromium",
    ...(matrixEnabled ? { grepInvert: /@matrix-only/ } : {}),
    use: {
      ...devices["Desktop Chrome"],
    },
  },
];

const matrixProjects = [
  {
    name: "matrix-desktop-chrome",
    grep: /@matrix-desktop/,
    use: {
      ...devices["Desktop Chrome"],
      viewport: { width: 1440, height: 900 },
    },
  },
  {
    name: "matrix-mobile-pixel-7",
    grep: /@matrix-mobile/,
    use: {
      ...devices["Pixel 7"],
    },
  },
];

const projects = matrixEnabled ? [...defaultProjects, ...matrixProjects] : defaultProjects;

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  timeout: 30_000,
  retries: 1,
  expect: {
    timeout: 7_000,
  },
  use: {
    baseURL,
    browserName: "chromium",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects,
  outputDir: "test-results",
  reporter: [["list"], ["./tests/TicketReporter.ts", { outputDir: "tickets" }]],
  webServer: {
    command: `npx serve . -l tcp://${webServerHost}:${webServerPort}`,
    url: baseURL,
    reuseExistingServer,
    timeout: webServerTimeout,
  },
});