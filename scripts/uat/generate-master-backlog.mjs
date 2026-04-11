#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const SEVERITY_ORDER = ["critical", "high", "medium", "low"];
const PRIORITY_ORDER = ["p0", "p1", "p2", "p3"];
const TYPE_ORDER = ["BUG", "UX", "ENHANCE", "FEAT"];

function parseArgs(argv) {
  const options = {};

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }

    const equalIndex = token.indexOf("=");
    if (equalIndex > -1) {
      const key = token.slice(2, equalIndex);
      const value = token.slice(equalIndex + 1);
      options[key] = value;
      continue;
    }

    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      options[key] = next;
      i += 1;
    } else {
      options[key] = "true";
    }
  }

  return options;
}

function toIsoTimestamp(overrideIso) {
  if (overrideIso) {
    const parsed = new Date(overrideIso);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return new Date().toISOString();
}

function normalizeString(value, fallback = "") {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return fallback;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item).trim()).filter(Boolean);
}

function toPersonaId(persona) {
  const caseMatch = String(persona).match(/\bP(\d{1,2})\b/i);
  if (caseMatch) {
    return `P${caseMatch[1].padStart(2, "0")}`;
  }

  const normalized = String(persona)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "unknown-persona";
}

function normalizeType(value) {
  const upper = String(value || "").toUpperCase();
  if (TYPE_ORDER.includes(upper)) {
    return upper;
  }
  return null;
}

function normalizeSeverity(value) {
  const lower = String(value || "").toLowerCase();
  if (SEVERITY_ORDER.includes(lower)) {
    return lower;
  }
  return null;
}

function normalizePriority(value) {
  const lower = String(value || "").toLowerCase();
  if (PRIORITY_ORDER.includes(lower)) {
    return lower;
  }
  return null;
}

function clampScore(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 1;
  }
  return Math.min(5, Math.max(1, Math.round(numeric)));
}

function deriveSeverityFromRisk(riskScore) {
  if (riskScore >= 75) {
    return "critical";
  }
  if (riskScore >= 45) {
    return "high";
  }
  if (riskScore >= 20) {
    return "medium";
  }
  return "low";
}

function derivePriorityFromSeverity(severity) {
  if (severity === "critical") {
    return "p0";
  }
  if (severity === "high") {
    return "p1";
  }
  if (severity === "medium") {
    return "p2";
  }
  return "p3";
}

function inferTypeFromLegacy(raw) {
  const text = [raw?.category, raw?.scenarioTitle, raw?.stepsSummary, raw?.errorMessage, raw?.actualResult]
    .map((item) => normalizeString(item))
    .join(" ")
    .toLowerCase();

  if (/ux|usability|a11y|accessibility|friction/.test(text)) {
    return "UX";
  }
  if (/missing feature|feature request|not implemented|unsupported/.test(text)) {
    return "FEAT";
  }
  if (/enhance|improve|optimization|performance/.test(text)) {
    return "ENHANCE";
  }
  return "BUG";
}

function inferPhaseId(raw) {
  const text = [raw?.phaseId, raw?.category, raw?.scenarioTitle, raw?.stepsSummary, ...(raw?.tags ?? [])]
    .map((item) => normalizeString(item))
    .join(" ")
    .toLowerCase();

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

function extractCaseIdFromFileName(fileName) {
  const match = fileName.match(/(UAT-\d{3})/i);
  if (match) {
    return match[1].toUpperCase();
  }
  return null;
}

function extractIsoFromFileName(fileName) {
  const match = fileName.match(/(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})(?:-(\d{3}))?Z/i);
  if (!match) {
    return null;
  }

  const date = match[1];
  const hh = match[2];
  const mm = match[3];
  const ss = match[4];
  const ms = match[5] ?? "000";
  return `${date}T${hh}:${mm}:${ss}.${ms}Z`;
}

function safeReadJson(filePath) {
  try {
    const rawText = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(rawText);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed;
  } catch (_error) {
    return null;
  }
}

function isLikelyTicketFile(fileName, raw) {
  const lower = fileName.toLowerCase();
  if (!lower.endsWith(".json")) {
    return false;
  }

  if (lower.startsWith("uat_master_backlog_") || lower.startsWith("uat_matrix_outcomes_")) {
    return false;
  }

  if (/^uat-\d{3}-.+\.json$/i.test(fileName)) {
    return true;
  }

  if (Array.isArray(raw?.rows) && raw?.runId) {
    return false;
  }

  return Boolean(raw?.scenarioId || raw?.sourceCaseId || raw?.triage?.sourceCaseId || String(raw?.id || "").startsWith("T-"));
}

