import { readFile } from "node:fs/promises";
import path from "node:path";
import { analyzeInputs } from "./analyze.js";
import type { FindingKind, TraceInput } from "./types.js";

export type DuplicateVerdict = "likely_duplicate" | "related_not_duplicate" | "needs_human_review" | "weak_match";

export interface DuplicateAuditIssue {
  id: string;
  number?: number;
  title: string;
  body: string;
  url?: string;
  labels: string[];
  comments: number;
  commentBodies: string[];
  updatedAt?: string;
}

export interface DuplicateAuditCandidate {
  issue: DuplicateAuditIssue;
  verdict: DuplicateVerdict;
  confidence: number;
  titleOverlap: number;
  sharedKinds: FindingKind[];
  issueOnlyKinds: FindingKind[];
  candidateOnlyKinds: FindingKind[];
  sharedLabels: string[];
  issueOnlyLabels: string[];
  candidateOnlyLabels: string[];
  sharedSurfaces: string[];
  issueOnlySurfaces: string[];
  candidateOnlySurfaces: string[];
  reasons: string[];
  nextAction: string;
}

export interface DuplicateAuditResult {
  generatedAt: string;
  source: string;
  issue: DuplicateAuditIssue;
  suggestedDuplicates: string[];
  candidates: DuplicateAuditCandidate[];
  summary: {
    candidateCount: number;
    likelyDuplicates: number;
    relatedNotDuplicates: number;
    needsHumanReview: number;
    weakMatches: number;
  };
}

export interface GithubDuplicateAuditOptions {
  issueNumber: number;
  candidates?: number[];
  token?: string;
  apiBaseUrl?: string;
}

interface RawAuditExport {
  issue?: unknown;
  candidates?: unknown;
  duplicates?: unknown;
  suggestedDuplicates?: unknown;
  source?: unknown;
}

interface RawIssue {
  number?: unknown;
  id?: unknown;
  title?: unknown;
  body?: unknown;
  html_url?: unknown;
  url?: unknown;
  labels?: unknown;
  comments?: unknown;
  commentsCount?: unknown;
  comments_url?: unknown;
  updatedAt?: unknown;
  updated_at?: unknown;
}

const SURFACE_PATTERNS: Array<[string, RegExp]> = [
  ["windows", /\bwindows|powershell|wsl|win32|nativePipe|SKY_CUA_NATIVE_PIPE_DIRECTORY\b/i],
  ["macos", /\bmacos|darwin|os ?x|appshot|nspasteboard\b/i],
  ["linux", /\blinux|wayland|x11|devcontainer|container\b/i],
  ["desktop-app", /\bdesktop|app\b/i],
  ["cli", /\bcli|tui|terminal|slash command\b/i],
  ["extension", /\bextension|vscode|ide\b/i],
  ["remote", /\bremote|ssh|app-server|reconnect\b/i],
  ["computer-use", /\bcomputer use|codex-computer-use|appshot|native pipe\b/i],
  ["browser", /\bbrowser|chrome|playwright\b/i],
  ["sandbox", /\bsandbox|spawn setup refresh|permission\b/i],
  ["session", /\bsession|thread|project|history|conversation\b/i],
  ["context", /\bcontext|compact|compaction|fork\b/i],
  ["rate-limits", /\brate[- ]?limit|usage|quota|5h|weekly|remaining\b/i],
  ["subagent", /\bsubagent|multiagent|spawn_agent|fork_turns\b/i],
  ["mcp", /\bmcp|model context protocol|streamable http\b/i]
];

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "codex", "for", "from",
  "in", "into", "is", "it", "me", "my", "of", "on", "or", "the", "this", "to",
  "with", "without", "after", "before", "when", "while", "app", "issue", "bug"
]);

export async function buildDuplicateAudit(targets: string[]): Promise<DuplicateAuditResult> {
  if (targets.length === 0) {
    throw new Error("duplicate-audit requires an export file, stdin input, or --repo owner/name --issue number.");
  }

  const raw = await readFile(path.resolve(targets[0]), "utf8");
  return buildDuplicateAuditFromExport(raw, targets[0]);
}

