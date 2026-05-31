# trace-to-skill Demo

Scenario: **Codex thinking and stream hang**

A turn or tool call completes, but the session stays on Thinking or Working with no streamed follow-up.

Fixture: `fixtures/codex-thinking-hang.md`

This is a packaged public fixture, so you can try the project without collecting a private trace first.

## Generated Codex Issue Report

# OpenAI Codex Issue Triage Report

Score: **75/100**

Likely failure class: **Codex thinking or stream hang (codex_thinking_hang, high)**

Agent workflow needs clearer verification, instruction, or security hardening before broad reuse.

## Copy-Paste Issue Body

```md
### What happened?

trace-to-skill detected Codex thinking or stream hang (codex_thinking_hang). Codex can accept a turn, finish local tool calls, or keep a Responses request open while the UI/CLI remains on Thinking or Working with no streamed follow-up, making users interrupt healthy runs or lose long-session context.

### Detected failure class

- codex_thinking_hang: Codex thinking or stream hang (high)

### Evidence

#### Codex thinking or stream hang
- fixtures/codex-thinking-hang.md:12 - - Codex Desktop can remain in Thinking after successful tool calls with no streamed follow-up or a hung /responses request.
- fixtures/codex-thinking-hang.md:13 - - The tools returned instantly (`pwd` and `rg --files`), then the app sat for minutes with no next assistant action until interrupt.
- fixtures/codex-thinking-hang.md:16 - - The first response_item type=reasoning appeared only after a 1,838.5 second gap.
- fixtures/codex-thinking-hang.md:17 - - Another report showed `model_client.stream_responses_api{transport="responses_http" api.path="responses"}: close time.busy=51.5ms time.idle=380s`.
- fixtures/codex-thinking-hang.md:20 - - In subagent runs, the parent main thread stays stuck thinking while a child thread remains active, so the UI needs `waiting_on_child`, `child_requires_input`, or `child_cleanup_pending`.
- fixtures/codex-thinking-hang.md:21 - - One workaround was a minimal `config.toml` without MCPs because a broken MCP that was not responding kept the session stuck on Thinking.

### Diagnostics to attach

- When reporting Codex thinking hangs, capture app/CLI/extension version, OS, model and reasoning/speed settings, turn/thread id, prompt timestamp, `turn/start` or `task_started` timestamp, last successful tool-call output, first `response_item` or assistant timestamp if it eventually appears, transport (`responses_http` or websocket), `time.busy`/`time.idle` close metrics, reconnect or stream-disconnect lines, MCP/subagent state, whether stop/interrupt works, and whether a new thread or minimal config without MCPs recovers.

### Privacy

- I redacted tokens, API keys, private paths, customer data, and hidden Unicode controls before sharing this trace.
```

## Findings

### 1. Codex thinking or stream hang

Severity: **high**

Codex can accept a turn, finish local tool calls, or keep a Responses request open while the UI/CLI remains on Thinking or Working with no streamed follow-up, making users interrupt healthy runs or lose long-session context.

Evidence:
- `fixtures/codex-thinking-hang.md:12` - Codex Desktop can remain in Thinking after successful tool calls with no streamed follow-up or a hung /responses request.
- `fixtures/codex-thinking-hang.md:13` - The tools returned instantly (`pwd` and `rg --files`), then the app sat for minutes with no next assistant action until interrupt.
- `fixtures/codex-thinking-hang.md:16` - The first response_item type=reasoning appeared only after a 1,838.5 second gap.
- `fixtures/codex-thinking-hang.md:17` - Another report showed `model_client.stream_responses_api{transport="responses_http" api.path="responses"}: close time.busy=51.5ms time.idle=380s`.
- `fixtures/codex-thinking-hang.md:20` - In subagent runs, the parent main thread stays stuck thinking while a child thread remains active, so the UI needs `waiting_on_child`, `child_requires_input`, or `child_cleanup_pending`.
- `fixtures/codex-thinking-hang.md:21` - One workaround was a minimal `config.toml` without MCPs because a broken MCP that was not responding kept the session stuck on Thinking.
- `fixtures/codex-thinking-hang.md:32` - MCP and subagent state, especially whether a minimal config without MCPs fixes the hang

Suggested rule:

> When reporting Codex thinking hangs, capture app/CLI/extension version, OS, model and reasoning/speed settings, turn/thread id, prompt timestamp, `turn/start` or `task_started` timestamp, last successful tool-call output, first `response_item` or assistant timestamp if it eventually appears, transport (`responses_http` or websocket), `time.busy`/`time.idle` close metrics, reconnect or stream-disconnect lines, MCP/subagent state, whether stop/interrupt works, and whether a new thread or minimal config without MCPs recovers.


## Reporter Notes

- Run `trace-to-skill redact <trace> --output redacted-runs` before attaching logs publicly.
- Prefer the shortest trace that reproduces the failure.
- Include exact Codex app/CLI version, OS, model, subscription/workspace, and the command or UI action that failed.
- Link related OpenAI/Codex issues when you know them, but keep the evidence self-contained.


## Other Demo Scenarios

- `remote-compact`: Long sessions break when `/compact` or auto-compaction times out, disconnects, or fails at `responses/compact`.
- `windows-helper-path`: Windows Desktop exposes bundled rg/node/plugin helpers from WindowsApps or missing LocalCache paths that cannot execute.
- `approval-friction`: Repeated approval prompts, Approve for this session misses, and noisy trusted MCP tool approvals.
- `latency-regression`: Fast mode feels like Standard, with long thinking, search, read, or compaction stalls.
- `token-burn`: Usage drains from background polling, idle activity, compaction loops, retries, or cached-heavy turns.
- `patch-overwrite`: `apply_patch` accepts `*** Add File` for an existing path, turning a create operation into a silent overwrite.
- `sensitive-files`: Secrets, local credentials, production env files, or private databases enter agent context.
- `github-prompt-injection`: Untrusted issue, PR, comment, or web text tells the agent to ignore policy or leak secrets.
- `file-tree-ui`: Desktop file tree, floating file panel, or file preview disappears, goes stale, or cannot be revealed.
- `usage-reset-drift`: Weekly or 5-hour reset dates move unexpectedly, making paid usage hard to plan or wasting saved capacity.

```bash
trace-to-skill demo --list
trace-to-skill demo remote-compact
trace-to-skill demo windows-helper-path
trace-to-skill demo patch-overwrite
trace-to-skill demo thinking-hang
trace-to-skill demo file-tree-ui
trace-to-skill demo usage-reset-drift
```