function buildScoring(raw, type, mode) {
  const existing = raw?.scoring ?? raw?.triage?.scoring ?? {};

  const impactFallbackByType = {
    BUG: 5,
    UX: 4,
    FEAT: 3,
    ENHANCE: 2,
  };

  const impactScore = clampScore(existing?.impactScore ?? impactFallbackByType[type] ?? 3);
  const frequencyScore = clampScore(existing?.frequencyScore ?? 3);
  const personaVulnerabilityScore = clampScore(existing?.personaVulnerabilityScore ?? (mode === "beginner" ? 4 : 2));

  let riskScore = Number(existing?.riskScore);
  if (!Number.isFinite(riskScore) || riskScore <= 0) {
    riskScore = impactScore * frequencyScore * personaVulnerabilityScore;
  }

  return {
    impactScore,
    frequencyScore,
    personaVulnerabilityScore,
    riskScore,
  };
}

function normalizeTicket(raw, fileName) {
  const sourceCaseId =
    normalizeString(raw?.sourceCaseId) ||
    normalizeString(raw?.triage?.sourceCaseId) ||
    normalizeString(raw?.scenarioId) ||
    extractCaseIdFromFileName(fileName) ||
    "UNKNOWN";

  const scenarioTitle = normalizeString(raw?.scenarioTitle, sourceCaseId);
  const persona = normalizeString(raw?.persona, "Unknown persona");
  const personaId =
    normalizeString(raw?.personaId) ||
    normalizeString(raw?.triage?.personaId) ||
    toPersonaId(persona);

  const category =
    normalizeString(raw?.category) ||
    normalizeString(raw?.triage?.category) ||
    "General";

  const mode = normalizeString(raw?.mode, "beginner").toLowerCase() === "power" ? "power" : "beginner";

  const inferredType = inferTypeFromLegacy(raw);
  const type =
    normalizeType(raw?.type) ||
    normalizeType(raw?.triage?.type) ||
    inferredType;

  const scoring = buildScoring(raw, type, mode);

  const inferredSeverity = deriveSeverityFromRisk(scoring.riskScore);
  const severity =
    normalizeSeverity(raw?.severity) ||
    normalizeSeverity(raw?.triage?.severity) ||
    inferredSeverity;

  const priority =
    normalizePriority(raw?.priority) ||
    normalizePriority(raw?.triage?.priority) ||
    derivePriorityFromSeverity(severity);

  const phaseId =
    normalizeString(raw?.phaseId) ||
    normalizeString(raw?.triage?.phaseId) ||
    inferPhaseId({ ...raw, phaseId: raw?.phaseId, tags: raw?.tags ?? raw?.triage?.tags ?? [] });

  const expected =
    normalizeString(raw?.expected) ||
    normalizeString(raw?.triage?.expected) ||
    normalizeString(raw?.expectedSummary);

  const actual =
    normalizeString(raw?.actual) ||
    normalizeString(raw?.triage?.actual) ||
    normalizeString(raw?.actualResult) ||
    normalizeString(raw?.errorMessage);

  const summary =
    normalizeString(raw?.summary) ||
    normalizeString(raw?.triage?.summary) ||
    `${type}: ${sourceCaseId} ${scenarioTitle} - ${actual || "No actual result captured."}`;

  const reproSteps =
    normalizeStringArray(raw?.reproSteps).length > 0
      ? normalizeStringArray(raw?.reproSteps)
      : normalizeStringArray(raw?.triage?.reproSteps).length > 0
      ? normalizeStringArray(raw?.triage?.reproSteps)
      : normalizeStringArray(raw?.detailedSteps).length > 0
      ? normalizeStringArray(raw?.detailedSteps)
      : normalizeString(raw?.stepsSummary)
      ? [normalizeString(raw?.stepsSummary)]
      : [`Execute scenario ${sourceCaseId}.`];

  const recommendation =
    normalizeString(raw?.recommendation) ||
    normalizeString(raw?.triage?.recommendation) ||
    `Investigate and resolve ${type} issues in ${category}.`;

  const acceptanceCriteria =
    normalizeStringArray(raw?.acceptanceCriteria).length > 0
      ? normalizeStringArray(raw?.acceptanceCriteria)
      : normalizeStringArray(raw?.triage?.acceptanceCriteria).length > 0
      ? normalizeStringArray(raw?.triage?.acceptanceCriteria)
      : [
          `Scenario ${sourceCaseId} completes without blocking errors.`,
          expected ? `Expected behavior is satisfied: ${expected}` : "Expected behavior is satisfied.",
        ];

  const evidenceCandidates = [
    ...normalizeStringArray(raw?.evidence),
    ...normalizeStringArray(raw?.triage?.evidence),
    normalizeString(raw?.screenshotPath),
  ].filter(Boolean);
  const evidence = Array.from(new Set(evidenceCandidates));

  const tags = Array.from(
    new Set([
      ...normalizeStringArray(raw?.tags),
      ...normalizeStringArray(raw?.triage?.tags),
    ]),
  );

  const fileTimestamp = extractIsoFromFileName(fileName);
  const createdAtRaw = normalizeString(raw?.createdAt) || fileTimestamp || "1970-01-01T00:00:00.000Z";
  const createdAt = toIsoTimestamp(createdAtRaw);

  const id = normalizeString(raw?.id, `T-${sourceCaseId}-${path.basename(fileName, ".json")}`);

  return {
    id,
    sourceCaseId,
    scenarioTitle,
    persona,
    personaId,
    phaseId,
    type,
    severity,
    priority,
    category,
    summary,
    reproSteps,
    expected,
    actual,
    evidence,
    recommendation,
    acceptanceCriteria,
    scoring,
    tags,
    mode,
    createdAt,
    artifactFile: fileName,
    schemaOrigin: normalizeString(raw?.schemaVersion) ? "v2" : "legacy",
  };
}

