import { readFile } from "node:fs/promises";
import path from "node:path";
import { analyzeInputs } from "./analyze.js";
import type { AnalysisResult, FindingKind, Severity, TraceInput } from "./types.js";

export interface IssueMapOptions {
  top?: number;
}

export interface GithubIssueMapOptions extends IssueMapOptions {
  state?: "open" | "closed" | "all";
  limit?: number;
  token?: string;
  apiBaseUrl?: string;
}

export interface IssueMapIssue {
  id: string;
  title: string;
  url?: string;
  labels: string[];
  comments: number;
  reactions: number;
  updatedAt?: string;
  analysis: AnalysisResult;
}

export interface IssueMapKindSummary {
  kind: FindingKind;
  title: string;
  severity: Severity;
  issues: number;
  comments: number;
  reactions: number;
  priorityScore: number;
  examples: Array<{
    id: string;
    title: string;
    url?: string;
    comments: number;
    labels: string[];
  }>;
  suggestedRules: string[];
}

export interface IssueMapRoadmapItem {
  rank: number;
  kind: FindingKind;
  priorityScore: number;
  targetArtifact: string;
  command: string;
  rationale: string;
  examples: IssueMapKindSummary["examples"];
}

export interface IssueMapResult {
  generatedAt: string;
  sources: string[];
  issueCount: number;
  matchedIssueCount: number;
  unmatchedIssueCount: number;
  summaries: IssueMapKindSummary[];
  roadmap: IssueMapRoadmapItem[];
  unmatchedIssues: Array<{
    id: string;
    title: string;
    url?: string;
    comments: number;
    labels: string[];
  }>;
}

interface RawIssue {
  number?: unknown;
  id?: unknown;
  title?: unknown;
  body?: unknown;
  url?: unknown;
  html_url?: unknown;
  labels?: unknown;
  comments?: unknown;
  commentsCount?: unknown;
  reactions?: unknown;
  updatedAt?: unknown;
  createdAt?: unknown;
  updated_at?: unknown;
  created_at?: unknown;
  pull_request?: unknown;
}

interface NormalizedIssue {
  id: string;
  title: string;
  body: string;
  url?: string;
  labels: string[];
  comments: number;
  commentBodies: string[];
  reactions: number;
  updatedAt?: string;
}

const SEVERITY_WEIGHT: Record<Severity, number> = {
  low: 1,
  medium: 3,
  high: 7,
  critical: 13
};

const SEVERITY_RANK: Record<Severity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3
};

export async function buildIssueMap(targets: string[], options: IssueMapOptions = {}): Promise<IssueMapResult> {
  if (targets.length === 0) {
    throw new Error("issue-map requires at least one GitHub issue export file.");
  }

  const normalizedIssues: NormalizedIssue[] = [];
  for (const target of targets) {
    const source = path.resolve(target);
    const raw = await readFile(source, "utf8");
    normalizedIssues.push(...parseIssueExport(raw, target));
  }

  return buildIssueMapFromNormalized(normalizedIssues, targets, options);
}

