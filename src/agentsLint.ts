import { constants as fsConstants, promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { doctorRepo, type DoctorCheck } from "./doctor.js";
import type { Evidence, Finding } from "./types.js";

export interface AgentsLintResult {
  generatedAt: string;
  root: string;
  status: "pass" | "warn" | "fail";
  score: number;
  instructionFiles: string[];
  mcpConfigs: string[];
  checks: DoctorCheck[];
  findings: Finding[];
  summary: string;
}

const SKIP_DIRS = new Set([".git", "node_modules", "dist", "coverage", ".next", "build"]);
const INSTRUCTION_SIZE_WARN_BYTES = 24000;

export async function lintAgents(target = process.cwd()): Promise<AgentsLintResult> {
  const root = path.resolve(target);
  const files = await listFiles(root);
  const lintableFiles = files.filter((file) => !isEvidenceArchive(file));
  const instructionFiles = lintableFiles.filter((file) => isInstructionFile(file));
  const mcpConfigs = lintableFiles.filter((file) => isMcpConfigCandidate(file));
  const doctor = await doctorRepo(root);
  const checks = doctor.checks.filter((check) => check.id === "agent-instructions" || check.id === "validation");
  const findings = doctor.findings.filter((finding) =>
    finding.kind === "ignored_instruction" ||
    finding.kind === "mcp_risk" ||
    finding.kind === "secret_exposure" ||
    finding.kind === "hidden_unicode" ||
    finding.kind === "prompt_injection"
  );
  findings.push(...(await detectInstructionFileRisks(root, instructionFiles)));
  findings.push(...(await detectMcpConfigDiagnostics(root, mcpConfigs)));
  const score = calculateAgentsLintScore(checks, findings);
  const status = statusFrom(score, checks, findings);

  return {
    generatedAt: new Date().toISOString(),
    root,
    status,
    score,
    instructionFiles,
    mcpConfigs,
    checks,
    findings,
    summary: summarizeAgentsLint(status, instructionFiles, mcpConfigs, findings)
  };
}

export function renderAgentsLintMarkdown(result: AgentsLintResult): string {
  const lines = [
    "# AGENTS.md Lint Report",
    "",
    `Status: **${result.status}**`,
    `Score: **${result.score}/100**`,
    "",
    result.summary,
    "",
    `Repository: \`${result.root}\``,
    `Generated: ${result.generatedAt}`,
    "",
    "## Instruction Files",
    ""
  ];

  if (result.instructionFiles.length > 0) {
    result.instructionFiles.forEach((file) => lines.push(`- \`${file}\``));
  } else {
    lines.push("No AGENTS.md, CLAUDE.md, GEMINI.md, Cursor rules, or Copilot instruction files found.");
  }

  lines.push("", "## MCP Configs", "");
  if (result.mcpConfigs.length > 0) {
    result.mcpConfigs.forEach((file) => lines.push(`- \`${file}\``));
  } else {
    lines.push("No MCP config files detected.");
  }

  lines.push("", "## Checks", "");
  result.checks.forEach((check) => {
    lines.push(`- **${check.status.toUpperCase()}** ${check.title}: ${check.detail}`);
    if (check.recommendation) {
      lines.push(`  Recommendation: ${check.recommendation}`);
    }
  });

  lines.push("", "## Findings", "");
  if (result.findings.length === 0) {
    lines.push("No instruction or MCP findings detected.");
  } else {
    result.findings.forEach((finding) => {
      const firstEvidence = finding.evidence[0];
      const evidence = firstEvidence ? ` Evidence: \`${firstEvidence.file}:${firstEvidence.line}\`.` : "";
      lines.push(`- **${finding.severity}** ${finding.title}.${evidence}`);
    });
  }

  lines.push(
    "",
    "## Suggested Next Step",
    "",
    result.status === "pass"
      ? "Keep AGENTS.md as the canonical maintainer-controlled instruction file, and make tool-specific files reference it."
      : "Fix failed checks or high-risk findings before letting Codex act broadly on this repository."
  );

  return `${lines.join("\n")}\n`;
}

async function listFiles(root: string): Promise<string[]> {
  const files: string[] = [];

  async function visit(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relative = path.relative(root, fullPath).split(path.sep).join("/");
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) {
          await visit(fullPath);
        }
        continue;
      }

      if (entry.isFile()) {
        files.push(relative);
      }
    }
  }

  await visit(root);
  return files.sort((a, b) => a.localeCompare(b));
}

