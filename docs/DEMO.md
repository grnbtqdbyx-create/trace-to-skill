# trace-to-skill Demo

Scenario: **Codex remote connection or SSH workspace failure**

Desktop remote SSH workspaces, Settings > Connections, remote app-server, tunnel, or remote filesystem evidence breaks.

Fixture: `fixtures/codex-remote-connection.md`

This is a packaged public fixture, so you can try the project without collecting a private trace first.

## Generated Codex Issue Report

# OpenAI Codex Issue Triage Report

Score: **75/100**

Likely failure class: **Codex remote connection or SSH workspace failure (codex_remote_connection, high)**

Agent workflow needs clearer verification, instruction, or security hardening before broad reuse.

## Copy-Paste Issue Body

```md
### What happened?

trace-to-skill detected Codex remote connection or SSH workspace failure (codex_remote_connection). Remote-first developers need Codex Desktop to open SSH, server, VM, WSL, container, or cloud workspaces as the source of truth, with reliable remote file browsing, command execution, model availability, app-server health, and reconnect behavior.

### Detected failure class

- codex_remote_connection: Codex remote connection or SSH workspace failure (high)

### Evidence

#### Codex remote connection or SSH workspace failure
- fixtures/codex-remote-connection.md:5 - - Remote Development in Codex Desktop App is a high-demand workflow because many users work on SSH hosts, cloud instances, GPU machines, WSL boxes, containers, or remote Linux servers.
- fixtures/codex-remote-connection.md:7 - - Users expect Settings > Connections to show SSH hosts from `~/.ssh/config` after enabling `[features] remote_connections = true`.
- fixtures/codex-remote-connection.md:8 - - A common setup mistake is using `remote_control = true` instead of `remote_connections = true`, so the Connections subheading never appears in the Desktop app.
- fixtures/codex-remote-connection.md:9 - - The local tunnel can fail with "local tunnel not ready" even when the SSH host is reachable.
- fixtures/codex-remote-connection.md:10 - - Remote folder browsing can fail with `Unable to load folder contents: Timed out waiting for MCP response to fs/getMetadata while listing directories/files`.
- fixtures/codex-remote-connection.md:12 - - Killing a stale `codex-server` or app-server on the remote host can force the Desktop app to reattach.

### Diagnostics to attach

- When reporting Codex remote connection failures, capture Codex Desktop version, remote Codex CLI/app-server version, local OS, remote OS/architecture, SSH target alias from `~/.ssh/config`, whether `[features].remote_connections = true` is set, Settings > Connections visibility, selected host/path, remote workspace path, whether the remote filesystem is the source of truth, exact tunnel/app-server error, codex-server pid and restart result, `ps -ef | rg 'codex app-server|openai.chatgpt.*/codex'` evidence if available, remote PATH/auth/proxy/API reachability, model list differences versus local, fs/getMetadata or folder listing errors, ForwardAgent/proxy requirements, and whether reconnect/resume or a clean host works.

### Privacy

- I redacted tokens, API keys, private paths, customer data, and hidden Unicode controls before sharing this trace.
```

## Findings

### 1. Codex remote connection or SSH workspace failure

Severity: **high**

Remote-first developers need Codex Desktop to open SSH, server, VM, WSL, container, or cloud workspaces as the source of truth, with reliable remote file browsing, command execution, model availability, app-server health, and reconnect behavior.

Evidence:
- `fixtures/codex-remote-connection.md:5` - Remote Development in Codex Desktop App is a high-demand workflow because many users work on SSH hosts, cloud instances, GPU machines, WSL boxes, containers, or remote Linux servers.
- `fixtures/codex-remote-connection.md:7` - Users expect Settings > Connections to show SSH hosts from `~/.ssh/config` after enabling `[features] remote_connections = true`.
- `fixtures/codex-remote-connection.md:8` - A common setup mistake is using `remote_control = true` instead of `remote_connections = true`, so the Connections subheading never appears in the Desktop app.
- `fixtures/codex-remote-connection.md:9` - The local tunnel can fail with "local tunnel not ready" even when the SSH host is reachable.
- `fixtures/codex-remote-connection.md:10` - Remote folder browsing can fail with `Unable to load folder contents: Timed out waiting for MCP response to fs/getMetadata while listing directories/files`.
- `fixtures/codex-remote-connection.md:12` - Killing a stale `codex-server` or app-server on the remote host can force the Desktop app to reattach.
- `fixtures/codex-remote-connection.md:13` - Some remote machines cannot directly access the Codex API, so reports need to mention proxy, local-machine request routing, or ForwardAgent SSH remote server requirements.
- `fixtures/codex-remote-connection.md:22` - Exact local tunnel, app-server, codex-server, fs/getMetadata, folder listing, model list, auth, proxy, or API reachability error.

Suggested rule:

> When reporting Codex remote connection failures, capture Codex Desktop version, remote Codex CLI/app-server version, local OS, remote OS/architecture, SSH target alias from `~/.ssh/config`, whether `[features].remote_connections = true` is set, Settings > Connections visibility, selected host/path, remote workspace path, whether the remote filesystem is the source of truth, exact tunnel/app-server error, codex-server pid and restart result, `ps -ef | rg 'codex app-server|openai.chatgpt.*/codex'` evidence if available, remote PATH/auth/proxy/API reachability, model list differences versus local, fs/getMetadata or folder listing errors, ForwardAgent/proxy requirements, and whether reconnect/resume or a clean host works.


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
- `context-visibility`: Desktop context or token usage indicators disappear, leaving long-session compaction pressure invisible.
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
trace-to-skill demo remote-connection
trace-to-skill demo file-tree-ui
trace-to-skill demo usage-reset-drift
```
