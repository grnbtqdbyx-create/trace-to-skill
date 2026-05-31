# Failure Taxonomy

These are the first failure classes `trace-to-skill` detects.

## Premature Completion

The agent claims a task is done without verifiable command output, test names, screenshots, or reviewer-ready evidence.

## Tests Not Run

The agent changes code but skips validation, usually with language like "change looked small" or "not run".

## Test Failure

A test, build, typecheck, lint, or smoke command failed. The agent should continue the fix loop or report a precise blocker.

## Context Compaction

Codex context compaction failed, disconnected, looped, or hit `context_length_exceeded`. The fix is to capture the compact error, model/app version, thread state, and recovery state before continuing or reporting the session as healthy.

## Sandbox Permission

Codex sandbox setup, approval mode, ACL, or workspace ownership failed before tools could run reliably. Common signals include Windows sandbox setup refresh errors, `os error 740`, `CodexSandboxOffline` ownership drift, access denied, and Full Access sessions downgraded to workspace-write or on-request behavior.

The fix is to capture the OS, Codex version, `sandbox_mode`, `approval_policy`, exact stderr, workspace ownership/ACL evidence, and whether a clean directory can run a simple command plus `apply_patch`.

## Quota Mismatch

Codex reports a usage-limit block even though another surface shows remaining quota, or quota state appears to be shared across accounts, consumed in parallel across 5h and weekly windows, or reset at an impossible time.

The fix is to capture the subscription plan, account or workspace, client and version, model, `/status` output before and after the failed prompt, usage dashboard state, reset times, feedback/thread ID, and whether logout/login or another machine changes the result.

## Hallucinated File

The trace references a missing path, missing module, or nonexistent file. The fix is usually a repository navigation rule.

## Instruction Drift

Agent instruction files disagree or the agent ignores an existing repository rule.

`trace-to-skill` checks common instruction files such as `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.cursor/rules`, and `.github/copilot-instructions.md` for obvious contradictions:

- different package managers for validation commands
- "always run tests" vs "do not run tests"
- approval required vs approval bypassed for destructive commands
- missing `@file.md` include targets
- nested `AGENTS.md` files that the root instructions do not point to
- invalid UTF-8 bytes that can make instruction loading fail or become hard to debug

## Over-Editing

The diff touches too many files for the requested task without matching plan and validation evidence.

## Unsafe Command

Destructive shell commands, privilege escalation, or remote script execution patterns appear in the trace.

## Secret Exposure

Credentials, API keys, or tokens appear in traces or reports.

## Hidden Unicode

Bidirectional or zero-width Unicode control characters appear in agent-visible instructions or patches.

## Prompt Injection

Untrusted issue bodies, PR comments, copied logs, or web pages instruct the agent to ignore maintainer policy, hide actions from reviewers, reveal hidden prompts, or exfiltrate secrets.

The fix is to treat those surfaces as data unless the instruction is also present in a maintainer-controlled file such as `AGENTS.md`, workflow YAML, or source code owned by the repository.

## MCP Risk

MCP server configuration or tool usage appears without an explicit trust boundary, capability inventory, or approval policy.

`trace-to-skill` also parses common `mcpServers` JSON shapes and project `.codex/config.toml` MCP sections, then reports capability hints such as filesystem, shell, browser, network, database, container, and secret-bearing environment variables. `lint-agents` checks static startup inputs too: command availability, missing `cwd`, placeholder env values, unresolved `$VARS`, unresolved plugin placeholders, local stdio commands without explicit `cwd`, and JSON `mcp_servers` / `mcpServers` casing drift. It also flags Codex config drift such as deprecated `codex_hooks`, missing `default_permissions` profile definitions, and synced `projects.* trusted_level` metadata.
