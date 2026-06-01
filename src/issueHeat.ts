import { readFile } from "node:fs/promises";
import path from "node:path";
import { analyzeInputs } from "./analyze.js";
import { fetchGithubIssues, parseIssueExport, type GithubIssueMapOptions, type IssueMapSource, type NormalizedIssue } from "./issueMap.js";
import type { FindingKind, Severity, TraceInput } from "./types.js";

export interface IssueHeatOptions {
  top?: number;
  windowHours?: number;
  now?: Date;
}

export interface GithubIssueHeatOptions extends IssueHeatOptions, GithubIssueMapOptions {}

export interface IssueHeatExample {
  id: string;
  title: string;
  url?: string;
  labels: string[];
  comments: number;
  reactions: number;
  createdAt?: string;
  updatedAt?: string;
  ageHours?: number;
  heatScore: number;
}

export interface IssueHeatSummary {
  kind: FindingKind;
  title: string;
  severity: Severity;
  issues: number;
  comments: number;
  reactions: number;
  heatScore: number;
  latestUpdatedAt?: string;
  examples: IssueHeatExample[];
  action: string;
}

export interface IssueHeatResult {
  generatedAt: string;
  sources: string[];
  windowHours: number;
  issueCount: number;
  consideredIssueCount: number;
  matchedIssueCount: number;
  hot: IssueHeatSummary[];
  unmatchedRecentIssues: IssueHeatExample[];
}

const DEFAULT_WINDOW_HOURS = 24;

const SEVERITY_WEIGHT: Record<Severity, number> = {
  low: 4,
  medium: 12,
  high: 28,
  critical: 48
};

const SEVERITY_RANK: Record<Severity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3
};

const LOW_SIGNAL_HEAT_KINDS = new Set<FindingKind>(["weak_evidence", "premature_completion"]);

export async function buildIssueHeat(targets: string[], options: IssueHeatOptions = {}): Promise<IssueHeatResult> {
  if (targets.length === 0) {
    throw new Error("issue-heat requires at least one GitHub issue export file.");
  }

  const sources: IssueMapSource[] = [];
  for (const target of targets) {
    sources.push({
      source: target,
      raw: await readFile(path.resolve(target), "utf8")
    });
  }

  return buildIssueHeatFromSources(sources, options);
}

export function buildIssueHeatFromSources(sources: IssueMapSource[], options: IssueHeatOptions = {}): IssueHeatResult {
  if (sources.length === 0) {
    throw new Error("issue-heat requires at least one GitHub issue export file or stdin input.");
  }

  const issues: NormalizedIssue[] = [];
  for (const source of sources) {
    issues.push(...parseIssueExport(source.raw, source.source));
  }

  return buildIssueHeatFromIssues(issues, sources.map((source) => source.source), options);
}

export async function buildGithubIssueHeat(repo: string, options: GithubIssueHeatOptions = {}): Promise<IssueHeatResult> {
  const issues = await fetchGithubIssues(repo, {
    ...options,
    sort: options.sort ?? "updated",
    direction: options.direction ?? "desc"
  });
  return buildIssueHeatFromIssues(issues, [`github:${repo}`], options);
}