function extractScenarioNumber(caseId) {
  const match = String(caseId).match(/UAT-(\d+)/i);
  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function compareTickets(a, b) {
  const severityDiff = SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
  if (severityDiff !== 0) {
    return severityDiff;
  }

  const priorityDiff = PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority);
  if (priorityDiff !== 0) {
    return priorityDiff;
  }

  const riskDiff = b.scoring.riskScore - a.scoring.riskScore;
  if (riskDiff !== 0) {
    return riskDiff;
  }

  const caseDiff = extractScenarioNumber(a.sourceCaseId) - extractScenarioNumber(b.sourceCaseId);
  if (caseDiff !== 0) {
    return caseDiff;
  }

  const idDiff = String(a.sourceCaseId).localeCompare(String(b.sourceCaseId));
  if (idDiff !== 0) {
    return idDiff;
  }

  return String(a.id).localeCompare(String(b.id));
}

function buildTotals(tickets) {
  const bySeverity = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  const byPriority = {
    p0: 0,
    p1: 0,
    p2: 0,
    p3: 0,
  };

  const byType = {
    BUG: 0,
    UX: 0,
    ENHANCE: 0,
    FEAT: 0,
  };

  for (const ticket of tickets) {
    bySeverity[ticket.severity] += 1;
    byPriority[ticket.priority] += 1;
    byType[ticket.type] += 1;
  }

  return {
    tickets: tickets.length,
    bySeverity,
    byPriority,
    byType,
  };
}

function groupBySeverityAndPriority(tickets) {
  const groups = {};

  for (const severity of SEVERITY_ORDER) {
    groups[severity] = {};
    for (const priority of PRIORITY_ORDER) {
      groups[severity][priority] = [];
    }
  }

  for (const ticket of tickets) {
    groups[ticket.severity][ticket.priority].push(ticket);
  }

  return groups;
}

