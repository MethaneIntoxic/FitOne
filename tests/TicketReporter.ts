import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { Reporter, TestCase, TestResult } from "@playwright/test/reporter";
import { scenarios, type UatScenario } from "./uatScenarios";

type TicketType = "BUG" | "ENHANCE" | "FEAT" | "UX";
type Severity = "critical" | "high" | "medium" | "low";
type Priority = "p0" | "p1" | "p2" | "p3";
type PhaseId = "phase1" | "phase2" | "phase3" | "phase4" | "legacy";

interface TicketScoring {
  impactScore: number;
  frequencyScore: number;
  personaVulnerabilityScore: number;
  riskScore: number;
}

interface NormalizedTriageFields {
  sourceCaseId: string;
  personaId: string;
  phaseId: PhaseId;
  type: TicketType;
  severity: Severity;
  priority: Priority;
  category: string;
  summary: string;
  reproSteps: string[];
  expected: string;
  actual: string;
  evidence: string[];
  recommendation: string;
  acceptanceCriteria: string[];
  scoring: TicketScoring;
  tags: string[];
}

interface Ticket {
  // Legacy fields retained for backward compatibility.
  id: string;
  scenarioId: string;
  scenarioTitle: string;
  persona: string;
  category: string;
  mode: "beginner" | "power";
  environment: {
    browserName: string;
    projectName?: string;
    browserVersion?: string;
    os?: string;
    runId?: string;
  };
  stepsSummary: string;
  expectedSummary: string;
  actualResult: string;
  errorMessage: string;
  failureFingerprint: string;
  runFingerprintKey: string;
  screenshotPath?: string;
  createdAt: string;

  // Normalized triage fields for BUG/ENHANCE/FEAT/UX backlog synthesis.
  schemaVersion: "2.0";
  sourceCaseId: string;
  personaId: string;
  phaseId: PhaseId;
  type: TicketType;
  severity: Severity;
  priority: Priority;
  summary: string;
  reproSteps: string[];
  expected: string;
  actual: string;
  evidence: string[];
  recommendation: string;
  acceptanceCriteria: string[];
  scoring: TicketScoring;
  tags: string[];
  triage: NormalizedTriageFields;
}

type ReporterOptions = {
  outputDir?: string;
  nowIso?: string;
};

const scenarioById = new Map<string, UatScenario>(scenarios.map((scenario) => [scenario.id, scenario]));

const severityRank: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const priorityBySeverity: Record<Severity, Priority> = {
  critical: "p0",
  high: "p1",
  medium: "p2",
  low: "p3",
};

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

function inferProjectName(test: TestCase): string {
  const suiteProject = (test.parent as any)?.project?.();
  if (suiteProject?.name) {
    return String(suiteProject.name);
  }

  const titlePath = test.titlePath();
  const matchedSegment = titlePath.find((segment) => /^(chromium|firefox|webkit|matrix-[\w-]+)$/i.test(segment));
  return matchedSegment ?? "unknown-project";
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

function normalizeErrorFingerprintSource(input: string): string {
  return stripAnsi(input)
    .toLowerCase()
    .replace(/\r\n/g, "\n")
    .replace(/https?:\/\/[^\s)]+/g, "<url>")
    .replace(/\b\d{4}-\d{2}-\d{2}t\d{2}:\d{2}:\d{2}(?:\.\d+)?z\b/g, "<iso-ts>")
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, "<date>")
    .replace(/:[0-9]+:[0-9]+/g, ":<line>:<col>")
    .replace(/\b(retry|attempt)\s+\d+\b/g, "$1 <n>")
    .replace(/\b\d+\b/g, "<n>")
    .replace(/\s+/g, " ")
    .trim();
}

function createFailureFingerprint(errorMessage: string): string {
  const normalized = normalizeErrorFingerprintSource(errorMessage) || "unknown-error";
  return createHash("sha1").update(normalized).digest("hex").slice(0, 16);
}

