# GitHub Issue Pain Map

Generated: 2026-06-01T02:57:23.552Z

Issues analyzed: **11**
Matched issues: **10**
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
| 1051 | `codex_token_burn` | high | 2 | 918 | 53 | [#14593 Burning tokens very fast](https://github.com/openai/codex/issues/14593) |
| 409 | `codex_auth_verification` | high | 2 | 346 | 18 | [#20161 Phone number verification doesn't work](https://github.com/openai/codex/issues/20161) |
| 304 | `codex_model_routing_mismatch` | high | 3 | 231 | 18 | [#11189 GPT-5.3-Codex being routed to GPT-5.2](https://github.com/openai/codex/issues/11189) |
| 234 | `weak_evidence` | medium | 11 | 1641 | 114 | [#14593 Burning tokens very fast](https://github.com/openai/codex/issues/14593) |
| 202 | `premature_completion` | high | 1 | 169 | 8 | [#1243 "Sign in With ChatGPT" functionality needs to be robust against all account types](https://github.com/openai/codex/issues/1243) |
| 137 | `codex_remote_compact` | high | 1 | 90 | 15 | [#14860 Error running remote compact task](https://github.com/openai/codex/issues/14860) |
| 137 | `context_compaction` | high | 1 | 90 | 15 | [#14860 Error running remote compact task](https://github.com/openai/codex/issues/14860) |
| 88 | `codex_mcp_discovery_mismatch` | high | 1 | 55 | 8 | [#6465 MCP servers not detected in Codex VS Code extension but working in Codex CLI](https://github.com/openai/codex/issues/6465) |
| 22 | `codex_usage_bucket_confusion` | high | 1 | 1 | 2 | [#25471 Codex usage popover shows confusing remaining percentages for 5h vs weekly buckets](https://github.com/openai/codex/issues/25471) |

## Maintainer Roadmap

| Rank | Next artifact | Why now | Command |
| ---: | --- | --- | --- |
| 1 | Usage evidence fixture and support-ready token report | 2 issue(s), 918 comment(s), severity high; top signal: codex_token_burn. | `trace-to-skill usage-evidence ./usage-notes.md --output usage-evidence.md` |
| 2 | Auth verification fixture and login support report | 2 issue(s), 346 comment(s), severity high; top signal: codex_auth_verification. | `trace-to-skill codex-report ./runs --output openai-codex-auth-issue.md` |
| 3 | Model-routing fixture and SSE evidence report | 3 issue(s), 231 comment(s), severity high; top signal: codex_model_routing_mismatch. | `trace-to-skill codex-report ./runs --output openai-codex-model-routing.md` |
| 4 | Codex-ready issue report and failure fixture | 1 issue(s), 169 comment(s), severity high; top signal: premature_completion. | `trace-to-skill codex-report ./runs --output openai-codex-issue.md` |
| 5 | Compaction/session regression fixture and Codex issue report | 1 issue(s), 90 comment(s), severity high; top signal: codex_remote_compact. | `trace-to-skill codex-report ./runs --output openai-codex-issue.md` |

## Suggested Next Actions

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

### premature_completion

Priority score: 202. 1 issue(s), 169 comment(s).

Example issues:
- [#1243 "Sign in With ChatGPT" functionality needs to be robust against all account types](https://github.com/openai/codex/issues/1243) (169 comments; labels: none)

Evidence rule prompts:
- Before claiming completion, run the relevant validation command or clearly state the exact validation that could not be run and why.

### codex_remote_compact

Priority score: 137. 1 issue(s), 90 comment(s).

Example issues:
- [#14860 Error running remote compact task](https://github.com/openai/codex/issues/14860) (90 comments; labels: bug, context)

Evidence rule prompts:
- When reporting Codex remote compact failures, capture app/CLI/extension version, OS, model and reasoning/speed mode, provider config without secrets, exact /compact or auto-compact error, `responses/compact` endpoint shape, timeout values such as tcp_user_timeout or stream_idle_timeout_ms, context/token level before compaction, whether lowering reasoning/speed changes behavior, whether local fallback or a new session recovers, and related thread/feedback ids.

## Unmatched Issues

- [#99999 Add a fun launch animation](https://github.com/openai/codex/issues/99999) (0 comments; labels: enhancement)
