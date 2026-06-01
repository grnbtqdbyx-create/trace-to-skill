# GitHub Issue Pain Map

Generated: 2026-06-01T03:25:54.011Z

Issues analyzed: **15**
Matched issues: **14**
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
| 1895 | `codex_remote_connection` | high | 1 | 176 | 851 | [#10450 Remote Development in Codex Desktop App](https://github.com/openai/codex/issues/10450) |
| 1051 | `codex_token_burn` | high | 2 | 918 | 53 | [#14593 Burning tokens very fast](https://github.com/openai/codex/issues/14593) |
| 460 | `weak_evidence` | medium | 15 | 1985 | 991 | [#14593 Burning tokens very fast](https://github.com/openai/codex/issues/14593) |
| 409 | `codex_auth_verification` | high | 2 | 346 | 18 | [#20161 Phone number verification doesn't work](https://github.com/openai/codex/issues/20161) |
| 304 | `codex_model_routing_mismatch` | high | 3 | 231 | 18 | [#11189 GPT-5.3-Codex being routed to GPT-5.2](https://github.com/openai/codex/issues/11189) |
| 257 | `codex_context_visibility` | high | 3 | 168 | 26 | [#23794 Codex Desktop no longer shows visible context/token usage indicator](https://github.com/openai/codex/issues/23794) |
| 202 | `premature_completion` | high | 1 | 169 | 8 | [#1243 "Sign in With ChatGPT" functionality needs to be robust against all account types](https://github.com/openai/codex/issues/1243) |
| 137 | `codex_remote_compact` | high | 1 | 90 | 15 | [#14860 Error running remote compact task](https://github.com/openai/codex/issues/14860) |
| 137 | `context_compaction` | high | 1 | 90 | 15 | [#14860 Error running remote compact task](https://github.com/openai/codex/issues/14860) |
| 88 | `codex_mcp_discovery_mismatch` | high | 1 | 55 | 8 | [#6465 MCP servers not detected in Codex VS Code extension but working in Codex CLI](https://github.com/openai/codex/issues/6465) |
| 22 | `codex_usage_bucket_confusion` | high | 1 | 1 | 2 | [#25471 Codex usage popover shows confusing remaining percentages for 5h vs weekly buckets](https://github.com/openai/codex/issues/25471) |

## Maintainer Roadmap

| Rank | Next artifact | Why now | Command |
| ---: | --- | --- | --- |
| 1 | Remote connection fixture and SSH workspace evidence report | 1 issue(s), 176 comment(s), severity high; top signal: codex_remote_connection. | `trace-to-skill codex-report ./runs --output openai-codex-remote-connection.md` |
| 2 | Usage evidence fixture and support-ready token report | 2 issue(s), 918 comment(s), severity high; top signal: codex_token_burn. | `trace-to-skill usage-evidence ./usage-notes.md --output usage-evidence.md` |
| 3 | Auth verification fixture and login support report | 2 issue(s), 346 comment(s), severity high; top signal: codex_auth_verification. | `trace-to-skill codex-report ./runs --output openai-codex-auth-issue.md` |
| 4 | Model-routing fixture and SSE evidence report | 3 issue(s), 231 comment(s), severity high; top signal: codex_model_routing_mismatch. | `trace-to-skill codex-report ./runs --output openai-codex-model-routing.md` |
| 5 | Context visibility fixture and Desktop UI evidence report | 3 issue(s), 168 comment(s), severity high; top signal: codex_context_visibility. | `trace-to-skill codex-report ./runs --output openai-codex-context-visibility.md` |

## Suggested Next Actions

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

### codex_auth_verification

Priority score: 409. 2 issue(s), 346 comment(s).

Example issues:
- [#20161 Phone number verification doesn't work](https://github.com/openai/codex/issues/20161) (177 comments; labels: bug, auth)
- [#1243 "Sign in With ChatGPT" functionality needs to be robust against all account types](https://github.com/openai/codex/issues/1243) (169 comments; labels: none)

Evidence rule prompts:
- When reporting Codex sign-in or account-verification failures, capture the Codex app/CLI/extension version, surface, OS, account type without secrets, workspace or organization context, SSO provider, whether the flow is ChatGPT sign-in, phone/SMS/OTP verification, or extension chat initialization, exact redacted error text, timestamps, whether another device/browser/account works, logout/login attempts, and screenshots with phone numbers, tokens, and email addresses redacted.

### codex_model_routing_mismatch

Priority score: 304. 3 issue(s), 231 comment(s).

Example issues:
- [#11189 GPT-5.3-Codex being routed to GPT-5.2](https://github.com/openai/codex/issues/11189) (169 comments; labels: bug, CLI)
- [#11561 GPT-5.3-Codex being routed to GPT-5.2](https://github.com/openai/codex/issues/11561) (47 comments; labels: bug, CLI)
- [#11842 GPT-5.3-Codex being routed to GPT-5.2](https://github.com/openai/codex/issues/11842) (15 comments; labels: bug, CLI)

Evidence rule prompts:
- When reporting Codex model-routing mismatches, capture the Codex app/CLI/extension version, subscription/workspace, selected model from config.toml, TUI, command flag, or UI, actual server-side model from SSE `response.created` / `response.model`, the exact `RUST_LOG` or trace command used, timestamp, account or verification state without secrets, whether API and Codex routes differ, whether a warning/fallback notice appeared, and a minimal one-prompt reproduction with redacted logs.

### codex_context_visibility

Priority score: 257. 3 issue(s), 168 comment(s).

Example issues:
- [#23794 Codex Desktop no longer shows visible context/token usage indicator](https://github.com/openai/codex/issues/23794) (160 comments; labels: bug, context, app)
- [#23591 Reimplement visible context/token usage indicator in Codex Desktop App](https://github.com/openai/codex/issues/23591) (7 comments; labels: enhancement, rate-limits, context, app)
- [#24710 Codex Desktop: hidden context indicator still blocks long-session context management](https://github.com/openai/codex/issues/24710) (1 comments; labels: enhancement, context, app)

Evidence rule prompts:
- When reporting Codex context-visibility regressions, capture Codex Desktop version, OS, surface, screenshot or short recording of the chat input area, whether the prior context/token indicator or tooltip was visible before the update, exact UI route where it disappeared, local session metadata showing context/window pressure if available, `/status` output if relevant, compaction timing, whether CLI/TUI still exposes a statusline, and how the missing indicator affects long-session decisions.

## Unmatched Issues

- [#99999 Add a fun launch animation](https://github.com/openai/codex/issues/99999) (0 comments; labels: enhancement)
