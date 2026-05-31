# Codex Connector Auth Cache Fixture

Issue cluster: Codex Desktop app connectors keep stale authorization or discovery metadata after a connector returns a reauth-required error.

Environment:
- Codex Desktop 26.527.31326 on macOS
- Codex CLI 0.135.0
- Connectors: Linear, Microsoft Teams, Google Drive, OpenAI Platform, and Supabase
- Linear plugin root: `~/.codex/plugins/cache/openai-curated/linear/c6c214fd`
- App id: `asdk_app_69a089a326dc8191b32a3f2553f5be2c`

Observed behavior:
- A read-only Linear tool is visible, but `mcp__codex_apps__linear._list_teams` returns `401: "Server returned 401: 'Reauthentication required'"`.
- Codex Desktop also showed `Your access token could not be refreshed because your refresh token was revoked. Please log out and sign in again` during an active session.
- Restarting Codex Desktop did not fix the connector.
- `codex plugin remove linear@openai-curated` followed by `codex plugin add linear@openai-curated` did not fix auth.
- Moving aside `~/.codex/cache/codex_apps_tools/*.json` and `~/.codex/cache/codex_app_directory/*.json` regenerated files but kept the same connector link id.
- Before and after cache regeneration, Linear still referenced `link_69ebf2fff8cc8191a42ae4b585c191f6`.
- The regenerated app directory still reported `isAccessible: false`.
- The ChatGPT app page only showed `Connect`, but the connect flow did not restore Codex Desktop access.
- An external Linear MCP workaround succeeded with `codex mcp add linear --url https://mcp.linear.app/mcp`:

```bash
codex plugin remove linear@openai-curated
codex mcp add linear --url https://mcp.linear.app/mcp
```

Temporary AGENTS.md workaround:

```md
Use only the external Linear MCP tools in the `mcp__linear.*` namespace.
Do not use bundled Codex Apps Linear tools, including `mcp__codex_apps__linear.*`.
Do not fall back to Codex Apps Linear if the external MCP tools are unavailable.
```

What would make this report useful:
- exact Codex app and CLI versions
- OS and install source
- connector/plugin name, app id, plugin root, and tool name
- exact 401 or refresh-token-revoked error
- `link_*` id before and after reconnect/cache regeneration
- `isAccessible` state from app directory metadata
- redacted `codex_apps_tools` and `codex_app_directory` metadata
- restart, plugin remove/re-add, reconnect, sign-out/sign-in, and cache-clear attempts
- whether the ChatGPT app page shows Connect or Connected
- whether an external MCP workaround succeeds
