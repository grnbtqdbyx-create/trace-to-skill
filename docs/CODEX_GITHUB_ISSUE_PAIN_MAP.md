# GitHub Issue Pain Map

Generated: 2026-06-01T01:27:18.765Z

Issues analyzed: **100**
Matched issues: **48**
Unmatched issues: **52**

This report maps exported GitHub issues onto deterministic `trace-to-skill` failure classes. Export issues with `gh issue list` or `gh search issues`, then use the highest-priority clusters to decide which fixtures, docs, or support reports to build next.

```bash
gh issue list --repo openai/codex --state open --limit 100 --json number,title,body,url,labels,comments,createdAt,updatedAt > codex-issues.json
trace-to-skill issue-map codex-issues.json --output codex-issue-map.md
```

## Top Clusters

| Priority | Kind | Severity | Issues | Comments | Reactions | Example |
| ---: | --- | --- | ---: | ---: | ---: | --- |
| 978 | `codex_token_burn` | high | 9 | 881 | 0 | [#14593 Burning tokens very fast](https://github.com/openai/codex/issues/14593) | |
| 778 | `weak_evidence` | medium | 100 | 3746 | 0 | [#14593 Burning tokens very fast](https://github.com/openai/codex/issues/14593) | |
| 446 | `premature_completion` | high | 11 | 329 | 0 | [#3962 Play a sound when Codex finishes a prompt / task](https://github.com/openai/codex/issues/3962) | |
| 307 | `codex_remote_compact` | high | 7 | 230 | 0 | [#14860 Error running remote compact task](https://github.com/openai/codex/issues/14860) | |
| 272 | `context_compaction` | high | 6 | 205 | 0 | [#14860 Error running remote compact task](https://github.com/openai/codex/issues/14860) | |
| 217 | `sandbox_permission` | high | 5 | 160 | 0 | [#10601 Sandbox setup error on Windows](https://github.com/openai/codex/issues/10601) | |
| 205 | `codex_windows_helper_path` | high | 5 | 148 | 0 | [#18258 Codex app on macOS shows 'Computer Use plugin unavailable'](https://github.com/openai/codex/issues/18258) | |
| 152 | `codex_latency_regression` | high | 4 | 105 | 0 | [#24422 GPT-5.5 Fast suddenly feels as slow as Standard, with long thinking/context/search stalls](https://github.com/openai/codex/issues/24422) | |
| 137 | `codex_mcp_discovery_mismatch` | high | 3 | 100 | 0 | [#6465 MCP servers not detected in Codex VS Code extension (but working in Codex CLI)](https://github.com/openai/codex/issues/6465) | |
| 133 | `codex_approval_friction` | high | 3 | 96 | 0 | [#4212 Windows approval “Allow for this session” isn’t remembered](https://github.com/openai/codex/issues/4212) | |
| 131 | `codex_resource_leak` | high | 3 | 94 | 0 | [#11981 Codex app 100% CPU Usage even when only one agent is running](https://github.com/openai/codex/issues/11981) | |
| 130 | `codex_tool_call_integrity` | high | 2 | 103 | 0 | [#2998 IDE-integrated diff / approval](https://github.com/openai/codex/issues/2998) | |
| 123 | `codex_plugin_runtime` | high | 3 | 86 | 0 | [#18258 Codex app on macOS shows 'Computer Use plugin unavailable'](https://github.com/openai/codex/issues/18258) | |
| 112 | `mcp_risk` | high | 2 | 85 | 0 | [#6465 MCP servers not detected in Codex VS Code extension (but working in Codex CLI)](https://github.com/openai/codex/issues/6465) | |
| 110 | `codex_latest_turn_drift` | high | 2 | 83 | 0 | [#8648 Codex replies to earlier messages instead of latest one in conversations](https://github.com/openai/codex/issues/8648) | |

## Suggested Next Actions

### codex_token_burn

Priority score: 978. 9 issue(s), 881 comment(s).

Example issues:
- [#14593 Burning tokens very fast](https://github.com/openai/codex/issues/14593) (593 comments; labels: bug, rate-limits)
- [#19464 Support 1M token context for GPT-5.5 in Codex](https://github.com/openai/codex/issues/19464) (132 comments; labels: enhancement, context)
- [#5957 Auto compaction causes GPT-5-Codex to lose the plot. It forgets it is mid-task, forgets it has edited files and stops.](https://github.com/openai/codex/issues/5957) (25 comments; labels: bug, context)

Evidence rule prompts:
- When reporting Codex token burn, capture plan/workspace, client and version, model and reasoning/speed settings, fast-mode/large-context/subagent/review flags, recent /status and usage-dashboard deltas, local token totals including cached input/output/reasoning if available, background process ids and write_stdin poll cadence, compaction attempts and failures, retry/tool-loop counts, whether the app was idle, and a minimal reproduction with before/after usage percentages.

### weak_evidence

Priority score: 778. 100 issue(s), 3746 comment(s).

Example issues:
- [#14593 Burning tokens very fast](https://github.com/openai/codex/issues/14593) (593 comments; labels: bug, rate-limits)
- [#19464 Support 1M token context for GPT-5.5 in Codex](https://github.com/openai/codex/issues/19464) (132 comments; labels: enhancement, context)
- [#14860 Error running remote compact task](https://github.com/openai/codex/issues/14860) (90 comments; labels: bug, context)

Evidence rule prompts:
- Final responses must include the exact validation evidence used to prove the change, not only a summary of intent.

### premature_completion

Priority score: 446. 11 issue(s), 329 comment(s).

Example issues:
- [#3962 Play a sound when Codex finishes a prompt / task](https://github.com/openai/codex/issues/3962) (50 comments; labels: enhancement, extension)
- [#7291 Bug report: VSCode extension failed to revert the changes](https://github.com/openai/codex/issues/7291) (42 comments; labels: bug, extension)
- [#18341 Mac app shows persistent blurred/translucent overlay below composer](https://github.com/openai/codex/issues/18341) (34 comments; labels: bug, app)

Evidence rule prompts:
- Before claiming completion, run the relevant validation command or clearly state the exact validation that could not be run and why.

### codex_remote_compact

Priority score: 307. 7 issue(s), 230 comment(s).

Example issues:
- [#14860 Error running remote compact task](https://github.com/openai/codex/issues/14860) (90 comments; labels: bug, context)
- [#9211 Error running remote compact task: timeout waiting for child process to exit](https://github.com/openai/codex/issues/9211) (27 comments; labels: bug, context)
- [#10823 Unable to compact the context in a VERY long running session](https://github.com/openai/codex/issues/10823) (26 comments; labels: bug, context)

Evidence rule prompts:
- When reporting Codex remote compact failures, capture app/CLI/extension version, OS, model and reasoning/speed mode, provider config without secrets, exact /compact or auto-compact error, `responses/compact` endpoint shape, timeout values such as tcp_user_timeout or stream_idle_timeout_ms, context/token level before compaction, whether lowering reasoning/speed changes behavior, whether local fallback or a new session recovers, and related thread/feedback ids.

### context_compaction

Priority score: 272. 6 issue(s), 205 comment(s).

Example issues:
- [#14860 Error running remote compact task](https://github.com/openai/codex/issues/14860) (90 comments; labels: bug, context)
- [#9211 Error running remote compact task: timeout waiting for child process to exit](https://github.com/openai/codex/issues/9211) (27 comments; labels: bug, context)
- [#10823 Unable to compact the context in a VERY long running session](https://github.com/openai/codex/issues/10823) (26 comments; labels: bug, context)

Evidence rule prompts:
- When Codex compaction fails, capture the compact error, model/app version, thread state, and whether the session is recoverable before continuing or reporting success.

## Unmatched Issues

- [#16231 High CPU usage on macOS after updating Codex in VS Code extension to 26.325.31654](https://github.com/openai/codex/issues/16231) (71 comments; labels: bug, extension, regression, performance)
- [#13041 WebSocket upgrade succeeds then server closes with 1008 Policy (falls back to HTTPS)](https://github.com/openai/codex/issues/13041) (70 comments; labels: bug, connectivity)
- [#11023 Codex desktop app for Linux](https://github.com/openai/codex/issues/11023) (68 comments; labels: enhancement, app)
- [#13993 Support standalone Windows installer (`codex-setup.exe`)](https://github.com/openai/codex/issues/13993) (58 comments; labels: enhancement, windows-os, app, User Request, Feature)
- [#8745 LSP integration (auto-detect + auto-install) for Codex CLI](https://github.com/openai/codex/issues/8745) (52 comments; labels: enhancement, agent)
- [#12661 Markdown file:// links open in default browser (Edge) instead of VS Code editor](https://github.com/openai/codex/issues/12661) (46 comments; labels: bug, windows-os, extension)
- [#9203 Please make "/undo" back](https://github.com/openai/codex/issues/9203) (46 comments; labels: enhancement, TUI, session)
- [#6020 MCP client for `X` failed to start: handshaking with MCP server failed: connection closed: initialize response](https://github.com/openai/codex/issues/6020) (40 comments; labels: bug, mcp)
- [#16857 High GPU usage while the app is “thinking” due to tiny useless animation](https://github.com/openai/codex/issues/16857) (36 comments; labels: bug, app, performance)
- [#3141 Allow GPU access inside sandbox](https://github.com/openai/codex/issues/3141) (35 comments; labels: enhancement, sandbox)
- [#3355 Error sending request for url (https://chatgpt.com/backend-api/codex/responses) after macbook sleeps](https://github.com/openai/codex/issues/3355) (35 comments; labels: bug, connectivity)
- [#2153 ChatGPT integration](https://github.com/openai/codex/issues/2153) (33 comments; labels: enhancement, app, User Request, Feature)
- [#11626 CLI: Add /rewind checkpoint restore that reverts both chat context and Codex-applied code edits](https://github.com/openai/codex/issues/11626) (33 comments; labels: enhancement, TUI)
- [#18960 Frequent reconnect loop in Codex App: websocket closed by server before response.completed](https://github.com/openai/codex/issues/18960) (33 comments; labels: bug, connectivity)
- [#2952 Search @ cannot search from directories excluded by .gitignore](https://github.com/openai/codex/issues/2952) (31 comments; labels: bug, extension)

