import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

export type ConfigAuditStatus = "pass" | "warn" | "fail";
export type ConfigAuditSeverity = "warning" | "error";

export interface ConfigAuditFinding {
  severity: ConfigAuditSeverity;
  kind:
    | "missing_config"
    | "model_pin"
    | "danger_full_access"
    | "windows_elevated_sandbox"
    | "default_permissions_missing"
    | "deprecated_codex_hooks"
    | "machine_local_project_state"
    | "plugin_cache_missing"
    | "mcp_approval_sprawl";
  line?: number;
  message: string;
}

export interface ConfigAuditResult {
  generatedAt: string;
  target: string;
  configPath: string;
  status: ConfigAuditStatus;
  summary: {
    exists: boolean;
    sizeBytes: number;
    topLevelKeys: string[];
    sections: string[];
    mcpServers: number;
    pluginSections: number;
  };
  values: {
    model?: string;
    approvalPolicy?: string;
    sandboxMode?: string;
    windowsSandbox?: string;
    defaultPermissions?: string;
  };
  findings: ConfigAuditFinding[];
}

interface TomlEntry {
  line: number;
  section?: string;
  key?: string;
  value?: unknown;
}

export async function auditCodexConfig(target = "~/.codex"): Promise<ConfigAuditResult> {
  const resolvedTarget = path.resolve(expandHome(target));
  const configPath = await resolveConfigPath(resolvedTarget);

  try {
    const content = await fs.readFile(configPath, "utf8");
    const fileStat = await fs.stat(configPath);
    const entries = parseTomlEntries(content);
    const findings = await collectFindings(configPath, entries);
    const sections = entries.filter((entry) => entry.section && !entry.key).map((entry) => entry.section as string);
    const topLevelKeys = entries.filter((entry) => !entry.section && entry.key).map((entry) => entry.key as string);

    return {
      generatedAt: new Date().toISOString(),
      target: resolvedTarget,
      configPath,
      status: statusFor(findings),
      summary: {
        exists: true,
        sizeBytes: fileStat.size,
        topLevelKeys,
        sections,
        mcpServers: sections.filter((section) => section.startsWith("mcp_servers.") || section.startsWith("mcpServers.")).length,
        pluginSections: sections.filter((section) => section.startsWith("plugins.")).length
      },
      values: {
        model: stringValue(findAssignment(entries, undefined, "model")?.value),
        approvalPolicy: stringValue(findAssignment(entries, undefined, "approval_policy")?.value),
        sandboxMode: stringValue(findAssignment(entries, undefined, "sandbox_mode")?.value),
        windowsSandbox: stringValue(findAssignment(entries, "windows", "sandbox")?.value),
        defaultPermissions: stringValue(findAssignment(entries, undefined, "default_permissions")?.value)
      },
      findings
    };
  } catch (error) {
    const missing = (error as NodeJS.ErrnoException).code === "ENOENT";
    const findings: ConfigAuditFinding[] = [{
      severity: missing ? "warning" : "error",
      kind: "missing_config",
      message: missing
        ? "Codex config.toml was not found at the resolved target."
        : `Codex config.toml could not be read: ${(error as Error).message}`
    }];

    return {
      generatedAt: new Date().toISOString(),
      target: resolvedTarget,
      configPath,
      status: statusFor(findings),
      summary: {
        exists: false,
        sizeBytes: 0,
        topLevelKeys: [],
        sections: [],
        mcpServers: 0,
        pluginSections: 0
      },
      values: {},
      findings
    };
  }
}

