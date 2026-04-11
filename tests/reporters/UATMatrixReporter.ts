import fs from "node:fs";
import path from "node:path";
import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from "@playwright/test/reporter";
import { scenarios, type UatScenario } from "../uatScenarios";

type MatrixStatus = "pass" | "fail" | "warn" | "blocked";
type RunMode = "beginner" | "power" | "unknown";
type PhaseId = "phase1" | "phase2" | "phase3" | "phase4" | "legacy";

interface MatrixRow {
  runId: string;
  runStartedAt: string;
  scenarioId: string;
  scenarioTitle: string;
  persona: string;
  personaId: string;
  phaseId: PhaseId;
  category: string;
  mode: RunMode;
  projectName: string;
  browserName: string;
  status: MatrixStatus;
  playwrightStatus: string;
  retry: number;
  durationMs: number;
  errorMessage: string;
  tags: string[];
  evidencePaths: string[];
  timestamp: string;
}

type ReporterOptions = {
  outputDir?: string;
  jsonFileName?: string;
  csvFileName?: string;
  nowIso?: string;
};

const scenarioById = new Map<string, UatScenario>(scenarios.map((scenario) => [scenario.id, scenario]));

function toIsoTimestamp(overrideIso?: string): string {
  if (overrideIso) {
    const parsed = new Date(overrideIso);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return new Date().toISOString();
}

function toSafeStamp(iso: string): string {
  return iso.replace(/[:.]/g, "-");
}

function normalizeScenarioId(test: TestCase): string {
  if (/^UAT-\d{3}$/i.test(test.title)) {
    return test.title.toUpperCase();
  }

  const fromPath = test
    .titlePath()
    .map((segment) => segment.trim())
    .find((segment) => /^UAT-\d{3}$/i.test(segment));
  if (fromPath) {
    return fromPath.toUpperCase();
  }

  const regexMatch = test.titlePath().join(" ").match(/UAT-\d{3}/i);
  return regexMatch ? regexMatch[0].toUpperCase() : test.title;
}

function inferProjectName(test: TestCase): string {
  const suiteProject = (test.parent as any)?.project?.();
  const projectName = suiteProject?.name;
  if (projectName) {
    return String(projectName);
  }

  const pathProject = test
    .titlePath()
    .map((segment) => segment.toLowerCase())
    .find((segment) => /chromium|firefox|webkit|mobile|desktop|iphone|pixel/.test(segment));

  return pathProject ?? "default";
}

function inferBrowserName(test: TestCase): string {
  const suiteProject = (test.parent as any)?.project?.();
  const configured = suiteProject?.use?.browserName;
  if (configured) {
    return String(configured);
  }

  const titlePath = test.titlePath();
  for (const candidate of ["chromium", "firefox", "webkit"]) {
    if (titlePath.some((segment) => segment.toLowerCase().includes(candidate))) {
      return candidate;
    }
  }

  return "chromium";
}

function normalizeTags(scenario: UatScenario | undefined, test: TestCase): string[] {
  const scenarioTags = (scenario?.tags ?? []).map((tag) => String(tag));
  const directTags = Array.isArray((test as any)?.tags) ? ((test as any).tags as string[]) : [];
  const pathTags = test
    .titlePath()
    .map((segment) => segment.trim())
    .filter((segment) => segment.startsWith("@"));

  return Array.from(new Set([...scenarioTags, ...directTags, ...pathTags])).filter(Boolean);
}

function inferMode(scenario: UatScenario | undefined, test: TestCase): RunMode {
  if (scenario?.mode === "beginner" || scenario?.mode === "power") {
    return scenario.mode;
  }

  const text = test.titlePath().join(" ").toLowerCase();
  if (text.includes("beginner")) {
    return "beginner";
  }
  if (text.includes("power")) {
    return "power";
  }
  return "unknown";
}

function inferPhaseId(scenario: UatScenario | undefined, scenarioId: string, tags: string[]): PhaseId {
  const text = `${scenario?.title ?? ""} ${scenario?.category ?? ""} ${scenario?.stepsSummary ?? ""} ${scenarioId} ${tags.join(" ")}`.toLowerCase();

  if (/phase1|onboarding|friction-heavy/.test(text)) {
    return "phase1";
  }
  if (/phase2|honeymoon|streak/.test(text)) {
    return "phase2";
  }
  if (/phase3|valley|dropout|recovery/.test(text)) {
    return "phase3";
  }
  if (/phase4|optimization|transform|analytics/.test(text)) {
    return "phase4";
  }
  return "legacy";
}

function toPersonaId(persona: string): string {
  const personaCaseMatch = persona.match(/\bP(\d{1,2})\b/i);
  if (personaCaseMatch) {
    return `P${personaCaseMatch[1].padStart(2, "0")}`;
  }

  const normalized = persona
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "unknown-persona";
}

function toMatrixStatus(result: TestResult): MatrixStatus {
  if (result.status === "passed") {
    return (result.retry ?? 0) > 0 ? "warn" : "pass";
  }
  if (result.status === "failed" || result.status === "timedOut") {
    return "fail";
  }
  if (result.status === "skipped" || result.status === "interrupted") {
    return "blocked";
  }
  return "warn";
}

function firstErrorMessage(result: TestResult): string {
  if (result.error?.message) {
    return result.error.message;
  }
  if (result.errors && result.errors.length > 0) {
    return result.errors.map((error) => error.message || String(error.value || "Unknown error")).join("\n\n");
  }
  return "";
}

function stripAnsi(input: string): string {
  return input.replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, "");
}

