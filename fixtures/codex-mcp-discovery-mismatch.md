# Codex MCP discovery mismatch fixture

This fixture uses public, token-free examples of MCP servers being visible in one Codex surface or config scope but absent from another.

## CLI works, VS Code extension has no tools

Environment:

- Codex CLI v0.58.0
- Codex VS Code extension v0.4.40
- macOS and Windows reports
- MCP server defined in `~/.codex/config.toml`

Observed behavior:

```text
Codex CLI /mcp shows playwright and supabase; tools are listed and callable.
Codex VS Code extension says list_mcp_resources remains empty.
The extension has no mcp__ prefixed tools exposed in this session.
MCP servers not detected in Codex VS Code extension, but working in Codex CLI.
```

Another report:

```text
codex mcp list shows nxmcp in the terminal session.
The Codex extension does not see Nx MCP tools in the current session tool list.
CLI can access the MCP server and list tables, while the extension reports:
resources/list failed: unknown MCP server 'postgres'
```

## Project config works in CLI but not Desktop

A trusted project contains only a project-local MCP entry:

```toml
[mcp_servers.serena]
command = "uvx"
args = ["--from", "git+https://github.com/oraios/serena", "serena", "start-mcp-server", "--context", "codex", "--project-from-cwd"]
```

Observed behavior:

```text
Project-scoped .codex/config.toml is ignored for this thread/workspace.
available MCP resources/templates are empty for Serena tools.
codex mcp list only shows servers from ~/.codex/config.toml.
codex mcp get serena returns: No MCP server named 'serena' found.
User-level MCP config works in Codex CLI, Codex Desktop, and the Codex Cursor extension.
Project-level MCP config works in Codex CLI only.
If I move the exact same MCP server definition into ~/.codex/config.toml and restart Codex Desktop, it is detected and works normally.
```

## WSL opens the wrong config

Windows app configuration:

```text
Agent environment and integrated terminal shell are set to WSL.
Open config.toml in WSL environment still opens the Windows config.toml.
Expected: /home/user/.codex/config.toml
Actual: C:\Users\user\.codex\config.toml
CODEX_HOME differs between CLI, VS Code, WSL, remote SSH, and the standalone app.
```

## Session exposure drift

```text
The standalone CLI /mcp can show tools while the VS Code assistant only exposes curated namespaces.
If I start a new conversation in the VS Code extension, it sees the right MCP servers/functions.
Switching back to the previous conversation loses them again.
The current session exposes no mcp__* tools.
```

The report should include app/CLI/extension versions, OS, IDE, remote/WSL/SSH state, workspace root, effective `CODEX_HOME`, config files considered (`~/.codex/config.toml`, project `.codex/config.toml`, and IDE-level MCP config), redacted MCP sections, trust/profile/default-permissions state, `codex mcp list`, `codex mcp get <server>`, CLI-versus-Desktop/VS Code comparison, loaded config path or extension logs, whether moving the same server to global config fixes it, whether reload/restart/new conversation changes tool exposure, and whether the session exposes `mcp__*` tools.
