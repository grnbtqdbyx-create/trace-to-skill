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

## Codex Connectivity

Codex login, device auth, API-key auth, ChatGPT response streaming, or remote transport fails because of token exchange errors, missing CA certificates, proxy or MITM behavior, Cloudflare challenges, IPv6 routing, DNS, VPN, or WebSocket/HTTPS fallback problems.

Common signals include `token_exchange_failed`, `auth.openai.com/oauth/token`, `codex_login::server`, `cf-mitigated: challenge`, `ca-certificates`, `update-ca-certificates`, `CODEX_CA_CERTIFICATE`, `SSL_CERT_FILE`, IPv6-only lookup evidence, and `stream disconnected before completion` errors against `chatgpt.com/backend-api/codex/responses`.

The fix is to capture the client or app version, OS/container image, proxy or VPN state, endpoint URL, exact error, DNS IPv4/IPv6 results, `curl -4` / `curl -6` checks, CA variables, certificate package status, and whether browser login, device auth, and API-key paths fail differently.

## Codex Remote Control

Codex mobile, SSH remote, or desktop remote-control appears connected but the next command does not reach the intended host, workspace, or app-server. Common causes include stale remote-control listeners, stale enrollment or `server_name` state, missing helper files in a cached runtime bundle, mixed mobile/desktop session state, or Android/iOS surfaces showing stale project/session data.

Common signals include `Waiting for desktop`, `Directory: Unavailable`, `remote-control`, `remoteControl/status/read`, `127.0.0.1:14567`, stale listener or cached binary evidence, missing `codex-windows-sandbox-setup.exe`, missing `codex-command-runner.exe`, backend environments returning empty, and re-pairing temporarily restoring access.

The fix is to capture desktop/app/CLI versions, mobile OS/app version, host id, remote-control status, listener pid and executable path, bound port, cache directory id, helper bundle completeness, active `server_name` or enrollment id, workspace root, last mobile command id, and whether restarting the listener or re-pairing changes the route.

## Codex MCP Runtime

Codex MCP tools can be configured and discoverable but still fail at runtime. Common causes include non-interactive approval paths cancelling the call, elicitation not being supported in exec mode, deferred discovery replaying a call without namespace or `serverName`, routed callable names such as `mcp__node_repl__js` becoming unsupported, or stdio transports closing before a second tool call.

Common signals include `user cancelled MCP tool call`, `request_user_input is not supported in exec mode`, `Approve app tool call?`, `tool_call_mcp_elicitation`, `unsupported call: mcp__...__...`, `tools/list` succeeding while manual `tools/call` succeeds but Codex routing fails, missing namespace or `serverName` metadata, `Transport closed`, and `StdioServerTransport` lifecycle events such as `stdin_end`, `stdin_close`, `transport_close`, `parent_gone`, or stderr backpressure.

The fix is to capture the Codex version, MCP server name and transport, tool name, exposed callable name, whether `tools/list` and manual `tools/call` succeed, `approval_policy`, sandbox mode, exec or interactive mode, elicitation setting, namespace or `serverName` metadata, exact `item.started` / `item.completed` JSONL, stderr or backpressure evidence, and whether restarting or reinitializing the transport changes the result.

## Codex Plugin Runtime

Codex Desktop can show a plugin, connector, Browser, Computer Use, or bundled skill as available while the shared plugin runtime is not actually usable. Common causes include missing native pipe/helper metadata, plugin-list schema drift, stale plugin cache reconciliation, file-lock issues, or installed plugins being silently downgraded.

Common signals include `Computer Use native pipe path is unavailable`, `Windows Computer Use helper paths are unavailable`, `SKY_CUA_NATIVE_PIPE_DIRECTORY` missing, `computer-use native pipe helper paths changed`, `reason=missing-helper-path`, `Plugin loading failed`, `plugin/list`, `unknown variant 'vertical'`, Plugins UI losing Browser/Computer Use/Chrome, `~/.codex/plugins/cache`, stale plugin versions, `EBUSY`, and `plugin_cache_windows_file_lock`.

The fix is to capture app version, OS, plugin name and version, plugin cache path, helper binary or client path, native pipe/helper environment variables, Browser/Computer Use/Plugins settings error text, connector install return flow, cache reconciliation or file-lock logs, whether the UI still lists the plugin, whether restarting resets or downgrades it, and whether a clean profile reproduces the failure.

## Codex Session State

Codex resume, Desktop history rendering, archived chat loading, context compression, or local state migrations can fail after a long thread accumulates large JSONL history, images, tool output, or stale SQLite/global-state metadata.

Common signals include `codex resume` interactive picker hangs or freezes, `codex resume <id>` working while the picker is unresponsive, large `rollout-*.jsonl` or session files, 10+ MB or 100+ MB histories, high `response_item`, `event_msg`, `function_call`, or `input_image` counts, `thread/resume` or `thread/goal/get` taking thousands of milliseconds, Codex Desktop becoming sluggish with high app-server/renderer CPU, `Could not load archived chats`, resume compression dropping the last 3-5 turns, `state_5.sqlite`, `goals_1.sqlite`, `no such table: thread_goals`, `projectless-thread-ids`, and `thread-workspace-root-hints` reverting after restart.