function calculateAgentsLintScore(checks: DoctorCheck[], findings: Finding[]): number {
  const checkPenalty = checks.reduce((total, check) => {
    if (check.status === "fail") {
      return total + 30;
    }
    if (check.status === "warn") {
      return total + 10;
    }
    return total;
  }, 0);
  const findingPenalty = findings.reduce((total, finding) => {
    const value = {
      low: 5,
      medium: 10,
      high: 25,
      critical: 35
    }[finding.severity];
    return total + value;
  }, 0);

  return Math.max(0, Math.min(100, 100 - checkPenalty - findingPenalty));
}

function statusFrom(checksScore: number, checks: DoctorCheck[], findings: Finding[]): AgentsLintResult["status"] {
  if (checks.some((check) => check.status === "fail") || findings.some((finding) => finding.severity === "critical" || finding.severity === "high")) {
    return "fail";
  }

  if (checksScore < 90 || checks.some((check) => check.status === "warn") || findings.length > 0) {
    return "warn";
  }

  return "pass";
}

function summarizeAgentsLint(status: AgentsLintResult["status"], instructionFiles: string[], mcpConfigs: string[], findings: Finding[]): string {
  if (status === "pass") {
    return "Agent instructions look consistent and ready for Codex use.";
  }

  if (status === "fail") {
    return "Agent instructions or MCP configuration need fixes before broad Codex automation.";
  }

  const missingAgents = instructionFiles.includes("AGENTS.md") ? "" : " Add AGENTS.md as the shared source of truth.";
  const mcpNote = mcpConfigs.length > 0 && findings.length === 0 ? " MCP configs were detected; keep their trust boundaries documented." : "";
  return `Agent instructions are usable but need tightening.${missingAgents}${mcpNote}`.trim();
}

function isInstructionFile(file: string): boolean {
  return /(^|\/)(AGENTS|CLAUDE|GEMINI|COPILOT|copilot-instructions)\.md$/i.test(file) ||
    /^\.cursor\/rules\/.+/i.test(file);
}

function isMcpConfigCandidate(file: string): boolean {
  return /(^|\/)(mcp|\.mcp|mcp-config|model-context)\.(json|jsonc)$/i.test(file) ||
    /(^|\/)\.cursor\/mcp\.json$/i.test(file);
}

function isEvidenceArchive(file: string): boolean {
  return /^(fixtures|examples|runs)\//i.test(file);
}

async function detectInstructionFileRisks(root: string, instructionFiles: string[]): Promise<Finding[]> {
  const findings: Finding[] = [];
  const missingPathEvidence = [];
  const largeFileEvidence = [];

  for (const file of instructionFiles) {
    const absolute = path.join(root, file);
    const content = await fs.readFile(absolute, "utf8");
    const lines = content.split(/\r?\n/);

    if (Buffer.byteLength(content, "utf8") > INSTRUCTION_SIZE_WARN_BYTES) {
      largeFileEvidence.push({
        file,
        line: 1,
        excerpt: `${file} is ${Buffer.byteLength(content, "utf8")} bytes; split long instructions into smaller scoped files or keep critical rules near the top.`
      });
    }

    for (const reference of collectPathReferences(lines)) {
      if (!(await pathExists(root, reference.value))) {
        missingPathEvidence.push({
          file,
          line: reference.line,
          excerpt: `referenced path does not exist: ${reference.value}`
        });
      }
    }
  }

  if (missingPathEvidence.length > 0) {
    findings.push({
      kind: "hallucinated_file",
      severity: "medium",
      title: "Agent instruction references missing paths",
      why: "Codex and other agents lose time or follow stale guidance when AGENTS.md or tool instructions point at files that no longer exist.",
      evidence: missingPathEvidence.slice(0, 8),
      suggestedRule:
        "Keep paths in agent instruction files verified; run trace-to-skill lint-agents after moving or deleting referenced files."
    });
  }

  if (largeFileEvidence.length > 0) {
    findings.push({
      kind: "ignored_instruction",
      severity: "medium",
      title: "Large agent instruction file may be truncated or ignored",
      why: "Very large instruction files make it harder for agents to preserve high-priority rules and can hide important guidance near the end.",
      evidence: largeFileEvidence,
      suggestedRule:
        "Keep critical repository instructions short, put must-follow validation rules near the top, and split long reference material into linked docs."
    });
  }

  return findings;
}

