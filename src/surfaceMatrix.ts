import type { FindingKind } from "./types.js";
import type { IssueMapKindSummary, IssueMapResult } from "./issueMap.js";

export interface SurfaceMatrixRow {
  surface: string;
  status: "blocked" | "degraded" | "requested";
  kind: FindingKind;
  issues: number;
  comments: number;
  reactions: number;
  priorityScore: number;
  examples: IssueMapKindSummary["examples"];
  supportPolicyQuestion: string;
  evidenceChecklist: string[];
  bestCommand: string;
}

export interface SurfaceMatrixResult {
  generatedAt: string;
  sources: string[];
  issueCount: number;
  rows: SurfaceMatrixRow[];
  nextActions: string[];
}

const SURFACE_PROFILES: Partial<Record<FindingKind, {
  surface: string;
  status: SurfaceMatrixRow["status"];
  supportPolicyQuestion: string;
  evidenceChecklist: string[];
  bestCommand: string;
}>> = {
  codex_platform_availability: {
    surface: "Desktop app, packaged builds, and IDE ecosystems",
    status: "blocked",
    supportPolicyQuestion: "Which OS, CPU architecture, package format, or IDE ecosystem is officially supported, planned, or out of scope?",
    evidenceChecklist: [
      "requested surface such as Desktop, Linux package, macOS Intel/Universal build, or JetBrains extension",
      "platform, architecture, distro/window system, package format, or IDE name/version",
      "exact install or launch error plus screenshot text when available",
      "same-machine Codex CLI version and whether CLI works",
      "comments/reactions/signup demand and any release-note or docs support-policy statement"
    ],
    bestCommand: "trace-to-skill demo platform-availability"
  },
  codex_remote_connection: {
    surface: "Remote SSH, cloud, WSL, container, and GPU workspaces",
    status: "blocked",
    supportPolicyQuestion: "Can Codex attach to remote filesystems and run against the remote machine as the source of truth?",
    evidenceChecklist: [
      "Codex Desktop/app version, local OS, remote OS/architecture, and remote Codex CLI/app-server version",
      "SSH alias, selected host/path, remote workspace path, and whether the remote filesystem is source of truth",
      "`[features].remote_connections = true` and Settings > Connections visibility",
      "local tunnel, codex-server/app-server, fs/getMetadata, model-list, auth, proxy, PATH, or ForwardAgent evidence",
      "reconnect/resume behavior and whether a clean host works"
    ],
    bestCommand: "trace-to-skill demo remote-connection"
  },
  codex_context_visibility: {
    surface: "Desktop context and token-pressure visibility",
    status: "degraded",
    supportPolicyQuestion: "Where should users see passive context-window pressure before compaction becomes risky?",
    evidenceChecklist: [
      "Codex Desktop version, OS, surface, and screenshot or recording of the chat input area",
      "prior context/token indicator or tooltip behavior before the update",
      "long-session context pressure, compaction timing, and whether /status is enough",
      "CLI/TUI comparison if another surface still shows context pressure"
    ],
    bestCommand: "trace-to-skill demo context-visibility"
  },
  codex_mcp_discovery_mismatch: {
    surface: "MCP tools across CLI, Desktop, VS Code, WSL, and remote sessions",
    status: "degraded",
    supportPolicyQuestion: "Which config scope is authoritative for each Codex surface, and why are tools visible in one surface but missing in another?",
    evidenceChecklist: [
      "app/CLI/extension version, OS, IDE, WSL/remote/SSH state, and workspace root",
      "effective CODEX_HOME and config files considered",
      "redacted MCP config, trust/profile/default-permissions state, and codex mcp list/get output",
      "CLI-versus-Desktop/VS Code/new-conversation comparison",
      "restart/reload behavior and loaded config/log lines"
    ],
    bestCommand: "trace-to-skill demo mcp-discovery-mismatch"
  },
  codex_file_tree_ui: {
    surface: "Desktop file tree and workspace navigation",
    status: "degraded",
    supportPolicyQuestion: "Can users reliably inspect and navigate the workspace that Codex is editing?",
    evidenceChecklist: [
      "Codex Desktop version, OS, architecture, and local/SSH/WSL/remote workspace state",
      "View > Toggle File Tree, folder icon, floating panel, or preview route",
      "expected versus observed file list, stale refresh, missing folder, or preview error",
      "reload/restart/new-workspace comparison"
    ],
    bestCommand: "trace-to-skill demo file-tree-ui"
  },
  codex_plugin_runtime: {
    surface: "Bundled plugins, connectors, Browser, Chrome, and Computer Use",
    status: "degraded",
    supportPolicyQuestion: "Which bundled capability is advertised to users but unavailable at runtime?",
    evidenceChecklist: [
      "plugin or connector name, Codex app version, platform, CODEX_HOME, and plugin cache path",
      "plugin manifest, marketplace, helper-app, native pipe, or schema error",
      "restart/reinstall/cache-clear behavior",
      "external MCP or browser fallback result when available"
    ],
    bestCommand: "trace-to-skill plugin-audit ~/.codex --format markdown"
  }
};

