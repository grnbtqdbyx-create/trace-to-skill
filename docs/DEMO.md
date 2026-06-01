# trace-to-skill Demo

Scenario: **Codex subagent lifecycle**

Completed, closed, stale, or interrupted subagents diverge between UI, live registry, persisted state, quota, and parent discoverability.

Fixture: `fixtures/codex-subagent-lifecycle.md`

This is a packaged public fixture, so you can try the project without collecting a private trace first.

## Generated Codex Issue Report

# OpenAI Codex Issue Triage Report

Score: **75/100**

Likely failure class: **Codex subagent lifecycle or state reconciliation failure (codex_subagent_lifecycle, high)**

Agent workflow needs clearer verification, instruction, or security hardening before broad reuse.

## Copy-Paste Issue Body

```md
### What happened?

trace-to-skill detected Codex subagent lifecycle or state reconciliation failure (codex_subagent_lifecycle). When completed, closed, stale, or interrupted subagents remain visible, keep quota slots, lose parent discoverability, or diverge between UI, live registry, and persisted spawn-edge state, long-running Codex sessions become hard to trust or recover.

### Detected failure class

- codex_subagent_lifecycle: Codex subagent lifecycle or state reconciliation failure (high)

### Evidence

#### Codex subagent lifecycle or state reconciliation failure
- fixtures/codex-subagent-lifecycle.md:16 - Completed or closed subagents remain visible in the Subagents panel.
- fixtures/codex-subagent-lifecycle.md:17 - The app shows stale subagent cards after close/readback reports no live agent handle.
- fixtures/codex-subagent-lifecycle.md:18 - The visible subagent count grows very large; the panel can show Show 67 more or 100+ stale entries.
- fixtures/codex-subagent-lifecycle.md:20 - It is unclear which subagents are active versus stale UI/cache entries.
- fixtures/codex-subagent-lifecycle.md:27 - thread_spawn_edges status count: closed=549, open=0
- fixtures/codex-subagent-lifecycle.md:28 - After restarting Codex Desktop multiple times, the Subagents panel still visually shows stale subagent cards.

### Diagnostics to attach

- When reporting Codex subagent lifecycle failures, capture Codex app/CLI/extension version, OS, surface, model, subscription/workspace, root thread id, subagent ids/nicknames/roles, spawn/close/list commands or UI actions, close_agent results, list_agents or /agents output, thread_spawn_edges status counts, agent registry or max_threads/quota evidence, recent-list/sidebar behavior, whether child threads are archived or shown as top-level conversations, last-progress/heartbeat or halt reason, MCP server state for subagents, compaction/resume timing, screenshot or redacted UI state, whether restart/reload/new thread clears it, and whether stale agents are UI-only or still block new spawns.

### Privacy

- I redacted tokens, API keys, private paths, customer data, and hidden Unicode controls before sharing this trace.
```

## Findings

### 1. Codex subagent lifecycle or state reconciliation failure

Severity: **high**

When completed, closed, stale, or interrupted subagents remain visible, keep quota slots, lose parent discoverability, or diverge between UI, live registry, and persisted spawn-edge state, long-running Codex sessions become hard to trust or recover.

Evidence:
- `fixtures/codex-subagent-lifecycle.md:16` Completed or closed subagents remain visible in the Subagents panel.
- `fixtures/codex-subagent-lifecycle.md:17` The app shows stale subagent cards after close/readback reports no live agent handle.
- `fixtures/codex-subagent-lifecycle.md:18` The visible subagent count grows very large; the panel can show Show 67 more or 100+ stale entries.
- `fixtures/codex-subagent-lifecycle.md:20` It is unclear which subagents are active versus stale UI/cache entries.
- `fixtures/codex-subagent-lifecycle.md:27` thread_spawn_edges status count: closed=549, open=0
- `fixtures/codex-subagent-lifecycle.md:28` After restarting Codex Desktop multiple times, the Subagents panel still visually shows stale subagent cards.
- `fixtures/codex-subagent-lifecycle.md:36` Codex subagents have been going stale and refusing to close for the past week.
- `fixtures/codex-subagent-lifecycle.md:47` Long sessions with stale subagents may hold MCP connections or leave connection lifecycle state unclear.

Suggested rule:

> When reporting Codex subagent lifecycle failures, capture Codex app/CLI/extension version, OS, surface, model, subscription/workspace, root thread id, subagent ids/nicknames/roles, spawn/close/list commands or UI actions, close_agent results, list_agents or /agents output, thread_spawn_edges status counts, agent registry or max_threads/quota evidence, recent-list/sidebar behavior, whether child threads are archived or shown as top-level conversations, last-progress/heartbeat or halt reason, MCP server state for subagents, compaction/resume timing, screenshot or redacted UI state, whether restart/reload/new thread clears it, and whether stale agents are UI-only or still block new spawns.


## Reporter Notes

- Run `trace-to-skill redact <trace> --output redacted-runs` before attaching logs publicly.
- Prefer the shortest trace that reproduces the failure.
- Include exact Codex app/CLI version, OS, model, subscription/workspace, and the command or UI action that failed.
- Link related OpenAI/Codex issues when you know them, but keep the evidence self-contained.


## Other Demo Scenarios

- `remote-compact`: Long sessions break when `/compact` or auto-compaction times out, disconnects, or fails at `responses/compact`.
- `context-fork-bloat`: Conversation forks duplicate parent transcript blocks, inflate token usage, or break prompt-cache lineage before new work happens.
- `windows-helper-path`: Windows Desktop exposes bundled rg/node/plugin helpers from WindowsApps or missing LocalCache paths that cannot execute.
- `approval-friction`: Repeated approval prompts, Approve for this session misses, and noisy trusted MCP tool approvals.
- `latency-regression`: Fast mode feels like Standard, with long thinking, search, read, or compaction stalls.
- `thinking-hang`: A turn or tool call completes, but the session stays on Thinking or Working with no streamed follow-up.
- `clipboard-attachment`: Copy as Markdown, long-paste conversion, or generated Pasted text.txt attachments break prompt and report workflows.
- `deeplink-launch`: OAuth callbacks, notification clicks, mobile links, or `codex app <path>` external activation fail to route into Codex.
- `connector-auth-cache`: App connectors keep stale `link_*` auth or discovery metadata after reauth-required responses.
- `mcp-discovery-mismatch`: MCP servers work in CLI or one config scope but are absent in Desktop, VS Code, WSL, or project-local sessions.
- `mcp-streamable-http`: Streamable HTTP or SSE MCP servers pass initialize or tools/list but fail parsing, handshakes, auth gating, stale sessions, or reconnects.
- `hooks-runtime`: Hooks duplicate, stop firing, warn about stale config, skip surfaces, or become hard to manage in Desktop settings.
- `terminal-output-integrity`: Terminal scrollback, streamed output, or transcript rendering drops, overwrites, truncates, or makes lines inaccessible.
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
trace-to-skill demo windows-helper-path
trace-to-skill demo patch-overwrite
trace-to-skill demo thinking-hang
trace-to-skill demo clipboard-attachment
trace-to-skill demo deeplink-launch
trace-to-skill demo connector-auth-cache
trace-to-skill demo mcp-discovery-mismatch
trace-to-skill demo mcp-streamable-http
trace-to-skill demo hooks-runtime
trace-to-skill demo terminal-output-integrity
trace-to-skill demo subagent-lifecycle
trace-to-skill demo file-tree-ui
trace-to-skill demo usage-reset-drift
```
