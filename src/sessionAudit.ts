import { createHash } from "node:crypto";
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
  session?: SessionAuditThreadMetadata;
}

export interface SessionAuditThreadMetadata {
  id: string;
  createdAt?: string;
  cwdBasename?: string;
  cwdHash?: string;
  originator?: string;
  cliVersion?: string;
  sourceKind?: string;
}

export interface SessionAuditStateFile {
  path: string;
  sizeBytes: number;
  present: boolean;
}

export interface SessionAuditFinding {
  severity: SessionAuditSeverity;
  kind: "large_rollout" | "huge_jsonl_line" | "json_parse_error" | "short_session_index" | "unindexed_rollout_thread" | "bloated_index_title" | "state_file_present";
  path?: string;
  message: string;
}

export interface SessionAuditThread {
  id: string;
  path: string;
  indexed: boolean;
  indexTitle?: string;
  indexTitleBytes?: number;
  indexTitleSignals?: string[];
  indexUpdatedAt?: string;
  createdAt?: string;
  cwdBasename?: string;
  cwdHash?: string;
  originator?: string;
  cliVersion?: string;
  sourceKind?: string;
  recoverCommand: string;
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
    rolloutThreads: number;
    indexedThreads: number;
    unindexedRolloutThreads: number;
    bloatedIndexTitles: number;
    projectRoots: number;
  };
  files: SessionAuditFile[];
  threads: SessionAuditThread[];
  stateFiles: SessionAuditStateFile[];
  findings: SessionAuditFinding[];
}

