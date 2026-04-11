#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(path.join(scriptDir, "..", ".."));
const ticketsDir = path.join(workspaceRoot, "tickets");
const archiveDate = new Date().toISOString().slice(0, 10).replace(/-/g, "");
const archiveDir = path.join(ticketsDir, "archive", archiveDate);

const archiveDuplicates = process.argv.includes("--archive-duplicates");

function normalizeErrorFingerprintSource(input) {
  return String(input || "")
    .replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, "")
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

function createFailureFingerprint(errorMessage) {
  const normalized = normalizeErrorFingerprintSource(errorMessage) || "unknown-error";
  return createHash("sha1").update(normalized).digest("hex").slice(0, 16);
}

function safeReadJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function parseDate(value) {
  const date = new Date(String(value || ""));
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function ticketProject(ticket) {
  const env = ticket.environment || {};
  return String(env.projectName || env.browserName || "unknown-project");
}

function ticketBrowser(ticket) {
  const env = ticket.environment || {};
  return String(env.browserName || "unknown-browser");
}

function ticketScenarioId(ticket) {
  return String(ticket.scenarioId || ticket.sourceCaseId || "unknown-scenario");
}

function ticketErrorMessage(ticket) {
  return String(ticket.errorMessage || ticket.actualResult || ticket.actual || "unknown-error");
}

function isTicketJsonFile(name) {
  return /^UAT-\d{3}.*\.json$/i.test(name);
}

function findMarkdownPair(fileName) {
  return fileName.replace(/\.json$/i, ".md");
}

if (!fs.existsSync(ticketsDir)) {
  throw new Error(`Tickets directory not found: ${ticketsDir}`);
}

const allJsonNames = fs.readdirSync(ticketsDir).filter((name) => isTicketJsonFile(name));
const ticketEntries = [];

for (const jsonName of allJsonNames) {
  const jsonPath = path.join(ticketsDir, jsonName);
  const ticket = safeReadJson(jsonPath);
  if (!ticket) {
    continue;
  }

  const scenarioId = ticketScenarioId(ticket);
  const browserName = ticketBrowser(ticket).toLowerCase();
  const projectName = ticketProject(ticket).toLowerCase();
  const failureFingerprint = createFailureFingerprint(ticketErrorMessage(ticket));
  const canonicalKey = [scenarioId, failureFingerprint, browserName, projectName].join("|");

  ticketEntries.push({
    jsonName,
    jsonPath,
    mdName: findMarkdownPair(jsonName),
    mdPath: path.join(ticketsDir, findMarkdownPair(jsonName)),
    ticket,
    scenarioId,
    browserName,
    projectName,
    failureFingerprint,
    canonicalKey,
    createdAt: String(ticket.createdAt || ""),
    createdDate: parseDate(ticket.createdAt),
  });
}

const groups = new Map();
for (const entry of ticketEntries) {
  if (!groups.has(entry.canonicalKey)) {
    groups.set(entry.canonicalKey, []);
  }
  groups.get(entry.canonicalKey).push(entry);
}

const canonicalEntries = [];
const duplicateEntries = [];

for (const [canonicalKey, entries] of groups.entries()) {
  entries.sort((a, b) => a.createdDate.getTime() - b.createdDate.getTime());
  const canonical = entries[0];
  const duplicates = entries.slice(1);

  canonicalEntries.push({
    canonicalKey,
    canonicalJson: canonical.jsonName,
    canonicalCreatedAt: canonical.createdAt,
    scenarioId: canonical.scenarioId,
    browserName: canonical.browserName,
    projectName: canonical.projectName,
    failureFingerprint: canonical.failureFingerprint,
    duplicates: duplicates.map((item) => item.jsonName),
    duplicateCount: duplicates.length,
  });

  for (const dup of duplicates) {
    duplicateEntries.push(dup);
  }
}

canonicalEntries.sort((a, b) => b.duplicateCount - a.duplicateCount || a.canonicalKey.localeCompare(b.canonicalKey));

if (archiveDuplicates && duplicateEntries.length > 0) {
  fs.mkdirSync(archiveDir, { recursive: true });

  for (const dup of duplicateEntries) {
    const archiveJsonPath = path.join(archiveDir, dup.jsonName);
    if (fs.existsSync(dup.jsonPath)) {
      fs.renameSync(dup.jsonPath, archiveJsonPath);
    }

    if (fs.existsSync(dup.mdPath)) {
      const archiveMdPath = path.join(archiveDir, dup.mdName);
      fs.renameSync(dup.mdPath, archiveMdPath);
    }
  }
}

const stamp = new Date().toISOString().slice(0, 10);
const indexJsonPath = path.join(ticketsDir, `CANONICAL_TICKET_INDEX_${stamp}.json`);
const indexMdPath = path.join(ticketsDir, `CANONICAL_TICKET_INDEX_${stamp}.md`);

const indexPayload = {
  schemaVersion: "1.0",
  generatedAt: new Date().toISOString(),
  sourceDirectory: ticketsDir,
  mode: archiveDuplicates ? "archive-duplicates" : "index-only",
  totals: {
    ticketFilesScanned: ticketEntries.length,
    canonicalKeys: canonicalEntries.length,
    duplicateFiles: duplicateEntries.length,
  },
  canonicalEntries,
};

fs.writeFileSync(indexJsonPath, `${JSON.stringify(indexPayload, null, 2)}\n`, "utf8");

const markdownLines = [
  "# Canonical Ticket Index",
  "",
  `- Generated At: ${indexPayload.generatedAt}`,
  `- Mode: ${indexPayload.mode}`,
  `- Ticket Files Scanned: ${indexPayload.totals.ticketFilesScanned}`,
  `- Canonical Keys: ${indexPayload.totals.canonicalKeys}`,
  `- Duplicate Files: ${indexPayload.totals.duplicateFiles}`,
  "",
  "## Highest Duplicate Buckets",
  "",
];

for (const row of canonicalEntries.slice(0, 25)) {
  markdownLines.push(
    `- ${row.scenarioId} | ${row.projectName} | dup=${row.duplicateCount} | canonical=${row.canonicalJson}`,
  );
}

if (archiveDuplicates) {
  markdownLines.push("", "## Archive", "", `- Archive Directory: ${archiveDir}`);
}

fs.writeFileSync(indexMdPath, `${markdownLines.join("\n")}\n`, "utf8");

console.log(`Canonical index written: ${indexJsonPath}`);
console.log(`Canonical summary written: ${indexMdPath}`);
if (archiveDuplicates) {
  console.log(`Duplicates archived: ${duplicateEntries.length}`);
}
