# Discovery Summary

This page is written for maintainers, search engines, package indexes, and AI research bots that need to understand `trace-to-skill` quickly.

## One-Sentence Summary

`trace-to-skill` checks whether a repository is Codex-ready, then turns failed AI coding-agent runs into evidence-backed `AGENTS.md` rules, `SKILL.md` workflows, privacy-safe traces, and eval gates.

## Canonical Links

- Repository: https://github.com/grnbtqdbyx-create/trace-to-skill
- npm: https://www.npmjs.com/package/trace-to-skill
- Latest release: https://github.com/grnbtqdbyx-create/trace-to-skill/releases/latest
- Use cases: https://github.com/grnbtqdbyx-create/trace-to-skill/blob/main/docs/USE_CASES.md
- Codex issue map: https://github.com/grnbtqdbyx-create/trace-to-skill/blob/main/docs/CODEX_ISSUE_MAP.md
- Scorecard: https://github.com/grnbtqdbyx-create/trace-to-skill/blob/main/docs/SCORECARD.md
- OpenAI OSS strategy: https://github.com/grnbtqdbyx-create/trace-to-skill/blob/main/docs/OPENAI_OSS_STRATEGY.md
- Zero-setup demo: https://github.com/grnbtqdbyx-create/trace-to-skill/blob/main/docs/DEMO.md

## Problems It Solves

