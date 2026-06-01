import { readFile } from "node:fs/promises";
import path from "node:path";
import { analyzeInputs } from "./analyze.js";
import type { AnalysisResult, FindingKind, Severity, TraceInput } from "./types.js";

export interface IssueMapOptions {
  top?: number;
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

export interface IssueMapResult {
  generatedAt: string;
  sources: string[];
  issueCount: number;
  matchedIssueCount: number;
  unmatchedIssueCount: number;
  summaries: IssueMapKindSummary[];
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
  labels?: unknown;
  comments?: unknown;
  commentsCount?: unknown;
  reactions?: unknown;
  updatedAt?: unknown;
  createdAt?: unknown;
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

  const issues: IssueMapIssue[] = [];
  for (const target of targets) {
    const source = path.resolve(target);
    const raw = await readFile(source, "utf8");
    const normalized = parseIssueExport(raw, target);

    for (const issue of normalized) {
      const input: TraceInput = {
        path: `${target}${issue.id.startsWith("#") ? issue.id : `#${issue.id}`}`,
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
    sources: targets,
    issueCount: issues.length,
    matchedIssueCount: matchedIssues.size,
    unmatchedIssueCount: issues.length - matchedIssues.size,
    summaries,
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
    "This report maps exported GitHub issues onto deterministic `trace-to-skill` failure classes. Export issues with `gh issue list` or `gh search issues`, then use the highest-priority clusters to decide which fixtures, docs, or support reports to build next.",
    "",
    "```bash",
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
    lines.push([
      `| ${summary.priorityScore}`,
      `\`${summary.kind}\``,
      summary.severity,
      `${summary.issues}`,
      `${summary.comments}`,
      `${summary.reactions}`,
      example ? formatIssueLink(example) : "none",
      "|"
    ].join(" | "));
  }

  lines.push("", "## Suggested Next Actions", "");
  for (const summary of result.summaries.slice(0, 5)) {
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

  return `${lines.join("\n")}\n`;
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
    url: stringValue(value.url),
    labels,
    comments,
    commentBodies,
    reactions: normalizeReactions(value.reactions),
    updatedAt: stringValue(value.updatedAt ?? value.createdAt)
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
