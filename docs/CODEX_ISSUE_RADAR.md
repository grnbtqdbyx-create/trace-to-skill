# GitHub Issue Pain Map

Generated: 2026-06-01T03:41:42.598Z

Issues analyzed: **46**
Matched issues: **23**
Unmatched issues: **23**

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
| 2438 | `codex_token_burn` | high | 4 | 1151 | 620 | [#14593 Burning tokens very fast](https://github.com/openai/codex/issues/14593) |
| 2221 | `weak_evidence` | medium | 46 | 4755 | 7794 | [#14593 Burning tokens very fast](https://github.com/openai/codex/issues/14593) |
| 1895 | `codex_remote_connection` | high | 1 | 176 | 851 | [#10450 Remote Development in Codex Desktop App](https://github.com/openai/codex/issues/10450) |
| 884 | `sensitive_file_access` | high | 1 | 75 | 396 | [#2847 A way to exclude sensitive files](https://github.com/openai/codex/issues/2847) |
| 805 | `codex_auth_verification` | high | 3 | 436 | 166 | [#20161 Phone number verification doesn't work](https://github.com/openai/codex/issues/20161) |
| 631 | `codex_context_visibility` | high | 1 | 160 | 227 | [#23794 Codex Desktop no longer shows visible context/token usage indicator](https://github.com/openai/codex/issues/23794) |
| 442 | `codex_tool_call_integrity` | high | 1 | 61 | 182 | [#2998 IDE-integrated diff / approval](https://github.com/openai/codex/issues/2998) |
| 434 | `codex_thinking_hang` | high | 2 | 201 | 103 | [#14048 All models — Codex CLI hangs indefinitely on all prompts, no response generated](https://github.com/openai/codex/issues/14048) |
| 376 | `codex_remote_compact` | high | 2 | 147 | 101 | [#14860 Error running remote compact task](https://github.com/openai/codex/issues/14860) |
| 376 | `context_compaction` | high | 2 | 147 | 101 | [#14860 Error running remote compact task](https://github.com/openai/codex/issues/14860) |
| 351 | `codex_terminal_output_integrity` | high | 1 | 66 | 134 | [#2558 Codex client output truncated when scrolling in Zellij](https://github.com/openai/codex/issues/2558) |
| 324 | `codex_model_routing_mismatch` | high | 1 | 169 | 69 | [#11189 GPT-5.3-Codex being routed to GPT-5.2](https://github.com/openai/codex/issues/11189) |

## Maintainer Roadmap

| Rank | Next artifact | Why now | Command |
| ---: | --- | --- | --- |
| 1 | Usage evidence fixture and support-ready token report | 4 issue(s), 1151 comment(s), severity high; top signal: codex_token_burn. | `trace-to-skill usage-evidence ./usage-notes.md --output usage-evidence.md` |
| 2 | Remote connection fixture and SSH workspace evidence report | 1 issue(s), 176 comment(s), severity high; top signal: codex_remote_connection. | `trace-to-skill codex-report ./runs --output openai-codex-remote-connection.md` |
| 3 | Privacy/safety guardrail and redacted support bundle | 1 issue(s), 75 comment(s), severity high; top signal: sensitive_file_access. | `trace-to-skill diagnostics-bundle ~/.codex --output codex-diagnostics` |
| 4 | Auth verification fixture and login support report | 3 issue(s), 436 comment(s), severity high; top signal: codex_auth_verification. | `trace-to-skill codex-report ./runs --output openai-codex-auth-issue.md` |
| 5 | Context visibility fixture and Desktop UI evidence report | 1 issue(s), 160 comment(s), severity high; top signal: codex_context_visibility. | `trace-to-skill codex-report ./runs --output openai-codex-context-visibility.md` |

## Suggested Next Actions

### codex_token_burn

Priority score: 2438. 4 issue(s), 1151 comment(s).

Example issues:
- [#14593 Burning tokens very fast](https://github.com/openai/codex/issues/14593) (593 comments; labels: bug, rate-limits)
- [#13568 Usage dropping too quickly](https://github.com/openai/codex/issues/13568) (325 comments; labels: bug, rate-limits)
- [#19464 Support 1M token context for GPT-5.5 in Codex](https://github.com/openai/codex/issues/19464) (132 comments; labels: enhancement, context)

Evidence rule prompts:
- When reporting Codex token burn, capture plan/workspace, client and version, model and reasoning/speed settings, fast-mode/large-context/subagent/review flags, recent /status and usage-dashboard deltas, local token totals including cached input/output/reasoning if available, background process ids and write_stdin poll cadence, compaction attempts and failures, retry/tool-loop counts, whether the app was idle, and a minimal reproduction with before/after usage percentages.

### codex_remote_connection

Priority score: 1895. 1 issue(s), 176 comment(s).

Example issues:
- [#10450 Remote Development in Codex Desktop App](https://github.com/openai/codex/issues/10450) (176 comments; labels: enhancement, app)

Evidence rule prompts:
- When reporting Codex remote connection failures, capture Codex Desktop version, remote Codex CLI/app-server version, local OS, remote OS/architecture, SSH target alias from `~/.ssh/config`, whether `[features].remote_connections = true` is set, Settings > Connections visibility, selected host/path, remote workspace path, whether the remote filesystem is the source of truth, exact tunnel/app-server error, codex-server pid and restart result, `ps -ef | rg 'codex app-server|openai.chatgpt.*/codex'` evidence if available, remote PATH/auth/proxy/API reachability, model list differences versus local, fs/getMetadata or folder listing errors, ForwardAgent/proxy requirements, and whether reconnect/resume or a clean host works.

### sensitive_file_access

Priority score: 884. 1 issue(s), 75 comment(s).

Example issues:
- [#2847 A way to exclude sensitive files](https://github.com/openai/codex/issues/2847) (75 comments; labels: enhancement, sandbox)

Evidence rule prompts:
- Before running an agent, exclude sensitive files such as .env, private keys, package auth files, cloud credentials, local databases, and production secret manifests; share only minimal redacted excerpts when maintainer-approved.

### codex_auth_verification

Priority score: 805. 3 issue(s), 436 comment(s).

Example issues:
- [#20161 Phone number verification doesn't work](https://github.com/openai/codex/issues/20161) (177 comments; labels: bug, auth)
- [#1243 "Sign in With ChatGPT" functionality needs to be robust against all account types](https://github.com/openai/codex/issues/1243) (169 comments; labels: none)
- [#2841 “Error starting conversation” in new Codex VS Code extension when initializing a chat](https://github.com/openai/codex/issues/2841) (90 comments; labels: bug, windows-os, extension)

Evidence rule prompts:
- When reporting Codex sign-in or account-verification failures, capture the Codex app/CLI/extension version, surface, OS, account type without secrets, workspace or organization context, SSO provider, whether the flow is ChatGPT sign-in, phone/SMS/OTP verification, or extension chat initialization, exact redacted error text, timestamps, whether another device/browser/account works, logout/login attempts, and screenshots with phone numbers, tokens, and email addresses redacted.

### codex_context_visibility

Priority score: 631. 1 issue(s), 160 comment(s).

Example issues:
- [#23794 Codex Desktop no longer shows visible context/token usage indicator](https://github.com/openai/codex/issues/23794) (160 comments; labels: bug, context, app)

Evidence rule prompts:
- When reporting Codex context-visibility regressions, capture Codex Desktop version, OS, surface, screenshot or short recording of the chat input area, whether the prior context/token indicator or tooltip was visible before the update, exact UI route where it disappeared, local session metadata showing context/window pressure if available, `/status` output if relevant, compaction timing, whether CLI/TUI still exposes a statusline, and how the missing indicator affects long-session decisions.

## Unmatched Issues

- [#10410 Codex Desktop App: macOS Intel (x86_64) support](https://github.com/openai/codex/issues/10410) (190 comments; labels: enhancement, app)
- [#2604 Subagent Support](https://github.com/openai/codex/issues/2604) (103 comments; labels: enhancement, subagent)
- [#12564 Allow renaming task/thread titles to improve history navigation](https://github.com/openai/codex/issues/12564) (77 comments; labels: enhancement, extension)
- [#2860 Unusable on Windows due to permission ask for every shell command](https://github.com/openai/codex/issues/2860) (77 comments; labels: bug, windows-os)
- [#2109 Event Hooks](https://github.com/openai/codex/issues/2109) (76 comments; labels: enhancement, hooks)
- [#2796 BUG: VSCode IDE Plugin on SSH Connection: "Failed to load tasks."](https://github.com/openai/codex/issues/2796) (71 comments; labels: bug, extension)
- [#16231 High CPU usage on macOS after updating Codex in VS Code extension to 26.325.31654](https://github.com/openai/codex/issues/16231) (71 comments; labels: bug, extension, regression, performance)
- [#4313 Extension for JetBrains IDEs (PyCharm, IntelliJ, etc.)](https://github.com/openai/codex/issues/4313) (70 comments; labels: enhancement)
- [#13041 WebSocket upgrade succeeds then server closes with 1008 Policy (falls back to HTTPS)](https://github.com/openai/codex/issues/13041) (70 comments; labels: bug, connectivity)
- [#11701 Subagent configuration and orchestration](https://github.com/openai/codex/issues/11701) (69 comments; labels: enhancement, subagent)
- [#11023 Codex desktop app for Linux](https://github.com/openai/codex/issues/11023) (68 comments; labels: enhancement, app)
- [#6172 Hitting rate limits](https://github.com/openai/codex/issues/6172) (66 comments; labels: bug, codex-web, rate-limits)