- Codex or Claude Code claims a task is done without validation evidence.
- A coding agent repeats the same test/build/lint failure.
- A long Codex thread fails during context compaction with stream disconnects, `context_length_exceeded`, endless auto-compaction, or `unknown variant auto` errors.
- Codex cannot start tools because sandbox setup refresh, Windows `os error 740`, ACL, ownership, or approval-mode permission failures block execution.
- Codex Desktop on Windows resolves bundled `rg.exe`, `node_repl.exe`, Browser, Chrome, or Computer Use helpers through `WindowsApps`, missing `%LOCALAPPDATA%\OpenAI\Codex\bin`, broken LocalCache bins, `CodexSandboxUsers` ACL gaps, EFS/copyfile failures, or `missing-helper-path` state.
- Codex login or response streaming fails because of `token_exchange_failed`, `auth.openai.com/oauth/token`, missing CA certificates, proxy/MITM, IPv6 fallback, Cloudflare challenge, or `stream disconnected before completion`.
- Codex mobile or remote-control appears connected but routes through stale listeners, stale enrollment, incomplete helper bundles, empty backend environments, or stale Android/iOS session state.
- Codex MCP tools are visible in `tools/list` but fail at runtime because approval is cancelled, elicitation is unsupported in exec mode, namespace or `serverName` metadata is dropped, routed names become `unsupported call`, or stdio transport closes.
- Codex MCP servers work in CLI or one config scope but are absent in VS Code, Desktop, WSL, remote, project-local, or older-conversation sessions because the effective config path, `CODEX_HOME`, trust/profile state, or tool exposure differs.
- Codex terminal output or scrollback becomes unreliable because streamed lines disappear, get overwritten, truncate, duplicate, misalign, snap to the bottom, or only survive in logs/transcripts.
- Codex subagents become hard to trust because completed or closed agents remain visible, stale spawn edges stay open, child threads crowd the recent list, spawn quota is exhausted, or compaction loses prior subagent IDs.
- Codex approval flow repeatedly prompts after `Approve for this session`, forgets a safe approval scope, or forces large trusted MCP servers into noisy per-tool approval configs.
- Codex config drift makes Preferences unable to save, keeps legacy `profile` / `[profiles.*]` config after migration, pins an unavailable model, resets Speed/Fast to Standard despite persisted `service_tier`, points `default_permissions` at a missing profile, enables Windows elevated sandbox mode, or references plugin cache entries that are missing on disk.
- Codex Desktop file tree, folder icon, floating file panel, or built-in file preview disappears, goes stale, or cannot be revealed by `View > Toggle File Tree`.
- Codex resume, Desktop history rendering, archived chats, context compression, or local state migrations fail after large JSONL histories, images, tool output, stale SQLite state, short `session_index.jsonl`, or project/thread metadata drift.
- Codex model or runtime latency regresses so GPT-5.5 Fast feels like Standard, simple tasks take 10-20+ minutes, thinking stalls, or search/read/compaction phases dominate the session.
- Codex accepts a turn, finishes local tools, or leaves a Responses stream open while the UI/CLI stays on Thinking or Working with no streamed follow-up.
- Codex copy/export, long pasted prompts, or generated `Pasted text.txt` attachments break instruction, `/goal`, preview/edit, or support-report workflows.
- Codex `codex://oauth_callback`, notification clicks, browser-extension activation, mobile pairing links, or `codex app <path>` external launches fail to route back into Codex.
- Codex app connectors keep stale `link_*` authorization or discovery metadata after `401 Reauthentication required`, plugin reinstall, app restart, or cache regeneration.
- Codex usage drains unexpectedly because of background `write_stdin` polling, idle app activity, compaction/replay overhead, retry loops, subagent fan-out, fast-mode drift, or cached-token-heavy turns.
- Codex weekly or 5-hour reset anchors move unexpectedly, saved usage is lost, or `/status` and the dashboard disagree about reset timing or enforcement.
- Codex usage evidence is scattered across `/status`, dashboard notes, reset tables, usage-limit messages, and token totals, making high-signal reports hard to file.
- Codex `/compact` or auto-compaction fails against the remote `responses/compact` endpoint with stream disconnects, child-process timeout messages, provider timeout workarounds, or long-thread recovery loss.
- Codex Desktop, app-server, VS Code extension, renderer, GPU, shell snapshot, or helper processes leak local resources or keep burning CPU/GPU/RAM after the useful work should be idle.
- Codex reports `You've hit your usage limit` even though `/status` or the usage dashboard shows quota left, or quota appears shared across accounts.
- A Codex or agent trace reads, attaches, diffs, uploads, or indexes sensitive files such as `.env`, private keys, package auth files, cloud credentials, local databases, or production secret manifests.
- A maintainer wants a filename/path-only preflight report for `.env`, private keys, package auth files, cloud credentials, local databases, signing files, and secret manifests before starting an AI agent.
- A repository has conflicting `AGENTS.md`, `CLAUDE.md`, Cursor, Copilot, or Gemini instructions.
- A monorepo has nested `AGENTS.md` files, `@file.md` instruction includes, or invalid instruction-file encoding that makes Codex load the wrong policy.
- A workflow wants to feed GitHub issue, PR, comment, discussion, check-run, or commit text into an agent but needs prompt-injection checks first.
- MCP config gives agents filesystem, shell, browser, network, database, container, or secret-bearing access without a visible trust boundary.
- MCP config looks valid at a glance but has broken startup inputs, such as missing commands, bad `cwd`, placeholder env vars, unresolved `$VARS`, unresolved plugin placeholders, local stdio commands without explicit `cwd`, or the wrong JSON `mcp_servers` wrapper key.
- Codex config contains drift-prone settings such as deprecated `codex_hooks`, missing `default_permissions` profiles, or synced `projects.* trusted_level` project metadata.
- Maintainers want to share failed traces publicly without leaking common tokens, emails, home paths, or hidden Unicode controls.

## Primary Users

- open-source maintainers using Codex for PR review, issue triage, release automation, or code changes
- teams adopting `AGENTS.md` and repository-specific agent policy
- maintainers evaluating MCP tool risk before enabling coding agents
- people collecting anonymized failed agent runs for reproducible evals

## Commands To Try