export function buildIssueHeatFromIssues(issues: NormalizedIssue[], sources: string[], options: IssueHeatOptions = {}): IssueHeatResult {
  const now = options.now ?? new Date();
  const windowHours = positiveNumber(options.windowHours) ?? DEFAULT_WINDOW_HOURS;
  const top = options.top ?? 12;
  const windowStart = now.getTime() - windowHours * 60 * 60 * 1000;
  const recentIssues = issues.filter((issue) => {
    const timestamp = issueTimestamp(issue);
    return timestamp === undefined || timestamp >= windowStart;
  });

  const summaryByKind = new Map<FindingKind, IssueHeatSummary>();
  const matchedIssues = new Set<string>();
  const unmatched: IssueHeatExample[] = [];

  for (const issue of recentIssues) {
    const input: TraceInput = {
      path: issue.id.startsWith("#") ? issue.id : `#${issue.id}`,
      content: renderIssueTrace(issue)
    };
    const analysis = analyzeInputs([input]);
    const kinds = new Set<FindingKind>();
    for (const finding of analysis.findings) {
      if (kinds.has(finding.kind)) {
        continue;
      }
      kinds.add(finding.kind);
      if (LOW_SIGNAL_HEAT_KINDS.has(finding.kind)) {
        continue;
      }

      if (finding.kind !== "weak_evidence") {
        matchedIssues.add(issue.id);
      }

      const issueScore = heatScoreForIssue(issue, finding.severity, finding.kind, now, windowHours);
      const example = issueExample(issue, issueScore, now);
      const existing = summaryByKind.get(finding.kind);
      if (!existing) {
        summaryByKind.set(finding.kind, {
          kind: finding.kind,
          title: finding.title,
          severity: finding.severity,
          issues: 1,
          comments: issue.comments,
          reactions: issue.reactions,
          heatScore: issueScore,
          latestUpdatedAt: issue.updatedAt ?? issue.createdAt,
          examples: [example],
          action: actionForKind(finding.kind)
        });
        continue;
      }

      existing.issues += 1;
      existing.comments += issue.comments;
      existing.reactions += issue.reactions;
      existing.heatScore += issueScore;
      existing.latestUpdatedAt = latestTimestamp(existing.latestUpdatedAt, issue.updatedAt ?? issue.createdAt);
      if (SEVERITY_RANK[finding.severity] > SEVERITY_RANK[existing.severity]) {
        existing.severity = finding.severity;
      }
      existing.examples.push(example);
    }

    if (![...kinds].some((kind) => !LOW_SIGNAL_HEAT_KINDS.has(kind))) {
      unmatched.push(issueExample(issue, heatScoreForIssue(issue, "low", "weak_evidence", now, windowHours), now));
    }
  }

  const hot = Array.from(summaryByKind.values())
    .map((summary) => ({
      ...summary,
      examples: summary.examples
        .sort((a, b) => b.heatScore - a.heatScore || b.comments - a.comments || a.title.localeCompare(b.title))
        .slice(0, 5)
    }))
    .sort((a, b) => b.heatScore - a.heatScore || b.comments - a.comments || a.kind.localeCompare(b.kind))
    .slice(0, top);

  return {
    generatedAt: now.toISOString(),
    sources,
    windowHours,
    issueCount: issues.length,
    consideredIssueCount: recentIssues.length,
    matchedIssueCount: matchedIssues.size,
    hot,
    unmatchedRecentIssues: unmatched
      .sort((a, b) => b.heatScore - a.heatScore || b.comments - a.comments || a.title.localeCompare(b.title))
      .slice(0, top)
  };
}

