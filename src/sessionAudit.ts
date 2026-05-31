import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";

export type SessionAuditStatus = "pass" | "warn" | "fail";
export type SessionAuditSeverity = "warning" | "error";

export interface SessionAuditOptions {
  largeFileBytes?: number;
  hugeLineBytes?: number;
}

export interface SessionAuditFile {
  path: string;
  sizeBytes: number;
  lineCount: number;
  largestLineBytes: number;
  jsonParseErrors: number;
  recordTypes: Record<string, number>;
  signalCounts: Record<string, number>;
}

export interface SessionAuditStateFile {
  path: string;
  sizeBytes: number;
  present: boolean;
}

export interface SessionAuditFinding {
  severity: SessionAuditSeverity;
  kind: "large_rollout" | "huge_jsonl_line" | "json_parse_error" | "short_session_index" | "state_file_present";
  path?: string;
  message: string;
}

export interface SessionAuditResult {
  generatedAt: string;
  root: string;
  status: SessionAuditStatus;
  thresholds: {
    largeFileBytes: number;
    hugeLineBytes: number;
  };
  summary: {
    jsonlFiles: number;
    totalBytes: number;
    largeFiles: number;
    hugeLineFiles: number;
    parseErrorFiles: number;
    sessionIndexLines?: number;
    rolloutFiles?: number;
  };
  files: SessionAuditFile[];
  stateFiles: SessionAuditStateFile[];
  findings: SessionAuditFinding[];
}

const DEFAULT_LARGE_FILE_BYTES = 10 * 1024 * 1024;
const DEFAULT_HUGE_LINE_BYTES = 512 * 1024;
const STATE_FILE_NAMES = new Set(["state_5.sqlite", "goals_1.sqlite", ".codex-global-state.json", "session_index.jsonl"]);

export async function auditCodexSessions(target = defaultCodexHome(), options: SessionAuditOptions = {}): Promise<SessionAuditResult> {
  const root = path.resolve(expandHome(target));
  const thresholds = {
    largeFileBytes: options.largeFileBytes ?? DEFAULT_LARGE_FILE_BYTES,
    hugeLineBytes: options.hugeLineBytes ?? DEFAULT_HUGE_LINE_BYTES
  };
  const discovered = await discoverCodexFiles(root);
  const files: SessionAuditFile[] = [];

  for (const file of discovered.jsonlFiles) {
    files.push(await analyzeJsonlFile(file, root));
  }

  const stateFiles = await Promise.all(discovered.stateFiles.map((file) => stateFileInfo(file, root)));
  const findings = buildFindings(files, stateFiles, thresholds);
  const sessionIndex = files.find((file) => path.basename(file.path) === "session_index.jsonl");
  const rolloutFiles = files.filter((file) => path.basename(file.path).startsWith("rollout-")).length;
  const summary = {
    jsonlFiles: files.length,
    totalBytes: files.reduce((sum, file) => sum + file.sizeBytes, 0),
    largeFiles: files.filter((file) => file.sizeBytes >= thresholds.largeFileBytes).length,
    hugeLineFiles: files.filter((file) => file.largestLineBytes >= thresholds.hugeLineBytes).length,
    parseErrorFiles: files.filter((file) => file.jsonParseErrors > 0).length,
    sessionIndexLines: sessionIndex?.lineCount,
    rolloutFiles
  };

  return {
    generatedAt: new Date().toISOString(),
    root,
    status: statusForFindings(findings),
    thresholds,
    summary,
    files: files.sort((a, b) => b.sizeBytes - a.sizeBytes),
    stateFiles,
    findings
  };
}

