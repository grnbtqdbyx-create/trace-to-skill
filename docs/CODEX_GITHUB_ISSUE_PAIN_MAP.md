# GitHub Issue Pain Map

Generated: 2026-06-01T03:51:24.368Z

Issues analyzed: **20**
Matched issues: **19**
Unmatched issues: **1**

This report maps GitHub issues onto deterministic `trace-to-skill` failure classes. Fetch a repository directly with `--repo`, or export issues with `gh issue list` / `gh search issues` and pass the JSON file.

```bash
trace-to-skill issue-map --repo openai/codex --output codex-issue-map.md
gh issue list --repo openai/codex --state open --limit 100 --json number,title,body,url,labels,comments,createdAt,updatedAt > codex-issues.json
trace-to-skill issue-map codex-issues.json --output codex-issue-map.md
gh issue list --repo openai/codex --state all --limit 100 --json number,title,body,url,labels,comments,updatedAt | trace-to-skill issue-map - --format json
```

## Top Clusters

| Priority | Kind | Severity | Issues | Comments | Reactions | Example |
| ---: | --- | --- | ---: | ---: | ---: | --- |
| 3101 | `codex_platform_availability` | high | 3 | 328 | 1368 | [#10410 Codex Desktop App: macOS Intel (x86_64) support](https://github.com/openai/codex/issues/10410) |
| 1895 | `codex_remote_connection` | high | 1 | 176 | 851 | [#10450 Remote Development in Codex Desktop App](https://github.com/openai/codex/issues/10450) |
| 1051 | `codex_token_burn` | high | 2 | 918 | 53 | [#14593 Burning tokens very fast](https://github.com/openai/codex/issues/14593) |
| 827 | `weak_evidence` | medium | 20 | 2514 | 2462 | [#14593 Burning tokens very fast](https://github.com/openai/codex/issues/14593) |
| 434 | `codex_thinking_hang` | high | 2 | 201 | 103 | [#14048 All models - Codex CLI hangs indefinitely on all prompts, no response generated](https://github.com/openai/codex/issues/14048) |
| 409 | `codex_auth_verification` | high | 2 | 346 | 18 | [#20161 Phone number verification doesn't work](https://github.com/openai/codex/issues/20161) |
| 304 | `codex_model_routing_mismatch` | high | 3 | 231 | 18 | [#11189 GPT-5.3-Codex being routed to GPT-5.2](https://github.com/openai/codex/issues/11189) |
| 257 | `codex_context_visibility` | high | 3 | 168 | 26 | [#23794 Codex Desktop no longer shows visible context/token usage indicator](https://github.com/openai/codex/issues/23794) |
| 202 | `premature_completion` | high | 1 | 169 | 8 | [#1243 "Sign in With ChatGPT" functionality needs to be robust against all account types](https://github.com/openai/codex/issues/1243) |
| 137 | `codex_remote_compact` | high | 1 | 90 | 15 | [#14860 Error running remote compact task](https://github.com/openai/codex/issues/14860) |
| 137 | `context_compaction` | high | 1 | 90 | 15 | [#14860 Error running remote compact task](https://github.com/openai/codex/issues/14860) |
| 88 | `codex_mcp_discovery_mismatch` | high | 1 | 55 | 8 | [#6465 MCP servers not detected in Codex VS Code extension but working in Codex CLI](https://github.com/openai/codex/issues/6465) |

## Maintainer Roadmap

| Rank | Next artifact | Why now | Command |
| ---: | --- | --- | --- |
| 1 | Platform availability fixture and support-policy evidence report | 3 issue(s), 328 comment(s), severity high; top signal: codex_platform_availability. | `trace-to-skill codex-report ./runs --output openai-codex-platform-availability.md` |
| 2 | Remote connection fixture and SSH workspace evidence report | 1 issue(s), 176 comment(s), severity high; top signal: codex_remote_connection. | `trace-to-skill codex-report ./runs --output openai-codex-remote-connection.md` |
| 3 | Usage evidence fixture and support-ready token report | 2 issue(s), 918 comment(s), severity high; top signal: codex_token_burn. | `trace-to-skill usage-evidence ./usage-notes.md --output usage-evidence.md` |
| 4 | Codex-ready issue report and failure fixture | 2 issue(s), 201 comment(s), severity high; top signal: codex_thinking_hang. | `trace-to-skill codex-report ./runs --output openai-codex-issue.md` |
| 5 | Auth verification fixture and login support report | 2 issue(s), 346 comment(s), severity high; top signal: codex_auth_verification. | `trace-to-skill codex-report ./runs --output openai-codex-auth-issue.md` |

## Suggested Next Actions

### codex_platform_availability

Priority score: 3101. 3 issue(s), 328 comment(s).

Example issues:
- [#10410 Codex Desktop App: macOS Intel (x86_64) support](https://github.com/openai/codex/issues/10410) (190 comments; labels: enhancement, app)
- [#11023 Codex desktop app for Linux](https://github.com/openai/codex/issues/11023) (68 comments; labels: enhancement, app)
- [#4313 Extension for JetBrains IDEs (PyCharm, IntelliJ, etc.)](https://github.com/openai/codex/issues/4313) (70 comments; labels: enhancement)

Evidence rule prompts:
- When reporting Codex platform availability gaps, capture requested surface (Desktop app, IDE extension, or packaged build), platform and architecture such as macOS Intel x86_64 or Linux distro/window system, install artifact and version, exact launch/install error, screenshot text such as prohibited icon or incompatible architecture, CLI version and whether CLI works on the same machine, alternative surfaces tried, package format requested, ecosystem workflow such as JetBrains/PyCharm/IntelliJ, demand evidence from comments/reactions or signup forms, and whether docs/release notes state the support policy.

### codex_remote_connection

Priority score: 1895. 1 issue(s), 176 comment(s).

Example issues:
- [#10450 Remote Development in Codex Desktop App](https://github.com/openai/codex/issues/10450) (176 comments; labels: enhancement, app)

Evidence rule prompts:
- When reporting Codex remote connection failures, capture Codex Desktop version, remote Codex CLI/app-server version, local OS, remote OS/architecture, SSH target alias from `~/.ssh/config`, whether `[features].remote_connections = true` is set, Settings > Connections visibility, selected host/path, remote workspace path, whether the remote filesystem is the source of truth, exact tunnel/app-server error, codex-server pid and restart result, `ps -ef | rg 'codex app-server|openai.chatgpt.*/codex'` evidence if available, remote PATH/auth/proxy/API reachability, model list differences versus local, fs/getMetadata or folder listing errors, ForwardAgent/proxy requirements, and whether reconnect/resume or a clean host works.

### codex_token_burn

Priority score: 1051. 2 issue(s), 918 comment(s).

Example issues:
- [#14593 Burning tokens very fast](https://github.com/openai/codex/issues/14593) (593 comments; labels: bug, rate-limits)
- [#13568 Usage dropping too quickly](https://github.com/openai/codex/issues/13568) (325 comments; labels: bug, rate-limits)

Evidence rule prompts:
- When reporting Codex token burn, capture plan/workspace, client and version, model and reasoning/speed settings, fast-mode/large-context/subagent/review flags, recent /status and usage-dashboard deltas, local token totals including cached input/output/reasoning if available, background process ids and write_stdin poll cadence, compaction attempts and failures, retry/tool-loop counts, whether the app was idle, and a minimal reproduction with before/after usage percentages.

### codex_thinking_hang

Priority score: 434. 2 issue(s), 201 comment(s).

Example issues:
- [#14048 All models - Codex CLI hangs indefinitely on all prompts, no response generated](https://github.com/openai/codex/issues/14048) (131 comments; labels: bug, agent)
- [#7156 Codex hangs during cli command execution](https://github.com/openai/codex/issues/7156) (70 comments; labels: bug, CLI)

Evidence rule prompts:
- When reporting Codex thinking or CLI no-response hangs, capture app/CLI/extension version, OS/terminal such as WSL, model and reasoning/speed settings, subscription/workspace, turn/thread id, prompt timestamp, whether the prompt is accepted but no streaming output/error/timeout appears, status bar or usage percent such as 100% left, `turn/start` or `task_started` timestamp, last successful tool-call output, first `response_item` or assistant timestamp if it eventually appears, `RUST_LOG`/SSE evidence including unhandled responses events, transport (`responses_http` or websocket), `time.busy`/`time.idle` close metrics, reconnect or stream-disconnect lines, status incident link or cluster mitigation note if relevant, MCP/subagent state, whether stop/Ctrl+C/interrupt works, and whether a new thread, logout/login, downgrade, API billing path, or minimal config without MCPs recovers.

### codex_auth_verification

Priority score: 409. 2 issue(s), 346 comment(s).

Example issues:
- [#20161 Phone number verification doesn't work](https://github.com/openai/codex/issues/20161) (177 comments; labels: bug, auth)
- [#1243 "Sign in With ChatGPT" functionality needs to be robust against all account types](https://github.com/openai/codex/issues/1243) (169 comments; labels: none)

Evidence rule prompts:
- When reporting Codex sign-in or account-verification failures, capture the Codex app/CLI/extension version, surface, OS, account type without secrets, workspace or organization context, SSO provider, whether the flow is ChatGPT sign-in, phone/SMS/OTP verification, or extension chat initialization, exact redacted error text, timestamps, whether another device/browser/account works, logout/login attempts, and screenshots with phone numbers, tokens, and email addresses redacted.

## Unmatched Issues

- [#99999 Add a fun launch animation](https://github.com/openai/codex/issues/99999) (0 comments; labels: enhancement)