function buildMarkdown(payload) {
  const lines = [];

  lines.push("# FitOne UAT Master Backlog");
  lines.push("");
  lines.push(`Generated At: ${payload.generatedAt}`);
  lines.push(`Source Directory: ${payload.sourceDirectory}`);
  lines.push("");
  lines.push("## Totals");
  lines.push("");
  lines.push(`- Total Tickets: ${payload.totals.tickets}`);
  lines.push(`- BUG: ${payload.totals.byType.BUG}`);
  lines.push(`- UX: ${payload.totals.byType.UX}`);
  lines.push(`- ENHANCE: ${payload.totals.byType.ENHANCE}`);
  lines.push(`- FEAT: ${payload.totals.byType.FEAT}`);
  lines.push(`- Critical: ${payload.totals.bySeverity.critical}`);
  lines.push(`- High: ${payload.totals.bySeverity.high}`);
  lines.push(`- Medium: ${payload.totals.bySeverity.medium}`);
  lines.push(`- Low: ${payload.totals.bySeverity.low}`);
  lines.push("");

  lines.push("## Severity and Priority Groups");
  lines.push("");

  for (const severity of SEVERITY_ORDER) {
    lines.push(`### ${severity.toUpperCase()}`);
    lines.push("");

    let severityHasRows = false;

    for (const priority of PRIORITY_ORDER) {
      const items = payload.groups.bySeverityPriority[severity][priority];
      if (items.length === 0) {
        continue;
      }

      severityHasRows = true;
      lines.push(`#### ${priority.toUpperCase()} (${items.length})`);
      lines.push("");

      for (const ticket of items) {
        lines.push(
          `- ${ticket.id} | ${ticket.type} | ${ticket.sourceCaseId} | ${ticket.category} | ${ticket.summary} | risk=${ticket.scoring.riskScore} | persona=${ticket.personaId} | phase=${ticket.phaseId}`,
        );
      }

      lines.push("");
    }

    if (!severityHasRows) {
      lines.push("- None");
      lines.push("");
    }
  }

  lines.push("## Ticket Catalog");
  lines.push("");
  lines.push("| ID | Type | Severity | Priority | Case | Category | Persona | Phase | Created At |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- |");

  for (const ticket of payload.tickets) {
    lines.push(
      `| ${ticket.id} | ${ticket.type} | ${ticket.severity} | ${ticket.priority} | ${ticket.sourceCaseId} | ${ticket.category} | ${ticket.personaId} | ${ticket.phaseId} | ${ticket.createdAt} |`,
    );
  }

  lines.push("");

  return lines.join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const cwd = process.cwd();
  const sourceDirectory = path.resolve(cwd, args.sourceDir ?? "tickets");
  const outputDirectory = path.resolve(cwd, args.outputDir ?? sourceDirectory);
  const generatedAt = toIsoTimestamp(args.nowIso ?? process.env.UAT_NOW_ISO);
  const dateStamp = generatedAt.slice(0, 10);

  const markdownFileName = args.mdFileName ?? `UAT_MASTER_BACKLOG_${dateStamp}.md`;
  const jsonFileName = args.jsonFileName ?? `UAT_MASTER_BACKLOG_${dateStamp}.json`;

  if (!fs.existsSync(sourceDirectory) || !fs.statSync(sourceDirectory).isDirectory()) {
    throw new Error(`Ticket source directory does not exist: ${sourceDirectory}`);
  }

  const entries = fs.readdirSync(sourceDirectory, { withFileTypes: true });
  const rawTickets = [];

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const fileName = entry.name;
    if (!fileName.toLowerCase().endsWith(".json")) {
      continue;
    }

    const filePath = path.join(sourceDirectory, fileName);
    const raw = safeReadJson(filePath);
    if (!raw) {
      continue;
    }

    if (!isLikelyTicketFile(fileName, raw)) {
      continue;
    }

    rawTickets.push(normalizeTicket(raw, fileName));
  }

  const tickets = rawTickets.sort(compareTickets);
  const totals = buildTotals(tickets);
  const bySeverityPriority = groupBySeverityAndPriority(tickets);

  const groupsByType = {};
  for (const type of TYPE_ORDER) {
    groupsByType[type] = tickets.filter((ticket) => ticket.type === type).map((ticket) => ticket.id);
  }

  const payload = {
    schemaVersion: "1.0",
    generatedAt,
    sourceDirectory,
    totals,
    groups: {
      bySeverityPriority,
      byType: groupsByType,
    },
    tickets,
  };

  const markdown = buildMarkdown(payload);

  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(path.join(outputDirectory, jsonFileName), JSON.stringify(payload, null, 2), "utf-8");
  fs.writeFileSync(path.join(outputDirectory, markdownFileName), markdown, "utf-8");

  process.stdout.write(
    `Generated master backlog with ${tickets.length} tickets:\n` +
      `- ${path.join(outputDirectory, jsonFileName)}\n` +
      `- ${path.join(outputDirectory, markdownFileName)}\n`,
  );
}

main();
