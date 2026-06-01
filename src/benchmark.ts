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
    id: "codex-remote-compact",
    title: "Codex remote compact task failure",
    fixture: "fixtures/codex-remote-compact.md",
    expectedKinds: ["codex_remote_compact", "context_compaction", "weak_evidence"]
  },
  {
    id: "context-compaction",
    title: "Codex context compaction failure",
    fixture: "fixtures/context-compaction.md",
    expectedKinds: ["context_compaction", "weak_evidence"]
  },
  {
    id: "codex-context-fork-bloat",
    title: "Codex conversation fork context bloat",
    fixture: "fixtures/codex-context-fork-bloat.md",
    expectedKinds: ["codex_context_fork_bloat", "weak_evidence"]
  },
  {
    id: "codex-subagent-prompt-leakage",
    title: "Codex subagent prompt leakage or boundary failure",
    fixture: "fixtures/codex-subagent-prompt-leakage.md",
    expectedKinds: ["codex_subagent_prompt_leakage", "weak_evidence"]
  },
  {
    id: "codex-subagent-orchestration",
    title: "Codex subagent orchestration and configuration gap",
    fixture: "fixtures/codex-subagent-orchestration.md",
    expectedKinds: ["codex_subagent_orchestration", "weak_evidence"]
  },
  {
    id: "codex-latest-turn-drift",
    title: "Codex latest-turn drift after compaction",
    fixture: "fixtures/codex-latest-turn-drift.md",
    expectedKinds: ["codex_latest_turn_drift", "weak_evidence"]
  },
  {
    id: "codex-model-routing-mismatch",
    title: "Codex selected model differs from actual routed model",
    fixture: "fixtures/codex-model-routing-mismatch.md",
    expectedKinds: ["codex_model_routing_mismatch", "weak_evidence"]
  },
  {
    id: "codex-latency-regression",
    title: "Codex model and runtime latency regression",
    fixture: "fixtures/codex-latency-regression.md",
    expectedKinds: ["codex_latency_regression", "weak_evidence"]
  },
  {
    id: "codex-thinking-hang",
    title: "Codex thinking and stream hang",
    fixture: "fixtures/codex-thinking-hang.md",
    expectedKinds: ["codex_thinking_hang", "weak_evidence"]
  },
  {
    id: "codex-cli-no-response",
    title: "Codex CLI no-response and command execution hang",
    fixture: "fixtures/codex-cli-no-response.md",
    expectedKinds: ["codex_thinking_hang", "weak_evidence"]
  },
  {
    id: "codex-clipboard-attachment",
    title: "Codex clipboard, paste, and attachment workflow regression",
    fixture: "fixtures/codex-clipboard-attachment.md",
    expectedKinds: ["codex_clipboard_attachment", "weak_evidence"]
  },
  {
    id: "codex-deeplink-launch",
    title: "Codex deeplink, OAuth callback, and external launch regression",
    fixture: "fixtures/codex-deeplink-launch.md",
    expectedKinds: ["codex_deeplink_launch", "weak_evidence"]
  },
  {
    id: "codex-connector-auth-cache",
    title: "Codex app connector auth cache and stale link regression",
    fixture: "fixtures/codex-connector-auth-cache.md",
    expectedKinds: ["codex_connector_auth_cache", "weak_evidence"]
  },
  {
    id: "codex-auth-verification",
    title: "Codex sign-in and account verification failure",
    fixture: "fixtures/codex-auth-verification.md",
    expectedKinds: ["codex_auth_verification", "weak_evidence"]
  },
  {
    id: "codex-approval-friction",
    title: "Codex approval persistence and MCP approval friction",
    fixture: "fixtures/codex-approval-friction.md",
    expectedKinds: ["codex_approval_friction", "sandbox_permission", "weak_evidence"]
  },
  {
    id: "sandbox-permission",
    title: "Codex sandbox permission failure",
    fixture: "fixtures/sandbox-permission.md",
    expectedKinds: ["sandbox_permission", "weak_evidence"]
  },
  {
    id: "codex-windows-helper-path",
    title: "Codex Windows helper and bundled tool path failure",
    fixture: "fixtures/codex-windows-helper-path.md",
    expectedKinds: ["codex_windows_helper_path", "sandbox_permission", "codex_plugin_runtime", "weak_evidence"]
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
    id: "codex-terminal-output-integrity",
    title: "Codex terminal output and scrollback integrity failure",
    fixture: "fixtures/codex-terminal-output-integrity.md",
    expectedKinds: ["codex_terminal_output_integrity", "weak_evidence"]
  },
  {
    id: "codex-subagent-lifecycle",
    title: "Codex subagent lifecycle and state reconciliation failure",
    fixture: "fixtures/codex-subagent-lifecycle.md",
    expectedKinds: ["codex_subagent_lifecycle", "weak_evidence"]
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
    id: "codex-mcp-streamable-http",
    title: "Codex Streamable HTTP MCP parse and handshake failure",
    fixture: "fixtures/codex-mcp-streamable-http.md",
    expectedKinds: ["codex_mcp_streamable_http", "weak_evidence"]
  },
  {
    id: "codex-hooks-runtime",
    title: "Codex hooks runtime and UI failure",
    fixture: "fixtures/codex-hooks-runtime.md",
    expectedKinds: ["codex_hooks_runtime", "weak_evidence"]
  },
  {
    id: "codex-mcp-discovery-mismatch",
    title: "Codex MCP discovery and config-scope mismatch",
    fixture: "fixtures/codex-mcp-discovery-mismatch.md",
    expectedKinds: ["codex_mcp_discovery_mismatch", "weak_evidence"]
  },
  {
    id: "codex-plugin-runtime",
    title: "Codex plugin runtime and bundled capability failure",
    fixture: "fixtures/codex-plugin-runtime.md",
    expectedKinds: ["codex_plugin_runtime", "weak_evidence"]
  },
  {
    id: "codex-file-tree-ui",
    title: "Codex file tree and workspace navigation UI failure",
    fixture: "fixtures/codex-file-tree-ui.md",
    expectedKinds: ["codex_file_tree_ui", "weak_evidence"]
  },
  {
    id: "codex-session-state",
    title: "Codex session resume and state failure",
    fixture: "fixtures/codex-session-state.md",
    expectedKinds: ["codex_session_state", "weak_evidence"]
  },
  {
    id: "codex-usage-bucket-confusion",
    title: "Codex usage bucket scope and percentage confusion",
    fixture: "fixtures/codex-usage-bucket-confusion.md",
    expectedKinds: ["codex_usage_bucket_confusion", "weak_evidence"]
  },
  {
    id: "codex-context-visibility",
    title: "Codex context or token usage indicator missing",
    fixture: "fixtures/codex-context-visibility.md",
    expectedKinds: ["codex_context_visibility", "weak_evidence"]
  },
  {
    id: "codex-remote-connection",
    title: "Codex remote connection or SSH workspace failure",
    fixture: "fixtures/codex-remote-connection.md",
    expectedKinds: ["codex_remote_connection", "weak_evidence"]
  },
  {
    id: "codex-platform-availability",
    title: "Codex platform availability and unsupported surface demand",
    fixture: "fixtures/codex-platform-availability.md",
    expectedKinds: ["codex_platform_availability", "weak_evidence"]
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
    id: "codex-tool-call-integrity",
    title: "Codex tool-call integrity and rollback failure",
    fixture: "fixtures/codex-tool-call-integrity.md",
    expectedKinds: ["codex_tool_call_integrity", "weak_evidence"]
  },
  {
    id: "codex-apply-patch-overwrite",
    title: "Codex apply_patch Add File overwrite safety",
    fixture: "fixtures/codex-apply-patch-overwrite.md",
    expectedKinds: ["codex_tool_call_integrity", "weak_evidence"]
  },
  {
    id: "codex-usage-reset-drift",
    title: "Codex usage reset schedule drift",
    fixture: "fixtures/codex-usage-reset-drift.md",
    expectedKinds: ["codex_usage_reset_drift", "weak_evidence"]
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