export function renderIssueHeatMarkdown(result: IssueHeatResult): string {
  const lines = [
    "# GitHub Issue Heat",
    "",
    `Generated: ${result.generatedAt}`,
    `Window: last **${result.windowHours} hour(s)**`,
    `Issues fetched: **${result.issueCount}**`,
    `Issues in window: **${result.consideredIssueCount}**`,
    `Matched hot issues: **${result.matchedIssueCount}**`,
    "",
    "This report is recency-weighted. Use it beside `issue-map`: `issue-map` shows all-time pain, while `issue-heat` shows what is moving right now.",
    "",
    "```bash",
    "trace-to-skill issue-heat --repo openai/codex --state open --limit 100 --window-hours 24 --output codex-issue-heat.md",
    "gh issue list --repo openai/codex --state open --limit 100 --json number,title,body,url,labels,comments,createdAt,updatedAt | trace-to-skill issue-heat - --format json",
    "```",
    "",
    "## Hot Clusters",
    "",
    "| Heat | Kind | Severity | Issues | Comments | Reactions | Latest | Example | Action |",
    "| ---: | --- | --- | ---: | ---: | ---: | --- | --- | --- |"
  ];

  for (const summary of result.hot) {
    const example = summary.examples[0];
    lines.push(`| ${summary.heatScore} | \`${summary.kind}\` | ${summary.severity} | ${summary.issues} | ${summary.comments} | ${summary.reactions} | ${summary.latestUpdatedAt ?? "unknown"} | ${example ? formatIssueLink(example) : "none"} | \`${escapeMarkdownTable(summary.action)}\` |`);
  }

  lines.push("", "## Cluster Details", "");
  for (const summary of result.hot.filter((item) => item.kind !== "weak_evidence").slice(0, 8)) {
    lines.push(`### ${summary.kind}`, "");
    lines.push(`Heat score: ${summary.heatScore}. ${summary.issues} recent issue(s), ${summary.comments} comment(s).`, "");
    lines.push(`First action: \`${summary.action}\``, "");
    lines.push("Examples:");
    for (const example of summary.examples) {
      const age = example.ageHours === undefined ? "unknown age" : `${example.ageHours.toFixed(1)}h old`;
      lines.push(`- ${formatIssueLink(example)} (${age}; ${example.comments} comments; labels: ${example.labels.join(", ") || "none"})`);
    }
    lines.push("");
  }

  if (result.unmatchedRecentIssues.length > 0) {
    lines.push("## Unmatched Recent Issues", "");
    for (const issue of result.unmatchedRecentIssues) {
      const age = issue.ageHours === undefined ? "unknown age" : `${issue.ageHours.toFixed(1)}h old`;
      lines.push(`- ${formatIssueLink(issue)} (${age}; ${issue.comments} comments; labels: ${issue.labels.join(", ") || "none"})`);
    }
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function renderIssueTrace(issue: NormalizedIssue): string {
  const parts = [
    `# ${issue.title}`,
    "",
    issue.url ? `URL: ${issue.url}` : undefined,
    issue.createdAt ? `Created: ${issue.createdAt}` : undefined,
    issue.updatedAt ? `Updated: ${issue.updatedAt}` : undefined,
    issue.labels.length > 0 ? `Labels: ${issue.labels.join(", ")}` : undefined,
    `Comments: ${issue.comments}`,
    issue.reactions > 0 ? `Reactions: ${issue.reactions}` : undefined,
    "",
    issue.body
  ].filter((part): part is string => part !== undefined);

  if (issue.commentBodies.length > 0) {
    parts.push("", "## Comments", "", ...issue.commentBodies.slice(0, 10));
  }

  return parts.join("\n");
}

function heatScoreForIssue(issue: NormalizedIssue, severity: Severity, kind: FindingKind, now: Date, windowHours: number): number {
  const ageHours = ageHoursForIssue(issue, now);
  const recencyBoost = ageHours === undefined ? 20 : Math.max(0, 120 - (ageHours / windowHours) * 100);
  const commentBoost = Math.min(120, issue.comments * 6);
  const reactionBoost = Math.min(100, issue.reactions);
  const labelBoost = issue.labels.reduce((sum, label) => sum + labelHeat(label), 0);
  const kindPenalty = kind === "weak_evidence" ? -40 : 0;
  return Math.max(1, Math.round(recencyBoost + commentBoost + reactionBoost + SEVERITY_WEIGHT[severity] + labelBoost + kindPenalty));
}

function issueExample(issue: NormalizedIssue, heatScore: number, now: Date): IssueHeatExample {
  return {
    id: issue.id,
    title: issue.title,
    url: issue.url,
    labels: issue.labels,
    comments: issue.comments,
    reactions: issue.reactions,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
    ageHours: ageHoursForIssue(issue, now),
    heatScore
  };
}

function issueTimestamp(issue: NormalizedIssue): number | undefined {
  const timestamp = Date.parse(issue.updatedAt ?? issue.createdAt ?? "");
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

function ageHoursForIssue(issue: NormalizedIssue, now: Date): number | undefined {
  const timestamp = issueTimestamp(issue);
  if (timestamp === undefined) {
    return undefined;
  }
  return Math.max(0, (now.getTime() - timestamp) / (60 * 60 * 1000));
}

function latestTimestamp(a: string | undefined, b: string | undefined): string | undefined {
  if (!a) {
    return b;
  }
  if (!b) {
    return a;
  }
  return Date.parse(b) > Date.parse(a) ? b : a;
}

function labelHeat(label: string): number {
  const normalized = label.toLowerCase();
  if (normalized.includes("bug")) {
    return 12;
  }
  if (normalized.includes("windows") || normalized.includes("app") || normalized.includes("computer-use")) {
    return 10;
  }
  if (normalized.includes("sandbox") || normalized.includes("rate-limits") || normalized.includes("context")) {
    return 8;
  }
  if (normalized.includes("enhancement")) {
    return 3;
  }
  return 0;
}

function positiveNumber(value: number | undefined): number | undefined {
  return value !== undefined && Number.isFinite(value) && value > 0 ? value : undefined;
}

function actionForKind(kind: FindingKind): string {
  if (kind === "codex_token_burn" || kind === "codex_usage_bucket_confusion" || kind === "codex_usage_reset_drift" || kind === "quota_mismatch") {
    return "trace-to-skill usage-doctor ./usage-notes.md --output usage-evidence.md";
  }
  if (kind === "codex_windows_helper_path" || kind === "sandbox_permission" || kind === "codex_plugin_runtime") {
    return "trace-to-skill diagnostics-bundle ~/.codex --output codex-diagnostics";
  }
  if (kind === "codex_resource_leak") {
    return "trace-to-skill process-audit ./process-notes.md --output process-audit.md";
  }
  if (kind === "codex_mcp_discovery_mismatch" || kind === "codex_mcp_runtime" || kind === "codex_mcp_streamable_http") {
    return "trace-to-skill plugin-audit ~/.codex --format markdown";
  }
  if (kind === "sensitive_file_access" || kind === "prompt_injection") {
    return "trace-to-skill sensitive-audit . --format markdown";
  }
  if (kind === "codex_remote_connection" || kind === "codex_remote_control") {
    return "trace-to-skill demo remote-connection";
  }
  if (kind === "codex_platform_availability") {
    return "trace-to-skill demo platform-availability";
  }
  if (kind === "codex_context_visibility" || kind === "context_compaction" || kind === "codex_remote_compact") {
    return "trace-to-skill codex-report ./runs --output openai-codex-issue.md";
  }
  return "trace-to-skill codex-report ./runs --output openai-codex-issue.md";
}

function formatIssueLink(issue: { id: string; title: string; url?: string }): string {
  const label = `${issue.id} ${escapeMarkdownTable(issue.title)}`;
  return issue.url ? `[${label}](${issue.url})` : label;
}

function escapeMarkdownTable(value: string): string {
  return value.replace(/\|/g, "\\|");
}
