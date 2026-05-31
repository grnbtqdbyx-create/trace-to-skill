import { mkdir, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { auditCodexConfig, renderConfigAuditMarkdown, type ConfigAuditResult } from "./configAudit.js";
import { auditCodexPlugins, renderPluginAuditMarkdown, type PluginAuditResult } from "./pluginAudit.js";
import { auditCodexSessions, renderSessionAuditMarkdown, type SessionAuditOptions, type SessionAuditResult } from "./sessionAudit.js";

export type DiagnosticsBundleStatus = "pass" | "warn" | "fail";

export interface DiagnosticsBundleOptions extends SessionAuditOptions {
  appPath?: string;
  force?: boolean;
}

export interface DiagnosticsBundleReport {
  kind: "manifest" | "readme" | "config-audit" | "plugin-audit" | "session-audit";
  format: "json" | "markdown";
  path: string;
}

export interface DiagnosticsBundleResult {
  generatedAt: string;
  target: string;
  outputDir: string;
  status: DiagnosticsBundleStatus;
  privacy: {
    mode: "metadata-only";
    rawFilesIncluded: false;
    excludedRawFiles: string[];
  };
  summary: {
    configStatus: ConfigAuditResult["status"];
    pluginStatus: PluginAuditResult["status"];
    sessionStatus: SessionAuditResult["status"];
    reports: number;
  };
  recommendedAttachments: string[];
  reports: DiagnosticsBundleReport[];
}

const DEFAULT_OUTPUT_DIR = "trace-to-skill-codex-diagnostics";
const EXCLUDED_RAW_FILES = [
  "config.toml",
  "logs_2.sqlite",
  "state_5.sqlite",
  "goals_1.sqlite",
  "session_index.jsonl",
  "rollout-*.jsonl",
  "codex-tui.log",
  "sandbox.log"
];

export async function createDiagnosticsBundle(
  target = "~/.codex",
  outputDir = DEFAULT_OUTPUT_DIR,
  options: DiagnosticsBundleOptions = {}
): Promise<DiagnosticsBundleResult> {
  const resolvedTarget = path.resolve(expandHome(target));
  const resolvedOutputDir = path.resolve(expandHome(outputDir));
  await prepareOutputDirectory(resolvedOutputDir, Boolean(options.force));

  const configAudit = await auditCodexConfig(resolvedTarget);
  const pluginAudit = await auditCodexPlugins(resolvedTarget, {
    appPath: options.appPath
  });
  const sessionAudit = await auditCodexSessions(resolvedTarget, {
    largeFileBytes: options.largeFileBytes,
    hugeLineBytes: options.hugeLineBytes
  });
  const generatedAt = new Date().toISOString();
  const status = combinedStatus(configAudit.status, pluginAudit.status, sessionAudit.status);

  const reports: DiagnosticsBundleReport[] = [
    report("manifest", "json", resolvedOutputDir, "manifest.json"),
    report("readme", "markdown", resolvedOutputDir, "README.md"),
    report("config-audit", "json", resolvedOutputDir, "config-audit.json"),
    report("config-audit", "markdown", resolvedOutputDir, "config-audit.md"),
    report("plugin-audit", "json", resolvedOutputDir, "plugin-audit.json"),
    report("plugin-audit", "markdown", resolvedOutputDir, "plugin-audit.md"),
    report("session-audit", "json", resolvedOutputDir, "session-audit.json"),
    report("session-audit", "markdown", resolvedOutputDir, "session-audit.md")
  ];

  const result: DiagnosticsBundleResult = {
    generatedAt,
    target: resolvedTarget,
    outputDir: resolvedOutputDir,
    status,
    privacy: {
      mode: "metadata-only",
      rawFilesIncluded: false,
      excludedRawFiles: EXCLUDED_RAW_FILES
    },
    summary: {
      configStatus: configAudit.status,
      pluginStatus: pluginAudit.status,
      sessionStatus: sessionAudit.status,
      reports: reports.length
    },
    recommendedAttachments: [
      "manifest.json",
      "README.md",
      "config-audit.json",
      "config-audit.md",
      "plugin-audit.json",
      "plugin-audit.md",
      "session-audit.json",
      "session-audit.md"
    ],
    reports
  };

  await writeFile(path.join(resolvedOutputDir, "manifest.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  await writeFile(path.join(resolvedOutputDir, "README.md"), renderDiagnosticsBundleReadme(result), "utf8");
  await writeFile(path.join(resolvedOutputDir, "config-audit.json"), `${JSON.stringify(configAudit, null, 2)}\n`, "utf8");
  await writeFile(path.join(resolvedOutputDir, "config-audit.md"), renderConfigAuditMarkdown(configAudit), "utf8");
  await writeFile(path.join(resolvedOutputDir, "plugin-audit.json"), `${JSON.stringify(pluginAudit, null, 2)}\n`, "utf8");
  await writeFile(path.join(resolvedOutputDir, "plugin-audit.md"), renderPluginAuditMarkdown(pluginAudit), "utf8");
  await writeFile(path.join(resolvedOutputDir, "session-audit.json"), `${JSON.stringify(sessionAudit, null, 2)}\n`, "utf8");
  await writeFile(path.join(resolvedOutputDir, "session-audit.md"), renderSessionAuditMarkdown(sessionAudit), "utf8");

  return result;
}

export function renderDiagnosticsBundleMarkdown(result: DiagnosticsBundleResult): string {
  const lines = [
    "# trace-to-skill Codex Diagnostics Bundle",
    "",
    `Status: **${result.status}**`,
    "",
    `Target: \`${result.target}\``,
    `Output directory: \`${result.outputDir}\``,
    `Privacy mode: \`${result.privacy.mode}\``,
    `Raw files included: ${result.privacy.rawFilesIncluded ? "yes" : "no"}`,
    "",
    "## Summary",
    "",
    `- config-audit: ${result.summary.configStatus}`,
    `- plugin-audit: ${result.summary.pluginStatus}`,
    `- session-audit: ${result.summary.sessionStatus}`,
    `- reports written: ${result.summary.reports}`,
    "",
    "## Recommended Attachments",
    ""
  ];

  for (const attachment of result.recommendedAttachments) {
    lines.push(`- \`${attachment}\``);
  }

  lines.push(
    "",
    "Do not publicly attach raw `config.toml`, `logs_2.sqlite`, `state_5.sqlite`, `session_index.jsonl`, rollout JSONL, or local Codex logs unless OpenAI asks for them privately.",
    ""
  );

  return lines.join("\n");
}

function renderDiagnosticsBundleReadme(result: DiagnosticsBundleResult): string {
  const lines = [
    "# Codex Diagnostics Bundle",
    "",
    "This bundle was generated by `trace-to-skill diagnostics-bundle` for OpenAI Codex issue triage.",
    "",
    "It is metadata-only: it includes config, plugin, and session audit summaries and does not copy raw transcripts, raw config, SQLite databases, or local logs.",
    "",
    "## What To Attach",
    ""
  ];

  for (const attachment of result.recommendedAttachments) {
    lines.push(`- \`${attachment}\``);
  }

  lines.push(
    "",
    "## Do Not Publicly Attach",
    ""
  );

  for (const rawFile of result.privacy.excludedRawFiles) {
    lines.push(`- \`${rawFile}\``);
  }

  lines.push(
    "",
    "If OpenAI asks for raw logs privately, back them up first and redact secrets, local paths, tokens, private prompts, and personal identifiers.",
    "",
    "## Status",
    "",
    `- bundle: ${result.status}`,
    `- config-audit: ${result.summary.configStatus}`,
    `- plugin-audit: ${result.summary.pluginStatus}`,
    `- session-audit: ${result.summary.sessionStatus}`,
    `- generatedAt: ${result.generatedAt}`,
    `- target: \`${result.target}\``,
    ""
  );

  return lines.join("\n");
}

async function prepareOutputDirectory(outputDir: string, force: boolean): Promise<void> {
  await mkdir(outputDir, { recursive: true });
  const existing = await readdir(outputDir);
  if (existing.length > 0 && !force) {
    throw new Error(`diagnostics bundle output directory is not empty: ${outputDir}. Use --force or choose a new --output directory.`);
  }
}

function report(
  kind: DiagnosticsBundleReport["kind"],
  format: DiagnosticsBundleReport["format"],
  outputDir: string,
  filename: string
): DiagnosticsBundleReport {
  return {
    kind,
    format,
    path: path.join(outputDir, filename)
  };
}

function combinedStatus(...statuses: DiagnosticsBundleStatus[]): DiagnosticsBundleStatus {
  if (statuses.includes("fail")) {
    return "fail";
  }
  if (statuses.includes("warn")) {
    return "warn";
  }
  return "pass";
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
