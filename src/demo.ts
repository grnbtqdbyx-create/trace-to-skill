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
    id: "context-fork-bloat",
    title: "Codex context fork bloat",
    fixture: "fixtures/codex-context-fork-bloat.md",
    description: "Conversation forks duplicate parent transcript blocks, inflate token usage, or break prompt-cache lineage before new work happens."
  },
  {
    id: "subagent-prompt-leakage",
    title: "Codex subagent prompt leakage",
    fixture: "fixtures/codex-subagent-prompt-leakage.md",
    description: "MultiAgentV2 child agents receive assistant/commentary prompt envelopes or sibling prompts despite `fork_turns: \"none\"`."
  },
  {
    id: "windows-helper-path",
    title: "Codex Windows helper path failure",
    fixture: "fixtures/codex-windows-helper-path.md",
    description: "Windows Desktop exposes bundled rg/node/plugin helpers from WindowsApps or missing LocalCache paths that cannot execute."
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
    id: "model-routing-mismatch",
    title: "Codex selected model differs from actual routed model",
    fixture: "fixtures/codex-model-routing-mismatch.md",
    description: "Codex shows one selected model while SSE response evidence shows a different server-side model was used."
  },
  {
    id: "thinking-hang",
    title: "Codex thinking and stream hang",
    fixture: "fixtures/codex-thinking-hang.md",
    description: "A turn or tool call completes, but the session stays on Thinking or Working with no streamed follow-up."
  },
  {
    id: "cli-no-response",
    title: "Codex CLI no-response or all-model hang",
    fixture: "fixtures/codex-cli-no-response.md",
    description: "Codex CLI accepts prompts but produces no streaming output, no error, no timeout, or hangs during command execution."
  },
  {
    id: "clipboard-attachment",
    title: "Codex clipboard and pasted-text attachment regression",
    fixture: "fixtures/codex-clipboard-attachment.md",
    description: "Copy as Markdown, long-paste conversion, or generated Pasted text.txt attachments break prompt and report workflows."
  },
  {
    id: "deeplink-launch",
    title: "Codex deeplink and OAuth callback launch regression",
    fixture: "fixtures/codex-deeplink-launch.md",
    description: "OAuth callbacks, notification clicks, mobile links, or `codex app <path>` external activation fail to route into Codex."
  },
  {
    id: "connector-auth-cache",
    title: "Codex app connector auth cache regression",
    fixture: "fixtures/codex-connector-auth-cache.md",
    description: "App connectors keep stale `link_*` auth or discovery metadata after reauth-required responses."
  },
  {
    id: "auth-verification",
    title: "Codex sign-in and account verification failure",
    fixture: "fixtures/codex-auth-verification.md",
    description: "Phone verification, ChatGPT sign-in account routing, or extension chat initialization blocks Codex before a usable session starts."
  },
  {
    id: "mcp-discovery-mismatch",
    title: "Codex MCP discovery mismatch",
    fixture: "fixtures/codex-mcp-discovery-mismatch.md",
    description: "MCP servers work in CLI or one config scope but are absent in Desktop, VS Code, WSL, or project-local sessions."
  },
  {
    id: "mcp-streamable-http",
    title: "Codex Streamable HTTP MCP failure",
    fixture: "fixtures/codex-mcp-streamable-http.md",
    description: "Streamable HTTP or SSE MCP servers pass initialize or tools/list but fail parsing, handshakes, auth gating, stale sessions, or reconnects."
  },
  {
    id: "hooks-runtime",
    title: "Codex hooks runtime failure",
    fixture: "fixtures/codex-hooks-runtime.md",
    description: "Hooks duplicate, stop firing, warn about stale config, skip surfaces, or become hard to manage in Desktop settings."
  },
  {
    id: "terminal-output-integrity",
    title: "Codex terminal output integrity",
    fixture: "fixtures/codex-terminal-output-integrity.md",
    description: "Terminal scrollback, streamed output, or transcript rendering drops, overwrites, truncates, or makes lines inaccessible."
  },
  {
    id: "subagent-lifecycle",
    title: "Codex subagent lifecycle",
    fixture: "fixtures/codex-subagent-lifecycle.md",
    description: "Completed, closed, stale, or interrupted subagents diverge between UI, live registry, persisted state, quota, and parent discoverability."
  },
  {
    id: "usage-bucket-confusion",
    title: "Codex usage bucket confusion",
    fixture: "fixtures/codex-usage-bucket-confusion.md",
    description: "Usage popovers show 5h and weekly percentages without clear remaining/used, rolling/calendar, or account/workspace scope."
  },
  {
    id: "context-visibility",
    title: "Codex context or token usage indicator missing",
    fixture: "fixtures/codex-context-visibility.md",
    description: "Desktop context or token usage indicators disappear, leaving long-session compaction pressure invisible."
  },
  {
    id: "remote-connection",
    title: "Codex remote connection or SSH workspace failure",
    fixture: "fixtures/codex-remote-connection.md",
    description: "Desktop remote SSH workspaces, Settings > Connections, remote app-server, tunnel, or remote filesystem evidence breaks."
  },
  {
    id: "platform-availability",
    title: "Codex platform availability gap",
    fixture: "fixtures/codex-platform-availability.md",
    description: "Codex Desktop, Linux app, or JetBrains extension demand is blocked by unsupported architecture, OS, package, or IDE surface."
  },
  {
    id: "token-burn",
    title: "Codex token burn",
    fixture: "fixtures/codex-token-burn.md",
    description: "Usage drains from background polling, idle activity, compaction loops, retries, or cached-heavy turns."
  },
  {
    id: "patch-overwrite",
    title: "Codex apply_patch overwrite safety",
    fixture: "fixtures/codex-apply-patch-overwrite.md",
    description: "`apply_patch` accepts `*** Add File` for an existing path, turning a create operation into a silent overwrite."
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
    "trace-to-skill demo context-fork-bloat",
    "trace-to-skill demo subagent-prompt-leakage",
    "trace-to-skill demo windows-helper-path",
    "trace-to-skill demo patch-overwrite",
    "trace-to-skill demo thinking-hang",
    "trace-to-skill demo cli-no-response",
    "trace-to-skill demo clipboard-attachment",
    "trace-to-skill demo deeplink-launch",
    "trace-to-skill demo connector-auth-cache",
    "trace-to-skill demo mcp-discovery-mismatch",
    "trace-to-skill demo mcp-streamable-http",
    "trace-to-skill demo hooks-runtime",
    "trace-to-skill demo terminal-output-integrity",
    "trace-to-skill demo subagent-lifecycle",
    "trace-to-skill demo usage-bucket-confusion",
    "trace-to-skill demo context-visibility",
    "trace-to-skill demo remote-connection",
    "trace-to-skill demo platform-availability",
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
    "trace-to-skill demo context-fork-bloat",
    "trace-to-skill demo subagent-prompt-leakage",
    "trace-to-skill demo windows-helper-path",
    "trace-to-skill demo patch-overwrite",
    "trace-to-skill demo latency-regression",
    "trace-to-skill demo thinking-hang",
    "trace-to-skill demo cli-no-response",
    "trace-to-skill demo clipboard-attachment",
    "trace-to-skill demo deeplink-launch",
    "trace-to-skill demo connector-auth-cache",
    "trace-to-skill demo mcp-discovery-mismatch",
    "trace-to-skill demo mcp-streamable-http",
    "trace-to-skill demo hooks-runtime",
    "trace-to-skill demo terminal-output-integrity",
    "trace-to-skill demo subagent-lifecycle",
    "trace-to-skill demo usage-bucket-confusion",
    "trace-to-skill demo context-visibility",
    "trace-to-skill demo remote-connection",
    "trace-to-skill demo platform-availability",
    "trace-to-skill demo --list",
    "```",
    ""
  ].join("\n");
}

function packageRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
}
