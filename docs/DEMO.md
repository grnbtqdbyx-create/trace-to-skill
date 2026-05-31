# trace-to-skill Demo

Scenario: **Codex apply_patch overwrite safety**

`apply_patch` accepts `*** Add File` for an existing path, turning a create operation into a silent overwrite.

Fixture: `fixtures/codex-apply-patch-overwrite.md`

This is a packaged public fixture, so you can try the project without collecting a private trace first.

## Generated Codex Issue Report

# OpenAI Codex Issue Triage Report

Score: **75/100**

Likely failure class: **Codex tool-call integrity or rollback failure (codex_tool_call_integrity, high)**

Agent workflow needs clearer verification, instruction, or security hardening before broad reuse.

## Copy-Paste Issue Body

```md
### What happened?

trace-to-skill detected Codex tool-call integrity or rollback failure (codex_tool_call_integrity). Patch, rollback, subagent, and protocol-level tool-call failures can silently overwrite files, strand threads, or make recovery actions fail unless reports preserve exact tool inputs, tool results, durable state, and recovery evidence.

### Detected failure class

- codex_tool_call_integrity: Codex tool-call integrity or rollback failure (high)

### Evidence

#### Codex tool-call integrity or rollback failure
- fixtures/codex-apply-patch-overwrite.md:13 - apply_patch accepted `*** Add File` for an existing file and silently caused a destructive overwrite instead of failing.

### Diagnostics to attach

- When reporting Codex tool-call integrity failures, capture the exact tool input and output, app/CLI/extension version, OS/IDE, workspace git state, affected file path and whether it already existed or was a symlink, diff before/after, tool_call_id sequence, durable thread state for subagents, rollback/revert attempts, and whether a clean repo reproduction fails the same way.

### Privacy

- I redacted tokens, API keys, private paths, customer data, and hidden Unicode controls before sharing this trace.
```

## Findings

### 1. Codex tool-call integrity or rollback failure

Severity: **high**

Patch, rollback, subagent, and protocol-level tool-call failures can silently overwrite files, strand threads, or make recovery actions fail unless reports preserve exact tool inputs, tool results, durable state, and recovery evidence.

Evidence:
- `fixtures/codex-apply-patch-overwrite.md:13` apply_patch accepted `*** Add File` for an existing file and silently caused a destructive overwrite instead of failing.

Suggested rule:

> When reporting Codex tool-call integrity failures, capture the exact tool input and output, app/CLI/extension version, OS/IDE, workspace git state, affected file path and whether it already existed or was a symlink, diff before/after, tool_call_id sequence, durable thread state for subagents, rollback/revert attempts, and whether a clean repo reproduction fails the same way.


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
- `sensitive-files`: Secrets, local credentials, production env files, or private databases enter agent context.
- `github-prompt-injection`: Untrusted issue, PR, comment, or web text tells the agent to ignore policy or leak secrets.
- `file-tree-ui`: Desktop file tree, floating file panel, or file preview disappears, goes stale, or cannot be revealed.
- `usage-reset-drift`: Weekly or 5-hour reset dates move unexpectedly, making paid usage hard to plan or wasting saved capacity.

```bash
trace-to-skill demo --list
trace-to-skill demo remote-compact
trace-to-skill demo windows-helper-path
trace-to-skill demo patch-overwrite
trace-to-skill demo file-tree-ui
trace-to-skill demo usage-reset-drift
```
