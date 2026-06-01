# Codex remote connection fixture

## Public-style issue signals

- Remote Development in Codex Desktop App is a high-demand workflow because many users work on SSH hosts, cloud instances, GPU machines, WSL boxes, containers, or remote Linux servers.
- The remote workspace should be the single source of truth: no local clone, git/rsync/sshfs sync workaround, or stale local copy should be required.
- Users expect Settings > Connections to show SSH hosts from `~/.ssh/config` after enabling `[features] remote_connections = true`.
- A common setup mistake is using `remote_control = true` instead of `remote_connections = true`, so the Connections subheading never appears in the Desktop app.
- The local tunnel can fail with "local tunnel not ready" even when the SSH host is reachable.
- Remote folder browsing can fail with `Unable to load folder contents: Timed out waiting for MCP response to fs/getMetadata while listing directories/files`.
- The app can show a stale remote Codex version even after the host has the expected Codex CLI version installed.
- Killing a stale `codex-server` or app-server on the remote host can force the Desktop app to reattach.
- Some remote machines cannot directly access the Codex API, so reports need to mention proxy, local-machine request routing, or ForwardAgent SSH remote server requirements.
- Long-running remote tasks often depend on tmux-like persistence, reconnect/resume behavior, and background sessions after the Desktop app closes.

## Evidence checklist

- Codex Desktop version, local OS, remote OS/architecture, and remote Codex CLI/app-server version.
- SSH target alias from `~/.ssh/config`, selected host/path, and whether Settings > Connections is visible.
- Redacted `[features].remote_connections = true` config evidence and confirmation that `remote_control = true` was not the mistaken feature flag.
- Remote workspace path and whether the remote filesystem is the source of truth.
- Exact local tunnel, app-server, codex-server, fs/getMetadata, folder listing, model list, auth, proxy, or API reachability error.
- `ps -ef | rg 'codex app-server|openai.chatgpt.*/codex'` or equivalent process evidence when a stale remote server is suspected.
- Whether killing codex-server, reinstalling/updating remote Codex, reconnecting, or trying a clean host changes the result.