export function renderConfigAuditMarkdown(result: ConfigAuditResult): string {
  const lines = [
    "# trace-to-skill Codex Config Audit",
    "",
    `Status: **${result.status}**`,
    "",
    `Target: \`${result.target}\``,
    `Config: \`${result.configPath}\``,
    `Exists: ${result.summary.exists ? "yes" : "no"}`,
    `Size: ${result.summary.sizeBytes} bytes`,
    `Top-level keys: ${result.summary.topLevelKeys.length > 0 ? result.summary.topLevelKeys.join(", ") : "none"}`,
    `Sections: ${result.summary.sections.length}`,
    `MCP servers: ${result.summary.mcpServers}`,
    `Plugin sections: ${result.summary.pluginSections}`,
    "",
    "## Effective Values",
    "",
    `- model: ${formatValue(result.values.model)}`,
    `- approval_policy: ${formatValue(result.values.approvalPolicy)}`,
    `- sandbox_mode: ${formatValue(result.values.sandboxMode)}`,
    `- [windows].sandbox: ${formatValue(result.values.windowsSandbox)}`,
    `- default_permissions: ${formatValue(result.values.defaultPermissions)}`,
    "",
    "## Findings",
    ""
  ];

  if (result.findings.length === 0) {
    lines.push("No Codex config findings detected.", "");
  } else {
    for (const finding of result.findings) {
      const location = finding.line ? ` line ${finding.line}` : "";
      lines.push(`- **${finding.severity}** ${finding.kind}${location}: ${finding.message}`);
    }
    lines.push("");
  }

  lines.push(
    "Suggested next step:",
    "",
    "- Attach this report to config, sandbox, approval, or plugin-runtime issues instead of pasting raw config with secrets.",
    "- Back up `~/.codex/config.toml` before manually changing sandbox, permission, model, MCP, or plugin settings.",
    ""
  );

  return lines.join("\n");
}

async function resolveConfigPath(target: string): Promise<string> {
  try {
    const targetStat = await fs.stat(target);
    if (targetStat.isDirectory()) {
      return path.join(target, "config.toml");
    }
  } catch {
    if (path.basename(target) !== "config.toml" && !target.endsWith(".toml")) {
      return path.join(target, "config.toml");
    }
  }

  return target;
}

async function collectFindings(configPath: string, entries: TomlEntry[]): Promise<ConfigAuditFinding[]> {
  const findings: ConfigAuditFinding[] = [];
  const model = findAssignment(entries, undefined, "model");
  const sandboxMode = findAssignment(entries, undefined, "sandbox_mode");
  const windowsSandbox = findAssignment(entries, "windows", "sandbox");
  const defaultPermissions = findAssignment(entries, undefined, "default_permissions");
  const permissionProfiles = collectPermissionProfiles(entries);
  const sections = entries.filter((entry) => entry.section && !entry.key).map((entry) => entry.section as string);

  if (model && typeof model.value === "string") {
    findings.push({
      severity: "warning",
      kind: "model_pin",
      line: model.line,
      message: `model is pinned to "${model.value}"; include this in reports about update, routing, latency, or unavailable-model regressions.`
    });
  }

  if (sandboxMode?.value === "danger-full-access") {
    findings.push({
      severity: "warning",
      kind: "danger_full_access",
      line: sandboxMode.line,
      message: "sandbox_mode is danger-full-access; this is useful evidence for approval/sandbox reports but broad for daily OSS maintenance."
    });
  }

  if (windowsSandbox?.value === "elevated") {
    findings.push({
      severity: "warning",
      kind: "windows_elevated_sandbox",
      line: windowsSandbox.line,
      message: "[windows].sandbox is elevated; recent Codex reports link this mode to node_repl or sandbox setup refresh failures on some Windows installs."
    });
  }

  if (defaultPermissions && typeof defaultPermissions.value === "string" && !permissionProfiles.has(defaultPermissions.value)) {
    findings.push({
      severity: "error",
      kind: "default_permissions_missing",
      line: defaultPermissions.line,
      message: `default_permissions references missing permissions profile "${defaultPermissions.value}".`
    });
  }

  for (const entry of entries) {
    if (entry.section === "features" && entry.key === "codex_hooks") {
      findings.push({
        severity: "warning",
        kind: "deprecated_codex_hooks",
        line: entry.line,
        message: "deprecated [features].codex_hooks is present; use [features].hooks instead."
      });
    }

    if (entry.section?.startsWith("projects.") && entry.key === "trusted_level") {
      findings.push({
        severity: "warning",
        kind: "machine_local_project_state",
        line: entry.line,
        message: "projects.* trusted_level is machine-local state; syncing it can cause confusing trust drift across machines."
      });
    }
  }

  const approvalModeEntries = entries.filter((entry) => entry.section?.includes(".tools.") && entry.key === "approval_mode");
  if (approvalModeEntries.length >= 20) {
    findings.push({
      severity: "warning",
      kind: "mcp_approval_sprawl",
      line: approvalModeEntries[0]?.line,
      message: `${approvalModeEntries.length} per-tool MCP approval_mode entries found; this matches reports where MCP approval config becomes hard to maintain.`
    });
  }

  for (const section of sections) {
    if (section.startsWith("projects.") && /\/|\\|:/.test(section)) {
      findings.push({
        severity: "warning",
        kind: "machine_local_project_state",
        line: findSectionLine(entries, section),
        message: `project section appears to contain a machine-local path: [${section}]`
      });
    }
  }

  findings.push(...(await findMissingPluginCaches(configPath, entries)));
  return findings;
}

