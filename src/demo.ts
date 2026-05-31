import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeTargets } from "./analyze.js";
import { renderCodexIssueReport } from "./report.js";
import type { AnalysisResult } from "./types.js";

export interface DemoScenario {
  id: string;
  title: string;
  fixture: string;
  description: string;
}

export interface DemoResult {
  generatedAt: string;
  scenario: DemoScenario;
  analysis: AnalysisResult;
}

const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "remote-compact",
    title: "Codex remote compact task failure",
    fixture: "fixtures/codex-remote-compact.md",
    description: "Long sessions break when `/compact` or auto-compaction times out, disconnects, or fails at `responses/compact`."
  },
  {
    id: "approval-friction",
    title: "Codex approval friction",
    fixture: "fixtures/codex-approval-friction.md",
    description: "Repeated approval prompts, Approve for this session misses, and noisy trusted MCP tool approvals."
  },
  {
    id: "latency-regression",
    title: "Codex latency regression",
    fixture: "fixtures/codex-latency-regression.md",
    description: "Fast mode feels like Standard, with long thinking, search, read, or compaction stalls."
  },
  {
    id: "token-burn",
    title: "Codex token burn",
    fixture: "fixtures/codex-token-burn.md",
    description: "Usage drains from background polling, idle activity, compaction loops, retries, or cached-heavy turns."
  },
  {
    id: "sensitive-files",
    title: "Sensitive file access",
    fixture: "fixtures/sensitive-file-access.md",
    description: "Secrets, local credentials, production env files, or private databases enter agent context."
  },
  {
    id: "github-prompt-injection",
    title: "GitHub prompt injection",
    fixture: "fixtures/prompt-injection.md",
    description: "Untrusted issue, PR, comment, or web text tells the agent to ignore policy or leak secrets."
  },
  {
    id: "file-tree-ui",
    title: "Codex file tree UI failure",
    fixture: "fixtures/codex-file-tree-ui.md",
    description: "Desktop file tree, floating file panel, or file preview disappears, goes stale, or cannot be revealed."
  },
  {
    id: "usage-reset-drift",
    title: "Codex usage reset schedule drift",
    fixture: "fixtures/codex-usage-reset-drift.md",
    description: "Weekly or 5-hour reset dates move unexpectedly, making paid usage hard to plan or wasting saved capacity."
  }
];

export function listDemoScenarios(): DemoScenario[] {
  return [...DEMO_SCENARIOS];
}

export async function runDemo(scenarioId = "approval-friction"): Promise<DemoResult> {
  const scenario = DEMO_SCENARIOS.find((item) => item.id === scenarioId);
  if (!scenario) {
    const ids = DEMO_SCENARIOS.map((item) => item.id).join(", ");
    throw new Error(`unknown demo scenario "${scenarioId}". Available scenarios: ${ids}`);
  }

  const analysis = await analyzeTargets([path.join(packageRoot(), scenario.fixture)]);
  return {
    generatedAt: new Date().toISOString(),
    scenario,
    analysis
  };
}

export function renderDemoMarkdown(result: DemoResult): string {
  const otherScenarios = DEMO_SCENARIOS
    .filter((scenario) => scenario.id !== result.scenario.id)
    .map((scenario) => `- \`${scenario.id}\`: ${scenario.description}`);

  return [
    "# trace-to-skill Demo",
    "",
    `Scenario: **${result.scenario.title}**`,
    "",
    result.scenario.description,
    "",
    `Fixture: \`${result.scenario.fixture}\``,
    "",
    "This is a packaged public fixture, so you can try the project without collecting a private trace first.",
    "",
    "## Generated Codex Issue Report",
    "",
    renderCodexIssueReport(result.analysis).replace(/^# OpenAI Codex Issue Report\n\n/, ""),
    "",
    "## Other Demo Scenarios",
    "",
    ...otherScenarios,
    "",
    "```bash",
    "trace-to-skill demo --list",
    "trace-to-skill demo remote-compact",
    "trace-to-skill demo file-tree-ui",
    "trace-to-skill demo usage-reset-drift",
    "```",
    ""
  ].join("\n");
}

export function renderDemoScenarioList(scenarios = listDemoScenarios()): string {
  return [
    "# trace-to-skill Demo Scenarios",
    "",
    "| Scenario | What it shows |",
    "| --- | --- |",
    ...scenarios.map((scenario) => `| \`${scenario.id}\` | ${scenario.description} |`),
    "",
    "Run one locally:",
    "",
    "```bash",
    "trace-to-skill demo",
    "trace-to-skill demo remote-compact",
    "trace-to-skill demo latency-regression",
    "trace-to-skill demo --list",
    "```",
    ""
  ].join("\n");
}

function packageRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
}
