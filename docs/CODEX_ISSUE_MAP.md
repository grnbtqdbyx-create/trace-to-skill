# Codex Issue Map

This map links active OpenAI/Codex issue clusters to the deterministic `trace-to-skill` failure classes and commands that produce high-signal reports.

Use it when you want to file a concise Codex issue, deduplicate reports, or convert a private failed session into public evidence without pasting the full transcript.

## Quick Workflow

```bash
npx trace-to-skill redact ./runs --output redacted-runs
npx trace-to-skill analyze redacted-runs --format json
npx trace-to-skill codex-report redacted-runs --output openai-codex-issue.md
```

## Issue Clusters

| OpenAI/Codex issue cluster | Common signals | Finding kind | Best command |
| --- | --- | --- | --- |
| Token burn and usage drain | `tokens burning very fast`, large cached input totals, `write_stdin` empty polls, idle app usage, compaction tax, retry loops | `codex_token_burn` | `trace-to-skill codex-report ./runs` |
| Resource leaks and runaway processes | high CPU/GPU/RAM, `Code Helper`, `Codex Helper Renderer`, orphaned `shell-snapshot`, `syspolicyd`, log floods, thinking animation GPU loops | `codex_resource_leak` | `trace-to-skill codex-report ./runs` |
| Tool-call integrity and rollback failures | `apply_patch` overwrites an existing `Add File` target, unmatched `tool_call_id`, `close_agent` hangs, failed revert/undo, unsafe diff application | `codex_tool_call_integrity` | `trace-to-skill codex-report ./runs` |
| Quota mismatch | `/status` or usage page shows quota left, but runtime says `You've hit your usage limit`; account/workspace reset or cache confusion | `quota_mismatch` | `trace-to-skill codex-report ./runs` |
| Sensitive file exclusion | `.env`, private keys, `.npmrc`, cloud credentials, local databases, or production secret manifests entered agent context | `sensitive_file_access` | `trace-to-skill codex-report ./runs` |
| Context compaction failures | `Error running remote compact task`, `context_length_exceeded`, compaction loops, `responses/compact` stream disconnects | `context_compaction` | `trace-to-skill analyze ./runs` |
| Session resume and state failures | `codex resume` picker freezes, large rollout JSONL, `Could not load archived chats`, `state_5.sqlite`, `thread_goals` | `codex_session_state` | `trace-to-skill codex-report ./runs` |
| Sandbox and permission blockers | Windows sandbox setup refresh, `os error 740`, ACL/ownership drift, approval-mode mismatch | `sandbox_permission` | `trace-to-skill analyze ./runs` |
| Auth and connectivity failures | `token_exchange_failed`, `auth.openai.com/oauth/token`, missing CA certificates, proxy/TLS, IPv6, Cloudflare, stream disconnects | `codex_connectivity` | `trace-to-skill codex-report ./runs` |
| Remote-control routing failures | `Waiting for desktop`, `Directory: Unavailable`, stale listener/enrollment, `127.0.0.1:14567`, empty backend environments | `codex_remote_control` | `trace-to-skill codex-report ./runs` |
| MCP runtime failures | `user cancelled MCP tool call`, `unsupported call: mcp__...__...`, namespace/serverName loss, `Transport closed` | `codex_mcp_runtime` | `trace-to-skill codex-report ./runs` |
| Plugin runtime and bundled capability failures | Computer Use native pipe path unavailable, Browser/Computer Use settings fail, plugin/list `unknown variant 'vertical'`, stale plugin cache downgrades | `codex_plugin_runtime` | `trace-to-skill codex-report ./runs` |
| MCP config risk | filesystem/shell/browser/network/database/container access, secret-bearing env vars, broken startup inputs | `mcp_risk` | `trace-to-skill lint-agents .` |
| GitHub prompt injection | issue/PR/comment text says to ignore policy, leak secrets, hide actions, or execute attacker-controlled commands | `prompt_injection` | `trace-to-skill guard-github-event "$GITHUB_EVENT_PATH"` |

## Report Quality Checklist

- Include exact Codex app, CLI, or extension version.
- Include OS, shell/terminal, IDE, model, reasoning effort, speed mode, and subscription/workspace.
- Include the smallest redacted trace that reproduces the failure.
- Include before/after `/status` and usage dashboard state for quota or token-burn reports.
- Include process names/PIDs, CPU/GPU/RSS samples, log-loop signatures, and whether killing exact PIDs or closing the app clears resource leaks.
- Include exact tool input/output, `tool_call_id` order, affected path state, and rollback evidence for tool-call integrity failures.
- Include plugin name/version, cache path, helper path, native pipe env vars, settings/plugin-list errors, and restart behavior for plugin runtime failures.
- Include line-linked evidence rather than screenshots alone when logs are available.
- Redact tokens, API keys, emails, local home paths, customer data, and hidden Unicode before posting publicly.
- For sensitive-file reports, attach only redacted excerpts and the file path/class, not the original credential material.

## Related OpenAI/Codex Threads Used For Fixtures

- Token burn and usage drain: https://github.com/openai/codex/issues/14593, https://github.com/openai/codex/issues/13733, https://github.com/openai/codex/issues/25420, https://github.com/openai/codex/issues/19585
- Resource leaks and runaway processes: https://github.com/openai/codex/issues/16231, https://github.com/openai/codex/issues/11981, https://github.com/openai/codex/issues/16857, https://github.com/openai/codex/issues/25388
- Tool-call integrity and rollback failures: https://github.com/openai/codex/issues/25399, https://github.com/openai/codex/issues/25380, https://github.com/openai/codex/issues/25426, https://github.com/openai/codex/issues/7291
- Session state and resume failures: https://github.com/openai/codex/issues/25430, https://github.com/openai/codex/issues/25390, https://github.com/openai/codex/issues/25394, https://github.com/openai/codex/issues/25407
- MCP runtime failures: https://github.com/openai/codex/issues/16685, https://github.com/openai/codex/issues/18977, https://github.com/openai/codex/issues/24297, https://github.com/openai/codex/issues/23839
- Plugin runtime and bundled capability failures: https://github.com/openai/codex/issues/25391, https://github.com/openai/codex/issues/25418, https://github.com/openai/codex/issues/25406, https://github.com/openai/codex/issues/18258
- Sensitive file exclusion: https://github.com/openai/codex/issues/2847
- Auth/connectivity and remote-control reports are represented by the public fixtures in `fixtures/codex-connectivity.md` and `fixtures/codex-remote-control.md`.
