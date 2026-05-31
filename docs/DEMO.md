# trace-to-skill Demo

Scenario: **Codex MCP discovery mismatch**

MCP servers work in CLI or one config scope but are absent in Desktop, VS Code, WSL, or project-local sessions.

Fixture: `fixtures/codex-mcp-discovery-mismatch.md`

This is a packaged public fixture, so you can try the project without collecting a private trace first.

## Generated Codex Issue Report

# OpenAI Codex Issue Triage Report

Score: **75/100**

Likely failure class: **Codex MCP discovery or config-scope mismatch (codex_mcp_discovery_mismatch, high)**

Agent workflow needs clearer verification, instruction, or security hardening before broad reuse.

## Copy-Paste Issue Body

```md
### What happened?

trace-to-skill detected Codex MCP discovery or config-scope mismatch (codex_mcp_discovery_mismatch). MCP servers can work in Codex CLI or one config scope while Desktop, VS Code, WSL, remote, or project-local sessions silently load another scope and expose no tools.

### Detected failure class

- codex_mcp_discovery_mismatch: Codex MCP discovery or config-scope mismatch (high)

### Evidence

#### Codex MCP discovery or config-scope mismatch
- fixtures/codex-mcp-discovery-mismatch.md:20 - MCP servers not detected in Codex VS Code extension, but working in Codex CLI.
- fixtures/codex-mcp-discovery-mismatch.md:60 - Open config.toml in WSL environment still opens the Windows config.toml.
- fixtures/codex-mcp-discovery-mismatch.md:63 - CODEX_HOME differs between CLI, VS Code, WSL, remote SSH, and the standalone app.

### Diagnostics to attach

- When reporting Codex MCP discovery or config-scope mismatches, capture app/CLI/extension version, OS, IDE, remote/WSL/SSH state, workspace root, effective CODEX_HOME, all config files considered (`~/.codex/config.toml`, project `.codex/config.toml`, `.vscode/mcp.json`, `.mcp.json`), exact MCP sections without secrets, trust/profile/default-permissions state, `codex mcp list` and `codex mcp get <server>`, CLI versus Desktop/VS Code comparison, loaded config path or extension logs, whether moving the same server to user-global config fixes it, whether reload/restart/new conversation changes tool exposure, and whether the current session exposes any `mcp__*` tools.

### Privacy

- I redacted tokens, API keys, private paths, customer data, and hidden Unicode controls before sharing this trace.
```

## Findings

### 1. Codex MCP discovery or config-scope mismatch

Severity: **high**

MCP servers can work in Codex CLI or one config scope while Desktop, VS Code, WSL, remote, or project-local sessions silently load another scope and expose no tools.

Evidence:
- `fixtures/codex-mcp-discovery-mismatch.md:20` MCP servers not detected in Codex VS Code extension, but working in Codex CLI.
- `fixtures/codex-mcp-discovery-mismatch.md:60` Open config.toml in WSL environment still opens the Windows config.toml.
- `fixtures/codex-mcp-discovery-mismatch.md:63` CODEX_HOME differs between CLI, VS Code, WSL, remote SSH, and the standalone app.

Suggested rule:

> When reporting Codex MCP discovery or config-scope mismatches, capture app/CLI/extension version, OS, IDE, remote/WSL/SSH state, workspace root, effective CODEX_HOME, all config files considered (`~/.codex/config.toml`, project `.codex/config.toml`, `.vscode/mcp.json`, `.mcp.json`), exact MCP sections without secrets, trust/profile/default-permissions state, `codex mcp list` and `codex mcp get <server>`, CLI versus Desktop/VS Code comparison, loaded config path or extension logs, whether moving the same server to user-global config fixes it, whether reload/restart/new conversation changes tool exposure, and whether the current session exposes any `mcp__*` tools.


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
- `thinking-hang`: A turn or tool call completes, but the session stays on Thinking or Working with no streamed follow-up.
- `clipboard-attachment`: Copy as Markdown, long-paste conversion, or generated Pasted text.txt attachments break prompt and report workflows.
- `deeplink-launch`: OAuth callbacks, notification clicks, mobile links, or `codex app <path>` external activation fail to route into Codex.
- `connector-auth-cache`: App connectors keep stale `link_*` auth or discovery metadata after reauth-required responses.
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
trace-to-skill demo clipboard-attachment
trace-to-skill demo deeplink-launch
trace-to-skill demo connector-auth-cache
trace-to-skill demo mcp-discovery-mismatch
trace-to-skill demo file-tree-ui
trace-to-skill demo usage-reset-drift
```
