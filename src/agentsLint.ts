import { constants as fsConstants, promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { TextDecoder } from "node:util";
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
  findings.push(...(await detectCodexConfigDiagnostics(root, mcpConfigs)));
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
    /(^|\/)\.cursor\/mcp\.json$/i.test(file) ||
    /(^|\/)\.codex\/config\.toml$/i.test(file);
}

function isEvidenceArchive(file: string): boolean {
  return /^(fixtures|examples|runs)\//i.test(file);
}

async function detectInstructionFileRisks(root: string, instructionFiles: string[]): Promise<Finding[]> {
  const findings: Finding[] = [];
  const missingPathEvidence = [];
  const largeFileEvidence = [];
  const missingIncludeEvidence = [];
  const nestedInstructionEvidence = [];
  const encodingEvidence = [];
  const instructionContents = new Map<string, string>();

  for (const file of instructionFiles) {
    const absolute = path.join(root, file);
    const raw = await fs.readFile(absolute);
    const decoded = decodeInstructionFile(raw);
    const content = decoded.content;
    instructionContents.set(file, content);
    const lines = content.split(/\r?\n/);

    if (decoded.invalidUtf8) {
      encodingEvidence.push({
        file,
        line: 1,
        excerpt: `${file} contains bytes that are not valid UTF-8; Codex may skip or misread this instruction file.`
      });
    }

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

    for (const reference of collectIncludeReferences(lines)) {
      if (reference.invalid) {
        missingIncludeEvidence.push({
          file,
          line: reference.line,
          excerpt: `include target is not a safe repo-relative markdown path: ${reference.value}`
        });
      } else if (!(await pathExists(root, reference.value))) {
        missingIncludeEvidence.push({
          file,
          line: reference.line,
          excerpt: `include target does not exist: ${reference.value}`
        });
      }
    }
  }

  const rootInstructions = instructionContents.get("AGENTS.md") ?? "";
  if (rootInstructions) {
    for (const file of instructionFiles) {
      if (file !== "AGENTS.md" && /(^|\/)AGENTS\.md$/i.test(file) && !rootInstructions.includes(file) && !rootInstructions.includes(path.dirname(file))) {
        nestedInstructionEvidence.push({
          file,
          line: 1,
          excerpt: `nested AGENTS.md may not be loaded unless Codex starts in ${path.dirname(file)} or the root AGENTS.md explicitly points to it`
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

  if (missingIncludeEvidence.length > 0) {
    findings.push({
      kind: "hallucinated_file",
      severity: "medium",
      title: "Agent instruction include references missing paths",
      why: "Teams often split AGENTS.md or CLAUDE.md into reusable markdown files. Missing or unsafe include targets make instruction assembly unverifiable and create cross-tool drift.",
      evidence: missingIncludeEvidence.slice(0, 8),
      suggestedRule:
        "Keep @include-style instruction references repo-relative, present, and auditable; run trace-to-skill lint-agents after moving shared instruction files."
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

  if (nestedInstructionEvidence.length > 0) {
    findings.push({
      kind: "ignored_instruction",
      severity: "medium",
      title: "Nested AGENTS.md may not be loaded automatically",
      why: "Codex users report that nested AGENTS.md files in monorepos are easy to miss unless the agent starts in the right directory or the root instructions explicitly mention them.",
      evidence: nestedInstructionEvidence.slice(0, 8),
      suggestedRule:
        "List nested AGENTS.md files in the root AGENTS.md or add explicit package-scope rules so maintainers can verify which instruction files should be loaded for each path."
    });
  }

  if (encodingEvidence.length > 0) {
    findings.push({
      kind: "ignored_instruction",
      severity: "medium",
      title: "Agent instruction file may fail UTF-8 loading",
      why: "Instruction files with invalid encoding can be silently skipped or misread by coding agents, making policy failures hard to diagnose.",
      evidence: encodingEvidence.slice(0, 8),
      suggestedRule:
        "Save AGENTS.md, CLAUDE.md, and other agent instruction files as valid UTF-8 and reject files with replacement characters or unsupported encodings."
    });
  }

  return findings;
}

function decodeInstructionFile(raw: Buffer): { content: string; invalidUtf8: boolean } {
  try {
    return {
      content: new TextDecoder("utf-8", { fatal: true }).decode(raw),
      invalidUtf8: false
    };
  } catch {
    return {
      content: raw.toString("utf8"),
      invalidUtf8: true
    };
  }
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

function collectIncludeReferences(lines: string[]): Array<{ line: number; value: string; invalid: boolean }> {
  const references: Array<{ line: number; value: string; invalid: boolean }> = [];
  const seen = new Set<string>();

  lines.forEach((line, index) => {
    for (const match of line.matchAll(/(?:^|\s)@([A-Za-z0-9._/-]+\.md)\b/g)) {
      const raw = match[1];
      const value = normalizeIncludeReference(raw);
      const key = value ?? raw;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      references.push({
        line: index + 1,
        value: key,
        invalid: !value
      });
    }
  });

  return references;
}

function normalizeIncludeReference(raw: string): string | undefined {
  const value = raw.trim().replace(/^[.]\//, "").replace(/[),.;:]+$/, "");
  if (
    !value ||
    value.startsWith("/") ||
    value.startsWith("~") ||
    value.includes("..") ||
    value.includes("$") ||
    value.includes("*") ||
    value.includes(" ")
  ) {
    return undefined;
  }

  return /^[A-Za-z0-9._/-]+\.md$/i.test(value) ? value : undefined;
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
    const parsed = parseMcpConfig(file, content);
    if (!parsed) {
      evidence.push({
        file,
        line: 1,
        excerpt: `MCP config could not be parsed as ${file.endsWith(".toml") ? "TOML" : "JSON/JSONC"}.`
      });
      continue;
    }

    if (isTomlConfig(file) && !asObject(parsed.mcp_servers)) {
      continue;
    }

    if (!isTomlConfig(file) && asObject(parsed.mcp_servers) && !asObject(parsed.mcpServers)) {
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

      if (isTomlConfig(file) && commandLooksLocal(server.command) && typeof server.cwd !== "string") {
        evidence.push({
          file,
          line: findLine(content, name),
          excerpt: `server "${name}" in project .codex/config.toml uses a local stdio command without explicit cwd`
        });
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

async function detectCodexConfigDiagnostics(root: string, configFiles: string[]): Promise<Finding[]> {
  const evidence: Evidence[] = [];

  for (const file of configFiles.filter((item) => isCodexTomlConfig(item))) {
    const absolute = path.join(root, file);
    const content = await fs.readFile(absolute, "utf8");
    const lines = parseTomlLines(content);
    const permissions = collectPermissionProfiles(lines);
    const defaultPermissions = findTomlAssignment(lines, "default_permissions");

    if (defaultPermissions && typeof defaultPermissions.value === "string" && !permissions.has(defaultPermissions.value)) {
      evidence.push({
        file,
        line: defaultPermissions.line,
        excerpt: `default_permissions references missing permissions profile: ${defaultPermissions.value}`
      });
    }

    for (const item of lines) {
      if (item.section === "features" && item.key === "codex_hooks") {
        evidence.push({
          file,
          line: item.line,
          excerpt: "deprecated [features].codex_hooks key is present; use [features].hooks instead"
        });
      }

      if (item.section?.startsWith("projects.") && item.key === "trusted_level") {
        evidence.push({
          file,
          line: item.line,
          excerpt: "projects.* trusted_level is stored in config.toml; this can pollute synced dotfiles with machine-specific project metadata"
        });
      }
    }

    for (const section of collectSections(lines)) {
      if (section.startsWith("projects.") && /\/|\\|:/.test(section)) {
        evidence.push({
          file,
          line: findLine(content, section),
          excerpt: `project-specific config section appears to contain a machine-local path: [${section}]`
        });
      }
    }
  }

  if (evidence.length === 0) {
    return [];
  }

  return [{
    kind: "ignored_instruction",
    severity: "medium",
    title: "Codex config has drift-prone settings",
    why: "Codex config.toml issues are hard to debug when deprecated feature flags, missing permission profiles, or machine-local project trust metadata are mixed into repository or dotfiles config.",
    evidence: evidence.slice(0, 10),
    suggestedRule:
      "Keep Codex config portable: migrate [features].codex_hooks to [features].hooks, define every default_permissions profile, and avoid syncing projects.* trusted_level entries."
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

  const commandIssue = startupStringIssue(command);
  if (commandIssue) {
    evidence.push({
      file,
      line: findLine(content, command),
      excerpt: `server "${name}" command ${commandIssue}: ${command}`
    });
  } else if (command && !(await commandExists(root, command))) {
    evidence.push({
      file,
      line: findLine(content, command),
      excerpt: `server "${name}" command is not resolvable without starting it: ${command}`
    });
  }

  if (typeof server.cwd === "string" && server.cwd.trim()) {
    const cwd = server.cwd.trim();
    const cwdIssue = startupStringIssue(cwd);
    if (cwdIssue) {
      evidence.push({
        file,
        line: findLine(content, cwd),
        excerpt: `server "${name}" cwd ${cwdIssue}: ${cwd}`
      });
    } else if (!(await localPathExists(root, cwd))) {
      evidence.push({
        file,
        line: findLine(content, cwd),
        excerpt: `server "${name}" cwd does not exist: ${cwd}`
      });
    }
  }

  if (Array.isArray(server.args)) {
    server.args.forEach((value) => {
      if (typeof value !== "string") {
        return;
      }
      const issue = startupStringIssue(value);
      if (issue) {
        evidence.push({
          file,
          line: findLine(content, value),
          excerpt: `server "${name}" arg ${issue}: ${value}`
        });
      }
    });
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

function commandLooksLocal(value: unknown): boolean {
  return typeof value === "string" && (value.includes("/") || value.includes("\\") || value === "php" || value === "node" || value === "python" || value === "python3");
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

function startupStringIssue(value: string): string | undefined {
  const variableReferences = Array.from(value.matchAll(/\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?/g)).map((match) => match[1]);
  const unresolved = variableReferences.filter((name) => !process.env[name]);
  if (unresolved.length > 0) {
    return `references unset environment variable ${unresolved.join(", ")}`;
  }

  return undefined;
}

function parseMcpConfig(file: string, content: string): Record<string, unknown> | undefined {
  if (isTomlConfig(file)) {
    return parseMcpToml(content);
  }

  return parseJsonObject(stripJsonComments(content));
}

function isTomlConfig(file: string): boolean {
  return /\.toml$/i.test(file);
}

function isCodexTomlConfig(file: string): boolean {
  return /(^|\/)\.codex\/config\.toml$/i.test(file);
}

function parseMcpToml(content: string): Record<string, unknown> | undefined {
  const mcpServers: Record<string, unknown> = {};
  const lines = content.split(/\r?\n/);
  let currentServer: Record<string, unknown> | undefined;

  for (const rawLine of lines) {
    const line = stripTomlComment(rawLine).trim();
    if (!line) {
      continue;
    }

    const section = /^\[mcp_servers\.([A-Za-z0-9_.-]+)\]$/.exec(line) ?? /^\[mcpServers\.([A-Za-z0-9_.-]+)\]$/.exec(line);
    if (section) {
      currentServer = {};
      mcpServers[section[1]] = currentServer;
      continue;
    }

    if (line.startsWith("[") && line.endsWith("]")) {
      currentServer = undefined;
      continue;
    }

    if (!currentServer) {
      continue;
    }

    const assignment = /^([A-Za-z0-9_-]+)\s*=\s*(.+)$/.exec(line);
    if (!assignment) {
      continue;
    }

    currentServer[assignment[1]] = parseTomlValue(assignment[2].trim());
  }

  return Object.keys(mcpServers).length > 0 ? { mcp_servers: mcpServers } : {};
}

function parseTomlValue(value: string): unknown {
  if (value.startsWith("\"") || value.startsWith("'")) {
    return parseTomlString(value);
  }

  if (value.startsWith("[")) {
    return parseTomlArray(value);
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return value;
}

function parseTomlArray(value: string): unknown[] {
  const trimmed = value.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
    return [];
  }

  const items: unknown[] = [];
  const pattern = /"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|([^,\s][^,]*)/g;
  const inner = trimmed.slice(1, -1);
  for (const match of inner.matchAll(pattern)) {
    if (match[1] !== undefined) {
      items.push(unescapeTomlString(match[1]));
    } else if (match[2] !== undefined) {
      items.push(match[2]);
    } else if (match[3] !== undefined) {
      items.push(parseTomlValue(match[3].trim()));
    }
  }

  return items;
}

function parseTomlString(value: string): string {
  if (value.startsWith("\"")) {
    const match = /^"((?:\\.|[^"\\])*)"/.exec(value);
    return match ? unescapeTomlString(match[1]) : value;
  }

  const match = /^'([^']*)'/.exec(value);
  return match ? match[1] : value;
}

function unescapeTomlString(value: string): string {
  return value
    .replace(/\\"/g, "\"")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\\\/g, "\\");
}

function stripTomlComment(line: string): string {
  let quote: "\"" | "'" | undefined;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const previous = line[index - 1];
    if ((char === "\"" || char === "'") && previous !== "\\") {
      quote = quote === char ? undefined : quote ?? char;
      continue;
    }
    if (char === "#" && !quote) {
      return line.slice(0, index);
    }
  }
  return line;
}

interface TomlLine {
  line: number;
  section?: string;
  key?: string;
  value?: unknown;
}

function parseTomlLines(content: string): TomlLine[] {
  const result: TomlLine[] = [];
  let currentSection: string | undefined;

  content.split(/\r?\n/).forEach((rawLine, index) => {
    const line = stripTomlComment(rawLine).trim();
    if (!line) {
      return;
    }

    const section = /^\[([^\]]+)\]$/.exec(line);
    if (section) {
      currentSection = section[1];
      result.push({ line: index + 1, section: currentSection });
      return;
    }

    const assignment = /^([A-Za-z0-9_-]+)\s*=\s*(.+)$/.exec(line);
    if (assignment) {
      result.push({
        line: index + 1,
        section: currentSection,
        key: assignment[1],
        value: parseTomlValue(assignment[2].trim())
      });
    }
  });

  return result;
}

function collectPermissionProfiles(lines: TomlLine[]): Set<string> {
  const profiles = new Set<string>();
  for (const item of lines) {
    if (!item.section) {
      continue;
    }
    const match = /^permissions\.((?:"[^"]+"|'[^']+'|[^.]+))/.exec(item.section);
    if (match) {
      profiles.add(unquoteTomlBarePart(match[1]));
    }
  }
  return profiles;
}

function findTomlAssignment(lines: TomlLine[], key: string): TomlLine | undefined {
  return lines.find((item) => item.key === key);
}

function collectSections(lines: TomlLine[]): string[] {
  return lines.filter((item) => item.section && !item.key).map((item) => item.section as string);
}

function unquoteTomlBarePart(value: string): string {
  if (value.startsWith("\"") || value.startsWith("'")) {
    return parseTomlString(value);
  }
  return value;
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