export function buildSurfaceMatrix(issueMap: IssueMapResult): SurfaceMatrixResult {
  const rows = issueMap.summaries
    .map((summary) => buildSurfaceRow(summary))
    .filter((row): row is SurfaceMatrixRow => Boolean(row))
    .sort((a, b) => b.priorityScore - a.priorityScore || b.reactions - a.reactions || a.surface.localeCompare(b.surface));

  return {
    generatedAt: new Date().toISOString(),
    sources: issueMap.sources,
    issueCount: issueMap.issueCount,
    rows,
    nextActions: [
      "Publish this matrix with the issue radar so users can see which Codex surfaces are blocked versus degraded.",
      "For blocked rows, collect support-policy evidence from release notes or docs before filing a new issue.",
      "For degraded rows, attach the row checklist and a trace-to-skill demo/codex-report output instead of screenshots alone."
    ]
  };
}

export function renderSurfaceMatrixMarkdown(result: SurfaceMatrixResult): string {
  const lines = [
    "# Codex Surface Support Matrix",
    "",
    `Generated: ${result.generatedAt}`,
    `Issues analyzed: **${result.issueCount}**`,
    "",
    "This matrix turns live Codex issue demand into surface-specific support questions, evidence checklists, and first commands.",
    "",
    "| Surface | Status | Issues | Comments | Reactions | Example | First command |",
    "| --- | --- | ---: | ---: | ---: | --- | --- |"
  ];

  for (const row of result.rows) {
    lines.push(`| ${escapeCell(row.surface)} | ${row.status} | ${row.issues} | ${row.comments} | ${row.reactions} | ${formatExample(row.examples[0])} | \`${escapeCell(row.bestCommand)}\` |`);
  }

  lines.push("", "## Evidence Checklists", "");
  for (const row of result.rows) {
    lines.push(`### ${row.surface}`, "");
    lines.push(`Support-policy question: ${row.supportPolicyQuestion}`, "");
    lines.push("Examples:");
    for (const example of row.examples) {
      lines.push(`- ${formatExample(example)} (${example.comments} comments; labels: ${example.labels.join(", ") || "none"})`);
    }
    lines.push("", "Attach:");
    for (const item of row.evidenceChecklist) {
      lines.push(`- ${item}`);
    }
    lines.push("");
  }

  lines.push("## Next Actions", "");
  for (const action of result.nextActions) {
    lines.push(`- ${action}`);
  }
  lines.push("");

  return `${lines.join("\n").trimEnd()}\n`;
}

function buildSurfaceRow(summary: IssueMapKindSummary): SurfaceMatrixRow | undefined {
  const profile = SURFACE_PROFILES[summary.kind];
  if (!profile) {
    return undefined;
  }

  return {
    surface: profile.surface,
    status: profile.status,
    kind: summary.kind,
    issues: summary.issues,
    comments: summary.comments,
    reactions: summary.reactions,
    priorityScore: summary.priorityScore,
    examples: summary.examples,
    supportPolicyQuestion: profile.supportPolicyQuestion,
    evidenceChecklist: profile.evidenceChecklist,
    bestCommand: profile.bestCommand
  };
}

function formatExample(example: IssueMapKindSummary["examples"][number] | undefined): string {
  if (!example) {
    return "none";
  }

  const label = `${example.id} ${example.title}`;
  return example.url ? `[${escapeMarkdown(label)}](${example.url})` : escapeMarkdown(label);
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|");
}

function escapeMarkdown(value: string): string {
  return value.replace(/\[/g, "\\[").replace(/\]/g, "\\]");
}
