import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeTargets } from "./analyze.js";
import type { FindingKind } from "./types.js";

export interface BenchmarkCaseDefinition {
  id: string;
  title: string;
  fixture: string;
  expectedKinds: FindingKind[];
  requireCritical?: boolean;
  requireClean?: boolean;
}

export interface BenchmarkCaseResult {
  id: string;
  title: string;
  fixture: string;
  score: number;
  findings: number;
  criticalFindings: number;
  detectedKinds: FindingKind[];
  expectedKinds: FindingKind[];
  passed: boolean;
}

export interface BenchmarkResult {
  generatedAt: string;
  passed: boolean;
  cases: BenchmarkCaseResult[];
}

const BENCHMARK_CASES: BenchmarkCaseDefinition[] = [
  {
    id: "clean-validated-run",
    title: "Clean validated agent run",
    fixture: "fixtures/safe-run.md",
    expectedKinds: [],
    requireClean: true
  },
  {
    id: "failed-workflow",
    title: "Failed workflow with missing validation",
    fixture: "fixtures/failed-run.md",
    expectedKinds: ["test_failure", "premature_completion", "tests_not_run", "mcp_risk", "hallucinated_file"],
    requireCritical: true
  },
  {
    id: "codex-jsonl",
    title: "Codex JSONL failed session",
    fixture: "fixtures/codex-session.jsonl",
    expectedKinds: ["test_failure", "premature_completion", "weak_evidence"],
    requireCritical: true
  },
  {
    id: "context-compaction",
    title: "Codex context compaction failure",
    fixture: "fixtures/context-compaction.md",
    expectedKinds: ["context_compaction", "weak_evidence"]
  },
  {
    id: "sandbox-permission",
    title: "Codex sandbox permission failure",
    fixture: "fixtures/sandbox-permission.md",
    expectedKinds: ["sandbox_permission", "weak_evidence"]
  },
  {
    id: "codex-connectivity",
    title: "Codex auth and connectivity failure",
    fixture: "fixtures/codex-connectivity.md",
    expectedKinds: ["codex_connectivity", "weak_evidence"]
  },
  {
    id: "codex-remote-control",
    title: "Codex remote-control route health failure",
    fixture: "fixtures/codex-remote-control.md",
    expectedKinds: ["codex_remote_control", "weak_evidence"]
  },
  {
    id: "quota-mismatch",
    title: "Codex quota mismatch",
    fixture: "fixtures/quota-mismatch.md",
    expectedKinds: ["quota_mismatch", "weak_evidence"]
  },
  {
    id: "mcp-risk",
    title: "MCP config with secret exposure",
    fixture: "fixtures/mcp-risk.json",
    expectedKinds: ["secret_exposure", "mcp_risk"],
    requireCritical: true
  },
  {
    id: "sensitive-file-access",
    title: "Sensitive file access in agent context",
    fixture: "fixtures/sensitive-file-access.md",
    expectedKinds: ["sensitive_file_access", "weak_evidence"]
  },
  {
    id: "codex-mcp-runtime",
    title: "Codex MCP runtime failure",
    fixture: "fixtures/codex-mcp-runtime.md",
    expectedKinds: ["codex_mcp_runtime", "weak_evidence"]
  },
  {
    id: "codex-session-state",
    title: "Codex session resume and state failure",
    fixture: "fixtures/codex-session-state.md",
    expectedKinds: ["codex_session_state", "weak_evidence"]
  },
  {
    id: "codex-token-burn",
    title: "Codex token burn and usage-drain loop",
    fixture: "fixtures/codex-token-burn.md",
    expectedKinds: ["codex_token_burn", "weak_evidence"]
  },
  {
    id: "codex-resource-leak",
    title: "Codex resource leak and runaway process",
    fixture: "fixtures/codex-resource-leak.md",
    expectedKinds: ["codex_resource_leak", "weak_evidence"]
  },
  {
    id: "prompt-injection",
    title: "Untrusted PR comment prompt injection",
    fixture: "fixtures/prompt-injection.md",
    expectedKinds: ["prompt_injection"],
    requireCritical: true
  },
  {
    id: "instruction-drift",
    title: "Conflicting agent instruction files",
    fixture: "fixtures/instruction-drift",
    expectedKinds: ["ignored_instruction"]
  }
];

export async function runBenchmark(): Promise<BenchmarkResult> {
  const cases: BenchmarkCaseResult[] = [];
  const root = packageRoot();

  for (const definition of BENCHMARK_CASES) {
    const result = await analyzeTargets([path.join(root, definition.fixture)]);
    const detectedKinds = Array.from(new Set(result.findings.map((finding) => finding.kind))).sort();
    const criticalFindings = result.findings.filter((finding) => finding.severity === "critical").length;

    cases.push({
      id: definition.id,
      title: definition.title,
      fixture: definition.fixture,
      score: result.score,
      findings: result.findings.length,
      criticalFindings,
      detectedKinds,
      expectedKinds: definition.expectedKinds,
      passed: casePassed(definition, detectedKinds, result.findings.length, criticalFindings)
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    passed: cases.every((item) => item.passed),
    cases
  };
}

export function renderBenchmarkMarkdown(result: BenchmarkResult): string {
  const lines = [
    "# trace-to-skill Benchmark",
    "",
    `Status: **${result.passed ? "pass" : "fail"}**`,
    "",
    "This benchmark runs the public fixture pack that ships with the repository and package. It is not a model leaderboard; it checks whether deterministic detectors still catch the agent-workflow failure classes the project claims to cover.",
    "",
    "| Case | Fixture | Score | Findings | Critical | Detected kinds | Result |",
    "| --- | --- | ---: | ---: | ---: | --- | --- |"
  ];

  for (const item of result.cases) {
    lines.push([
      `| ${item.title}`,
      `\`${item.fixture}\``,
      `${item.score}`,
      `${item.findings}`,
      `${item.criticalFindings}`,
      item.detectedKinds.length > 0 ? item.detectedKinds.map((kind) => `\`${kind}\``).join(", ") : "none",
      item.passed ? "pass |" : "fail |"
    ].join(" | "));
  }

  lines.push(
    "",
    "Run it locally:",
    "",
    "```bash",
    "trace-to-skill benchmark",
    "trace-to-skill benchmark --format json",
    "```",
    ""
  );

  return lines.join("\n");
}

function casePassed(
  definition: BenchmarkCaseDefinition,
  detectedKinds: FindingKind[],
  findings: number,
  criticalFindings: number
): boolean {
  if (definition.requireClean && findings !== 0) {
    return false;
  }

  if (definition.requireCritical && criticalFindings === 0) {
    return false;
  }

  return definition.expectedKinds.every((kind) => detectedKinds.includes(kind));
}

function packageRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
}