export async function buildGithubIssueMap(repo: string, options: GithubIssueMapOptions = {}): Promise<IssueMapResult> {
  const match = repo.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (!match) {
    throw new Error("--repo must use the owner/name format, for example openai/codex.");
  }

  const [, owner, name] = match;
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 100);
  const state = options.state ?? "open";
  const apiBaseUrl = options.apiBaseUrl ?? "https://api.github.com";
  const url = new URL(`${apiBaseUrl.replace(/\/$/, "")}/repos/${owner}/${name}/issues`);
  url.searchParams.set("state", state);
  url.searchParams.set("sort", "comments");
  url.searchParams.set("direction", "desc");
  url.searchParams.set("per_page", String(limit));

  const headers: Record<string, string> = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "trace-to-skill",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  const token = options.token ?? process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub issues request failed: ${response.status} ${response.statusText}${body ? `: ${body.slice(0, 240)}` : ""}`);
  }

  const rawIssues = (await response.json()) as unknown;
  const issues = extractIssueArray(rawIssues)
    .filter((issue) => !asRecord(issue.pull_request))
    .slice(0, limit)
    .map((issue, index) => normalizeIssue(issue, `github:${repo}`, index));

  return buildIssueMapFromNormalized(issues, [`github:${repo}`], options);
}

function buildIssueMapFromNormalized(normalized: NormalizedIssue[], sources: string[], options: IssueMapOptions): IssueMapResult {
  const issues: IssueMapIssue[] = [];
  for (const issue of normalized) {
    const input: TraceInput = {
      path: `${issue.id.startsWith("#") ? issue.id : `#${issue.id}`}`,
      content: renderIssueTrace(issue)
    };
    issues.push({
      id: issue.id,
      title: issue.title,
      url: issue.url,
      labels: issue.labels,
      comments: issue.comments,
      reactions: issue.reactions,
      updatedAt: issue.updatedAt,
      analysis: analyzeInputs([input])
    });
  }

  const summaryByKind = new Map<FindingKind, IssueMapKindSummary>();
  const matchedIssues = new Set<string>();

  for (const issue of issues) {
    const seenKinds = new Set<FindingKind>();
    for (const finding of issue.analysis.findings) {
      if (seenKinds.has(finding.kind)) {
        continue;
      }
      seenKinds.add(finding.kind);
      if (finding.kind !== "weak_evidence") {
        matchedIssues.add(issue.id);
      }

      const existing = summaryByKind.get(finding.kind);
      if (!existing) {
        summaryByKind.set(finding.kind, {
          kind: finding.kind,
          title: finding.title,
          severity: finding.severity,
          issues: 1,
          comments: issue.comments,
          reactions: issue.reactions,
          priorityScore: priorityScore(1, issue.comments, issue.reactions, finding.severity, finding.kind),
          examples: [issueExample(issue)],
          suggestedRules: [finding.suggestedRule]
        });
        continue;
      }

      existing.issues += 1;
      existing.comments += issue.comments;
      existing.reactions += issue.reactions;
      existing.priorityScore = priorityScore(existing.issues, existing.comments, existing.reactions, existing.severity, finding.kind);
      if (SEVERITY_RANK[finding.severity] > SEVERITY_RANK[existing.severity]) {
        existing.severity = finding.severity;
        existing.priorityScore = priorityScore(existing.issues, existing.comments, existing.reactions, existing.severity, finding.kind);
      }
      if (existing.examples.length < 3) {
        existing.examples.push(issueExample(issue));
      }
      if (!existing.suggestedRules.includes(finding.suggestedRule) && existing.suggestedRules.length < 3) {
        existing.suggestedRules.push(finding.suggestedRule);
      }
    }
  }

  const top = options.top ?? 12;
  const summaries = Array.from(summaryByKind.values())
    .sort((a, b) => b.priorityScore - a.priorityScore || b.comments - a.comments || a.kind.localeCompare(b.kind))
    .slice(0, top);

  return {
    generatedAt: new Date().toISOString(),
    sources,
    issueCount: issues.length,
    matchedIssueCount: matchedIssues.size,
    unmatchedIssueCount: issues.length - matchedIssues.size,
    summaries,
    roadmap: buildRoadmap(summaries),
    unmatchedIssues: issues
      .filter((issue) => !matchedIssues.has(issue.id))
      .sort((a, b) => b.comments - a.comments || a.title.localeCompare(b.title))
      .slice(0, top)
      .map(issueExample)
  };
}

export function renderIssueMapMarkdown(result: IssueMapResult): string {
  const lines = [
    "# GitHub Issue Pain Map",
    "",
    `Generated: ${result.generatedAt}`,
    "",
    `Issues analyzed: **${result.issueCount}**`,
    `Matched issues: **${result.matchedIssueCount}**`,
    `Unmatched issues: **${result.unmatchedIssueCount}**`,
    "",
    "This report maps GitHub issues onto deterministic `trace-to-skill` failure classes. Fetch a repository directly with `--repo`, or export issues with `gh issue list` / `gh search issues` and pass the JSON file.",
    "",
    "```bash",
    "trace-to-skill issue-map --repo openai/codex --output codex-issue-map.md",
    "gh issue list --repo openai/codex --state open --limit 100 --json number,title,body,url,labels,comments,createdAt,updatedAt > codex-issues.json",
    "trace-to-skill issue-map codex-issues.json --output codex-issue-map.md",
    "```",
    "",
    "## Top Clusters",
    "",
    "| Priority | Kind | Severity | Issues | Comments | Reactions | Example |",
    "| ---: | --- | --- | ---: | ---: | ---: | --- |"
  ];

  for (const summary of result.summaries) {
    const example = summary.examples[0];
    lines.push(`| ${summary.priorityScore} | \`${summary.kind}\` | ${summary.severity} | ${summary.issues} | ${summary.comments} | ${summary.reactions} | ${example ? formatIssueLink(example) : "none"} |`);
  }

  if (result.roadmap.length > 0) {
    lines.push("", "## Maintainer Roadmap", "");
    lines.push("| Rank | Next artifact | Why now | Command |");
    lines.push("| ---: | --- | --- | --- |");
    for (const item of result.roadmap) {
      lines.push(`| ${item.rank} | ${escapeMarkdownTable(item.targetArtifact)} | ${escapeMarkdownTable(item.rationale)} | \`${escapeMarkdownTable(item.command)}\` |`);
    }
  }

  lines.push("", "## Suggested Next Actions", "");
  const suggestedSummaries = result.summaries.filter((summary) => summary.kind !== "weak_evidence");
  for (const summary of (suggestedSummaries.length > 0 ? suggestedSummaries : result.summaries).slice(0, 5)) {
    lines.push(`### ${summary.kind}`, "");
    lines.push(`Priority score: ${summary.priorityScore}. ${summary.issues} issue(s), ${summary.comments} comment(s).`, "");
    lines.push("Example issues:");
    for (const example of summary.examples) {
      lines.push(`- ${formatIssueLink(example)} (${example.comments} comments; labels: ${example.labels.join(", ") || "none"})`);
    }
    lines.push("", "Evidence rule prompts:");
    for (const rule of summary.suggestedRules) {
      lines.push(`- ${rule}`);
    }
    lines.push("");
  }

  if (result.unmatchedIssues.length > 0) {
    lines.push("## Unmatched Issues", "");
    for (const issue of result.unmatchedIssues) {
      lines.push(`- ${formatIssueLink(issue)} (${issue.comments} comments; labels: ${issue.labels.join(", ") || "none"})`);
    }
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function buildRoadmap(summaries: IssueMapKindSummary[]): IssueMapRoadmapItem[] {
  const actionable = summaries.filter((summary) => summary.kind !== "weak_evidence");
  const selected = (actionable.length > 0 ? actionable : summaries).slice(0, 5);
  return selected.map((summary, index) => {
    const action = roadmapAction(summary.kind);
    return {
      rank: index + 1,
      kind: summary.kind,
      priorityScore: summary.priorityScore,
      targetArtifact: action.targetArtifact,
      command: action.command,
      rationale: `${summary.issues} issue(s), ${summary.comments} comment(s), severity ${summary.severity}; top signal: ${summary.kind}.`,
      examples: summary.examples
    };
  });
}

function roadmapAction(kind: FindingKind): { targetArtifact: string; command: string } {
  if (kind === "codex_token_burn" || kind === "codex_usage_bucket_confusion" || kind === "codex_usage_reset_drift" || kind === "quota_mismatch") {
    return {
      targetArtifact: "Usage evidence fixture and support-ready token report",
      command: "trace-to-skill usage-evidence ./usage-notes.md --output usage-evidence.md"
    };
  }

  if (kind === "codex_remote_compact" || kind === "context_compaction" || kind === "codex_context_fork_bloat" || kind === "codex_latest_turn_drift") {
    return {
      targetArtifact: "Compaction/session regression fixture and Codex issue report",
      command: "trace-to-skill codex-report ./runs --output openai-codex-issue.md"
    };
  }

  if (kind === "codex_subagent_lifecycle" || kind === "codex_subagent_prompt_leakage") {
    return {
      targetArtifact: "Subagent lifecycle fixture and session audit",
      command: "trace-to-skill session-audit ~/.codex --format markdown"
    };
  }

  if (kind === "sensitive_file_access" || kind === "prompt_injection") {
    return {
      targetArtifact: "Privacy/safety guardrail and redacted support bundle",
      command: "trace-to-skill diagnostics-bundle ~/.codex --output codex-diagnostics"
    };
  }

  if (kind === "codex_tool_call_integrity") {
    return {
      targetArtifact: "Patch safety fixture and pre-agent checkpoint workflow",
      command: "trace-to-skill checkpoint . --output .trace-to-skill/checkpoints/before-codex"
    };
  }

  if (kind === "codex_windows_helper_path" || kind === "sandbox_permission") {
    return {
      targetArtifact: "Windows sandbox/helper diagnostic bundle",
      command: "trace-to-skill diagnostics-bundle ~/.codex --output codex-diagnostics"
    };
  }

  if (kind === "codex_mcp_discovery_mismatch" || kind === "codex_mcp_runtime" || kind === "codex_mcp_streamable_http") {
    return {
      targetArtifact: "MCP startup and transport diagnostic fixture",
      command: "trace-to-skill plugin-audit ~/.codex --format markdown"
    };
  }

  if (kind === "codex_terminal_output_integrity" || kind === "codex_resource_leak") {
    return {
      targetArtifact: "Runtime/process evidence report",
      command: "trace-to-skill process-audit ./process-notes.md --output process-audit.md"
    };
  }

  return {
    targetArtifact: "Codex-ready issue report and failure fixture",
    command: "trace-to-skill codex-report ./runs --output openai-codex-issue.md"
  };
}

function parseIssueExport(raw: string, source: string): NormalizedIssue[] {
  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed) as unknown;
    const values = extractIssueArray(parsed);
    return values.map((value, index) => normalizeIssue(value, source, index));
  }

  return [{
    id: path.basename(source),
    title: path.basename(source),
    body: raw,
    labels: [],
    comments: 0,
    commentBodies: [],
    reactions: 0
  }];
}

