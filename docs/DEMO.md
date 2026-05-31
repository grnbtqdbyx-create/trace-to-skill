# trace-to-skill Demo

Scenario: **Codex app connector auth cache regression**

App connectors keep stale `link_*` auth or discovery metadata after reauth-required responses.

Fixture: `fixtures/codex-connector-auth-cache.md`

This is a packaged public fixture, so you can try the project without collecting a private trace first.

## Generated Codex Issue Report

# OpenAI Codex Issue Triage Report

Score: **75/100**

Likely failure class: **Codex app connector auth cache or stale link regression (codex_connector_auth_cache, high)**

Agent workflow needs clearer verification, instruction, or security hardening before broad reuse.

## Copy-Paste Issue Body

```md
### What happened?

trace-to-skill detected Codex app connector auth cache or stale link regression (codex_connector_auth_cache). Codex app connectors can keep stale server-side or local `link_*` authorization metadata after reauth-required responses, making plugin reinstall and app restart look successful while connector tools still fail.

### Detected failure class

- codex_connector_auth_cache: Codex app connector auth cache or stale link regression (high)

### Evidence

#### Codex app connector auth cache or stale link regression
- fixtures/codex-connector-auth-cache.md:13 - - A read-only Linear tool is visible, but `mcp__codex_apps__linear._list_teams` returns `401: "Server returned 401: 'Reauthentication required'"`.
- fixtures/codex-connector-auth-cache.md:14 - - Codex Desktop also showed `Your access token could not be refreshed because your refresh token was revoked. Please log out and sign in again` during an active session.
- fixtures/codex-connector-auth-cache.md:15 - - Restarting Codex Desktop did not fix the connector.
- fixtures/codex-connector-auth-cache.md:16 - - `codex plugin remove linear@openai-curated` followed by `codex plugin add linear@openai-curated` did not fix auth.
- fixtures/codex-connector-auth-cache.md:17 - - Moving aside `~/.codex/cache/codex_apps_tools/*.json` and `~/.codex/cache/codex_app_directory/*.json` regenerated files but kept the same connector link id.
- fixtures/codex-connector-auth-cache.md:18 - - Before and after cache regeneration, Linear still referenced `link_69ebf2fff8cc8191a42ae4b585c191f6`.

### Diagnostics to attach

- When reporting Codex app connector auth-cache regressions, capture app/CLI version, OS, connector/plugin name and id, installed plugin root, exact tool name such as `mcp__codex_apps__linear.*`, error text, `link_*` id before and after reconnect, `isAccessible` state, relevant `~/.codex/cache/codex_apps_tools` and `codex_app_directory` metadata without tokens, restart/remove/re-add/cache-clear attempts, whether the ChatGPT app page shows Connect, whether a server-side link appears unchanged, and whether an external MCP workaround succeeds.

### Privacy

- I redacted tokens, API keys, private paths, customer data, and hidden Unicode controls before sharing this trace.
```

## Findings

### 1. Codex app connector auth cache or stale link regression

Severity: **high**

Codex app connectors can keep stale server-side or local `link_*` authorization metadata after reauth-required responses, making plugin reinstall and app restart look successful while connector tools still fail.

Evidence:
- `fixtures/codex-connector-auth-cache.md:13` - A read-only Linear tool is visible, but `mcp__codex_apps__linear._list_teams` returns `401: "Server returned 401: 'Reauthentication required'"`.
- `fixtures/codex-connector-auth-cache.md:14` - Codex Desktop also showed `Your access token could not be refreshed because your refresh token was revoked. Please log out and sign in again` during an active session.
- `fixtures/codex-connector-auth-cache.md:15` - Restarting Codex Desktop did not fix the connector.
- `fixtures/codex-connector-auth-cache.md:16` - `codex plugin remove linear@openai-curated` followed by `codex plugin add linear@openai-curated` did not fix auth.
- `fixtures/codex-connector-auth-cache.md:17` - Moving aside `~/.codex/cache/codex_apps_tools/*.json` and `~/.codex/cache/codex_app_directory/*.json` regenerated files but kept the same connector link id.
- `fixtures/codex-connector-auth-cache.md:18` - Before and after cache regeneration, Linear still referenced `link_69ebf2fff8cc8191a42ae4b585c191f6`.
- `fixtures/codex-connector-auth-cache.md:19` - The regenerated app directory still reported `isAccessible: false`.
- `fixtures/codex-connector-auth-cache.md:21` - An external Linear MCP workaround succeeded with `codex mcp add linear --url https://mcp.linear.app/mcp`:

Suggested rule:

> When reporting Codex app connector auth-cache regressions, capture app/CLI version, OS, connector/plugin name and id, installed plugin root, exact tool name such as `mcp__codex_apps__linear.*`, error text, `link_*` id before and after reconnect, `isAccessible` state, relevant `~/.codex/cache/codex_apps_tools` and `codex_app_directory` metadata without tokens, restart/remove/re-add/cache-clear attempts, whether the ChatGPT app page shows Connect, whether a server-side link appears unchanged, and whether an external MCP workaround succeeds.


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
trace-to-skill demo file-tree-ui
trace-to-skill demo usage-reset-drift
```