const DEFAULT_LARGE_FILE_BYTES = 10 * 1024 * 1024;
const DEFAULT_HUGE_LINE_BYTES = 512 * 1024;
const INDEX_TITLE_BLOAT_BYTES = 240;
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

  const sessionIndex = files.find((file) => path.basename(file.path) === "session_index.jsonl");
  const indexEntries = sessionIndex ? await readSessionIndex(path.join(root, sessionIndex.path)) : new Map<string, SessionIndexEntry>();
  const threads = buildThreads(files, indexEntries);
  const stateFiles = await Promise.all(discovered.stateFiles.map((file) => stateFileInfo(file, root)));
  const findings = buildFindings(files, threads, stateFiles, thresholds);
  const rolloutFiles = files.filter((file) => path.basename(file.path).startsWith("rollout-")).length;
  const projectKeys = new Set(threads.map((thread) => thread.cwdHash).filter(Boolean));
  const summary = {
    jsonlFiles: files.length,
    totalBytes: files.reduce((sum, file) => sum + file.sizeBytes, 0),
    largeFiles: files.filter((file) => file.sizeBytes >= thresholds.largeFileBytes).length,
    hugeLineFiles: files.filter((file) => file.largestLineBytes >= thresholds.hugeLineBytes).length,
    parseErrorFiles: files.filter((file) => file.jsonParseErrors > 0).length,
    sessionIndexLines: sessionIndex?.lineCount,
    rolloutFiles,
    rolloutThreads: threads.length,
    indexedThreads: threads.filter((thread) => thread.indexed).length,
    unindexedRolloutThreads: threads.filter((thread) => !thread.indexed).length,
    bloatedIndexTitles: threads.filter((thread) => (thread.indexTitleSignals?.length ?? 0) > 0).length,
    projectRoots: projectKeys.size
  };

  return {
    generatedAt: new Date().toISOString(),
    root,
    status: statusForFindings(findings),
    thresholds,
    summary,
    files: files.sort((a, b) => b.sizeBytes - a.sizeBytes),
    threads,
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
    `Rollout threads: ${result.summary.rolloutThreads}`,
    `Indexed threads: ${result.summary.indexedThreads}`,
    `Unindexed rollout threads: ${result.summary.unindexedRolloutThreads}`,
    `Bloated index titles: ${result.summary.bloatedIndexTitles}`,
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

  lines.push("## Recoverable Thread Index", "");
  if (result.threads.length === 0) {
    lines.push("No rollout session metadata found.", "");
  } else {
    lines.push("| Indexed | Thread id | Project | Created | Index title | Title bytes/signals | Resume |");
    lines.push("| --- | --- | --- | --- | --- | --- | --- |");
    for (const thread of result.threads.slice(0, 25)) {
      const project = [thread.cwdBasename, thread.cwdHash].filter(Boolean).join(" ");
      const titleSignals = [
        thread.indexTitleBytes === undefined ? undefined : `${thread.indexTitleBytes}b`,
        ...(thread.indexTitleSignals ?? [])
      ].filter(Boolean).join(", ");
      lines.push([
        String(thread.indexed),
        `\`${thread.id}\``,
        project || "",
        thread.createdAt ?? "",
        previewTitle(thread.indexTitle),
        titleSignals,
        `\`${thread.recoverCommand}\``
      ].map(escapeCell).join(" | ").replace(/^/, "| ").replace(/$/, " |"));
    }
    lines.push("");
    lines.push("This table intentionally avoids printing full workspace paths. `cwdHash` is a short hash of the original path so related threads can be grouped without exposing local directories.", "");
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
    "- If project history/search is empty but this report lists unindexed rollout threads, try `codex resume <thread_id>` locally and include the unindexed count plus affected hashed project group in the issue.",
    "- If sidebar titles contain transcript chunks, include the `bloated_index_title` finding and title byte/signal counts instead of posting the full title text.",
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
  let session: SessionAuditThreadMetadata | undefined;

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
      session ??= extractSessionMetadata(parsed);
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
    signalCounts,
    session
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
  threads: SessionAuditThread[],
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

  if (sessionIndex) {
    for (const thread of threads.filter((item) => !item.indexed).slice(0, 10)) {
      findings.push({
        severity: "warning",
        kind: "unindexed_rollout_thread",
        path: thread.path,
        message: `Rollout thread ${thread.id} has session metadata but no matching session_index.jsonl row; project/search UI may hide it while direct resume can still work.`
      });
    }
  }

  for (const thread of threads.filter((item) => (item.indexTitleSignals?.length ?? 0) > 0).slice(0, 10)) {
    findings.push({
      severity: "warning",
      kind: "bloated_index_title",
      path: thread.path,
      message: `Thread ${thread.id} has a risky session_index title (${thread.indexTitleBytes ?? 0} bytes; ${(thread.indexTitleSignals ?? []).join(", ")}). Large transcript-like titles can make Desktop sidebar/search caches hide or mis-render otherwise recoverable threads.`
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

interface SessionIndexEntry {
  id: string;
  title?: string;
  updatedAt?: string;
}

async function readSessionIndex(filePath: string): Promise<Map<string, SessionIndexEntry>> {
  const entries = new Map<string, SessionIndexEntry>();
  const input = createReadStream(filePath, { encoding: "utf8" });
  const reader = readline.createInterface({ input, crlfDelay: Infinity });

  for await (const line of reader) {
    if (!line.trim()) {
      continue;
    }

    try {
      const parsed = JSON.parse(line) as Record<string, unknown>;
      const id = typeof parsed.id === "string" ? parsed.id : undefined;
      if (!id) {
        continue;
      }

      entries.set(id, {
        id,
        title: firstString(parsed.thread_name, parsed.title, parsed.name),
        updatedAt: firstString(parsed.updated_at, parsed.updatedAt)
      });
    } catch {
      continue;
    }
  }

  return entries;
}

function buildThreads(files: SessionAuditFile[], indexEntries: Map<string, SessionIndexEntry>): SessionAuditThread[] {
  return files
    .filter((file) => path.basename(file.path).startsWith("rollout-") && file.session)
    .map((file) => {
      const session = file.session as SessionAuditThreadMetadata;
      const indexed = indexEntries.get(session.id);
      return {
        id: session.id,
        path: file.path,
        indexed: indexed !== undefined,
        indexTitle: indexed?.title,
        indexTitleBytes: indexed?.title ? Buffer.byteLength(indexed.title, "utf8") : undefined,
        indexTitleSignals: indexed?.title ? indexTitleSignals(indexed.title) : undefined,
        indexUpdatedAt: indexed?.updatedAt,
        createdAt: session.createdAt,
        cwdBasename: session.cwdBasename,
        cwdHash: session.cwdHash,
        originator: session.originator,
        cliVersion: session.cliVersion,
        sourceKind: session.sourceKind,
        recoverCommand: `codex resume ${session.id}`
      };
    })
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

function extractSessionMetadata(parsed: unknown): SessionAuditThreadMetadata | undefined {
  if (!parsed || typeof parsed !== "object") {
    return undefined;
  }

  const record = parsed as Record<string, unknown>;
  if (record.type !== "session_meta") {
    return undefined;
  }

  const payload = record.payload && typeof record.payload === "object" ? record.payload as Record<string, unknown> : undefined;
  const id = typeof payload?.id === "string" ? payload.id : undefined;
  if (!id) {
    return undefined;
  }

  const cwd = typeof payload?.cwd === "string" ? payload.cwd : undefined;
  return {
    id,
    createdAt: firstString(payload?.timestamp, record.timestamp),
    cwdBasename: cwd ? path.basename(cwd) : undefined,
    cwdHash: cwd ? createHash("sha256").update(cwd).digest("hex").slice(0, 12) : undefined,
    originator: firstString(payload?.originator),
    cliVersion: firstString(payload?.cli_version),
    sourceKind: sourceKind(payload?.source)
  };
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

function firstString(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === "string" && value.length > 0);
}

function indexTitleSignals(title: string): string[] {
  const signals = new Set<string>();
  const size = Buffer.byteLength(title, "utf8");
  if (size >= INDEX_TITLE_BLOAT_BYTES) {
    signals.add("long_title");
  }

  if (/```|<code>|<\/code>|\\n|\n/.test(title)) {
    signals.add("structured_transcript");
  }

  if (/\b(user|assistant|tool|system|developer)\s*[:=]/i.test(title) || /response_item|event_msg|function_call|tool_call/i.test(title)) {
    signals.add("transcript_marker");
  }

  if (/\b(Pasted text|fileAttachments|input_image|data:image|base64|token usage|Get-CimInstance)\b/i.test(title)) {
    signals.add("attachment_or_log_chunk");
  }

  if (/^\s*[{[]/.test(title) || /"type"\s*:\s*"(session_meta|response_item|event_msg)"/.test(title)) {
    signals.add("json_fragment");
  }

  return [...signals].sort((a, b) => a.localeCompare(b));
}

function previewTitle(value: string | undefined): string {
  if (!value) {
    return "";
  }

  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > 96 ? `${compact.slice(0, 93)}...` : compact;
}

function sourceKind(source: unknown): string | undefined {
  if (typeof source === "string") {
    return source;
  }

  if (source && typeof source === "object") {
    const object = source as Record<string, unknown>;
    if (object.subagent) {
      return "subagent";
    }

    return "object";
  }

  return undefined;
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
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