function extractIssueArray(value: unknown): RawIssue[] {
  if (Array.isArray(value)) {
    return value.map((item) => asRawIssue(item));
  }

  const object = asRecord(value);
  if (!object) {
    return [];
  }

  for (const key of ["issues", "items", "nodes", "data"]) {
    const candidate = object[key];
    if (Array.isArray(candidate)) {
      return candidate.map((item) => asRawIssue(item));
    }
  }

  return [asRawIssue(object)];
}

function normalizeIssue(value: RawIssue, source: string, index: number): NormalizedIssue {
  const number = stringValue(value.number ?? value.id);
  const title = stringValue(value.title) ?? `Issue ${number ?? index + 1}`;
  const labels = normalizeLabels(value.labels);
  const commentBodies = normalizeCommentBodies(value.comments);
  const comments = numberValue(value.commentsCount) ?? (typeof value.comments === "number" ? value.comments : commentBodies.length);

  return {
    id: number ? `#${number}` : `${path.basename(source)}:${index + 1}`,
    title,
    body: stringValue(value.body) ?? "",
    url: stringValue(value.html_url ?? value.url),
    labels,
    comments,
    commentBodies,
    reactions: normalizeReactions(value.reactions),
    updatedAt: stringValue(value.updatedAt ?? value.updated_at ?? value.createdAt ?? value.created_at)
  };
}