```bash
npx trace-to-skill doctor .
npx trace-to-skill demo
npx trace-to-skill demo thinking-hang
npx trace-to-skill demo clipboard-attachment
npx trace-to-skill demo deeplink-launch
npx trace-to-skill demo connector-auth-cache
npx trace-to-skill demo mcp-discovery-mismatch
npx trace-to-skill demo terminal-output-integrity
npx trace-to-skill demo subagent-lifecycle
npx trace-to-skill scorecard .
npx trace-to-skill lint-agents .
npx trace-to-skill guard-github-event "$GITHUB_EVENT_PATH"
npx trace-to-skill session-audit ~/.codex --format json
npx trace-to-skill sensitive-audit . --format json
npx trace-to-skill config-audit ~/.codex --format json
npx trace-to-skill plugin-audit ~/.codex --app /Applications/Codex.app --format json
npx trace-to-skill diagnostics-bundle ~/.codex --output codex-diagnostics
npx trace-to-skill usage-evidence ./usage-notes.md --output usage-evidence.md
npx trace-to-skill redact ./runs --output redacted-runs
npx trace-to-skill analyze ./runs --format json
npx trace-to-skill codex-report ./runs --output openai-codex-issue.md
npx trace-to-skill suggest ./runs --target agents-md
```

## Outputs For Bots

- `trace-to-skill analyze --format json`
- `trace-to-skill lint-agents --format json`
- `trace-to-skill doctor --format json`
- `trace-to-skill demo --format json`
- `trace-to-skill redact --format json`
- `trace-to-skill sensitive-audit --format json`
- `trace-to-skill scorecard --format json`
- `trace-to-skill session-audit --format json`
- `trace-to-skill config-audit --format json`
- `trace-to-skill plugin-audit --format json`
- `trace-to-skill diagnostics-bundle --format json`
- `trace-to-skill usage-evidence --format json`
- SARIF from `trace-to-skill analyze --format sarif`
- OpenAI/Codex issue-ready Markdown from `trace-to-skill codex-report`
- Packaged zero-setup Codex issue-report demo from `trace-to-skill demo`
- OpenAI OSS support/application brief from `trace-to-skill oss-brief`
- Codex issue-cluster mapping in `docs/CODEX_ISSUE_MAP.md`
- GitHub Action outputs for doctor, AGENTS lint, GitHub context guard, benchmark, and scorecard modes

## Schema Contracts

- `schemas/analysis-result.schema.json`
- `schemas/agents-lint-result.schema.json`
- `schemas/doctor-result.schema.json`
- `schemas/redact-result.schema.json`
- `schemas/sensitive-audit-result.schema.json`
- `schemas/scorecard-result.schema.json`
- `schemas/oss-brief-result.schema.json`
- `schemas/patch-guard-result.schema.json`
- `schemas/config-audit-result.schema.json`
- `schemas/diagnostics-bundle-result.schema.json`
- `schemas/plugin-audit-result.schema.json`
- `schemas/session-audit-result.schema.json`
- `schemas/usage-evidence-result.schema.json`

## Related Keywords

