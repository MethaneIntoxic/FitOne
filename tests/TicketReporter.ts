import fs from "node:fs";
import path from "node:path";
import type { Reporter, TestCase, TestResult } from "@playwright/test/reporter";
import { scenarios, type UatScenario } from "./uatScenarios";

interface Ticket {
  id: string;
  scenarioId: string;
  scenarioTitle: string;
  persona: string;
  category: string;
  mode: "beginner" | "power";
  environment: {
    browserName: string;
    browserVersion?: string;
    os?: string;
  };
  stepsSummary: string;
  expectedSummary: string;
  actualResult: string;
  errorMessage: string;
  screenshotPath?: string;
  createdAt: string;
}

type ReporterOptions = {
  outputDir?: string;
};

const scenarioById = new Map<string, UatScenario>(scenarios.map((scenario) => [scenario.id, scenario]));

function normalizeScenarioId(test: TestCase): string {
  if (/^UAT-\d{3}$/.test(test.title)) {
    return test.title;
  }

  const pathMatch = test.titlePath().find((segment) => /^UAT-\d{3}$/.test(segment));
  if (pathMatch) {
    return pathMatch;
  }

  const regexMatch = test.titlePath().join(" ").match(/UAT-\d{3}/);
  return regexMatch?.[0] ?? test.title;
}

function inferBrowserName(test: TestCase): string {
  const titlePath = test.titlePath();
  for (const candidate of ["chromium", "firefox", "webkit"]) {
    if (titlePath.some((segment) => segment.toLowerCase().includes(candidate))) {
      return candidate;
    }
  }

  const suiteProject = (test.parent as any)?.project?.();
  const configured = suiteProject?.use?.browserName;
  if (configured) {
    return String(configured);
  }
  return "chromium";
}

function firstFailureMessage(result: TestResult): string {
  if (result.error?.message) {
    return result.error.message;
  }
  if (result.errors && result.errors.length > 0) {
    return result.errors.map((error) => error.message || String(error.value || "Unknown error")).join("\n\n");
  }
  return `Test ended with status: ${result.status}`;
}

function stripAnsi(input: string): string {
  return input.replace(/\u001B\[[0-?]*[ -\/]*[@-~]/g, "");
}

function findScreenshotPath(result: TestResult): string | undefined {
  const screenshotAttachment = result.attachments.find(
    (attachment) =>
      attachment.name.toLowerCase().includes("screenshot") ||
      attachment.contentType?.toLowerCase().startsWith("image/"),
  );
  return screenshotAttachment?.path;
}

function toSafeStamp(iso: string): string {
  return iso.replace(/[:.]/g, "-");
}

export class TicketReporter implements Reporter {
  private readonly outputDir: string;
  private readonly sequenceByScenario = new Map<string, number>();

  constructor(options: ReporterOptions = {}) {
    this.outputDir = options.outputDir ?? "tickets";
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.status !== "failed" && result.status !== "timedOut") {
      return;
    }

    const finalAttempt = (result.retry ?? 0) >= (test.retries ?? 0);
    if (!finalAttempt) {
      return;
    }

    const scenarioId = normalizeScenarioId(test);
    const scenario =
      scenarioById.get(scenarioId) ??
      ({
        id: scenarioId,
        title: test.title,
        persona: "Unknown persona",
        category: "General",
        mode: "beginner",
        tags: [],
        stepsSummary: "No metadata available.",
        expectedSummary: "No expected summary available.",
        preconditions: ["No metadata available."],
        detailedSteps: ["No metadata available."],
        expectedOutcomes: ["No metadata available."],
        failureSignals: ["No metadata available."],
      } satisfies UatScenario);

    const sequence = (this.sequenceByScenario.get(scenario.id) ?? 0) + 1;
    this.sequenceByScenario.set(scenario.id, sequence);

    const createdAt = new Date().toISOString();
    const errorMessage = stripAnsi(firstFailureMessage(result));
    const actualResult = errorMessage.split("\n").filter(Boolean)[0] ?? `Failure in ${scenario.id}`;
    const screenshotPath = findScreenshotPath(result);

    const ticket: Ticket = {
      id: `T-${scenario.id}-${sequence}`,
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      persona: scenario.persona,
      category: scenario.category,
      mode: scenario.mode,
      environment: {
        browserName: inferBrowserName(test),
        os: `${process.platform} ${process.arch}`,
      },
      stepsSummary: scenario.stepsSummary,
      expectedSummary: scenario.expectedSummary,
      actualResult,
      errorMessage,
      screenshotPath,
      createdAt,
    };

    fs.mkdirSync(this.outputDir, { recursive: true });

    const stamp = toSafeStamp(createdAt);
    const baseName = `${scenario.id}-${stamp}`;
    const jsonPath = path.join(this.outputDir, `${baseName}.json`);
    const markdownPath = path.join(this.outputDir, `${baseName}.md`);

    fs.writeFileSync(jsonPath, JSON.stringify(ticket, null, 2), "utf-8");
    fs.writeFileSync(markdownPath, this.buildMarkdown(ticket), "utf-8");
  }

  printsToStdio(): boolean {
    return false;
  }

  private buildMarkdown(ticket: Ticket): string {
    const environment = [ticket.environment.browserName, ticket.environment.browserVersion, ticket.environment.os]
      .filter(Boolean)
      .join(" ");
    const attachments = ticket.screenshotPath
      ? `- Screenshot: ${ticket.screenshotPath}`
      : "- Screenshot: not captured";

    return [
      `# Ticket ${ticket.id}`,
      "",
      `- Scenario: ${ticket.scenarioId} – ${ticket.scenarioTitle}`,
      `- Persona: ${ticket.persona}`,
      `- Category: ${ticket.category}`,
      `- Mode: ${ticket.mode}`,
      `- Environment: ${environment}`,
      "",
      "## Steps (summary)",
      "",
      ticket.stepsSummary,
      "",
      "## Expected",
      "",
      ticket.expectedSummary,
      "",
      "## Actual",
      "",
      ticket.actualResult,
      "",
      "## Error",
      "",
      ticket.errorMessage,
      "",
      "## Attachments",
      "",
      attachments,
      "",
      `Created At: ${ticket.createdAt}`,
      "",
    ].join("\n");
  }
}

export default TicketReporter;