export function renderSessionAuditMarkdown(result: SessionAuditResult): string {
  const lines = [
    "# trace-to-skill Codex Session Audit",
    "",
    `Status: **${result.status}**`,
    "",
    `Root: \`${result.root}\``,
    `JSONL files: ${result.summary.jsonlFiles}`,
    `Rollout files: ${result.summary.rolloutFiles ?? 0}`,
    `Total JSONL bytes: ${result.summary.totalBytes}`,
    `Large files: ${result.summary.largeFiles}`,
    `Huge-line files: ${result.summary.hugeLineFiles}`,
    `Parse-error files: ${result.summary.parseErrorFiles}`,
    ""
  ];

  if (result.findings.length > 0) {
    lines.push("## Findings", "");
    for (const finding of result.findings) {
      const location = finding.path ? ` \`${finding.path}\`` : "";
      lines.push(`- **${finding.severity}** ${finding.kind}${location}: ${finding.message}`);
    }
    lines.push("");
  }

  lines.push("## Largest JSONL Files", "");
  const largest = result.files.slice(0, 10);
  if (largest.length === 0) {
    lines.push("No JSONL files found.", "");
  } else {
    lines.push("| File | Size | Lines | Largest line | Parse errors | Signals |");
    lines.push("| --- | ---: | ---: | ---: | ---: | --- |");
    for (const file of largest) {
      lines.push([
        `| \`${file.path}\``,
        `${file.sizeBytes}`,
        `${file.lineCount}`,
        `${file.largestLineBytes}`,
        `${file.jsonParseErrors}`,
        formatSignals(file.signalCounts),
        "|"
      ].join(" "));
    }
    lines.push("");
  }

  lines.push("## State Files", "");
  if (result.stateFiles.length === 0) {
    lines.push("No Codex state files found under this root.", "");
  } else {
    for (const file of result.stateFiles) {
      lines.push(`- \`${file.path}\`: ${file.present ? `${file.sizeBytes} bytes` : "missing"}`);
    }
    lines.push("");
  }

  lines.push(
    "Suggested next step:",
    "",
    "- If this report shows large rollout files or parse errors, attach this JSON/Markdown summary to the Codex issue instead of publishing private transcripts.",
    "- If `codex resume <id>` works but the picker freezes, include the largest file sizes and line counts from this report.",
    ""
  );

  return lines.join("\n");
}

async function discoverCodexFiles(root: string): Promise<{ jsonlFiles: string[]; stateFiles: string[] }> {
  const jsonlFiles: string[] = [];
  const stateFiles: string[] = [];

  async function walk(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") {
        continue;
      }

      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (entry.name.endsWith(".jsonl")) {
        jsonlFiles.push(fullPath);
      }

      if (STATE_FILE_NAMES.has(entry.name)) {
        stateFiles.push(fullPath);
      }
    }
  }

  await walk(root);
  return { jsonlFiles, stateFiles };
}

async function analyzeJsonlFile(filePath: string, root: string): Promise<SessionAuditFile> {
  const fileStat = await stat(filePath);
  const recordTypes: Record<string, number> = {};
  const signalCounts: Record<string, number> = {};
  let lineCount = 0;
  let largestLineBytes = 0;
  let jsonParseErrors = 0;

  const input = createReadStream(filePath, { encoding: "utf8" });
  const reader = readline.createInterface({ input, crlfDelay: Infinity });

  for await (const line of reader) {
    lineCount += 1;
    largestLineBytes = Math.max(largestLineBytes, Buffer.byteLength(line, "utf8"));
    countRawSignals(line, signalCounts);

    if (!line.trim()) {
      continue;
    }

    try {
      const parsed = JSON.parse(line) as unknown;
      countParsedRecord(parsed, recordTypes, signalCounts);
    } catch {
      jsonParseErrors += 1;
    }
  }

  return {
    path: path.relative(root, filePath) || path.basename(filePath),
    sizeBytes: fileStat.size,
    lineCount,
    largestLineBytes,
    jsonParseErrors,
    recordTypes,
    signalCounts
  };
}

async function stateFileInfo(filePath: string, root: string): Promise<SessionAuditStateFile> {
  const fileStat = await stat(filePath);
  return {
    path: path.relative(root, filePath) || path.basename(filePath),
    sizeBytes: fileStat.size,
    present: true
  };
}