Codex, OpenAI Codex, Codex issue report, OpenAI triage, Codex diagnostics bundle, privacy-preserving support bundle, sensitive path audit, sensitive-audit, agentignore, .agentignore, codexignore, .codexignore, aiexclude, .aiexclude, exclude sensitive files, Codex plugin audit, Computer Use unavailable, Codex Browser plugin unavailable, bundled marketplace mismatch, generated runtime marketplace, plugin manifest missing, CODEX_HOME mismatch, Codex CLI, Codex sandbox, Windows sandbox, Codex config audit, Codex config.toml, Codex global state, .codex-global-state.json, Codex Speed reset, Codex Fast resets to Standard, service_tier fast, default-service-tier priority, has-user-changed-service-tier, Codex Preferences unable to save, configVersionConflict, default_permissions missing profile, Codex Windows helper path, Codex WindowsApps, Codex rg Access Denied, Codex ripgrep, CodexSandboxUsers, LocalCache Local OpenAI Codex bin, node_repl spawn setup refresh, Codex approval friction, Approve for this session, Allow for this session, approval_policy never, MCP approval prompts, default_tools_approval_mode, Playwright MCP approvals, Chrome DevTools MCP approvals, Codex auth, token_exchange_failed, Codex connectivity, stream disconnected, Codex connector auth cache, Codex Apps stale link, codex_apps_tools, codex_app_directory, Reauthentication required, refresh token revoked, isAccessible false, link_ connector, Codex deeplink, Codex OAuth callback, codex://oauth_callback, Unable to find Electron app, Error launching app, type=click&tag, AppUserModelID, DelegateExecute, codex app path, Codex remote compact, responses/compact, /compact timeout, tcp_user_timeout, stream_idle_timeout_ms, Codex remote control, Codex mobile, Waiting for desktop, Directory Unavailable, stale listener, Codex terminal output, Codex scrollback, Codex terminal history, terminal output integrity, missing_count, missing_examples, tmux_scrollback_repro.sh, line_truncation_repro.md, Windows Terminal scrollback, transcript mode, Codex subagent lifecycle, stale subagents, close_agent, thread_spawn_edges, agent thread limit reached, agents.max_threads, list_agents, /agents, subagent child threads, fork_context, unbiased review, subagent recent conversations, Codex MCP runtime, MCP unsupported call, mcp__node_repl__js, MCP namespace serverName, MCP Transport closed, StdioServerTransport, Codex plugin runtime, Computer Use native pipe path unavailable, SKY_CUA_NATIVE_PIPE_DIRECTORY, Plugin loading failed, plugin/list unknown variant vertical, Codex Browser plugin, Codex Computer Use, Codex Chrome plugin, stale plugin cache, codex plugin add, Codex file tree, Toggle File Tree, missing folder icon, floating file panel stale, file preview fails, workspace navigation, Codex latest-turn drift, Codex replies to earlier messages, stale prompt response, ignoring latest message, previous prompt, auto compaction forgets edits, raw tool payload leak, write_stdin session_id, Codex latency regression, GPT-5.5 Fast slow, Codex too slow, thinking stalls, Codex thinking hang, Codex stuck thinking, Codex Working stuck, no streamed follow-up, first response_item delayed, responses_http time.idle, model_client.stream_responses_api, turn/start, task_started, Codex Copy as Markdown missing, Codex Pasted text.txt, Codex long pasted prompt attachment, Codex clipboard export, Codex paste as text, Codex generated attachment preview edit, Codex goal ignores attachment, pasted-text-attachments.json, fileAttachments promptRaw composer.getText, pre-first-token latency, search/read latency, runtime scheduling latency, Codex resume, Codex session audit, Codex history audit, Codex session index, session_index.jsonl, Codex session state, rollout JSONL, logs_2.sqlite, codex-tui.log, sandbox.log, thread_goals, state_5.sqlite, goals_1.sqlite, archived chats, Codex token burn, Codex usage evidence, Codex rate-limit evidence, Codex usage drain, Codex usage reset, Codex weekly reset drift, reset_at changed, deterministic reset, rate limit reset, write_stdin polling, cached input tokens, compaction tax, background process polling, Codex resource leak, Codex performance, high CPU, high GPU, shell-snapshot, Code Helper Renderer, Codex tool-call integrity, apply_patch, apply_patch Add File overwrite, patch guard, guard-patch, Add File symlink, tool_call_id, failed revert changes, patch safety, Codex quota, usage limit, rate limits, sensitive files, Codex privacy, .env, private keys, credential files, AGENTS.md, SKILL.md, Claude Code, Cursor, Copilot coding agent, Gemini CLI, MCP, Model Context Protocol, prompt injection, agent evals, AI code review, open-source maintainers, trace redaction, SARIF, GitHub Actions.

## Non-Goals

- It does not train a model.
- It does not automatically rewrite project policy.
- It does not ask maintainers to publish full private transcripts.
- It does not replace security review; it gives maintainers deterministic evidence and guardrails.
