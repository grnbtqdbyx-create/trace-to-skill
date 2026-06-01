# trace-to-skill Demo

Scenario: **Codex subagent orchestration and configuration gap**

Official subagent support, per-agent model/reasoning config, role definitions, MCP tool scoping, and repo-level orchestration are missing or unclear.

Fixture: `fixtures/codex-subagent-orchestration.md`

This is a packaged public fixture, so you can try the project without collecting a private trace first.

## Generated Codex Issue Report

# OpenAI Codex Issue Triage Report

Score: **75/100**

Likely failure class: **Codex subagent orchestration or configuration gap (codex_subagent_orchestration, high)**

Agent workflow needs clearer verification, instruction, or security hardening before broad reuse.

## Copy-Paste Issue Body

```md
### What happened?

trace-to-skill detected Codex subagent orchestration or configuration gap (codex_subagent_orchestration). Users want official subagent functionality that can isolate context, specialize roles, and configure model, reasoning, permissions, MCP tools, and repo-level instructions per helper instead of forcing one global agent configuration.

### Detected failure class

- codex_subagent_orchestration: Codex subagent orchestration or configuration gap (high)

### Evidence

#### Codex subagent orchestration or configuration gap
- fixtures/codex-subagent-orchestration.md:3 - Public issue cluster: Subagent Support and Subagent configuration and orchestration.
- fixtures/codex-subagent-orchestration.md:5 - ## Official Subagent Support
- fixtures/codex-subagent-orchestration.md:7 - - Users request official subagent functionality in Codex instead of prompt-only or headless CLI workarounds.
- fixtures/codex-subagent-orchestration.md:8 - - The requested system includes an agent registry, persistent agent storage, TUI integration for agent creation, prompt templating for agent definitions, and an agent selection interface.
- fixtures/codex-subagent-orchestration.md:9 - - Expected subagent benefits include specialized expertise, context isolation, workflow optimization, separate concerns, focused conversations, and less context switching.
- fixtures/codex-subagent-orchestration.md:15 - - Users want subagent configuration and orchestration so each helper can use a different model, `reasoning_effort`, permission profile, and MCP tool set.

### Diagnostics to attach

- When reporting Codex subagent orchestration gaps, capture the requested subagent workflow, Codex app/CLI/TUI version, whether built-in `spawn_agent` or `/agents` exists, desired role definitions, per-agent model/reasoning/speed settings, `agents_config.toml` or `~/.codex/config.toml` shape, repo-level versus user-level override needs, instruction-file behavior versus AGENTS.md, permission/sandbox/read-only settings, MCP tool allowlist/denylist expectations, context-isolation requirements, examples of planner/explorer/implementer/reviewer roles, and whether current workarounds such as headless `codex exec` subagents preserve logs, timeouts, and cost.

### Privacy

- I redacted tokens, API keys, private paths, customer data, and hidden Unicode controls before sharing this trace.
```

## Findings

### 1. Codex subagent orchestration or configuration gap

Severity: **high**

Users want official subagent functionality that can isolate context, specialize roles, and configure model, reasoning, permissions, MCP tools, and repo-level instructions per helper instead of forcing one global agent configuration.

Evidence:
- `fixtures/codex-subagent-orchestration.md:3` Public issue cluster: Subagent Support and Subagent configuration and orchestration.
- `fixtures/codex-subagent-orchestration.md:5` ## Official Subagent Support
- `fixtures/codex-subagent-orchestration.md:7` - Users request official subagent functionality in Codex instead of prompt-only or headless CLI workarounds.
- `fixtures/codex-subagent-orchestration.md:8` - The requested system includes an agent registry, persistent agent storage, TUI integration for agent creation, prompt templating for agent definitions, and an agent selection interface.
- `fixtures/codex-subagent-orchestration.md:9` - Expected subagent benefits include specialized expertise, context isolation, workflow optimization, separate concerns, focused conversations, and less context switching.
- `fixtures/codex-subagent-orchestration.md:15` - Users want subagent configuration and orchestration so each helper can use a different model, `reasoning_effort`, permission profile, and MCP tool set.
- `fixtures/codex-subagent-orchestration.md:16` - A common desired split is a strong planner/orchestrator model with faster explorer or implementation subagents such as Spark for scoped tasks.
- `fixtures/codex-subagent-orchestration.md:18` - Requested config surfaces include `~/.codex/config.toml`, `agents_config.toml`, and repo-level files such as `.agents/subagents/explore_agent.md`.

Suggested rule:

> When reporting Codex subagent orchestration gaps, capture the requested subagent workflow, Codex app/CLI/TUI version, whether built-in `spawn_agent` or `/agents` exists, desired role definitions, per-agent model/reasoning/speed settings, `agents_config.toml` or `~/.codex/config.toml` shape, repo-level versus user-level override needs, instruction-file behavior versus AGENTS.md, permission/sandbox/read-only settings, MCP tool allowlist/denylist expectations, context-isolation requirements, examples of planner/explorer/implementer/reviewer roles, and whether current workarounds such as headless `codex exec` subagents preserve logs, timeouts, and cost.


