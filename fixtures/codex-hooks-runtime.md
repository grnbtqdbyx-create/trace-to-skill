# Codex Hooks Runtime Fixture

## Duplicate hook execution

Codex CLI 0.136.0 with `[features].hooks = true` runs the same PostToolUse hook twice for a single tool call.
The trace shows duplicate Hooks entries for one `exec` command and the hook log contains two identical event ids.

## Deprecated config warning drift

Startup prints a deprecated `codex_hooks` warning even though the config only uses `[features].hooks`.
The warning appears before the TUI is ready and makes users think their hooks setup is legacy or unsafe.

## Hook lifecycle stops firing

After a rate-limit stop, live edit to hooks.json, or session auto-restore, SessionStart and PostToolUse hooks stop firing.
Restarting Codex restores hook execution temporarily.

## Surface mismatch

Windows command_execution does not emit PreToolUse hooks even with matcher `*`.
The same hook fires in a normal CLI shell, but Code Mode `exec` and Desktop routed tool calls skip it.

## Hooks settings UI

The Codex Desktop Hooks page lists many generic Hook N entries, cannot scroll through long hook lists, and does not show handler names or commands clearly.