function collectEvidencePaths(result: TestResult): string[] {
  const attachmentPaths = result.attachments
    .map((attachment) => attachment.path)
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  return Array.from(new Set(attachmentPaths));
}

function extractScenarioNumber(id: string): number {
  const match = id.match(/UAT-(\d{1,})/i);
  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function stableSortRows(rows: MatrixRow[]): MatrixRow[] {
  return [...rows].sort((a, b) => {
    const scenarioDiff = extractScenarioNumber(a.scenarioId) - extractScenarioNumber(b.scenarioId);
    if (scenarioDiff !== 0) {
      return scenarioDiff;
    }

    const idDiff = a.scenarioId.localeCompare(b.scenarioId);
    if (idDiff !== 0) {
      return idDiff;
    }

    const projectDiff = a.projectName.localeCompare(b.projectName);
    if (projectDiff !== 0) {
      return projectDiff;
    }

    const browserDiff = a.browserName.localeCompare(b.browserName);
    if (browserDiff !== 0) {
      return browserDiff;
    }

    return a.timestamp.localeCompare(b.timestamp);
  });
}

function csvEscape(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsv(rows: MatrixRow[]): string {
  const headers = [
    "runId",
    "runStartedAt",
    "scenarioId",
    "scenarioTitle",
    "persona",
    "personaId",
    "phaseId",
    "category",
    "mode",
    "projectName",
    "browserName",
    "status",
    "playwrightStatus",
    "retry",
    "durationMs",
    "errorMessage",
    "tags",
    "evidencePaths",
    "timestamp",
  ];

  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.runId,
        row.runStartedAt,
        row.scenarioId,
        row.scenarioTitle,
        row.persona,
        row.personaId,
        row.phaseId,
        row.category,
        row.mode,
        row.projectName,
        row.browserName,
        row.status,
        row.playwrightStatus,
        row.retry,
        row.durationMs,
        row.errorMessage,
        row.tags.join("|"),
        row.evidencePaths.join("|"),
        row.timestamp,
      ]
        .map(csvEscape)
        .join(","),
    );
  }

  return lines.join("\n");
}

export class UATMatrixReporter implements Reporter {
  private readonly outputDir: string;
  private readonly jsonFileName?: string;
  private readonly csvFileName?: string;
  private readonly nowIso?: string;

  private runStartedAt = toIsoTimestamp();
  private runId = `uat-run-${toSafeStamp(this.runStartedAt)}`;
  private readonly rows: MatrixRow[] = [];

  constructor(options: ReporterOptions = {}) {
    this.outputDir = options.outputDir ?? "tickets";
    this.jsonFileName = options.jsonFileName;
    this.csvFileName = options.csvFileName;
    this.nowIso = options.nowIso;
  }

  onBegin(_config: FullConfig, _suite: Suite): void {
    this.runStartedAt = toIsoTimestamp(this.nowIso);
    this.runId = `uat-run-${toSafeStamp(this.runStartedAt)}`;
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const finalAttempt = (result.retry ?? 0) >= (test.retries ?? 0);
    if (!finalAttempt) {
      return;
    }

    const scenarioId = normalizeScenarioId(test);
    const scenario = scenarioById.get(scenarioId);
    const tags = normalizeTags(scenario, test);

    const scenarioTitle = scenario?.title ?? test.title;
    const persona = scenario?.persona ?? "Unknown persona";
    const category = scenario?.category ?? "General";
    const mode = inferMode(scenario, test);
    const phaseId = inferPhaseId(scenario, scenarioId, tags);
    const projectName = inferProjectName(test);
    const browserName = inferBrowserName(test);
    const status = toMatrixStatus(result);
    const errorMessage = stripAnsi(firstErrorMessage(result));
    const evidencePaths = collectEvidencePaths(result);

    this.rows.push({
      runId: this.runId,
      runStartedAt: this.runStartedAt,
      scenarioId,
      scenarioTitle,
      persona,
      personaId: toPersonaId(persona),
      phaseId,
      category,
      mode,
      projectName,
      browserName,
      status,
      playwrightStatus: result.status,
      retry: result.retry ?? 0,
      durationMs: result.duration,
      errorMessage,
      tags,
      evidencePaths,
      timestamp: result.startTime ? result.startTime.toISOString() : toIsoTimestamp(this.nowIso),
    });
  }

  onEnd(_result: FullResult): void {
    const generatedAt = toIsoTimestamp(this.nowIso);
    const sortedRows = stableSortRows(this.rows);

    const totals = {
      total: sortedRows.length,
      pass: sortedRows.filter((row) => row.status === "pass").length,
      fail: sortedRows.filter((row) => row.status === "fail").length,
      warn: sortedRows.filter((row) => row.status === "warn").length,
      blocked: sortedRows.filter((row) => row.status === "blocked").length,
    };

    const payload = {
      schemaVersion: "1.0",
      generatedAt,
      runId: this.runId,
      runStartedAt: this.runStartedAt,
      totals,
      rows: sortedRows,
    };

    const stamp = toSafeStamp(this.runStartedAt);
    const jsonFileName = this.jsonFileName ?? `UAT_MATRIX_OUTCOMES_${stamp}.json`;
    const csvFileName = this.csvFileName ?? `UAT_MATRIX_OUTCOMES_${stamp}.csv`;

    fs.mkdirSync(this.outputDir, { recursive: true });
    fs.writeFileSync(path.join(this.outputDir, jsonFileName), JSON.stringify(payload, null, 2), "utf-8");
    fs.writeFileSync(path.join(this.outputDir, csvFileName), toCsv(sortedRows), "utf-8");
  }

  printsToStdio(): boolean {
    return false;
  }
}

export default UATMatrixReporter;