export function buildDuplicateAuditFromExport(raw: string, source = "export"): DuplicateAuditResult {
  const parsed = JSON.parse(raw) as RawAuditExport;
  const issue = normalizeIssue(parsed.issue, source, 0);
  const candidates = normalizeIssueArray(parsed.candidates ?? parsed.duplicates, source);
  const suggestedDuplicates = normalizeSuggestedDuplicates(parsed.suggestedDuplicates);
  return buildDuplicateAuditFromIssues(issue, candidates, {
    source: stringValue(parsed.source) ?? source,
    suggestedDuplicates
  });
}

export async function buildGithubDuplicateAudit(repo: string, options: GithubDuplicateAuditOptions): Promise<DuplicateAuditResult> {
  const match = repo.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (!match) {
    throw new Error("--repo must use the owner/name format, for example openai/codex.");
  }

  const [, owner, name] = match;
  const apiBaseUrl = options.apiBaseUrl ?? "https://api.github.com";
  const token = options.token ?? process.env.GITHUB_TOKEN;
  const issue = await fetchGithubIssue(apiBaseUrl, owner, name, options.issueNumber, token);
  const suggested = options.candidates && options.candidates.length > 0 ? options.candidates : extractDuplicateNumbers(issue.commentBodies);
  const uniqueSuggested = [...new Set(suggested)].filter((number) => number !== options.issueNumber);
  const candidates = await Promise.all(uniqueSuggested.map((number) => fetchGithubIssue(apiBaseUrl, owner, name, number, token)));
  return buildDuplicateAuditFromIssues(issue, candidates, {
    source: `github:${repo}#${options.issueNumber}`,
    suggestedDuplicates: uniqueSuggested.map((number) => `#${number}`)
  });
}

export function buildDuplicateAuditFromIssues(
  issue: DuplicateAuditIssue,
  candidates: DuplicateAuditIssue[],
  options: { source?: string; suggestedDuplicates?: string[] } = {}
): DuplicateAuditResult {
  const scored = candidates.map((candidate) => scoreCandidate(issue, candidate))
    .sort((a, b) => b.confidence - a.confidence || verdictRank(a.verdict) - verdictRank(b.verdict) || a.issue.id.localeCompare(b.issue.id));
  const summary = {
    candidateCount: scored.length,
    likelyDuplicates: scored.filter((candidate) => candidate.verdict === "likely_duplicate").length,
    relatedNotDuplicates: scored.filter((candidate) => candidate.verdict === "related_not_duplicate").length,
    needsHumanReview: scored.filter((candidate) => candidate.verdict === "needs_human_review").length,
    weakMatches: scored.filter((candidate) => candidate.verdict === "weak_match").length
  };

  return {
    generatedAt: new Date().toISOString(),
    source: options.source ?? "export",
    issue,
    suggestedDuplicates: options.suggestedDuplicates ?? [],
    candidates: scored,
    summary
  };
}

