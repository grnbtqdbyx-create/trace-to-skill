# Codex Issue Radar Demo

Generated: 2026-06-01T01:58:02.397Z

Issues analyzed: **46**
Matched issues: **14**
Unmatched issues: **32**

This public demo maps live `openai/codex` GitHub issues onto deterministic `trace-to-skill` failure classes. It is designed as a maintainer-facing signal: which public pain points have enough comments/reactions to become the next support artifact, fixture, `AGENTS.md` rule, or Codex workflow improvement.

Fetch a repository directly with `--repo`, or export issues with `gh issue list` / `gh search issues` and pass the JSON file.

```bash
trace-to-skill issue-map --repo openai/codex --state all --limit 100 --output codex-issue-radar.md
gh issue list --repo openai/codex --state open --limit 100 --json number,title,body,url,labels,comments,createdAt,updatedAt > codex-issues.json
trace-to-skill issue-map codex-issues.json --output codex-issue-map.md
```

Install a weekly/manual radar workflow in a repository:

```bash
trace-to-skill init --issue-map-repo owner/name --issue-map-state all --issue-map-limit 100
```

## Top Clusters

| Priority | Kind | Severity | Issues | Comments | Reactions | Example |
| ---: | --- | --- | ---: | ---: | ---: | --- |
| 2221 | `weak_evidence` | medium | 46 | 4754 | 7792 | [#14593 Burning tokens very fast](https://github.com/openai/codex/issues/14593) | |
| 1929 | `codex_token_burn` | high | 3 | 826 | 533 | [#14593 Burning tokens very fast](https://github.com/openai/codex/issues/14593) | |
| 884 | `sensitive_file_access` | high | 1 | 75 | 396 | [#2847 A way to exclude sensitive files](https://github.com/openai/codex/issues/2847) | |
| 442 | `codex_tool_call_integrity` | high | 1 | 61 | 182 | [#2998 IDE-integrated diff / approval](https://github.com/openai/codex/issues/2998) | |
| 376 | `codex_remote_compact` | high | 2 | 147 | 101 | [#14860 Error running remote compact task](https://github.com/openai/codex/issues/14860) | |
| 376 | `context_compaction` | high | 2 | 147 | 101 | [#14860 Error running remote compact task](https://github.com/openai/codex/issues/14860) | |
| 351 | `codex_terminal_output_integrity` | high | 1 | 66 | 134 | [#2558 Codex client output truncated when scrolling in Zellij](https://github.com/openai/codex/issues/2558) | |
| 261 | `premature_completion` | high | 1 | 60 | 92 | [#2448 Codex CLI: Plus users hitting usage limits extremely quickly compared to competitors](https://github.com/openai/codex/issues/2448) | |
| 247 | `codex_connectivity` | high | 2 | 192 | 14 | [#12764 The codex cli giving: 401 unauthorized](https://github.com/openai/codex/issues/12764) | |
| 181 | `codex_latest_turn_drift` | high | 1 | 58 | 53 | [#8648 Codex replies to earlier messages instead of latest one in conversations](https://github.com/openai/codex/issues/8648) | |
| 168 | `codex_resource_leak` | high | 1 | 97 | 27 | [#10432 High GPU usage (70–90%) on macOS with Codex app](https://github.com/openai/codex/issues/10432) | |
| 128 | `codex_mcp_discovery_mismatch` | high | 1 | 55 | 28 | [#6465 MCP servers not detected in Codex VS Code extension (but working in Codex CLI)](https://github.com/openai/codex/issues/6465) | |

## Suggested Next Actions

### weak_evidence

Priority score: 2221. 46 issue(s), 4754 comment(s).

Example issues:
- [#14593 Burning tokens very fast](https://github.com/openai/codex/issues/14593) (593 comments; labels: bug, rate-limits)
- [#13568 Usage dropping too quickly](https://github.com/openai/codex/issues/13568) (325 comments; labels: bug, rate-limits)
- [#10410 Codex Desktop App: macOS Intel (x86_64) support](https://github.com/openai/codex/issues/10410) (190 comments; labels: enhancement, app)

Evidence rule prompts:
- Final responses must include the exact validation evidence used to prove the change, not only a summary of intent.

### codex_token_burn

Priority score: 1929. 3 issue(s), 826 comment(s).

Example issues:
- [#14593 Burning tokens very fast](https://github.com/openai/codex/issues/14593) (593 comments; labels: bug, rate-limits)
- [#19464 Support 1M token context for GPT-5.5 in Codex](https://github.com/openai/codex/issues/19464) (132 comments; labels: enhancement, context)
- [#13186 Possible Codex usage metering anomaly on Plus (very small tasks consuming large 5h + weekly quota)](https://github.com/openai/codex/issues/13186) (101 comments; labels: bug, rate-limits, CLI)

Evidence rule prompts:
- When reporting Codex token burn, capture plan/workspace, client and version, model and reasoning/speed settings, fast-mode/large-context/subagent/review flags, recent /status and usage-dashboard deltas, local token totals including cached input/output/reasoning if available, background process ids and write_stdin poll cadence, compaction attempts and failures, retry/tool-loop counts, whether the app was idle, and a minimal reproduction with before/after usage percentages.

### sensitive_file_access

Priority score: 884. 1 issue(s), 75 comment(s).

Example issues:
- [#2847 A way to exclude sensitive files](https://github.com/openai/codex/issues/2847) (75 comments; labels: enhancement, sandbox)

Evidence rule prompts:
- Before running an agent, exclude sensitive files such as .env, private keys, package auth files, cloud credentials, local databases, and production secret manifests; share only minimal redacted excerpts when maintainer-approved.

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

- [#13568 Usage dropping too quickly](https://github.com/openai/codex/issues/13568) (325 comments; labels: bug, rate-limits)
- [#10410 Codex Desktop App: macOS Intel (x86_64) support](https://github.com/openai/codex/issues/10410) (190 comments; labels: enhancement, app)
- [#20161 Phone number verification doesn't work](https://github.com/openai/codex/issues/20161) (176 comments; labels: bug, auth)
- [#10450 Remote Development in Codex Desktop App](https://github.com/openai/codex/issues/10450) (176 comments; labels: enhancement, app)
- [#1243 "Sign in With ChatGPT" functionality needs to be robust against all account types](https://github.com/openai/codex/issues/1243) (169 comments; labels: none)
- [#11189 GPT-5.3-Codex being routed to GPT-5.2](https://github.com/openai/codex/issues/11189) (169 comments; labels: bug, CLI)
- [#23794 Codex Desktop no longer shows visible context/token usage indicator](https://github.com/openai/codex/issues/23794) (160 comments; labels: bug, context, app)
- [#14048 All models — Codex CLI hangs indefinitely on all prompts, no response generated](https://github.com/openai/codex/issues/14048) (131 comments; labels: bug, agent)
- [#2604 Subagent Support](https://github.com/openai/codex/issues/2604) (103 comments; labels: enhancement, subagent)
- [#2841 “Error starting conversation” in new Codex VS Code extension when initializing a chat](https://github.com/openai/codex/issues/2841) (90 comments; labels: bug, windows-os, extension)
- [#12564 Allow renaming task/thread titles to improve history navigation](https://github.com/openai/codex/issues/12564) (77 comments; labels: enhancement, extension)
- [#2860 Unusable on Windows due to permission ask for every shell command](https://github.com/openai/codex/issues/2860) (77 comments; labels: bug, windows-os)