function buildFindings(
  files: SessionAuditFile[],
  stateFiles: SessionAuditStateFile[],
  thresholds: { largeFileBytes: number; hugeLineBytes: number }
): SessionAuditFinding[] {
  const findings: SessionAuditFinding[] = [];
  const rolloutFiles = files.filter((file) => path.basename(file.path).startsWith("rollout-"));
  const sessionIndex = files.find((file) => path.basename(file.path) === "session_index.jsonl");

  for (const file of files) {
    if (file.sizeBytes >= thresholds.largeFileBytes) {
      findings.push({
        severity: "error",
        kind: "large_rollout",
        path: file.path,
        message: `JSONL file is ${file.sizeBytes} bytes, above the ${thresholds.largeFileBytes} byte large-file threshold.`
      });
    }

    if (file.largestLineBytes >= thresholds.hugeLineBytes) {
      findings.push({
        severity: "error",
        kind: "huge_jsonl_line",
        path: file.path,
        message: `Largest JSONL line is ${file.largestLineBytes} bytes, above the ${thresholds.hugeLineBytes} byte threshold.`
      });
    }

    if (file.jsonParseErrors > 0) {
      findings.push({
        severity: "error",
        kind: "json_parse_error",
        path: file.path,
        message: `${file.jsonParseErrors} JSONL line(s) could not be parsed.`
      });
    }
  }

  if (sessionIndex && rolloutFiles.length > 0 && sessionIndex.lineCount < rolloutFiles.length) {
    findings.push({
      severity: "warning",
      kind: "short_session_index",
      path: sessionIndex.path,
      message: `session_index.jsonl has ${sessionIndex.lineCount} lines for ${rolloutFiles.length} rollout file(s); this can indicate an incomplete sidebar index.`
    });
  }

  for (const stateFile of stateFiles.filter((file) => file.path.endsWith(".sqlite"))) {
    findings.push({
      severity: "warning",
      kind: "state_file_present",
      path: stateFile.path,
      message: "SQLite state file is present; include counts/schema output from a local sqlite tool if filing a Codex history/index issue."
    });
  }

  return findings;
}

function countRawSignals(line: string, signalCounts: Record<string, number>): void {
  for (const [key, pattern] of [
    ["input_image", /input_image/g],
    ["function_call", /function_call/g],
    ["tool_call", /tool_call/g],
    ["thread_resume", /thread\/resume/g],
    ["thread_goal", /thread\/goal\/get|thread_goals/g],
    ["item_not_found", /Item not found in turn state/g]
  ] as const) {
    const matches = line.match(pattern);
    if (matches) {
      signalCounts[key] = (signalCounts[key] ?? 0) + matches.length;
    }
  }
}

function countParsedRecord(parsed: unknown, recordTypes: Record<string, number>, signalCounts: Record<string, number>): void {
  if (!parsed || typeof parsed !== "object") {
    return;
  }

  const object = parsed as Record<string, unknown>;
  const type = typeof object.type === "string" ? object.type : "json";
  recordTypes[type] = (recordTypes[type] ?? 0) + 1;

  const item = object.item && typeof object.item === "object" ? object.item as Record<string, unknown> : undefined;
  const itemType = typeof item?.type === "string" ? item.type : undefined;
  if (itemType) {
    signalCounts[itemType] = (signalCounts[itemType] ?? 0) + 1;
  }
}

function statusForFindings(findings: SessionAuditFinding[]): SessionAuditStatus {
  if (findings.some((finding) => finding.severity === "error")) {
    return "fail";
  }

  return findings.length > 0 ? "warn" : "pass";
}

function formatSignals(signals: Record<string, number>): string {
  const entries = Object.entries(signals).filter(([, count]) => count > 0);
  if (entries.length === 0) {
    return "none";
  }

  return entries.map(([key, count]) => `${key}:${count}`).join(", ");
}

function defaultCodexHome(): string {
  return path.join(os.homedir(), ".codex");
}

function expandHome(input: string): string {
  if (input === "~") {
    return os.homedir();
  }

  if (input.startsWith("~/")) {
    return path.join(os.homedir(), input.slice(2));
  }

  return input;
}