export function renderDuplicateAuditMarkdown(result: DuplicateAuditResult): string {
  const lines = [
    "# Duplicate Audit",
    "",
    `Generated: ${result.generatedAt}`,
    `Source: ${result.source}`,
    `Issue: ${formatIssue(result.issue)}`,
    `Suggested duplicates: ${result.suggestedDuplicates.length > 0 ? result.suggestedDuplicates.join(", ") : "none"}`,
    "",
    "This report checks duplicate suggestions against detected failure kinds, labels, platform/surface signals, and title overlap. Use it to confirm true duplicates or write a narrower non-duplicate clarification.",
    "",
    "```bash",
    "trace-to-skill duplicate-audit --repo openai/codex --issue 25507 --format markdown",
    "trace-to-skill duplicate-audit duplicate-audit.json --format json",
    "```",
    "",
    "## Summary",
    "",
    `- Candidates: ${result.summary.candidateCount}`,
    `- Likely duplicates: ${result.summary.likelyDuplicates}`,
    `- Related but not exact duplicates: ${result.summary.relatedNotDuplicates}`,
    `- Needs human review: ${result.summary.needsHumanReview}`,
    `- Weak matches: ${result.summary.weakMatches}`,
    "",
    "## Candidates",
    "",
    "| Verdict | Confidence | Candidate | Shared kinds | Shared surfaces | Differentiators | Next action |",
    "| --- | ---: | --- | --- | --- | --- | --- |"
  ];

  for (const candidate of result.candidates) {
    const differentiators = [
      candidate.issueOnlyKinds.length > 0 ? `issue-only kinds: ${candidate.issueOnlyKinds.join(", ")}` : undefined,
      candidate.candidateOnlyKinds.length > 0 ? `candidate-only kinds: ${candidate.candidateOnlyKinds.join(", ")}` : undefined,
      candidate.issueOnlySurfaces.length > 0 ? `issue-only surfaces: ${candidate.issueOnlySurfaces.join(", ")}` : undefined,
      candidate.candidateOnlySurfaces.length > 0 ? `candidate-only surfaces: ${candidate.candidateOnlySurfaces.join(", ")}` : undefined
    ].filter((item): item is string => Boolean(item)).join("; ");
    lines.push(`| ${candidate.verdict} | ${candidate.confidence} | ${formatIssue(candidate.issue)} | ${candidate.sharedKinds.join(", ") || "none"} | ${candidate.sharedSurfaces.join(", ") || "none"} | ${escapeTable(differentiators || "none")} | ${escapeTable(candidate.nextAction)} |`);
  }

  lines.push("", "## Reasoning", "");
  for (const candidate of result.candidates) {
    lines.push(`### ${candidate.issue.id} ${candidate.issue.title}`, "");
    lines.push(`Verdict: **${candidate.verdict}** (${candidate.confidence}/100).`);
    lines.push(`Title overlap: ${candidate.titleOverlap.toFixed(2)}.`);
    for (const reason of candidate.reasons) {
      lines.push(`- ${reason}`);
    }
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function scoreCandidate(issue: DuplicateAuditIssue, candidate: DuplicateAuditIssue): DuplicateAuditCandidate {
  const issueKinds = findingKinds(issue);
  const candidateKinds = findingKinds(candidate);
  const sharedKinds = intersection(issueKinds, candidateKinds);
  const issueOnlyKinds = difference(issueKinds, candidateKinds);
  const candidateOnlyKinds = difference(candidateKinds, issueKinds);
  const issueLabels = normalizedLabels(issue.labels);
  const candidateLabels = normalizedLabels(candidate.labels);
  const sharedLabels = intersection(issueLabels, candidateLabels);
  const issueOnlyLabels = difference(issueLabels, candidateLabels);
  const candidateOnlyLabels = difference(candidateLabels, issueLabels);
  const issueSurfaces = surfaceSignals(issue);
  const candidateSurfaces = surfaceSignals(candidate);
  const sharedSurfaces = intersection(issueSurfaces, candidateSurfaces);
  const issueOnlySurfaces = difference(issueSurfaces, candidateSurfaces);
  const candidateOnlySurfaces = difference(candidateSurfaces, issueSurfaces);
  const titleOverlap = jaccard(tokenize(issue.title), tokenize(candidate.title));

  let confidence = Math.round(
    sharedKinds.length * 28 +
    sharedLabels.length * 9 +
    sharedSurfaces.length * 10 +
    titleOverlap * 35 -
    issueOnlyKinds.length * 8 -
    candidateOnlyKinds.length * 5 -
    issueOnlySurfaces.length * 4 -
    candidateOnlySurfaces.length * 3
  );
  confidence = Math.max(0, Math.min(100, confidence));

  let verdict: DuplicateVerdict = "weak_match";
  if (sharedKinds.length >= 2 && sharedSurfaces.length >= 1 && titleOverlap >= 0.28 && confidence >= 62) {
    verdict = "likely_duplicate";
  } else if (sharedKinds.length >= 1 && (sharedSurfaces.length >= 1 || sharedLabels.length >= 1) && confidence >= 38) {
    verdict = "related_not_duplicate";
  } else if (sharedKinds.length >= 1 || sharedLabels.length >= 2 || sharedSurfaces.length >= 2) {
    verdict = "needs_human_review";
  }

  const reasons = buildReasons({
    sharedKinds,
    issueOnlyKinds,
    candidateOnlyKinds,
    sharedLabels,
    sharedSurfaces,
    issueOnlySurfaces,
    candidateOnlySurfaces,
    titleOverlap
  });

  return {
    issue: candidate,
    verdict,
    confidence,
    titleOverlap,
    sharedKinds,
    issueOnlyKinds,
    candidateOnlyKinds,
    sharedLabels,
    issueOnlyLabels,
    candidateOnlyLabels,
    sharedSurfaces,
    issueOnlySurfaces,
    candidateOnlySurfaces,
    reasons,
    nextAction: nextAction(verdict)
  };
}

function buildReasons(input: {
  sharedKinds: FindingKind[];
  issueOnlyKinds: FindingKind[];
  candidateOnlyKinds: FindingKind[];
  sharedLabels: string[];
  sharedSurfaces: string[];
  issueOnlySurfaces: string[];
  candidateOnlySurfaces: string[];
  titleOverlap: number;
}): string[] {
  const reasons: string[] = [];
  reasons.push(input.sharedKinds.length > 0 ? `Shared detected failure kinds: ${input.sharedKinds.join(", ")}.` : "No shared detected failure kind.");
  reasons.push(input.sharedSurfaces.length > 0 ? `Shared surface/platform signals: ${input.sharedSurfaces.join(", ")}.` : "No shared surface/platform signal.");
  if (input.sharedLabels.length > 0) {
    reasons.push(`Shared labels: ${input.sharedLabels.join(", ")}.`);
  }
  if (input.issueOnlyKinds.length > 0 || input.candidateOnlyKinds.length > 0) {
    reasons.push(`Differentiating failure kinds: issue-only ${input.issueOnlyKinds.join(", ") || "none"}; candidate-only ${input.candidateOnlyKinds.join(", ") || "none"}.`);
  }
  if (input.issueOnlySurfaces.length > 0 || input.candidateOnlySurfaces.length > 0) {
    reasons.push(`Differentiating surfaces: issue-only ${input.issueOnlySurfaces.join(", ") || "none"}; candidate-only ${input.candidateOnlySurfaces.join(", ") || "none"}.`);
  }
  reasons.push(`Title token overlap is ${input.titleOverlap.toFixed(2)}.`);
  return reasons;
}

function nextAction(verdict: DuplicateVerdict): string {
  if (verdict === "likely_duplicate") {
    return "Close or merge only after confirming the newer issue adds no unique reproduction detail.";
  }
  if (verdict === "related_not_duplicate") {
    return "Keep open or cross-link with a short note naming the narrower differentiator.";
  }
  if (verdict === "needs_human_review") {
    return "Ask for one missing reproduction detail before closing as duplicate.";
  }
  return "Do not close as duplicate from this signal alone.";
}

function findingKinds(issue: DuplicateAuditIssue): FindingKind[] {
  const trace: TraceInput = {
    path: issue.id,
    content: renderTrace(issue)
  };
  return [...new Set(analyzeInputs([trace]).findings.map((finding) => finding.kind).filter((kind) => kind !== "weak_evidence" && kind !== "premature_completion"))].sort();
}

function renderTrace(issue: DuplicateAuditIssue): string {
  return [
    `# ${issue.title}`,
    issue.url ? `URL: ${issue.url}` : undefined,
    issue.labels.length > 0 ? `Labels: ${issue.labels.join(", ")}` : undefined,
    `Comments: ${issue.comments}`,
    "",
    issue.body,
    issue.commentBodies.length > 0 ? ["", "## Comments", "", ...issue.commentBodies.slice(0, 8)].join("\n") : undefined
  ].filter((part): part is string => part !== undefined).join("\n");
}

async function fetchGithubIssue(apiBaseUrl: string, owner: string, name: string, issueNumber: number, token?: string): Promise<DuplicateAuditIssue> {
  const issue = await githubJson(`${apiBaseUrl.replace(/\/$/, "")}/repos/${owner}/${name}/issues/${issueNumber}`, token) as RawIssue;
  const commentUrl = stringValue(issue.comments_url);
  const comments = commentUrl ? await githubJson(commentUrl, token) : [];
  return normalizeIssue({
    ...issue,
    comments
  }, `github:${owner}/${name}`, issueNumber);
}

async function githubJson(url: string, token?: string): Promise<unknown> {
  const headers: Record<string, string> = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "trace-to-skill",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub duplicate-audit request failed: ${response.status} ${response.statusText}${body ? `: ${body.slice(0, 240)}` : ""}`);
  }
  return response.json();
}

function extractDuplicateNumbers(comments: string[]): number[] {
  const numbers: number[] = [];
  for (const comment of comments) {
    if (!/Potential duplicates detected/i.test(comment)) {
      continue;
    }
    for (const match of comment.matchAll(/(?:^|\s|[-*])#([0-9]{1,10})\b/gm)) {
      numbers.push(Number(match[1]));
    }
  }
  return numbers.filter((number) => Number.isSafeInteger(number) && number > 0);
}

function normalizeIssueArray(value: unknown, source: string): DuplicateAuditIssue[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item, index) => normalizeIssue(item, source, index + 1));
}

function normalizeIssue(value: unknown, source: string, index: number): DuplicateAuditIssue {
  const raw = asRecord(value) ?? {};
  const number = numberValue(raw.number ?? raw.id);
  const title = stringValue(raw.title) ?? `Issue ${number ?? index + 1}`;
  const labels = normalizeLabels(raw.labels);
  const commentBodies = normalizeCommentBodies(raw.comments);
  const commentCount = numberValue(raw.commentsCount) ?? (typeof raw.comments === "number" ? raw.comments : commentBodies.length);
  return {
    id: number ? `#${number}` : `${path.basename(source)}:${index + 1}`,
    number,
    title,
    body: stringValue(raw.body) ?? "",
    url: stringValue(raw.html_url ?? raw.url),
    labels,
    comments: commentCount,
    commentBodies,
    updatedAt: stringValue(raw.updatedAt ?? raw.updated_at)
  };
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

function normalizedLabels(labels: string[]): string[] {
  return [...new Set(labels.map((label) => label.trim().toLowerCase()).filter(Boolean))].sort();
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

function normalizeSuggestedDuplicates(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => stringValue(item)).filter((item): item is string => Boolean(item));
}

function surfaceSignals(issue: DuplicateAuditIssue): string[] {
  const text = `${issue.title}\n${issue.body}\n${issue.labels.join("\n")}\n${issue.commentBodies.slice(0, 4).join("\n")}`;
  return SURFACE_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([surface]) => surface).sort();
}

function tokenize(value: string): string[] {
  return [...new Set(value.toLowerCase()
    .replace(/[`"'()[\]{}:;,.!?/\\|_+=<>]/g, " ")
    .split(/[^a-z0-9-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token)))].sort();
}

function jaccard(left: string[], right: string[]): number {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }
  const shared = intersection(left, right);
  const union = new Set([...left, ...right]);
  return shared.length / union.size;
}

function intersection<T>(left: T[], right: T[]): T[] {
  const rightSet = new Set(right);
  return left.filter((item) => rightSet.has(item));
}

function difference<T>(left: T[], right: T[]): T[] {
  const rightSet = new Set(right);
  return left.filter((item) => !rightSet.has(item));
}

function verdictRank(verdict: DuplicateVerdict): number {
  return {
    likely_duplicate: 0,
    related_not_duplicate: 1,
    needs_human_review: 2,
    weak_match: 3
  }[verdict];
}

function formatIssue(issue: DuplicateAuditIssue): string {
  const label = `${issue.id} ${escapeTable(issue.title)}`;
  return issue.url ? `[${label}](${issue.url})` : label;
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, "\\|");
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
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return value;
  }
  if (typeof value === "string" && /^[0-9]{1,10}$/.test(value)) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : undefined;
  }
  return undefined;
}