The fix is to capture app and CLI versions, OS, session or thread id, rollout JSONL size, line and record counts, largest line size, image/tool-output counts, `thread/resume` and `thread/goal/get` timings, renderer/app-server CPU and memory, affected SQLite/global-state files and migration versions, whether `codex resume <id>` works, whether a new thread works, and any backup or restore steps before editing local state.

## Codex Token Burn

Codex usage can drain unexpectedly even when users cannot tell whether the cause is useful model work, background process polling, idle app activity, compaction/replay overhead, retry loops, subagent fan-out, fast-mode drift, large context, long `AGENTS.md`, MCP/skill overhead, or cached-token-heavy turns.

Common signals include tokens `burning very fast`, usage dropping by visible percentages after one or two prompts, weekly allowance depletion under normal usage, 5-hour usage reaching 0%, large `input` plus `cached input` totals, `write_stdin` empty polling, background commands repeatedly checking for no new output, Codex using daily usage while idle or only open, compaction tax, retry/tool loops, and requests for usage attribution across normal turns, compaction, retries, subagents, and background polling.

The fix is to capture plan/workspace, client and version, model and reasoning/speed settings, fast-mode/large-context/subagent/review flags, recent `/status` and usage-dashboard deltas, local token totals including cached input/output/reasoning if available, background process ids and `write_stdin` poll cadence, compaction attempts and failures, retry/tool-loop counts, whether the app was idle, and a minimal reproduction with before/after usage percentages.

## Codex Resource Leak

Codex Desktop, the VS Code extension, app-server, renderer, GPU process, shell snapshot capture, or helper processes can keep consuming CPU/GPU/RAM after the useful work should be idle.

Common signals include high `Code Helper (Renderer)` or `Code Helper (Plugin)` CPU, `Codex Helper Renderer`, `Codex app-server`, `syspolicyd`, `zygote`, `WindowServer`, `shell-snapshot`, `print '# Snapshot file'`, `.codex/shell_snapshots`, `chat_processes.json`, PPID 1 orphaned subprocesses, repeated `thread-stream-state-changed`, `worker_rpc_response_error`, `open-in-target not supported`, `stable-metadata`, thinking/shimmer GPU loops, and non-Git workspace CPU runaways.

The fix is to capture app/extension/CLI version, OS, IDE, thread type, process names/PIDs, CPU/GPU/RSS samples over time, whether the process is orphaned, log-loop signatures, workspace Git-root state, animation/reduce-motion state, reproduction steps, and whether closing the panel/app, killing exact PIDs, `git init`, rollback, or restart clears the leak.

## Codex Tool-Call Integrity

Codex patch, rollback, subagent, and protocol tool calls can fail in ways that threaten maintainer trust: `apply_patch` accepting `*** Add File` for an existing file, `tool_calls` messages missing matching tool responses, `close_agent` hanging after durable state says closed, or extension revert/undo failing after code was deleted.

Common signals include `apply_patch`, `*** Add File`, existing file overwrite, symlink target replacement, `assistant message with 'tool_calls' must be followed by tool messages`, missing `tool_call_id`, `close_agent` hanging forever, `agent thread limit reached`, `Failed to revert changes`, and deleted or truncated uncommitted code.

The fix is to capture exact tool input/output, app/CLI/extension version, OS/IDE, workspace git state, affected file path and whether it already existed or was a symlink, diff before/after, tool-call ordering, durable subagent/thread state, rollback attempts, and whether a clean repo reproduction fails the same way.

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

## Sensitive File Access

Credential files, private keys, package auth files, cloud credentials, local databases, or production secret manifests entered agent context through a read, attach, upload, diff, or indexing step.

Common signals include `.env`, `.env.production`, `.npmrc`, `.pypirc`, `.netrc`, `.aws/credentials`, `.kube/config`, `.docker/config.json`, `id_rsa`, `id_ed25519`, `.pem`, `.key`, `.p12`, `.mobileprovision`, `.sqlite`, `.db`, `secrets.yaml`, and private-key PEM blocks.

The fix is to exclude sensitive files before the agent starts, redact public traces, and share only minimal maintainer-approved excerpts.

## Hidden Unicode

Bidirectional or zero-width Unicode control characters appear in agent-visible instructions or patches.

## Prompt Injection

Untrusted issue bodies, PR comments, copied logs, or web pages instruct the agent to ignore maintainer policy, hide actions from reviewers, reveal hidden prompts, or exfiltrate secrets.

The fix is to treat those surfaces as data unless the instruction is also present in a maintainer-controlled file such as `AGENTS.md`, workflow YAML, or source code owned by the repository.

## MCP Risk

MCP server configuration or tool usage appears without an explicit trust boundary, capability inventory, or approval policy.

`trace-to-skill` also parses common `mcpServers` JSON shapes and project `.codex/config.toml` MCP sections, then reports capability hints such as filesystem, shell, browser, network, database, container, and secret-bearing environment variables. `lint-agents` checks static startup inputs too: command availability, missing `cwd`, placeholder env values, unresolved `$VARS`, unresolved plugin placeholders, local stdio commands without explicit `cwd`, and JSON `mcp_servers` / `mcpServers` casing drift. It also flags Codex config drift such as deprecated `codex_hooks`, missing `default_permissions` profile definitions, and synced `projects.* trusted_level` metadata.