## Reporter Notes

- Run `trace-to-skill redact <trace> --output redacted-runs` before attaching logs publicly.
- Prefer the shortest trace that reproduces the failure.
- Include exact Codex app/CLI version, OS, model, subscription/workspace, and the command or UI action that failed.
- Link related OpenAI/Codex issues when you know them, but keep the evidence self-contained.


## Other Demo Scenarios

- `remote-compact`: Long sessions break when `/compact` or auto-compaction times out, disconnects, or fails at `responses/compact`.
- `context-fork-bloat`: Conversation forks duplicate parent transcript blocks, inflate token usage, or break prompt-cache lineage before new work happens.
- `subagent-prompt-leakage`: MultiAgentV2 child agents receive assistant/commentary prompt envelopes or sibling prompts despite `fork_turns: "none"`.
- `windows-helper-path`: Windows Desktop exposes bundled rg/node/plugin helpers from WindowsApps or missing LocalCache paths that cannot execute.
- `approval-friction`: Repeated approval prompts, Approve for this session misses, and noisy trusted MCP tool approvals.
- `latency-regression`: Fast mode feels like Standard, with long thinking, search, read, or compaction stalls.
- `model-routing-mismatch`: Codex shows one selected model while SSE response evidence shows a different server-side model was used.
- `thinking-hang`: A turn or tool call completes, but the session stays on Thinking or Working with no streamed follow-up.
- `cli-no-response`: Codex CLI accepts prompts but produces no streaming output, no error, no timeout, or hangs during command execution.
- `clipboard-attachment`: Copy as Markdown, long-paste conversion, or generated Pasted text.txt attachments break prompt and report workflows.
- `deeplink-launch`: OAuth callbacks, notification clicks, mobile links, or `codex app <path>` external activation fail to route into Codex.
- `connector-auth-cache`: App connectors keep stale `link_*` auth or discovery metadata after reauth-required responses.
- `auth-verification`: Phone verification, ChatGPT sign-in account routing, or extension chat initialization blocks Codex before a usable session starts.
- `mcp-discovery-mismatch`: MCP servers work in CLI or one config scope but are absent in Desktop, VS Code, WSL, or project-local sessions.
- `mcp-streamable-http`: Streamable HTTP or SSE MCP servers pass initialize or tools/list but fail parsing, handshakes, auth gating, stale sessions, or reconnects.
- `hooks-runtime`: Hooks duplicate, stop firing, warn about stale config, skip surfaces, or become hard to manage in Desktop settings.
- `terminal-output-integrity`: Terminal scrollback, streamed output, or transcript rendering drops, overwrites, truncates, or makes lines inaccessible.
- `subagent-lifecycle`: Completed, closed, stale, or interrupted subagents diverge between UI, live registry, persisted state, quota, and parent discoverability.
- `usage-bucket-confusion`: Usage popovers show 5h and weekly percentages without clear remaining/used, rolling/calendar, or account/workspace scope.
- `context-visibility`: Desktop context or token usage indicators disappear, leaving long-session compaction pressure invisible.
- `remote-connection`: Desktop remote SSH workspaces, Settings > Connections, remote app-server, tunnel, or remote filesystem evidence breaks.
- `platform-availability`: Codex Desktop, Linux app, or JetBrains extension demand is blocked by unsupported architecture, OS, package, or IDE surface.
- `token-burn`: Usage drains from background polling, idle activity, compaction loops, retries, or cached-heavy turns.
- `patch-overwrite`: `apply_patch` accepts `*** Add File` for an existing path, turning a create operation into a silent overwrite.
- `sensitive-files`: Secrets, local credentials, production env files, or private databases enter agent context.
- `github-prompt-injection`: Untrusted issue, PR, comment, or web text tells the agent to ignore policy or leak secrets.
- `file-tree-ui`: Desktop file tree, floating file panel, or file preview disappears, goes stale, or cannot be revealed.
- `usage-reset-drift`: Weekly or 5-hour reset dates move unexpectedly, making paid usage hard to plan or wasting saved capacity.

```bash
trace-to-skill demo --list
trace-to-skill demo remote-compact
trace-to-skill demo context-fork-bloat
trace-to-skill demo subagent-prompt-leakage
trace-to-skill demo subagent-orchestration
trace-to-skill demo windows-helper-path
trace-to-skill demo patch-overwrite
trace-to-skill demo thinking-hang
trace-to-skill demo cli-no-response
trace-to-skill demo clipboard-attachment
trace-to-skill demo deeplink-launch
trace-to-skill demo connector-auth-cache
trace-to-skill demo mcp-discovery-mismatch
trace-to-skill demo mcp-streamable-http
trace-to-skill demo hooks-runtime
trace-to-skill demo terminal-output-integrity
trace-to-skill demo subagent-lifecycle
trace-to-skill demo usage-bucket-confusion
trace-to-skill demo context-visibility
trace-to-skill demo remote-connection
trace-to-skill demo platform-availability
trace-to-skill demo file-tree-ui
trace-to-skill demo usage-reset-drift
```
