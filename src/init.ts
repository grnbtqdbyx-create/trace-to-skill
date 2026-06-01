import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export interface InitOptions {
  cwd?: string;
  traces?: string;
  threshold?: string;
  doctorThreshold?: string;
  issueMapRepo?: string;
  issueMapState?: "open" | "closed" | "all";
  issueMapLimit?: string;
  issueMapCommentIssue?: string;
  comment?: boolean;
  sarif?: boolean;
  force?: boolean;
  dryRun?: boolean;
}

export interface InitResult {
  written: string[];
  skipped: string[];
  message: string;
}

export async function initProject(options: InitOptions = {}): Promise<InitResult> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const traces = normalizeTracePath(options.traces ?? "runs");
  const threshold = normalizeThreshold(options.threshold ?? "80");
  const doctorThreshold = normalizeThreshold(options.doctorThreshold ?? "85");
  const issueMapRepo = options.issueMapRepo ? normalizeRepo(options.issueMapRepo) : undefined;
  const issueMapState = options.issueMapState ?? "open";
  const issueMapLimit = normalizeThreshold(options.issueMapLimit ?? "100");
  const issueMapCommentIssue = options.issueMapCommentIssue ? normalizePositiveInteger(options.issueMapCommentIssue, "--issue-map-comment-issue") : undefined;
  const files = buildInitFiles({
    traces,
    threshold,
    doctorThreshold,
    issueMapRepo,
    issueMapState,
    issueMapLimit,
    issueMapCommentIssue,
    comment: Boolean(options.comment),
    sarif: Boolean(options.sarif)
  });
  const written: string[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    const target = path.join(cwd, file.path);
    const relative = path.relative(cwd, target);
    if (options.dryRun) {
      written.push(relative);
      continue;
    }

    await mkdir(path.dirname(target), { recursive: true });
    try {
      await writeFile(target, file.content, {
        encoding: "utf8",
        flag: options.force ? "w" : "wx"
      });
      written.push(relative);
    } catch (error) {
      if (isAlreadyExists(error)) {
        skipped.push(relative);
        continue;
      }

      throw error;
    }
  }

  return {
    written,
    skipped,
    message: buildInitMessage(written, skipped, options.dryRun)
  };
}

interface InitFile {
  path: string;
  content: string;
}

interface InitFileOptions {
  traces: string;
  threshold: string;
  doctorThreshold: string;
  issueMapRepo?: string;
  issueMapState: "open" | "closed" | "all";
  issueMapLimit: string;
  issueMapCommentIssue?: string;
  comment: boolean;
  sarif: boolean;
}

function buildInitFiles(options: InitFileOptions): InitFile[] {
  const files: InitFile[] = [
    {
      path: ".github/workflows/codex-readiness.yml",
      content: renderCodexReadinessWorkflow(options.doctorThreshold, options.comment)
    },
    {
      path: ".github/workflows/agent-learning.yml",
      content: renderAgentLearningWorkflow(options.traces, options.threshold, options.comment, options.sarif)
    },
    {
      path: `${options.traces}/README.md`,
      content: renderRunsReadme()
    },
    {
      path: `${options.traces}/.gitkeep`,
      content: ""
    }
  ];

  if (options.issueMapRepo) {
    files.push({
      path: ".github/workflows/codex-issue-radar.yml",
      content: renderIssueRadarWorkflow(options.issueMapRepo, options.issueMapState, options.issueMapLimit, options.issueMapCommentIssue)
    });
  }

  return files;
}

function renderCodexReadinessWorkflow(doctorThreshold: string, comment: boolean): string {
  const permissions = comment
    ? [
      "    permissions:",
      "      contents: read",
      "      pull-requests: write",
      "      issues: write"
    ].join("\n")
    : "    permissions:\n      contents: read";

  return `${[
    "name: Codex Readiness",
    "",
    "on:",
    "  pull_request:",
    "  workflow_dispatch:",
    "",
    "jobs:",
    "  codex-readiness:",
    "    runs-on: ubuntu-latest",
    permissions,
    "    steps:",
    "      - uses: actions/checkout@v5",
    "      - id: trace-to-skill",
    "        uses: grnbtqdbyx-create/trace-to-skill@v0.1.101",
    "        with:",
    "          mode: all",
    `          doctor-threshold: "${doctorThreshold}"`,
    comment ? '          doctor-comment: "true"' : undefined,
    comment ? '          scorecard-comment: "true"' : undefined,
    '          job-summary: "true"',
    comment ? "          github-token: ${{ github.token }}" : undefined,
    "      - run: |",
    "          echo \"Codex readiness score is ${{ steps.trace-to-skill.outputs.doctor-score }}\"",
    "          echo \"Benchmark status is ${{ steps.trace-to-skill.outputs.benchmark-status }}\"",
    "          echo \"Scorecard status is ${{ steps.trace-to-skill.outputs.scorecard-status }}\""
  ].filter((line): line is string => Boolean(line)).join("\n")}\n`;
}

