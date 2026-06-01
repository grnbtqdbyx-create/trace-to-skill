# trace-to-skill Demo

Scenario: **Codex context or token usage indicator missing**

Desktop context or token usage indicators disappear, leaving long-session compaction pressure invisible.

Fixture: `fixtures/codex-context-visibility.md`

This is a packaged public fixture, so you can try the project without collecting a private trace first.

## Generated Codex Issue Report

# OpenAI Codex Issue Triage Report

Score: **75/100**

Likely failure class: **Codex context or token usage indicator missing (codex_context_visibility, high)**

Agent workflow needs clearer verification, instruction, or security hardening before broad reuse.

## Copy-Paste Issue Body

```md
### What happened?

trace-to-skill detected Codex context or token usage indicator missing (codex_context_visibility). Desktop users need passive context-pressure visibility during long coding sessions so they can decide when to compact, split a thread, reduce pasted context, or avoid context loss before the app forces compaction.

### Detected failure class

- codex_context_visibility: Codex context or token usage indicator missing (high)

### Evidence

#### Codex context or token usage indicator missing
- fixtures/codex-context-visibility.md:5 - - Codex Desktop no longer shows a visible context/token usage indicator in the chat UI after an update.
- fixtures/codex-context-visibility.md:6 - - Previously the app exposed context usage information, context-window pressure, or a tooltip near the input area.
- fixtures/codex-context-visibility.md:8 - - `/status` is useful as an explicit command, but it is not a replacement for passive context awareness during long-running desktop threads.
- fixtures/codex-context-visibility.md:9 - - The missing indicator affects professional coding workflows because users cannot tell when to compact, start a new thread, reduce pasted context, or split work before context loss.
- fixtures/codex-context-visibility.md:10 - - A related report says the data exists in local session logs, but the app no longer exposes it passively.
- fixtures/codex-context-visibility.md:15 - - Screenshot or short recording of the chat input area where the context indicator or tooltip used to appear.

### Diagnostics to attach

- When reporting Codex context-visibility regressions, capture Codex Desktop version, OS, surface, screenshot or short recording of the chat input area, whether the prior context/token indicator or tooltip was visible before the update, exact UI route where it disappeared, local session metadata showing context/window pressure if available, `/status` output if relevant, compaction timing, whether CLI/TUI still exposes a statusline, and how the missing indicator affects long-session decisions.

### Privacy

- I redacted tokens, API keys, private paths, customer data, and hidden Unicode controls before sharing this trace.
```

## Findings

### 1. Codex context or token usage indicator missing

Severity: **high**

Desktop users need passive context-pressure visibility during long coding sessions so they can decide when to compact, split a thread, reduce pasted context, or avoid context loss before the app forces compaction.

Evidence:
- `fixtures/codex-context-visibility.md:5` - Codex Desktop no longer shows a visible context/token usage indicator in the chat UI after an update.
- `fixtures/codex-context-visibility.md:6` - Previously the app exposed context usage information, context-window pressure, or a tooltip near the input area.
- `fixtures/codex-context-visibility.md:8` - `/status` is useful as an explicit command, but it is not a replacement for passive context awareness during long-running desktop threads.
- `fixtures/codex-context-visibility.md:9` - The missing indicator affects professional coding workflows because users cannot tell when to compact, start a new thread, reduce pasted context, or split work before context loss.
- `fixtures/codex-context-visibility.md:10` - A related report says the data exists in local session logs, but the app no longer exposes it passively.
- `fixtures/codex-context-visibility.md:15` - Screenshot or short recording of the chat input area where the context indicator or tooltip used to appear.

Suggested rule:

> When reporting Codex context-visibility regressions, capture Codex Desktop version, OS, surface, screenshot or short recording of the chat input area, whether the prior context/token indicator or tooltip was visible before the update, exact UI route where it disappeared, local session metadata showing context/window pressure if available, `/status` output if relevant, compaction timing, whether CLI/TUI still exposes a statusline, and how the missing indicator affects long-session decisions.


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
trace-to-skill demo usage-bucket-confusion
trace-to-skill demo context-visibility
trace-to-skill demo file-tree-ui
trace-to-skill demo usage-reset-drift
```
