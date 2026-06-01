# GitHub Issue Pain Map

Generated: 2026-06-01T02:48:00.507Z

Issues analyzed: **46**
Matched issues: **18**
Unmatched issues: **28**

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
| 2221 | `weak_evidence` | medium | 46 | 4755 | 7792 | [#14593 Burning tokens very fast](https://github.com/openai/codex/issues/14593) |
| 884 | `sensitive_file_access` | high | 1 | 75 | 396 | [#2847 A way to exclude sensitive files](https://github.com/openai/codex/issues/2847) |
| 805 | `codex_auth_verification` | high | 3 | 436 | 166 | [#20161 Phone number verification doesn't work](https://github.com/openai/codex/issues/20161) |
| 442 | `codex_tool_call_integrity` | high | 1 | 61 | 182 | [#2998 IDE-integrated diff / approval](https://github.com/openai/codex/issues/2998) |
| 376 | `codex_remote_compact` | high | 2 | 147 | 101 | [#14860 Error running remote compact task](https://github.com/openai/codex/issues/14860) |
| 376 | `context_compaction` | high | 2 | 147 | 101 | [#14860 Error running remote compact task](https://github.com/openai/codex/issues/14860) |
| 351 | `codex_terminal_output_integrity` | high | 1 | 66 | 134 | [#2558 Codex client output truncated when scrolling in Zellij](https://github.com/openai/codex/issues/2558) |
| 261 | `premature_completion` | high | 1 | 60 | 92 | [#2448 Codex CLI: Plus users hitting usage limits extremely quickly compared to competitors](https://github.com/openai/codex/issues/2448) |
| 247 | `codex_connectivity` | high | 2 | 192 | 14 | [#12764 The codex cli giving: 401 unauthorized](https://github.com/openai/codex/issues/12764) |
| 181 | `codex_latest_turn_drift` | high | 1 | 58 | 53 | [#8648 Codex replies to earlier messages instead of latest one in conversations](https://github.com/openai/codex/issues/8648) |
| 168 | `codex_resource_leak` | high | 1 | 97 | 27 | [#10432 High GPU usage (70–90%) on macOS with Codex app](https://github.com/openai/codex/issues/10432) |

## Maintainer Roadmap

| Rank | Next artifact | Why now | Command |
| ---: | --- | --- | --- |
| 1 | Usage evidence fixture and support-ready token report | 4 issue(s), 1151 comment(s), severity high; top signal: codex_token_burn. | `trace-to-skill usage-evidence ./usage-notes.md --output usage-evidence.md` |
| 2 | Privacy/safety guardrail and redacted support bundle | 1 issue(s), 75 comment(s), severity high; top signal: sensitive_file_access. | `trace-to-skill diagnostics-bundle ~/.codex --output codex-diagnostics` |
| 3 | Auth verification fixture and login support report | 3 issue(s), 436 comment(s), severity high; top signal: codex_auth_verification. | `trace-to-skill codex-report ./runs --output openai-codex-auth-issue.md` |
| 4 | Patch safety fixture and pre-agent checkpoint workflow | 1 issue(s), 61 comment(s), severity high; top signal: codex_tool_call_integrity. | `trace-to-skill checkpoint . --output .trace-to-skill/checkpoints/before-codex` |
| 5 | Compaction/session regression fixture and Codex issue report | 2 issue(s), 147 comment(s), severity high; top signal: codex_remote_compact. | `trace-to-skill codex-report ./runs --output openai-codex-issue.md` |

## Suggested Next Actions

### codex_token_burn

Priority score: 2438. 4 issue(s), 1151 comment(s).

Example issues:
- [#14593 Burning tokens very fast](https://github.com/openai/codex/issues/14593) (593 comments; labels: bug, rate-limits)
- [#13568 Usage dropping too quickly](https://github.com/openai/codex/issues/13568) (325 comments; labels: bug, rate-limits)
- [#19464 Support 1M token context for GPT-5.5 in Codex](https://github.com/openai/codex/issues/19464) (132 comments; labels: enhancement, context)

Evidence rule prompts:
- When reporting Codex token burn, capture plan/workspace, client and version, model and reasoning/speed settings, fast-mode/large-context/subagent/review flags, recent /status and usage-dashboard deltas, local token totals including cached input/output/reasoning if available, background process ids and write_stdin poll cadence, compaction attempts and failures, retry/tool-loop counts, whether the app was idle, and a minimal reproduction with before/after usage percentages.

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

### codex_tool_call_integrity

Priority score: 442. 1 issue(s), 61 comment(s).

Example issues:
- [#2998 IDE-integrated diff / approval](https://github.com/openai/codex/issues/2998) (61 comments; labels: enhancement, extension)

Evidence rule prompts:
- When reporting Codex tool-call integrity failures, capture the exact tool input and output, app/CLI/extension version, OS/IDE, workspace git state, affected file path and whether it already existed or was a symlink, diff before/after, tool_call_id sequence, durable thread state for subagents, rollback/revert attempts, and whether a clean repo reproduction fails the same way.

### codex_remote_compact

Priority score: 376. 2 issue(s), 147 comment(s).

Example issues:
- [#14860 Error running remote compact task](https://github.com/openai/codex/issues/14860) (90 comments; labels: bug, context)
- [#9544 Error running remote compact task: stream disconnected before completion](https://github.com/openai/codex/issues/9544) (57 comments; labels: bug, context)

Evidence rule prompts:
- When reporting Codex remote compact failures, capture app/CLI/extension version, OS, model and reasoning/speed mode, provider config without secrets, exact /compact or auto-compact error, `responses/compact` endpoint shape, timeout values such as tcp_user_timeout or stream_idle_timeout_ms, context/token level before compaction, whether lowering reasoning/speed changes behavior, whether local fallback or a new session recovers, and related thread/feedback ids.

## Unmatched Issues

- [#10410 Codex Desktop App: macOS Intel (x86_64) support](https://github.com/openai/codex/issues/10410) (190 comments; labels: enhancement, app)
- [#10450 Remote Development in Codex Desktop App](https://github.com/openai/codex/issues/10450) (176 comments; labels: enhancement, app)
- [#11189 GPT-5.3-Codex being routed to GPT-5.2](https://github.com/openai/codex/issues/11189) (169 comments; labels: bug, CLI)
- [#23794 Codex Desktop no longer shows visible context/token usage indicator](https://github.com/openai/codex/issues/23794) (160 comments; labels: bug, context, app)
- [#14048 All models — Codex CLI hangs indefinitely on all prompts, no response generated](https://github.com/openai/codex/issues/14048) (131 comments; labels: bug, agent)
- [#2604 Subagent Support](https://github.com/openai/codex/issues/2604) (103 comments; labels: enhancement, subagent)
- [#12564 Allow renaming task/thread titles to improve history navigation](https://github.com/openai/codex/issues/12564) (77 comments; labels: enhancement, extension)
- [#2860 Unusable on Windows due to permission ask for every shell command](https://github.com/openai/codex/issues/2860) (77 comments; labels: bug, windows-os)
- [#2109 Event Hooks](https://github.com/openai/codex/issues/2109) (76 comments; labels: enhancement, hooks)
- [#2796 BUG: VSCode IDE Plugin on SSH Connection: "Failed to load tasks."](https://github.com/openai/codex/issues/2796) (71 comments; labels: bug, extension)
- [#16231 High CPU usage on macOS after updating Codex in VS Code extension to 26.325.31654](https://github.com/openai/codex/issues/16231) (71 comments; labels: bug, extension, regression, performance)
- [#7156 Codex hangs during cli command execution](https://github.com/openai/codex/issues/7156) (70 comments; labels: bug, CLI)