function collectPathReferences(lines: string[]): Array<{ line: number; value: string }> {
  const references: Array<{ line: number; value: string }> = [];
  const seen = new Set<string>();

  lines.forEach((line, index) => {
    for (const match of line.matchAll(/`([^`\n]+)`/g)) {
      addPathReference(references, seen, index + 1, match[1]);
    }

    for (const match of line.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      addPathReference(references, seen, index + 1, match[1]);
    }
  });

  return references;
}

function addPathReference(references: Array<{ line: number; value: string }>, seen: Set<string>, line: number, raw: string): void {
  const value = normalizePathReference(raw);
  if (!value || seen.has(value)) {
    return;
  }

  seen.add(value);
  references.push({ line, value });
}

function normalizePathReference(raw: string): string | undefined {
  const value = raw.trim().replace(/^file:\/\//, "").replace(/[),.;:]+$/, "");
  if (
    !value ||
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("mailto:") ||
    value.startsWith("#") ||
    value.includes("*") ||
    value.includes("$") ||
    value.includes(" ") ||
    value.startsWith("@") ||
    value.startsWith("~") ||
    path.isAbsolute(value)
  ) {
    return undefined;
  }

  if (!/^[A-Za-z0-9._/@-]+(?:\/[A-Za-z0-9._@-]+)*$/.test(value)) {
    return undefined;
  }

  const hasPathSignal = value.includes("/") || /\.[A-Za-z0-9]{1,8}$/.test(value);
  return hasPathSignal ? value.replace(/^\.\//, "") : undefined;
}

async function pathExists(root: string, reference: string): Promise<boolean> {
  try {
    await fs.access(path.join(root, reference));
    return true;
  } catch {
    return false;
  }
}

async function detectMcpConfigDiagnostics(root: string, mcpConfigs: string[]): Promise<Finding[]> {
  const evidence: Evidence[] = [];

  for (const file of mcpConfigs) {
    const absolute = path.join(root, file);
    const content = await fs.readFile(absolute, "utf8");
    const parsed = parseJsonObject(stripJsonComments(content));
    if (!parsed) {
      evidence.push({
        file,
        line: 1,
        excerpt: "MCP config could not be parsed as JSON/JSONC."
      });
      continue;
    }

    if (asObject(parsed.mcp_servers) && !asObject(parsed.mcpServers)) {
      evidence.push({
        file,
        line: findLine(content, "mcp_servers"),
        excerpt: "uses mcp_servers; Codex plugin MCP configs commonly expect mcpServers or a direct top-level server map"
      });
    }

    const servers = discoverMcpServers(parsed);
    if (!servers) {
      evidence.push({
        file,
        line: 1,
        excerpt: "no MCP server map found; expected mcpServers, servers, or a direct top-level server map"
      });
      continue;
    }

    for (const [name, rawServer] of Object.entries(servers)) {
      const server = asObject(rawServer);
      if (!server) {
        evidence.push({
          file,
          line: findLine(content, name),
          excerpt: `server "${name}" is not an object`
        });
        continue;
      }

      evidence.push(...(await inspectMcpServer(root, file, content, name, server)));
    }
  }

  if (evidence.length === 0) {
    return [];
  }

  return [{
    kind: "mcp_risk",
    severity: "medium",
    title: "MCP config has unresolved startup inputs",
    why: "Codex MCP failures are hard to debug when config shape, command paths, cwd values, or required environment variables are invalid before the server even starts.",
    evidence: evidence.slice(0, 10),
    suggestedRule:
      "Before enabling an MCP server for coding agents, verify config key casing, command availability, cwd existence, and required environment variables with trace-to-skill lint-agents."
  }];
}

async function inspectMcpServer(root: string, file: string, content: string, name: string, server: Record<string, unknown>): Promise<Evidence[]> {
  const evidence: Evidence[] = [];
  const hasUrl = typeof server.url === "string" || typeof server.httpUrl === "string";
  const command = typeof server.command === "string" ? server.command.trim() : "";

  if (!command && !hasUrl) {
    evidence.push({
      file,
      line: findLine(content, name),
      excerpt: `server "${name}" has neither command nor url`
    });
  }

  if (command && !(await commandExists(root, command))) {
    evidence.push({
      file,
      line: findLine(content, command),
      excerpt: `server "${name}" command is not resolvable without starting it: ${command}`
    });
  }

  if (typeof server.cwd === "string" && server.cwd.trim()) {
    const cwd = server.cwd.trim();
    if (!(await localPathExists(root, cwd))) {
      evidence.push({
        file,
        line: findLine(content, cwd),
        excerpt: `server "${name}" cwd does not exist: ${cwd}`
      });
    }
  }

  const env = asObject(server.env);
  if (env) {
    for (const [key, value] of Object.entries(env)) {
      const issue = envValueIssue(key, value);
      if (issue) {
        evidence.push({
          file,
          line: findLine(content, key),
          excerpt: `server "${name}" env ${key}: ${issue}`
        });
      }
    }
  }

  return evidence;
}

function discoverMcpServers(parsed: Record<string, unknown>): Record<string, unknown> | undefined {
  const wrapped = asObject(parsed.mcpServers) ?? asObject(parsed.servers) ?? asObject(parsed.mcp_servers);
  if (wrapped) {
    return wrapped;
  }

  const entries = Object.entries(parsed).filter(([key, value]) => !key.startsWith("$") && asObject(value));
  if (entries.length > 0 && entries.every(([, value]) => looksLikeMcpServer(value))) {
    return Object.fromEntries(entries);
  }

  return undefined;
}

function looksLikeMcpServer(value: unknown): boolean {
  const server = asObject(value);
  return Boolean(server && (
    typeof server.command === "string" ||
    typeof server.url === "string" ||
    typeof server.httpUrl === "string" ||
    Array.isArray(server.args) ||
    asObject(server.env)
  ));
}

async function commandExists(root: string, command: string): Promise<boolean> {
  if (command.includes("/") || command.includes("\\")) {
    return localPathExists(root, command);
  }

  const paths = (process.env.PATH ?? "").split(path.delimiter).filter(Boolean);
  const extensions = process.platform === "win32"
    ? (process.env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM").split(";")
    : [""];

  for (const directory of paths) {
    for (const extension of extensions) {
      const candidate = path.join(directory, `${command}${extension}`);
      if (await isExecutableFile(candidate)) {
        return true;
      }
    }
  }

  return false;
}

async function localPathExists(root: string, value: string): Promise<boolean> {
  const expanded = value === "~" || value.startsWith("~/")
    ? path.join(os.homedir(), value.slice(2))
    : value;
  const candidate = path.isAbsolute(expanded) ? expanded : path.join(root, expanded);
  try {
    await fs.access(candidate);
    return true;
  } catch {
    return false;
  }
}

async function isExecutableFile(candidate: string): Promise<boolean> {
  try {
    const stat = await fs.stat(candidate);
    if (!stat.isFile()) {
      return false;
    }
    if (process.platform === "win32") {
      return true;
    }
    await fs.access(candidate, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function envValueIssue(key: string, value: unknown): string | undefined {
  if (typeof value !== "string") {
    return "value should be a string so the launcher receives the intended environment variable";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "empty value";
  }

  if (/^(todo|tbd|changeme|change-me|your[-_ ]?(token|key|secret|password)|example)$/i.test(trimmed)) {
    return "placeholder value";
  }

  const variableReference = /^\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?$/.exec(trimmed);
  if (variableReference && !process.env[variableReference[1]]) {
    return `references unset environment variable ${variableReference[1]}`;
  }

  if (/token|secret|key|password/i.test(key) && /^[A-Za-z0-9_./+=-]{16,}$/.test(trimmed) && !variableReference) {
    return "appears to contain a literal secret; prefer referencing an external environment variable";
  }

  return undefined;
}

function stripJsonComments(content: string): string {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

function parseJsonObject(content: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(content);
    return asObject(parsed);
  } catch {
    return undefined;
  }
}

function asObject(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function findLine(content: string, needle: string): number {
  const lines = content.split(/\r?\n/);
  const index = lines.findIndex((line) => line.includes(needle));
  return index >= 0 ? index + 1 : 1;
}