function renderIssueTrace(issue: NormalizedIssue): string {
  const parts = [
    `# ${issue.title}`,
    "",
    issue.url ? `URL: ${issue.url}` : undefined,
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

function normalizeLabels(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }
      const object = asRecord(item);
      return stringValue(object?.name);
    })
    .filter((item): item is string => Boolean(item && item.trim().length > 0));
}

function normalizeCommentBodies(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }
      const object = asRecord(item);
      return stringValue(object?.body ?? object?.text ?? object?.content);
    })
    .filter((item): item is string => Boolean(item && item.trim().length > 0));
}

function normalizeReactions(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  const object = asRecord(value);
  if (!object) {
    return 0;
  }

  const totalCount = numberValue(object.totalCount);
  if (totalCount !== undefined) {
    return totalCount;
  }

  const totalCountSnake = numberValue(object.total_count);
  if (totalCountSnake !== undefined) {
    return totalCountSnake;
  }

  return Object.values(object).reduce<number>((total, candidate) => total + (numberValue(candidate) ?? 0), 0);
}

function priorityScore(issues: number, comments: number, reactions: number, severity: Severity, kind: FindingKind): number {
  if (kind === "weak_evidence") {
    return Math.round(issues * 4 + comments * 0.1 + reactions * 0.2 + SEVERITY_WEIGHT[severity]);
  }

  return issues * 10 + comments + reactions * 2 + SEVERITY_WEIGHT[severity];
}

function issueExample(issue: Pick<IssueMapIssue, "id" | "title" | "url" | "comments" | "labels">): IssueMapKindSummary["examples"][number] {
  return {
    id: issue.id,
    title: issue.title,
    url: issue.url,
    comments: issue.comments,
    labels: issue.labels
  };
}

function formatIssueLink(issue: { id: string; title: string; url?: string }): string {
  const label = `${issue.id} ${escapeMarkdownTable(issue.title)}`;
  return issue.url ? `[${label}](${issue.url})` : label;
}

function escapeMarkdownTable(value: string): string {
  return value.replace(/\|/g, "\\|");
}

function asRawIssue(value: unknown): RawIssue {
  return (asRecord(value) ?? {}) as RawIssue;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function stringValue(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
