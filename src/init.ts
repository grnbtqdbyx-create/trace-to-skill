import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export interface InitOptions {
  cwd?: string;
  traces?: string;
  threshold?: string;
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
  const files = buildInitFiles(traces, threshold, Boolean(options.comment), Boolean(options.sarif));
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

function buildInitFiles(traces: string, threshold: string, comment: boolean, sarif: boolean): InitFile[] {
  const files: InitFile[] = [
    {
      path: ".github/workflows/agent-learning.yml",
      content: renderWorkflow(traces, threshold, comment, sarif)
    },
    {
      path: `${traces}/README.md`,
      content: renderRunsReadme()
    },
    {
      path: `${traces}/.gitkeep`,
      content: ""
    }
  ];

  return files;
}

function renderWorkflow(traces: string, threshold: string, comment: boolean, sarif: boolean): string {
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
    "      - uses: actions/setup-node@v5",
    "        with:",
    "          node-version: 20",
    `      - run: npx github:grnbtqdbyx-create/trace-to-skill analyze ${traces} --output agent-learning-report.md`,
    sarif ? `      - run: npx github:grnbtqdbyx-create/trace-to-skill analyze ${traces} --format sarif --output trace-to-skill.sarif` : undefined,
    sarif ? "      - uses: github/codeql-action/upload-sarif@v4" : undefined,
    sarif ? "        with:" : undefined,
    sarif ? "          sarif_file: trace-to-skill.sarif" : undefined,
    comment ? `      - run: npx github:grnbtqdbyx-create/trace-to-skill comment ${traces} --token "\${{ github.token }}"` : undefined,
    `      - run: npx github:grnbtqdbyx-create/trace-to-skill eval ${traces} --threshold ${threshold}`
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

function renderRunsReadme(): string {
  return `# Agent Run Traces

Store anonymized Codex, Claude Code, Cursor, Copilot, or MCP-enabled agent run traces here.

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