async function findMissingPluginCaches(configPath: string, entries: TomlEntry[]): Promise<ConfigAuditFinding[]> {
  const codexHome = path.dirname(configPath);
  const findings: ConfigAuditFinding[] = [];
  const pluginSections = entries.filter((entry) => entry.section?.startsWith("plugins.") && !entry.key);

  for (const sectionEntry of pluginSections) {
    const section = sectionEntry.section as string;
    const enabled = findAssignment(entries, section, "enabled");
    if (enabled?.value !== true) {
      continue;
    }

    const pluginId = parsePluginSectionId(section);
    if (!pluginId) {
      continue;
    }

    const [name, marketplace] = pluginId.split("@");
    if (!name || !marketplace) {
      continue;
    }

    const cachePath = path.join(codexHome, "plugins", "cache", marketplace, name);
    if (!(await pathExists(cachePath))) {
      findings.push({
        severity: "warning",
        kind: "plugin_cache_missing",
        line: sectionEntry.line,
        message: `enabled plugin "${pluginId}" has no cache directory at ${relativeHome(cachePath)}.`
      });
    }
  }

  return findings;
}

function parseTomlEntries(content: string): TomlEntry[] {
  const result: TomlEntry[] = [];
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
    if (!assignment) {
      return;
    }

    result.push({
      line: index + 1,
      section: currentSection,
      key: assignment[1],
      value: parseTomlValue(assignment[2].trim())
    });
  });

  return result;
}

function parseTomlValue(value: string): unknown {
  if (value.startsWith("\"") || value.startsWith("'")) {
    return parseTomlString(value);
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return value;
}

function parseTomlString(value: string): string {
  if (value.startsWith("\"")) {
    const match = /^"((?:\\.|[^"\\])*)"/.exec(value);
    return match ? match[1].replace(/\\"/g, "\"").replace(/\\\\/g, "\\") : value;
  }
  const match = /^'([^']*)'/.exec(value);
  return match ? match[1] : value;
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

function collectPermissionProfiles(entries: TomlEntry[]): Set<string> {
  const profiles = new Set<string>();
  for (const entry of entries) {
    if (!entry.section) {
      continue;
    }
    const match = /^permissions\.((?:"[^"]+"|'[^']+'|[^.]+))/.exec(entry.section);
    if (match) {
      profiles.add(unquoteTomlPart(match[1]));
    }
  }
  return profiles;
}

function findAssignment(entries: TomlEntry[], section: string | undefined, key: string): TomlEntry | undefined {
  return entries.find((entry) => entry.section === section && entry.key === key);
}

function findSectionLine(entries: TomlEntry[], section: string): number | undefined {
  return entries.find((entry) => entry.section === section && !entry.key)?.line;
}

function parsePluginSectionId(section: string): string | undefined {
  const raw = section.slice("plugins.".length);
  return unquoteTomlPart(raw);
}

function unquoteTomlPart(value: string): string {
  if (value.startsWith("\"") || value.startsWith("'")) {
    return parseTomlString(value);
  }
  return value;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function statusFor(findings: ConfigAuditFinding[]): ConfigAuditStatus {
  if (findings.some((finding) => finding.severity === "error")) {
    return "fail";
  }
  return findings.length > 0 ? "warn" : "pass";
}

function formatValue(value: string | undefined): string {
  return value ? `\`${value}\`` : "not set";
}

async function pathExists(candidate: string): Promise<boolean> {
  try {
    await fs.access(candidate);
    return true;
  } catch {
    return false;
  }
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

function relativeHome(input: string): string {
  const home = os.homedir();
  if (input === home) {
    return "~";
  }
  if (input.startsWith(`${home}${path.sep}`)) {
    return `~${path.sep}${path.relative(home, input)}`;
  }
  return input;
}
