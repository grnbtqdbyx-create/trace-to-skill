# Codex Hooks Contract And Coverage Gap

Public issue cluster: Event Hooks and hook contract requests.

## Lifecycle Coverage

- Users ask for Event Hooks with pattern matching so scripts or commands can run before and after Codex behaviors.
- The requested lifecycle events include `SessionStart`, `SessionEnd`, `Stop`, `PreCompact`, `PostCompact`, `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `SubagentStop`, and `Notification`.
- Enterprise users want hooks for governance, compliance checks, devops monitoring, multi-agent memory discipline, persistent summaries, and guardrails.
- Users compare the desired contract to Claude Code, Cursor, OpenCode, and other hook systems with blocking plus feedback-providing hooks.

## Contract Semantics

- Reports ask for a documented contract with supported event names, config schema, valid TOML structure, execution semantics, stability expectations, and working examples.
- Users need to know whether hooks are blocking or async, whether `on_failure` can `continue` or `abort`, and whether hooks can return a decision.
- A key request is hook stdout or `hookSpecificOutput.additionalContext` so `SessionStart` or `UserPromptSubmit` can inject context the model sees.
- Tool matcher coverage matters: users ask whether Shell, Edit, Write, MCP, approval-requested, and command events can be matched in `PreToolUse` and `PostToolUse`.

## Workflows Blocked

- `SessionStart` should load hot context from an external DB or shared memory before the first turn.
- `Stop` or `SessionEnd` should persist a session summary and embeddings before the agent exits.
- `PreCompact` should checkpoint context before compaction destroys important detail.
- `PreToolUse` should block destructive commands such as `reset --hard`, `push --force`, or unapproved filesystem writes.
- `PostToolUse` should trigger formatting, compliance checks, merge/push detection, and notification scripts.
- `UserPromptSubmit` should inject cross-agent deltas or current work status before each turn.

## Evidence Checklist

- Codex app/CLI/extension version, OS, surface, and whether hooks are experimental or stable.
- Current docs or release note link, plus whether users had to reverse engineer behavior.
- Exact event names requested and whether each hook should be blocking, async, or fire-and-forget.
- Failure semantics: `continue`, `abort`, feedback text, decision return, timeout, and retries.
- Config schema or TOML example, command array shape, env injection, and payload-path fallback.
- Payload fields needed: session id, thread id, turn id, cwd, model, tool name, command, status, stdout/stderr, usage tokens, and compaction reason.
- Whether hook stdout can inject `additionalContext` into model context.
- Matcher needs for Shell, Edit, Write, MCP, approval, and lifecycle events across CLI, Desktop, Code Mode, Windows, WSL, and remote sessions.