function renderAgentLearningWorkflow(traces: string, threshold: string, comment: boolean, sarif: boolean): string {
  const permissions = comment || sarif
    ? [
      "    permissions:",
      "      contents: read",
      comment ? "      pull-requests: write" : undefined,
      comment ? "      issues: write" : undefined,
      sarif ? "      security-events: write" : undefined
    ].filter((line): line is string => Boolean(line)).join("\n")
    : "    permissions:\n      contents: read";

  const steps = [
    "      - uses: actions/checkout@v5",
    "      - id: trace-to-skill",
    "        uses: grnbtqdbyx-create/trace-to-skill@v0.1.101",
    "        with:",
    "          mode: traces",
    `          traces: ${traces}`,
    `          threshold: "${threshold}"`,
    comment ? '          comment: "true"' : undefined,
    '          job-summary: "true"',
    comment ? "          github-token: ${{ github.token }}" : undefined,
    sarif ? `      - run: npx trace-to-skill analyze ${traces} --format sarif --output trace-to-skill.sarif` : undefined,
    sarif ? "      - uses: github/codeql-action/upload-sarif@v4" : undefined,
    sarif ? "        with:" : undefined,
    sarif ? "          sarif_file: trace-to-skill.sarif" : undefined,
    "      - run: echo \"Agent report is ${{ steps.trace-to-skill.outputs.agent-report }}\""
  ].filter((line): line is string => Boolean(line));

  return `${[
    "name: Agent Learning Report",
    "",
    "on:",
    "  pull_request:",
    "  workflow_dispatch:",
    "",
    "jobs:",
    "  trace-to-skill:",
    "    runs-on: ubuntu-latest",
    permissions,
    "    steps:",
    ...steps
  ].join("\n")}\n`;
}

function renderIssueRadarWorkflow(repo: string, state: "open" | "closed" | "all", limit: string, commentIssue: string | undefined): string {
  return `${[
    "name: Codex Issue Radar",
    "",
    "on:",
    "  schedule:",
    "    - cron: '17 8 * * 1'",
    "  workflow_dispatch:",
    "",
    "jobs:",
    "  issue-radar:",
    "    runs-on: ubuntu-latest",
    "    permissions:",
    "      contents: read",
    commentIssue ? "      issues: write" : "      issues: read",
    "    steps:",
    "      - uses: actions/checkout@v5",
    "      - id: issue-map",
    "        uses: grnbtqdbyx-create/trace-to-skill@v0.1.101",
    "        with:",
    "          mode: issue-map",
    `          issue-map-repo: ${repo}`,
    `          issue-map-state: ${state}`,
    `          issue-map-limit: "${limit}"`,
    commentIssue ? '          issue-map-comment: "true"' : undefined,
    commentIssue ? `          issue-map-comment-issue: "${commentIssue}"` : undefined,
    "          github-token: ${{ github.token }}",
    '          job-summary: "true"',
    "      - run: |",
    "          echo \"Issue radar analyzed ${{ steps.issue-map.outputs.issue-map-issues }} issues\"",
    "          echo \"Issue radar matched ${{ steps.issue-map.outputs.issue-map-matched }} issues\"",
    "          echo \"Top failure class is ${{ steps.issue-map.outputs.issue-map-top-kind }}\""
  ].filter((line): line is string => Boolean(line)).join("\n")}\n`;
}

function renderRunsReadme(): string {
  return `# Agent Run Traces

Store anonymized Codex, Claude Code, Cursor, Copilot, Gemini CLI, OpenCode, or MCP-enabled agent run traces here.

Recommended files:

- failed-run.md
- codex-session.jsonl
- mcp-risk.json

Do not commit secrets, customer data, private source code, or full proprietary transcripts.
`;
}

function buildInitMessage(written: string[], skipped: string[], dryRun: boolean | undefined): string {
  const prefix = dryRun ? "dry-run: " : "";
  const parts = [`${prefix}prepared ${written.length} file(s)`];
  if (skipped.length > 0) {
    parts.push(`skipped ${skipped.length} existing file(s)`);
  }
  return parts.join(", ");
}

function isAlreadyExists(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "EEXIST";
}

function normalizeTracePath(value: string): string {
  const traces = value.replace(/^\.\/+/, "");
  if (!traces || path.isAbsolute(traces) || traces.includes("\\") || !/^[A-Za-z0-9._/-]+$/.test(traces)) {
    throw new Error("--traces must be a safe relative path such as runs or agent-runs");
  }

  const parts = traces.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) {
    throw new Error("--traces must not contain empty, current, or parent directory segments");
  }

  return traces;
}

function normalizeThreshold(value: string): string {
  if (!/^[0-9]{1,3}$/.test(value)) {
    throw new Error("--threshold must be an integer between 1 and 100");
  }

  const threshold = Number(value);
  if (!Number.isInteger(threshold) || threshold < 1 || threshold > 100) {
    throw new Error("--threshold must be an integer between 1 and 100");
  }

  return String(threshold);
}

function normalizeRepo(value: string): string {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value)) {
    throw new Error("--issue-map-repo must use the owner/name format, for example openai/codex.");
  }

  return value;
}

function normalizePositiveInteger(value: string, flagName: string): string {
  if (!/^[0-9]{1,10}$/.test(value)) {
    throw new Error(`${flagName} must be a positive integer.`);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${flagName} must be a positive integer.`);
  }

  return String(parsed);
}
