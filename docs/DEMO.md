# trace-to-skill Demo

## Fast Maintainer Demo

Watch the short asciinema recording: [`docs/MAINTAINER_DEMO.cast`](MAINTAINER_DEMO.cast).

It uses only packaged public fixtures and shows the quickest maintainer loop:

```bash
npx trace-to-skill demo hooks-contract
npx trace-to-skill codex-report fixtures/codex-hooks-contract.md --output codex-hooks-issue.md
npx trace-to-skill scorecard .
```

The demo starts with a failed-agent/Codex issue fixture, turns it into a copy-paste OpenAI/Codex issue report with line-level evidence, then checks repository readiness with scorecard proof.

Scenario: **Codex hooks contract and coverage gap**

Users need documented hook events, blocking/async semantics, matcher coverage, additionalContext, and lifecycle coverage for guardrails and automation.

Fixture: `fixtures/codex-hooks-contract.md`

This is a packaged public fixture, so you can try the project without collecting a private trace first.

## Generated Codex Issue Report

# OpenAI Codex Issue Triage Report

Score: **75/100**

Likely failure class: **Codex hooks contract or coverage gap (codex_hooks_contract, high)**

Agent workflow needs clearer verification, instruction, or security hardening before broad reuse.

## Copy-Paste Issue Body

```md
### What happened?

trace-to-skill detected Codex hooks contract or coverage gap (codex_hooks_contract). Hooks are the integration point for guardrails, context discipline, enterprise governance, and automation; users need a documented event contract, predictable blocking/async semantics, and enough lifecycle coverage to integrate Codex without reverse engineering.

### Detected failure class

- codex_hooks_contract: Codex hooks contract or coverage gap (high)

### Evidence

#### Codex hooks contract or coverage gap
- fixtures/codex-hooks-contract.md:3 - Public issue cluster: Event Hooks and hook contract requests.
- fixtures/codex-hooks-contract.md:7 - - Users ask for Event Hooks with pattern matching so scripts or commands can run before and after Codex behaviors.
- fixtures/codex-hooks-contract.md:8 - - The requested lifecycle events include `SessionStart`, `SessionEnd`, `Stop`, `PreCompact`, `PostCompact`, `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `SubagentStop`, and `Notification`.
- fixtures/codex-hooks-contract.md:9 - - Enterprise users want hooks for governance, compliance checks, devops monitoring, multi-agent memory discipline, persistent summaries, and guardrails.
- fixtures/codex-hooks-contract.md:10 - - Users compare the desired contract to Claude Code, Cursor, OpenCode, and other hook systems with blocking plus feedback-providing hooks.
- fixtures/codex-hooks-contract.md:15 - - Users need to know whether hooks are blocking or async, whether `on_failure` can `continue` or `abort`, and whether hooks can return a decision.

### Diagnostics to attach

- When reporting Codex hooks contract or coverage gaps, capture Codex app/CLI/extension version, OS, surface, `[features].hooks` state, current docs link or release note, exact hook events requested, whether each event must be blocking or async, desired failure policy (`continue`, `abort`, or feedback), matcher needs for Shell/Edit/Write/MCP/approval events, whether hook stdout should inject `additionalContext`, config schema/TOML examples, payload fields needed for session/thread/turn/cwd/model/tool result, stability expectation for experimental versus stable hooks, Windows/Code Mode/Desktop coverage, comparison to Claude Code/OpenCode hooks if relevant, and the guardrail, compliance, context-memory, formatting, tmux/status, or orchestration workflow that is blocked.

### Privacy

- I redacted tokens, API keys, private paths, customer data, and hidden Unicode controls before sharing this trace.
```

## Findings

### 1. Codex hooks contract or coverage gap

Severity: **high**

Hooks are the integration point for guardrails, context discipline, enterprise governance, and automation; users need a documented event contract, predictable blocking/async semantics, and enough lifecycle coverage to integrate Codex without reverse engineering.

Evidence:
- `fixtures/codex-hooks-contract.md:3` Public issue cluster: Event Hooks and hook contract requests.
- `fixtures/codex-hooks-contract.md:7` - Users ask for Event Hooks with pattern matching so scripts or commands can run before and after Codex behaviors.
- `fixtures/codex-hooks-contract.md:8` - The requested lifecycle events include `SessionStart`, `SessionEnd`, `Stop`, `PreCompact`, `PostCompact`, `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `SubagentStop`, and `Notification`.
- `fixtures/codex-hooks-contract.md:9` - Enterprise users want hooks for governance, compliance checks, devops monitoring, multi-agent memory discipline, persistent summaries, and guardrails.
- `fixtures/codex-hooks-contract.md:10` - Users compare the desired contract to Claude Code, Cursor, OpenCode, and other hook systems with blocking plus feedback-providing hooks.
- `fixtures/codex-hooks-contract.md:15` - Users need to know whether hooks are blocking or async, whether `on_failure` can `continue` or `abort`, and whether hooks can return a decision.
- `fixtures/codex-hooks-contract.md:16` - A key request is hook stdout or `hookSpecificOutput.additionalContext` so `SessionStart` or `UserPromptSubmit` can inject context the model sees.
- `fixtures/codex-hooks-contract.md:17` - Tool matcher coverage matters: users ask whether Shell, Edit, Write, MCP, approval-requested, and command events can be matched in `PreToolUse` and `PostToolUse`.

Suggested rule:

> When reporting Codex hooks contract or coverage gaps, capture Codex app/CLI/extension version, OS, surface, `[features].hooks` state, current docs link or release note, exact hook events requested, whether each event must be blocking or async, desired failure policy (`continue`, `abort`, or feedback), matcher needs for Shell/Edit/Write/MCP/approval events, whether hook stdout should inject `additionalContext`, config schema/TOML examples, payload fields needed for session/thread/turn/cwd/model/tool result, stability expectation for experimental versus stable hooks, Windows/Code Mode/Desktop coverage, comparison to Claude Code/OpenCode hooks if relevant, and the guardrail, compliance, context-memory, formatting, tmux/status, or orchestration workflow that is blocked.


## Reporter Notes

- Run `trace-to-skill redact <trace> --output redacted-runs` before attaching logs publicly.
- Prefer the shortest trace that reproduces the failure.
- Include exact Codex app/CLI version, OS, model, subscription/workspace, and the command or UI action that failed.
- Link related OpenAI/Codex issues when you know them, but keep the evidence self-contained.


## Other Demo Scenarios

- `remote-compact`: Long sessions break when `/compact` or auto-compaction times out, disconnects, or fails at `responses/compact`.
- `context-fork-bloat`: Conversation forks duplicate parent transcript blocks, inflate token usage, or break prompt-cache lineage before new work happens.
- `subagent-prompt-leakage`: MultiAgentV2 child agents receive assistant/commentary prompt envelopes or sibling prompts despite `fork_turns: "none"`.
- `subagent-orchestration`: Official subagent support, per-agent model/reasoning config, role definitions, MCP tool scoping, and repo-level orchestration are missing or unclear.
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
trace-to-skill demo hooks-contract
trace-to-skill demo terminal-output-integrity
trace-to-skill demo subagent-lifecycle
trace-to-skill demo usage-bucket-confusion
trace-to-skill demo context-visibility
trace-to-skill demo remote-connection
trace-to-skill demo platform-availability
trace-to-skill demo file-tree-ui
trace-to-skill demo usage-reset-drift
```
