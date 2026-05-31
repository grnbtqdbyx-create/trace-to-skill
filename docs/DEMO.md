# trace-to-skill Demo

Scenario: **Codex remote compact task failure**

Long sessions break when `/compact` or auto-compaction times out, disconnects, or fails at `responses/compact`.

Fixture: `fixtures/codex-remote-compact.md`

This is a packaged public fixture, so you can try the project without collecting a private trace first.

## Generated Codex Issue Report

# OpenAI Codex Issue Triage Report

Score: **59/100**

Likely failure class: **Codex remote compact task failure (codex_remote_compact, high)**

Agent workflow needs clearer verification, instruction, or security hardening before broad reuse.

## Copy-Paste Issue Body

```md
### What happened?

trace-to-skill detected Codex remote compact task failure (codex_remote_compact). Remote compaction failures interrupt long Codex sessions, force users to recreate context, and need timeout/provider evidence separated from generic context-window errors.

### Detected failure class

- codex_remote_compact: Codex remote compact task failure (high)

### Evidence

#### Codex remote compact task failure
- fixtures/codex-remote-compact.md:23 - Error running remote compact task: timeout waiting for child process to exit
- fixtures/codex-remote-compact.md:29 - Error running remote compact task: stream disconnected before completion: error sending request for url (https://chatgpt.com/backend-api/codex/responses/compact)
- fixtures/codex-remote-compact.md:38 - - Some users tried `stream_idle_timeout_ms = 900000` as a provider-level compact workaround.
- fixtures/codex-remote-compact.md:39 - - A Codex.app compact timeout workaround that changes `model_provider` to `openai-long-timeout` can hide existing threads because old threads are stored under the original provider id.
- fixtures/codex-remote-compact.md:40 - - Azure Foundry reports mention `responses/compact`, `base_url`, and removing `api-version`, but the issue still needs provider config captured without secrets.
- fixtures/codex-remote-compact.md:56 - - whether `responses/compact` failed with timeout, high demand, or stream disconnect

#### Codex context compaction failure
- fixtures/codex-remote-compact.md:23 - Error running remote compact task: timeout waiting for child process to exit
- fixtures/codex-remote-compact.md:29 - Error running remote compact task: stream disconnected before completion: error sending request for url (https://chatgpt.com/backend-api/codex/responses/compact)
- fixtures/codex-remote-compact.md:40 - - Azure Foundry reports mention `responses/compact`, `base_url`, and removing `api-version`, but the issue still needs provider config captured without secrets.
- fixtures/codex-remote-compact.md:56 - - whether `responses/compact` failed with timeout, high demand, or stream disconnect

### Diagnostics to attach

- When reporting Codex remote compact failures, capture app/CLI/extension version, OS, model and reasoning/speed mode, provider config without secrets, exact /compact or auto-compact error, `responses/compact` endpoint shape, timeout values such as tcp_user_timeout or stream_idle_timeout_ms, context/token level before compaction, whether lowering reasoning/speed changes behavior, whether local fallback or a new session recovers, and related thread/feedback ids.
- When Codex compaction fails, capture the compact error, model/app version, thread state, and whether the session is recoverable before continuing or reporting success.

### Privacy

- I redacted tokens, API keys, private paths, customer data, and hidden Unicode controls before sharing this trace.
```

## Findings

### 1. Codex remote compact task failure

Severity: **high**

Remote compaction failures interrupt long Codex sessions, force users to recreate context, and need timeout/provider evidence separated from generic context-window errors.

Evidence:
- `fixtures/codex-remote-compact.md:23` Error running remote compact task: timeout waiting for child process to exit
- `fixtures/codex-remote-compact.md:29` Error running remote compact task: stream disconnected before completion: error sending request for url (https://chatgpt.com/backend-api/codex/responses/compact)
- `fixtures/codex-remote-compact.md:38` - Some users tried `stream_idle_timeout_ms = 900000` as a provider-level compact workaround.
- `fixtures/codex-remote-compact.md:39` - A Codex.app compact timeout workaround that changes `model_provider` to `openai-long-timeout` can hide existing threads because old threads are stored under the original provider id.
- `fixtures/codex-remote-compact.md:40` - Azure Foundry reports mention `responses/compact`, `base_url`, and removing `api-version`, but the issue still needs provider config captured without secrets.
- `fixtures/codex-remote-compact.md:56` - whether `responses/compact` failed with timeout, high demand, or stream disconnect

Suggested rule:

> When reporting Codex remote compact failures, capture app/CLI/extension version, OS, model and reasoning/speed mode, provider config without secrets, exact /compact or auto-compact error, `responses/compact` endpoint shape, timeout values such as tcp_user_timeout or stream_idle_timeout_ms, context/token level before compaction, whether lowering reasoning/speed changes behavior, whether local fallback or a new session recovers, and related thread/feedback ids.

### 2. Codex context compaction failure

Severity: **high**

Context compaction failures can strand long coding sessions, burn quota, and make maintainer handoff difficult unless the exact compact error and recovery state are captured.

Evidence:
- `fixtures/codex-remote-compact.md:23` Error running remote compact task: timeout waiting for child process to exit
- `fixtures/codex-remote-compact.md:29` Error running remote compact task: stream disconnected before completion: error sending request for url (https://chatgpt.com/backend-api/codex/responses/compact)
- `fixtures/codex-remote-compact.md:40` - Azure Foundry reports mention `responses/compact`, `base_url`, and removing `api-version`, but the issue still needs provider config captured without secrets.
- `fixtures/codex-remote-compact.md:56` - whether `responses/compact` failed with timeout, high demand, or stream disconnect

Suggested rule:

> When Codex compaction fails, capture the compact error, model/app version, thread state, and whether the session is recoverable before continuing or reporting success.


## Reporter Notes

- Run `trace-to-skill redact <trace> --output redacted-runs` before attaching logs publicly.
- Prefer the shortest trace that reproduces the failure.
- Include exact Codex app/CLI version, OS, model, subscription/workspace, and the command or UI action that failed.
- Link related OpenAI/Codex issues when you know them, but keep the evidence self-contained.


## Other Demo Scenarios

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
trace-to-skill demo file-tree-ui
trace-to-skill demo usage-reset-drift
```