function buildRunFingerprintKey(
  scenarioId: string,
  failureFingerprint: string,
  browserName: string,
  projectName: string,
): string {
  return [scenarioId, failureFingerprint, browserName.toLowerCase(), projectName.toLowerCase()].join("|");
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

function toIsoTimestamp(overrideIso?: string): string {
  if (overrideIso) {
    const parsed = new Date(overrideIso);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return new Date().toISOString();
}

function normalizeTags(scenario: UatScenario): string[] {
  return (scenario.tags ?? []).map((tag) => String(tag).trim()).filter(Boolean);
}

function toPersonaId(persona: string): string {
  const normalized = persona
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "unknown-persona";
}

function inferPhaseId(scenario: UatScenario): PhaseId {
  const tags = normalizeTags(scenario).map((tag) => tag.toLowerCase());
  const text = `${scenario.title} ${scenario.stepsSummary} ${scenario.category}`.toLowerCase();

  if (tags.some((tag) => tag.includes("phase1")) || /onboarding|friction-heavy/.test(text)) {
    return "phase1";
  }
  if (tags.some((tag) => tag.includes("phase2")) || /honeymoon|streak/.test(text)) {
    return "phase2";
  }
  if (tags.some((tag) => tag.includes("phase3")) || /valley|dropout|recovery/.test(text)) {
    return "phase3";
  }
  if (tags.some((tag) => tag.includes("phase4")) || /optimization|transform|long-range|analytics/.test(text)) {
    return "phase4";
  }
  return "legacy";
}

function inferTicketType(scenario: UatScenario, errorMessage: string): TicketType {
  const tags = normalizeTags(scenario).map((tag) => tag.toLowerCase());
  const text = `${scenario.title} ${scenario.category} ${scenario.stepsSummary} ${errorMessage}`.toLowerCase();

  if (
    tags.some((tag) => tag.includes("ux") || tag.includes("a11y") || tag.includes("accessibility")) ||
    /ux|usability|a11y|accessibility|confusing|friction/.test(text)
  ) {
    return "UX";
  }

  if (
    tags.some((tag) => tag.includes("feature") || tag.includes("missing") || tag.includes("integration")) ||
    /not implemented|missing feature|unsupported|todo/.test(text)
  ) {
    return "FEAT";
  }

  if (
    tags.some((tag) => tag.includes("enhance") || tag.includes("improvement") || tag.includes("optimization")) ||
    /enhance|improve|optimi[sz]e|performance/.test(text)
  ) {
    return "ENHANCE";
  }

  return "BUG";
}

function clampScore(score: number): number {
  return Math.min(5, Math.max(1, Math.round(score)));
}

function deriveImpactScore(type: TicketType, errorMessage: string): number {
  const baseline: Record<TicketType, number> = {
    BUG: 5,
    UX: 4,
    FEAT: 3,
    ENHANCE: 2,
  };

  let score = baseline[type];
  if (/fatal|panic|timeout|cannot|unable|blocked|data loss/i.test(errorMessage)) {
    score = Math.max(score, 5);
  }
  return clampScore(score);
}

function deriveFrequencyScore(result: TestResult): number {
  let score = result.status === "timedOut" ? 5 : 3;
  score += result.retry ?? 0;
  if ((result.errors?.length ?? 0) > 1) {
    score += 1;
  }
  return clampScore(score);
}

function derivePersonaVulnerabilityScore(scenario: UatScenario): number {
  let score = scenario.mode === "beginner" ? 4 : 2;
  const text = `${scenario.persona} ${scenario.title} ${scenario.category} ${normalizeTags(scenario).join(" ")}`.toLowerCase();

  if (/senior|accessibility|a11y|novice|beginner|ed-sensitive|night-shift/.test(text)) {
    score += 1;
  }

  if (/onboarding|critical/.test(text)) {
    score += 1;
  }

  return clampScore(score);
}

function deriveSeverityAndPriority(riskScore: number): { severity: Severity; priority: Priority } {
  let severity: Severity = "low";

  if (riskScore >= 75) {
    severity = "critical";
  } else if (riskScore >= 45) {
    severity = "high";
  } else if (riskScore >= 20) {
    severity = "medium";
  }

  return {
    severity,
    priority: priorityBySeverity[severity],
  };
}

function buildReproSteps(scenario: UatScenario): string[] {
  const detailed = (scenario.detailedSteps ?? []).map((step) => String(step).trim()).filter(Boolean);
  if (detailed.length > 0) {
    return detailed;
  }

  const fallback = String(scenario.stepsSummary || "")
    .split(/\.|;|\n/g)
    .map((step) => step.trim())
    .filter(Boolean);

  if (fallback.length > 0) {
    return fallback;
  }

  return [`Open FitOne and execute scenario ${scenario.id}.`];
}

function buildAcceptanceCriteria(scenario: UatScenario): string[] {
  const outcomes = (scenario.expectedOutcomes ?? []).map((item) => String(item).trim()).filter(Boolean);
  if (outcomes.length > 0) {
    return [
      `Scenario ${scenario.id} completes without blocking errors.`,
      ...outcomes.slice(0, 3).map((item) => `Verify: ${item}`),
    ];
  }

  return [
    `Scenario ${scenario.id} completes without blocking errors.`,
    `Expected summary is met: ${scenario.expectedSummary}`,
  ];
}

function buildRecommendation(type: TicketType, category: string): string {
  if (type === "BUG") {
    return `Fix the failing ${category} flow and add a regression assertion for this scenario.`;
  }
  if (type === "UX") {
    return `Reduce UX friction in ${category} and validate accessibility and clarity with beginner personas.`;
  }
  if (type === "FEAT") {
    return `Implement the missing ${category} capability and add scenario-level coverage for the new behavior.`;
  }
  return `Enhance ${category} reliability/performance and verify measurable improvement in repeated runs.`;
}

function buildSummary(type: TicketType, scenario: UatScenario, actualResult: string): string {
  const firstLine = actualResult.split("\n").map((line) => line.trim()).find(Boolean) ?? `Failure in ${scenario.id}`;
  return `${type}: ${scenario.id} ${scenario.title} - ${firstLine}`;
}

function compareSeverity(a: Severity, b: Severity): number {
  return severityRank[a] - severityRank[b];
}

export class TicketReporter implements Reporter {
  private readonly outputDir: string;
  private readonly nowIso?: string;
  private readonly runId?: string;
  private readonly sequenceByScenario = new Map<string, number>();
  private readonly seenRunFingerprintKeys = new Set<string>();

  constructor(options: ReporterOptions = {}) {
    this.outputDir = options.outputDir ?? "tickets";
    this.nowIso = options.nowIso;
    this.runId = process.env.FITONE_UAT_RUN_ID;
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

    const createdAt = toIsoTimestamp(this.nowIso);
    const errorMessage = stripAnsi(firstFailureMessage(result));
    const browserName = inferBrowserName(test);
    const projectName = inferProjectName(test);
    const failureFingerprint = createFailureFingerprint(errorMessage);
    const runFingerprintKey = buildRunFingerprintKey(scenario.id, failureFingerprint, browserName, projectName);

    if (this.seenRunFingerprintKeys.has(runFingerprintKey)) {
      return;
    }
    this.seenRunFingerprintKeys.add(runFingerprintKey);

    const sequence = (this.sequenceByScenario.get(scenario.id) ?? 0) + 1;
    this.sequenceByScenario.set(scenario.id, sequence);

    const actualResult = errorMessage.split("\n").filter(Boolean)[0] ?? `Failure in ${scenario.id}`;
    const screenshotPath = findScreenshotPath(result);
    const phaseId = inferPhaseId(scenario);
    const type = inferTicketType(scenario, errorMessage);
    const impactScore = deriveImpactScore(type, errorMessage);
    const frequencyScore = deriveFrequencyScore(result);
    const personaVulnerabilityScore = derivePersonaVulnerabilityScore(scenario);
    const riskScore = impactScore * frequencyScore * personaVulnerabilityScore;
    const { severity, priority } = deriveSeverityAndPriority(riskScore);
    const reproSteps = buildReproSteps(scenario);
    const acceptanceCriteria = buildAcceptanceCriteria(scenario);
    const evidence = screenshotPath ? [screenshotPath] : [];
    const summary = buildSummary(type, scenario, actualResult);
    const scoring: TicketScoring = {
      impactScore,
      frequencyScore,
      personaVulnerabilityScore,
      riskScore,
    };

    const triage: NormalizedTriageFields = {
      sourceCaseId: scenario.id,
      personaId: toPersonaId(scenario.persona),
      phaseId,
      type,
      severity,
      priority,
      category: scenario.category,
      summary,
      reproSteps,
      expected: scenario.expectedSummary,
      actual: actualResult,
      evidence,
      recommendation: buildRecommendation(type, scenario.category),
      acceptanceCriteria,
      scoring,
      tags: normalizeTags(scenario),
    };

    const ticket: Ticket = {
      id: `T-${scenario.id}-${sequence}`,
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      persona: scenario.persona,
      category: scenario.category,
      mode: scenario.mode,
      environment: {
        browserName,
        projectName,
        os: `${process.platform} ${process.arch}`,
        runId: this.runId,
      },
      stepsSummary: scenario.stepsSummary,
      expectedSummary: scenario.expectedSummary,
      actualResult,
      errorMessage,
      failureFingerprint,
      runFingerprintKey,
      screenshotPath,
      createdAt,
      schemaVersion: "2.0",
      sourceCaseId: triage.sourceCaseId,
      personaId: triage.personaId,
      phaseId: triage.phaseId,
      type: triage.type,
      severity: triage.severity,
      priority: triage.priority,
      summary: triage.summary,
      reproSteps: triage.reproSteps,
      expected: triage.expected,
      actual: triage.actual,
      evidence: triage.evidence,
      recommendation: triage.recommendation,
      acceptanceCriteria: triage.acceptanceCriteria,
      scoring: triage.scoring,
      tags: triage.tags,
      triage,
    };

    fs.mkdirSync(this.outputDir, { recursive: true });

    const stamp = toSafeStamp(createdAt);
    const sequenceSuffix = sequence > 1 ? `-${String(sequence).padStart(2, "0")}` : "";
    const baseName = `${scenario.id}-${stamp}${sequenceSuffix}`;
    const jsonPath = path.join(this.outputDir, `${baseName}.json`);
    const markdownPath = path.join(this.outputDir, `${baseName}.md`);

    fs.writeFileSync(jsonPath, JSON.stringify(ticket, null, 2), "utf-8");
    fs.writeFileSync(markdownPath, this.buildMarkdown(ticket), "utf-8");
  }

  printsToStdio(): boolean {
    return false;
  }

  private buildMarkdown(ticket: Ticket): string {
    const environment = [
      ticket.environment.browserName,
      ticket.environment.projectName,
      ticket.environment.browserVersion,
      ticket.environment.os,
    ]
      .filter(Boolean)
      .join(" ");
    const attachments = ticket.screenshotPath
      ? `- Screenshot: ${ticket.screenshotPath}`
      : "- Screenshot: not captured";
    const normalizedEvidence = ticket.evidence.length > 0 ? ticket.evidence : ["none"];

    const triageLines = [
      `- Type: ${ticket.type}`,
      `- Severity: ${ticket.severity}`,
      `- Priority: ${ticket.priority}`,
      `- Phase: ${ticket.phaseId}`,
      `- Persona ID: ${ticket.personaId}`,
      `- Failure Fingerprint: ${ticket.failureFingerprint}`,
      `- Run Key: ${ticket.runFingerprintKey}`,
      `- Risk Score: ${ticket.scoring.riskScore} (impact ${ticket.scoring.impactScore} x frequency ${ticket.scoring.frequencyScore} x vulnerability ${ticket.scoring.personaVulnerabilityScore})`,
    ];

    const reproLines = ticket.reproSteps.map((step) => `- ${step}`);
    const acceptanceLines = ticket.acceptanceCriteria.map((item) => `- ${item}`);
    const evidenceLines = normalizedEvidence.map((item) => `- ${item}`);

    if (compareSeverity(ticket.severity, "high") <= 0) {
      triageLines.push("- Escalation: include in immediate triage queue");
    }

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
      "## Normalized Triage",
      "",
      ...triageLines,
      "",
      "## Summary",
      "",
      ticket.summary,
      "",
      "## Reproduction Steps",
      "",
      ...reproLines,
      "",
      "## Recommendation",
      "",
      ticket.recommendation,
      "",
      "## Acceptance Criteria",
      "",
      ...acceptanceLines,
      "",
      "## Normalized Evidence",
      "",
      ...evidenceLines,
      "",
      `Created At: ${ticket.createdAt}`,
      "",
    ].join("\n");
  }
}

export default TicketReporter;