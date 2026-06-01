# GitHub Issue Heat

Generated: 2026-06-01T05:01:49.932Z
Window: last **24 hour(s)**
Issues fetched: **77**
Issues in window: **77**
Matched hot issues: **37**

This report is recency-weighted. Use it beside `issue-map`: `issue-map` shows all-time pain, while `issue-heat` shows what is moving right now.

```bash
trace-to-skill issue-heat --repo openai/codex --state open --limit 100 --window-hours 24 --output codex-issue-heat.md
gh issue list --repo openai/codex --state open --limit 100 --json number,title,body,url,labels,comments,createdAt,updatedAt | trace-to-skill issue-heat - --format json
```

## Hot Clusters

| Heat | Kind | Severity | Issues | Comments | Reactions | Latest | Example | Action |
| ---: | --- | --- | ---: | ---: | ---: | --- | --- | --- |
| 1257 | `codex_windows_helper_path` | high | 6 | 36 | 13 | 2026-06-01T04:51:21Z | [#21598 Windows Desktop: Chrome plugin unavailable in Norway/EU even though extension is connected](https://github.com/openai/codex/issues/21598) | `trace-to-skill diagnostics-bundle ~/.codex --output codex-diagnostics` |
| 1147 | `codex_plugin_runtime` | high | 5 | 47 | 12 | 2026-06-01T04:51:21Z | [#21598 Windows Desktop: Chrome plugin unavailable in Norway/EU even though extension is connected](https://github.com/openai/codex/issues/21598) | `trace-to-skill diagnostics-bundle ~/.codex --output codex-diagnostics` |
| 1096 | `codex_thinking_hang` | high | 6 | 25 | 2 | 2026-06-01T04:11:06Z | [#23930 Codex app subagent cards can remain stuck/visible after close while close/readback reports no live agent](https://github.com/openai/codex/issues/23930) | `trace-to-skill codex-report ./runs --output openai-codex-issue.md` |
| 936 | `sandbox_permission` | high | 5 | 7 | 3 | 2026-06-01T03:58:47Z | [#25362 Windows sandbox failed spawn setup refresh OS error 740](https://github.com/openai/codex/issues/25362) | `trace-to-skill diagnostics-bundle ~/.codex --output codex-diagnostics` |
| 758 | `hallucinated_file` | medium | 4 | 24 | 11 | 2026-06-01T04:20:52Z | [#25203 GitHub OAuth callback fails with "Unable to find Electron app" on Windows](https://github.com/openai/codex/issues/25203) | `trace-to-skill codex-report ./runs --output openai-codex-issue.md` |
| 724 | `codex_subagent_lifecycle` | high | 4 | 23 | 2 | 2026-06-01T01:55:46Z | [#23930 Codex app subagent cards can remain stuck/visible after close while close/readback reports no live agent](https://github.com/openai/codex/issues/23930) | `trace-to-skill codex-report ./runs --output openai-codex-issue.md` |
| 657 | `codex_deeplink_launch` | high | 3 | 21 | 11 | 2026-06-01T04:20:52Z | [#25203 GitHub OAuth callback fails with "Unable to find Electron app" on Windows](https://github.com/openai/codex/issues/25203) | `trace-to-skill codex-report ./runs --output openai-codex-issue.md` |
| 652 | `codex_auth_verification` | high | 3 | 32 | 12 | 2026-06-01T03:22:15Z | [#20320 ChatGPT asking phone number verify but didn't send any code yet](https://github.com/openai/codex/issues/20320) | `trace-to-skill codex-report ./runs --output openai-codex-issue.md` |
| 545 | `codex_token_burn` | high | 2 | 594 | 282 | 2026-06-01T03:33:29Z | [#14593 Burning tokens very fast](https://github.com/openai/codex/issues/14593) | `trace-to-skill usage-doctor ./usage-notes.md --output usage-evidence.md` |
| 527 | `codex_remote_compact` | high | 2 | 91 | 82 | 2026-06-01T03:33:29Z | [#14860 Error running remote compact task](https://github.com/openai/codex/issues/14860) | `trace-to-skill codex-report ./runs --output openai-codex-issue.md` |
| 527 | `context_compaction` | high | 2 | 91 | 82 | 2026-06-01T03:33:29Z | [#14860 Error running remote compact task](https://github.com/openai/codex/issues/14860) | `trace-to-skill codex-report ./runs --output openai-codex-issue.md` |
| 527 | `codex_subagent_orchestration` | high | 3 | 10 | 3 | 2026-06-01T04:50:29Z | [#25472 Rogue Subagents with Goal Mode](https://github.com/openai/codex/issues/25472) | `trace-to-skill codex-report ./runs --output openai-codex-issue.md` |

## Cluster Details

### codex_windows_helper_path

Heat score: 1257. 6 recent issue(s), 36 comment(s).

First action: `trace-to-skill diagnostics-bundle ~/.codex --output codex-diagnostics`

Examples:
- [#21598 Windows Desktop: Chrome plugin unavailable in Norway/EU even though extension is connected](https://github.com/openai/codex/issues/21598) (4.4h old; 26 comments; labels: bug, windows-os, app, skills, browser)
- [#25391 Windows Computer Use plugin fails to bootstrap: native pipe path is unavailable](https://github.com/openai/codex/issues/25391) (1.1h old; 5 comments; labels: bug, windows-os, app, computer-use)
- [#25507 Windows Computer Use unavailable: nativePipe missing and SKY_CUA_NATIVE_PIPE_DIRECTORY not injected](https://github.com/openai/codex/issues/25507) (0.2h old; 2 comments; labels: bug, windows-os, app, computer-use)
- [#25488 Windows Codex Desktop: node_repl / Computer Use fails with "windows sandbox failed: spawn setup refresh"](https://github.com/openai/codex/issues/25488) (1.8h old; 1 comments; labels: bug, windows-os, sandbox, app, computer-use)
- [#25478 Windows elevated sandbox breaks node_repl and Browser Runtime](https://github.com/openai/codex/issues/25478) (2.7h old; 1 comments; labels: bug, windows-os, sandbox, tool-calls, app, browser)

### codex_plugin_runtime

Heat score: 1147. 5 recent issue(s), 47 comment(s).

First action: `trace-to-skill diagnostics-bundle ~/.codex --output codex-diagnostics`

Examples:
- [#21598 Windows Desktop: Chrome plugin unavailable in Norway/EU even though extension is connected](https://github.com/openai/codex/issues/21598) (4.4h old; 26 comments; labels: bug, windows-os, app, skills, browser)
- [#24040 Codex Desktop Chrome plugin: Native Messaging Host registry key missing on Windows](https://github.com/openai/codex/issues/24040) (0.5h old; 7 comments; labels: bug, windows-os, app, browser)
- [#24390 Codex Windows Desktop: Agent uses stale plugin cache path after plugin update, and session execution details are lost after restart](https://github.com/openai/codex/issues/24390) (1.4h old; 7 comments; labels: bug, windows-os, app, skills, session)
- [#25391 Windows Computer Use plugin fails to bootstrap: native pipe path is unavailable](https://github.com/openai/codex/issues/25391) (1.1h old; 5 comments; labels: bug, windows-os, app, computer-use)
- [#25507 Windows Computer Use unavailable: nativePipe missing and SKY_CUA_NATIVE_PIPE_DIRECTORY not injected](https://github.com/openai/codex/issues/25507) (0.2h old; 2 comments; labels: bug, windows-os, app, computer-use)

### codex_thinking_hang

Heat score: 1096. 6 recent issue(s), 25 comment(s).

First action: `trace-to-skill codex-report ./runs --output openai-codex-issue.md`

Examples:
- [#23930 Codex app subagent cards can remain stuck/visible after close while close/readback reports no live agent](https://github.com/openai/codex/issues/23930) (5.1h old; 10 comments; labels: bug, app, subagent)
- [#25472 Rogue Subagents with Goal Mode](https://github.com/openai/codex/issues/25472) (2.8h old; 6 comments; labels: bug, app, subagent, session)
- [#25277 CLI Becomes Unresponsive After /permissions Execution; SIGINT Handling Failed](https://github.com/openai/codex/issues/25277) (1.3h old; 2 comments; labels: bug, windows-os, sandbox, TUI)
- [#25430 codex resume interactive picker hangs/freezes when session files are large; codex resume <id> works fine](https://github.com/openai/codex/issues/25430) (2.4h old; 2 comments; labels: bug, windows-os, TUI, app, session, performance)
- [#19399 Subagent-specific TOML config no longer works on Codex Windows; named agents spawn with default config](https://github.com/openai/codex/issues/19399) (0.8h old; 3 comments; labels: bug, regression, subagent, config)

### sandbox_permission

Heat score: 936. 5 recent issue(s), 7 comment(s).

First action: `trace-to-skill diagnostics-bundle ~/.codex --output codex-diagnostics`

Examples:
- [#25362 Windows sandbox failed spawn setup refresh OS error 740](https://github.com/openai/codex/issues/25362) (2.0h old; 3 comments; labels: bug, windows-os, sandbox, app, computer-use)
- [#25488 Windows Codex Desktop: node_repl / Computer Use fails with "windows sandbox failed: spawn setup refresh"](https://github.com/openai/codex/issues/25488) (1.8h old; 1 comments; labels: bug, windows-os, sandbox, app, computer-use)
- [#25478 Windows elevated sandbox breaks node_repl and Browser Runtime](https://github.com/openai/codex/issues/25478) (2.7h old; 1 comments; labels: bug, windows-os, sandbox, tool-calls, app, browser)
- [#25497 Sandboxed PowerShell commands intermittently fail on Windows with `windows sandbox: spawn setup refresh`](https://github.com/openai/codex/issues/25497) (1.1h old; 1 comments; labels: bug, windows-os, extension, sandbox, tool-calls)
- [#24926 Windows Codex app: Browser/node_repl bridge fails with sandbox elevation error](https://github.com/openai/codex/issues/24926) (2.5h old; 1 comments; labels: bug, app, browser)

### hallucinated_file

Heat score: 758. 4 recent issue(s), 24 comment(s).

First action: `trace-to-skill codex-report ./runs --output openai-codex-issue.md`

Examples:
- [#25203 GitHub OAuth callback fails with "Unable to find Electron app" on Windows](https://github.com/openai/codex/issues/25203) (0.7h old; 17 comments; labels: bug, windows-os, auth, app)
- [#25368 Codex Windows desktop app deep link / OAuth callback bug](https://github.com/openai/codex/issues/25368) (2.3h old; 3 comments; labels: bug, windows-os, auth, app)
- [#25489 Codex Windows app will not launch after a clean reinstall.](https://github.com/openai/codex/issues/25489) (1.8h old; 1 comments; labels: bug, windows-os, app)
- [#25399 apply_patch Add File silently overwrites existing files](https://github.com/openai/codex/issues/25399) (3.1h old; 3 comments; labels: bug, CLI, tool-calls)

### codex_subagent_lifecycle

Heat score: 724. 4 recent issue(s), 23 comment(s).

First action: `trace-to-skill codex-report ./runs --output openai-codex-issue.md`

Examples:
- [#23930 Codex app subagent cards can remain stuck/visible after close while close/readback reports no live agent](https://github.com/openai/codex/issues/23930) (5.1h old; 10 comments; labels: bug, app, subagent)
- [#23700 Stale Codex subagents](https://github.com/openai/codex/issues/23700) (5.1h old; 9 comments; labels: bug, mcp, subagent)
- [#25458 MultiAgentV2 spawn_agent initial task is recorded as assistant/commentary and parallel child prompts leak](https://github.com/openai/codex/issues/25458) (3.1h old; 2 comments; labels: bug, app, subagent)
- [#25341 Subagent child threads are counted as top-level recent conversations and can leave stale open spawn edges](https://github.com/openai/codex/issues/25341) (5.1h old; 2 comments; labels: bug, extension, subagent, session)

### codex_deeplink_launch

Heat score: 657. 3 recent issue(s), 21 comment(s).

First action: `trace-to-skill codex-report ./runs --output openai-codex-issue.md`

Examples:
- [#25203 GitHub OAuth callback fails with "Unable to find Electron app" on Windows](https://github.com/openai/codex/issues/25203) (0.7h old; 17 comments; labels: bug, windows-os, auth, app)
- [#25368 Codex Windows desktop app deep link / OAuth callback bug](https://github.com/openai/codex/issues/25368) (2.3h old; 3 comments; labels: bug, windows-os, auth, app)
- [#25489 Codex Windows app will not launch after a clean reinstall.](https://github.com/openai/codex/issues/25489) (1.8h old; 1 comments; labels: bug, windows-os, app)

### codex_auth_verification

Heat score: 652. 3 recent issue(s), 32 comment(s).

First action: `trace-to-skill codex-report ./runs --output openai-codex-issue.md`

Examples:
- [#20320 ChatGPT asking phone number verify but didn't send any code yet](https://github.com/openai/codex/issues/20320) (2.0h old; 24 comments; labels: bug, auth)
- [#24990 Codex ChatGPT login flow](https://github.com/openai/codex/issues/24990) (1.7h old; 8 comments; labels: bug, auth)
- [#25479 Codex Desktop macOS Profile Usage Statistics Not Updating](https://github.com/openai/codex/issues/25479) (2.6h old; 0 comments; labels: bug, rate-limits, app)

## Unmatched Recent Issues

- [#8745 LSP integration (auto-detect + auto-install) for Codex CLI](https://github.com/openai/codex/issues/8745) (5.0h old; 52 comments; labels: enhancement, agent)
- [#9203 Please make "/undo" back](https://github.com/openai/codex/issues/9203) (5.0h old; 46 comments; labels: enhancement, TUI, session)
- [#21128 Codex Desktop silently hides project conversations outside the global recent-50 window](https://github.com/openai/codex/issues/21128) (0.9h old; 17 comments; labels: bug, app, session)
- [#24233 Google Drive plugin fails to create files: “No permission”](https://github.com/openai/codex/issues/24233) (0.2h old; 12 comments; labels: bug, windows-os, auth, app, skills)
- [#25244 Goal style questions disappear after restarting the client, serious error!!!!](https://github.com/openai/codex/issues/25244) (1.3h old; 12 comments; labels: bug, app, session)
- [#23403 remote-control daemon stays alive but device disappears from ChatGPT mobile app until app-server restart](https://github.com/openai/codex/issues/23403) (1.3h old; 10 comments; labels: bug, CLI, connectivity, app-server, remote)
- [#20769 Codex App resets Speed from Fast to Standard after restart](https://github.com/openai/codex/issues/20769) (5.1h old; 11 comments; labels: bug, app, config)
- [#25285 Windows Codex Desktop persists volatile plugin cache hash paths in sessions, causing older threads to lose skills after plugin cache updates](https://github.com/openai/codex/issues/25285) (1.4h old; 8 comments; labels: bug, windows-os, app, skills, session)
- [#25249 Windows: semi-transparent sidebar causes transparent/undrawn left and top regions when maximized](https://github.com/openai/codex/issues/25249) (2.3h old; 8 comments; labels: bug, windows-os, app)
- [#25474 Can't select the login method on codex](https://github.com/openai/codex/issues/25474) (1.2h old; 4 comments; labels: bug, windows-os, extension, auth, TUI)
- [#25453 Windows Codex Desktop spawns powershell.exe every second for full process polling, causing high CPU usage](https://github.com/openai/codex/issues/25453) (5.0h old; 4 comments; labels: bug, windows-os, app, performance)
- [#25510 Huge issues with the usage remanining](https://github.com/openai/codex/issues/25510) (0.2h old; 1 comments; labels: bug, rate-limits, app)
