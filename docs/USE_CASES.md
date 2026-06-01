# Use Cases

`trace-to-skill` is for maintainers who want coding agents to produce reviewable evidence instead of repeating the same mistakes.

## 1. Zero-Setup Demo

Use this before collecting or redacting private traces.

```bash
npx trace-to-skill demo
npx trace-to-skill demo --list
npx trace-to-skill demo remote-compact
npx trace-to-skill demo context-fork-bloat
npx trace-to-skill demo subagent-prompt-leakage
npx trace-to-skill demo windows-helper-path
npx trace-to-skill demo patch-overwrite
npx trace-to-skill demo latency-regression
npx trace-to-skill demo thinking-hang
npx trace-to-skill demo clipboard-attachment
npx trace-to-skill demo deeplink-launch
npx trace-to-skill demo connector-auth-cache
npx trace-to-skill demo mcp-discovery-mismatch
npx trace-to-skill demo mcp-streamable-http
npx trace-to-skill demo hooks-runtime
npx trace-to-skill demo terminal-output-integrity
npx trace-to-skill demo subagent-lifecycle
npx trace-to-skill sensitive-audit .
npx trace-to-skill sensitive-audit . --format ignore --ignore-target codexignore --output .codexignore.generated
npx trace-to-skill lsp-audit .
```

What it proves:

- packaged fixtures can produce a real Codex issue report immediately
- maintainers can inspect the output shape before sharing any private log
- demos cover remote compact failures, context fork bloat, subagent prompt leakage, Windows helper path failures, patch overwrite safety, approval friction, latency, Thinking hangs, clipboard/attachment regressions, deeplink/OAuth launch regressions, connector auth-cache regressions, MCP discovery/config-scope mismatches, Streamable HTTP MCP parse/handshake failures, hooks runtime failures, terminal output/scrollback integrity, subagent lifecycle drift, token burn, sensitive files, and prompt injection
- `sensitive-audit` scans filenames and paths before an agent run, without reading file contents, so teams can build `.agentignore`, `.aiexclude`, `.codexignore`, `.gitignore`, or sandbox permission profiles from a concrete repo report
- `lsp-audit` scans repo language signals and PATH availability so teams know which language servers are ready before asking Codex for symbol-aware edits

See the generated demo output in [docs/DEMO.md](DEMO.md).

## 2. Codex Readiness Gate

Use this when a repository wants Codex-assisted pull requests, but maintainers need proof that the repo has basic guardrails.

```bash
npx trace-to-skill scorecard .
```

What it proves:

- repository instructions exist
- CI and validation scripts are present
- maintainer docs and license are visible
- distribution is easy to try
- benchmark fixtures still catch known agent failure classes

Recommended CI surface:

```yaml
- uses: grnbtqdbyx-create/trace-to-skill@v0.1.83
  with:
    mode: all
    doctor-threshold: "85"
    doctor-comment: "true"
    scorecard-comment: "true"
    job-summary: "true"
    github-token: ${{ github.token }}
```

## 3. AGENTS.md And MCP Hygiene

Use this before giving Codex broad repository access.

```bash
npx trace-to-skill lint-agents .
```

This checks:

- whether repository-level agent instructions exist
- whether `AGENTS.md`, `CLAUDE.md`, Cursor rules, Copilot instructions, or other tool guidance conflict
- whether instruction files reference paths that no longer exist or have grown large enough to risk ignored guidance
- whether `@file.md` include references are missing, nested `AGENTS.md` files are easy to miss, or instruction files contain invalid UTF-8
- whether MCP config hints at risky capabilities such as filesystem, shell, browser, network, database, container, or secret-bearing environment variables
- whether JSON or `.codex/config.toml` MCP startup inputs are obviously broken before launch, including wrong JSON `mcp_servers` casing, missing commands, missing `cwd`, placeholder env values, unresolved `$VARS`, unresolved plugin placeholders, or local stdio commands without explicit `cwd`
- whether Codex config has drift-prone settings such as deprecated `codex_hooks`, missing `default_permissions` profile definitions, or synced `projects.* trusted_level` metadata

The goal is not to ban powerful tools. The goal is to make trust boundaries visible before an agent acts.

## 4. Language-Server Readiness Before Agent Edits

Use this when a repo wants Codex to navigate definitions, references, diagnostics, or rename/refactor flows, but language-server setup differs across machines.

```bash
npx trace-to-skill lsp-audit . --format json
npx trace-to-skill lsp-audit . --output lsp-readiness.md
```

What it proves:

- which languages were detected from manifests and source files
- whether matching LSP commands such as `typescript-language-server`, `pyright-langserver`, `gopls`, `rust-analyzer`, `sourcekit-lsp`, `jdtls`, `clangd`, `ruby-lsp`, `intelephense`, or `csharp-ls` are on `PATH`
- exact install hints and evidence files to document in `AGENTS.md`, CI, devcontainers, or setup scripts
- a stable JSON shape that bots can use before proposing symbol-aware edits

It does not auto-install anything or grant new permissions; it is a readiness report.

## 5. Sandbox And Permission Failure Triage

Use this when Codex cannot start tools, apply patches, or write to the workspace because sandbox setup or permissions fail.

```bash
npx trace-to-skill analyze ./runs --format json
npx trace-to-skill config-audit ~/.codex --format json
npx trace-to-skill plugin-audit ~/.codex --app /Applications/Codex.app --format json
npx trace-to-skill diagnostics-bundle ~/.codex --output codex-diagnostics
```

This catches signals such as Windows sandbox setup refresh failures, `os error 740`, `CodexSandboxOffline` ownership drift, ACL denial, approval-policy mismatch, and Full Access sessions behaving like workspace-write or on-request mode.

`config-audit` is local and read-only: it summarizes legacy `profile` / `[profiles.*]` config, model pins, Speed/Fast persistence drift between `config.toml` and `.codex-global-state.json`, `sandbox_mode`, `approval_policy`, `[windows].sandbox`, missing `default_permissions` profiles, deprecated `codex_hooks`, machine-local project trust entries, enabled plugins with missing cache directories, and large per-tool MCP approval configs.

For Codex App reports where Speed resets from Fast to Standard after restart, include the `service_tier`, `config default-service-tier`, `global default-service-tier`, `global has-user-changed-service-tier`, and `service_tier_persistence_drift` fields instead of pasting the raw state file.

`plugin-audit` is local and read-only: it summarizes configured bundled plugins, cache directories, plugin manifests, generated runtime marketplaces, optional app-bundle marketplaces, Computer Use helper-app install state, `CODEX_HOME` mismatch, and unsupported feature flags.

`diagnostics-bundle` combines the config, plugin, and session summaries into a metadata-only support folder with a manifest and README. Use it when OpenAI asks for more evidence but raw `config.toml`, SQLite state, rollout JSONL, and local logs should not be posted publicly.

## 6. Codex Auth And Connectivity Triage

Use this when Codex cannot log in, exchange an auth token, stream a response, or connect through a container, proxy, VPN, corporate CA, IPv6 network, or Cloudflare challenge.

```bash
npx trace-to-skill analyze ./runs --format json
```

This catches signals such as `token_exchange_failed`, `auth.openai.com/oauth/token`, `codex_login::server`, `cf-mitigated: challenge`, missing `ca-certificates`, `update-ca-certificates`, `CODEX_CA_CERTIFICATE`, IPv6 fallback evidence, proxy/MITM TLS failures, and `stream disconnected before completion` on `chatgpt.com/backend-api/codex/responses`.

## 7. Codex Remote Compact Failure Triage

Use this when `/compact` or auto-compaction fails during a long Codex session and the user cannot continue without recreating context.

```bash
npx trace-to-skill codex-report ./runs --output openai-codex-compact-issue.md
```

This catches signals such as `Error running remote compact task`, `timeout waiting for child process to exit`, `stream disconnected before completion`, `responses/compact`, `tcp_user_timeout`, `stream_idle_timeout_ms`, provider-id timeout workarounds, Azure provider config drift, and long-running tasks broken by failed compaction.

## 8. Codex Context Fork Bloat Evidence

Use this when a conversation fork carries duplicate parent context, inflates token counts, or breaks prompt-cache lineage before new work happens.

```bash
npx trace-to-skill demo context-fork-bloat
npx trace-to-skill analyze ./runs --format json
npx trace-to-skill codex-report ./runs --output openai-codex-context-fork-bloat.md
```

This catches signals such as forked conversations carrying the full parent transcript twice, repeated parent turns after a fork boundary, `input_tokens` or `cached_input_tokens` jumping after a short follow-up, `prompt_cache_key` changing despite mostly identical inherited content, cache hit rate drops, duplicated tool transcript blocks, and `fork_context` subagent history being duplicated into child context.

Include Codex app/CLI/extension version, surface, model, fork source thread id, forked thread id, fork action timestamp, fork boundary marker, `input_tokens` and `cached_input_tokens` before and after the fork, `prompt_cache_key` before and after, cache hit rate, duplicated parent-turn or tool-transcript examples with line ids, whether new files were read before the token jump, compaction state, subagent or `fork_context` history, minimal reproduction steps, and whether a fresh thread or non-fork continuation avoids the bloat.

## 9. Codex Subagent Prompt Leakage Evidence

Use this when `spawn_agent` child tasks are not isolated, especially with `fork_turns: "none"` or same-turn parallel subagent spawning.

```bash
npx trace-to-skill demo subagent-prompt-leakage
npx trace-to-skill analyze ./runs --format json
npx trace-to-skill codex-report ./runs --output openai-codex-subagent-prompt-leakage.md
```

This catches signals such as delegated `spawn_agent` messages recorded as assistant/commentary JSON envelopes, child rollout lines containing `recipient` or `trigger_turn`, same-turn `multi_tool_use.parallel` child prompts leaking into sibling child rollouts, generic workspace acknowledgements instead of assigned outputs, unexpected child tool calls from leaked sibling prompts, and `wait_agent` or `close_agent` reporting completion despite the wrong task.

Include Codex Desktop/app/CLI version, MultiAgentV2 state, OS, model, parent thread id, child thread ids, exact `spawn_agent` arguments, `fork_turns`, role/profile, whether `multi_tool_use.parallel` or same-turn parallel spawning was used, redacted child rollout line order, first user/task message, assistant/commentary envelope lines, sibling prompt excerpts, `wait_agent` and `close_agent` results, unexpected child tool calls, and sequential single-child versus parallel-child controls.

## 10. Codex Usage Evidence Packaging

Use this when a Codex usage issue has scattered evidence across `/status`, dashboard notes, reset tables, token totals, prompt-cache rows, cached input, and local overhead clues.

```bash
npx trace-to-skill usage-evidence ./usage-notes.md --output usage-evidence.md
npx trace-to-skill usage-evidence ./usage-notes.md --format json
```

This turns Markdown polling tables, CSV-like rows, JSON/JSONL snapshots, `reset_at` values, usage-limit errors, rapid drain experiment notes like `1% in 4 minutes`, `22 credits`, or `70% weekly in a day`, prompt-cache rows with `input_tokens`, `cached_input_tokens` / `cached_tokens`, `prompt_cache_key`, response ids, websocket/reconnect notes, `Token usage: total=... cached` lines, `write_stdin` polling, compaction loops, retry/tool loops, subagent fan-out, and idle-drain notes into a single report with a usage receipt.

The receipt separates:

- backend quota-window percentage evidence
- local token totals, including cached input and reasoning
- prompt-cache records and adjacent cache-collapse events
- bounded rapid-drain experiment rows with model, plan, prompt count, elapsed time, percent, and credits when present
- orchestration-overhead signals that may burn usage without accepted work
- suspected cause buckets to keep public reports comparable

## 11. Codex Windows Helper Path Triage

Use this when Codex Desktop on Windows discovers bundled tools or plugin helpers but cannot execute them from the integrated terminal, tool runner, Browser, Chrome, Computer Use, or node_repl path.

```bash
npx trace-to-skill codex-report ./runs --output openai-codex-windows-helper-issue.md
```

This catches signals such as `Program 'rg.exe' failed to run`, `Access is denied`, `WindowsApps\OpenAI.Codex...\app\resources`, missing `%LOCALAPPDATA%\OpenAI\Codex\bin`, missing MSIX LocalCache helper bins, `CodexSandboxUsers` ACL/RX problems, `copyfile` failures from WindowsApps bundled plugin manifests, EFS/Application Protected attributes, `windows sandbox failed: spawn setup refresh`, `missing-helper-path`, and unavailable Browser/Chrome/Computer Use plugin helpers.

## 12. Codex Mobile And Remote-Control Route Health

Use this when Codex mobile, SSH remote, or desktop remote-control says it is connected but commands do not reach the expected host, workspace, or app-server.

```bash
npx trace-to-skill analyze ./runs --format json
```

This catches signals such as `Waiting for desktop`, `Directory: Unavailable`, stale `server_name` enrollment, stale remote-control listener, `127.0.0.1:14567`, missing cached helper files such as `codex-windows-sandbox-setup.exe` or `codex-command-runner.exe`, empty backend environments, stale Android session lists, and temporary recovery after re-pairing or listener restart.

## 13. Codex Terminal Output And Scrollback Integrity

Use this when Codex terminal output, streamed assistant text, or scrollback becomes untrustworthy even though raw logs, transcripts, or transaction views still contain the missing lines.

```bash
npx trace-to-skill demo terminal-output-integrity
npx trace-to-skill analyze ./runs --format json
npx trace-to-skill codex-report ./runs --output openai-codex-terminal-output.md
```

This catches signals such as Windows Terminal scrollback lines disappearing, streamed output overwriting older visible transcript lines, numbered-line harness output with `missing_count`, `S-0391`, or `missing_examples`, `tmux_scrollback_repro.sh`, viewport snaps to the bottom during planner/approval flows, and transcript mode failing to recover earlier output.

Include the Codex CLI/app/extension version, OS, shell, terminal emulator and version, WSL/SSH/tmux/Zellij state, model, whether streaming was active, exact scroll action, terminal dimensions and scrollback settings, first missing or duplicated line id, raw log/transcript proof, terminal capture, numbered-line harness output, control run, `/resume` or transcript recovery behavior, and whether another terminal or downgrade changes the result.

## 14. Codex Subagent Lifecycle And State Reconciliation

Use this when subagents appear completed, closed, stale, or interrupted but Codex cannot reconcile UI state, live handles, persisted spawn edges, parent discoverability, and active spawn quota.

```bash
npx trace-to-skill demo subagent-lifecycle
npx trace-to-skill analyze ./runs --format json
npx trace-to-skill codex-report ./runs --output openai-codex-subagents.md
```

This catches signals such as completed subagents remaining visible in the Subagents panel, `close_agent` returning `not_found` or hanging, `thread_spawn_edges` rows staying open, `agent thread limit reached`, child subagent threads showing as top-level recent conversations, and compaction losing the prior subagent id so the parent forks the main session instead of resuming an unbiased reviewer.

Include Codex app/CLI/extension version, OS, surface, model, subscription/workspace, root thread id, subagent ids/nicknames/roles, spawn/close/list commands, `close_agent` results, `list_agents` or `/agents` output, `thread_spawn_edges` status counts, `agents.max_threads` or registry quota evidence, recent-list/sidebar behavior, child-thread archive/top-level status, last-progress or halt reason, MCP server state, compaction/resume timing, redacted UI evidence, restart/reload behavior, and whether stale agents are UI-only or still block spawns.

## 15. Codex MCP Runtime Triage

Use this when MCP tools are configured and visible, but Codex cannot actually call them at runtime.

```bash
npx trace-to-skill analyze ./runs --format json
npx trace-to-skill config-audit ~/.codex --format json
```

This catches signals such as `user cancelled MCP tool call`, `request_user_input is not supported in exec mode`, `Approve app tool call?`, `tool_call_mcp_elicitation`, routed callable names like `mcp__node_repl__js` becoming `unsupported call`, deferred discovery dropping namespace or `serverName`, `tools/list` succeeding while Codex routing fails, and stdio transport lifecycle failures such as `Transport closed`, `stdin_end`, `stdin_close`, `transport_close`, or stderr backpressure.

## 16. Codex Resume And Session State Triage

Use this when long Codex sessions become difficult to resume, Desktop history rendering gets sluggish, or local state migrations break goals/projects/history.

```bash
npx trace-to-skill analyze ./runs --format json
npx trace-to-skill session-audit ~/.codex --format json
npx trace-to-skill plugin-audit ~/.codex --app /Applications/Codex.app --format json
npx trace-to-skill diagnostics-bundle ~/.codex --output codex-diagnostics
```

This catches signals such as `codex resume` picker hangs, `codex resume <id>` working while the picker freezes, project pages/search/sidebar hiding threads that still exist on disk, transcript-like `session_index.jsonl` titles that can poison sidebar/search caches, large `rollout-*.jsonl` histories, high JSONL line and `response_item` / `event_msg` / `function_call` counts, large `input_image` payloads, slow `thread/resume` and `thread/goal/get` timings, `Could not load archived chats`, resume compression dropping the last 3-5 turns, `state_5.sqlite` / `goals_1.sqlite` migration mismatches, `no such table: thread_goals`, stale `projectless-thread-ids`, and `thread-workspace-root-hints` reverting after restart.

`session-audit` is local and read-only: it reports rollout JSONL size, line count, largest line size, parse errors, session index line count, title byte/signal counts, subagent lifecycle signal counts, state-file presence, recoverable thread ids, `codex resume <id>` commands, and common session signals so users can attach a privacy-preserving summary to OpenAI/Codex issues instead of posting transcripts. Full workspace paths are not printed in the thread table; related projects are grouped by basename plus a short path hash.

For mixed resume, crash, config, plugin, or history issues, `diagnostics-bundle` writes the session, config, and plugin reports together with a checklist of files not to attach publicly.

## 17. Codex File Tree UI Evidence

Use this when Codex Desktop cannot reveal project files through the native file tree, folder icon, floating file panel, or built-in preview.

```bash
npx trace-to-skill analyze ./runs --format json
npx trace-to-skill codex-report ./runs --output openai-codex-issue.md
```

This catches signals such as `View > Toggle File Tree` doing nothing, `Cmd+Shift+E` or `Ctrl+Shift+E` having no visible effect, the folder icon disappearing, the floating file panel showing stale or unclickable entries after add/rename/delete operations, and `.doc`, `.pdf`, or `.ppt` previews failing until restart.

## 18. Codex Token Burn Attribution

Use this when Codex usage drains faster than expected and the trace needs to separate useful model work from orchestration overhead.

```bash
npx trace-to-skill analyze ./runs --format json
npx trace-to-skill codex-report ./runs --output openai-codex-issue.md
```

This catches signals such as tokens `burning very fast`, usage dropping by visible percentages after one or two prompts, weekly allowance depletion, 5-hour usage reaching 0%, large `input` plus `cached input` totals, `input_tokens` / `cached_input_tokens` / `prompt_cache_key` rows that show cache collapse, `write_stdin` empty polling, background commands repeatedly reporting no new output, idle app usage, compaction tax, retry/tool loops, and missing attribution between normal turns, compaction, background polling, subagents, and retries.

For public reports, prefer `usage-evidence` first so the quota-window, local-token, and orchestration-overhead layers are visible separately.

## 19. Usage Reset Drift Evidence

Use this when Codex reset timing changes unexpectedly or users lose the ability to plan paid usage.

```bash
npx trace-to-skill analyze ./runs --format json
npx trace-to-skill codex-report ./runs --output openai-codex-issue.md
```

This catches signals such as weekly reset dates moving from one date to another, `reset_at` jumping after the first prompt, saved weekly usage being wiped or pushed into the next window, outage compensation resets changing the anchor, `/status` and dashboard disagreement, and requests for deterministic reset schedules or rollover of unused prior-window usage.

## 20. Quota And Usage-Limit Evidence

Use this when Codex blocks a prompt with a usage-limit message but another surface still shows remaining quota.

```bash
npx trace-to-skill analyze ./runs --format json
```

This catches traces where `/status` or the usage page shows remaining 5h or weekly quota, accounts appear to share limits unexpectedly, a Team account inherits a Plus account's limit state, or quota reset times jump after logout/login.

## 21. Codex Resource Leak Evidence

Use this when Codex Desktop, the VS Code extension, renderer, app-server, GPU process, shell snapshot, or helper process keeps burning local resources after the useful work should be idle.

```bash
npx trace-to-skill analyze ./runs --format json
npx trace-to-skill codex-report ./runs --output openai-codex-issue.md
```

This catches signals such as high `Code Helper (Renderer)` or `Code Helper (Plugin)` CPU, `Codex Helper Renderer`, `Codex app-server`, `syspolicyd`, `zygote`, `WindowServer`, orphaned `shell-snapshot` subprocesses, `.codex/shell_snapshots`, `chat_processes.json`, repeated `thread-stream-state-changed`, `worker_rpc_response_error`, thinking/shimmer GPU loops, and non-Git workspace CPU runaways.

Include process names/PIDs, CPU/GPU/RSS samples over time, log-loop snippets, workspace Git-root state, animation/reduce-motion state, and whether closing the panel/app, killing exact PIDs, `git init`, rollback, or restart clears the leak.

For process-only reports, run:

```bash
npx trace-to-skill process-audit ./process-notes.md --output process-audit.md
npx trace-to-skill process-audit ./process-notes.md --format json
```

`process-audit` packages Task Manager, System Informer, `Get-CimInstance`, `ps`, `top`, or handwritten process measurement snippets into a smaller public report. It detects PowerShell/pwsh CIM polling such as `Get-CimInstance Win32_Process`, high-CPU Codex/helper/renderer samples, stale `process_manager/chat_processes.json` mentions, and runaway helper signals without inspecting live processes or asking users to post full raw process dumps.

## 22. Codex Thinking Hang Evidence

Use this when Codex accepts a prompt, finishes a local tool call, or keeps a Responses stream open but the UI/CLI remains on Thinking or Working with no visible assistant follow-up.

```bash
npx trace-to-skill demo thinking-hang
npx trace-to-skill analyze ./runs --format json
npx trace-to-skill codex-report ./runs --output openai-codex-thinking-hang.md
```

This catches signals such as `turn/start`, `task_started`, a completed local tool result, a long gap before the first `response_item`, `model_client.stream_responses_api` close lines where `time.busy` is only milliseconds but `time.idle` is hundreds of seconds, Stop/Ctrl+C failing to interrupt, subagent parent threads staying stuck while a child is active, and minimal `config.toml` without MCPs changing the behavior.

Include the Codex version, OS, model and reasoning/speed settings, turn or thread id, prompt timestamp, last successful tool output, first `response_item` timestamp, `responses_http` or websocket transport evidence, `time.busy` / `time.idle`, MCP/subagent state, stop/interrupt behavior, and whether a new thread or minimal config recovers.

## 23. Codex Clipboard And Pasted-Text Attachment Evidence

Use this when copy/export, long pasted prompts, or generated `Pasted text.txt` attachments break Codex prompt, `/goal`, or support-report workflows.

```bash
npx trace-to-skill demo clipboard-attachment
npx trace-to-skill analyze ./runs --format json
npx trace-to-skill codex-report ./runs --output openai-codex-clipboard-attachment.md
```

This catches signals such as `Copy as Markdown` disappearing from the Copy menu, long structured prompts being auto-converted into `.txt` attachments, `Pasted text.txt` not previewing or editing inside Codex, `/goal` reading only visible editor text while ignoring fileAttachments, and generated pasted-text files existing on disk with non-zero sizes.

Include app version, OS, surface, exact copy menu items, source text size, paste action, visible editor text, generated attachment name/path/size, `pasted-text-attachments.json` or fileAttachments metadata, command path such as `/goal`, preview/edit/revert actions tried, clipboard payload format, and whether paste-as-text, opt-out, explicit file reference, or downgrade changes behavior.

## 24. Codex Deeplink And External Launch Evidence

Use this when OAuth callbacks, notification clicks, browser extension activation, mobile pairing, or CLI app-open commands fail to route back into Codex.

```bash
npx trace-to-skill demo deeplink-launch
npx trace-to-skill analyze ./runs --format json
npx trace-to-skill codex-report ./runs --output openai-codex-deeplink-launch.md
```

This catches signals such as `codex://oauth_callback?code=...` opening an Electron error, callback payloads being treated as `app\oauth_callback?code=...`, Windows toast `type=click&tag=...` activation becoming an app path, AppX/MSIX protocol registration mismatches, browser-extension activation arguments being misrouted, mobile QR/deeplink setup staying on `Waiting for desktop`, and `codex app .` focusing the app without switching workspace or opening a thread.

Include app/CLI/extension version, OS/build, install source, package id/path, affected surface, exact redacted URI shape, browser and connector/plugin name, error dialog text, whether the app was already running, AppX/MSIX evidence such as AppUserModelID and DelegateExecute, HKCU/HKCR `codex` keys, command-line arguments, repair/reinstall/re-register attempts, and whether manual `codex://test` or `Start-Process` reproduces.

## 25. Codex App Connector Auth Cache Evidence

Use this when Codex app connectors appear installed but keep stale auth or discovery metadata after a reauth-required response.

```bash
npx trace-to-skill demo connector-auth-cache
npx trace-to-skill analyze ./runs --format json
npx trace-to-skill codex-report ./runs --output openai-codex-connector-auth-cache.md
```

This catches signals such as `401: "Server returned 401: 'Reauthentication required'"`, `refresh token was revoked` during an active session, `mcp__codex_apps__linear.*` still using stale Codex Apps tools, unchanged `link_*` ids after cache regeneration, `isAccessible: false` in app-directory metadata, restart/remove/re-add not fixing auth, ChatGPT app pages still showing `Connect`, and external MCP workarounds succeeding while bundled Codex Apps connectors remain broken.

Include app/CLI version, OS, connector/plugin name and id, installed plugin root, exact tool name, redacted `codex_apps_tools` and `codex_app_directory` metadata, `link_*` id before/after reconnect, `isAccessible` state, restart/remove/re-add/cache-clear/sign-in attempts, ChatGPT app page state, and whether an external MCP workaround succeeds.

## 26. Codex MCP Discovery And Config Scope Evidence

Use this when MCP servers work in Codex CLI or one config scope but are missing in VS Code, Desktop, WSL, remote sessions, project-local config, or an older conversation.

```bash
npx trace-to-skill demo mcp-discovery-mismatch
npx trace-to-skill analyze ./runs --format json
npx trace-to-skill codex-report ./runs --output openai-codex-mcp-discovery.md
```

This catches signals such as `MCP servers not detected in Codex VS Code extension (but working in Codex CLI)`, `list_mcp_resources remains empty`, missing `mcp__*` tools, project `.codex/config.toml` ignored while `~/.codex/config.toml` works, `codex mcp get <server>` returning `No MCP server named`, WSL opening the Windows-hosted `config.toml`, `CODEX_HOME` mismatch, and tool exposure changing after restart, reload, or new conversation.

Include app/CLI/extension version, OS, IDE, remote/WSL/SSH state, workspace root, effective `CODEX_HOME`, all config files considered (`~/.codex/config.toml`, project `.codex/config.toml`, `.vscode/mcp.json`, `.mcp.json`), redacted MCP sections, trust/profile/default-permissions state, `codex mcp list`, `codex mcp get <server>`, CLI-versus-Desktop/VS Code comparison, loaded config path/log lines, whether moving the same server to user-global config fixes it, and whether the current session exposes `mcp__*` tools.

## 27. Codex Streamable HTTP MCP Evidence

Use this when a Streamable HTTP or SSE MCP server is reachable but Codex fails during JSON-RPC parsing, handshake, auth gating, stale session reuse, or reconnect.

```bash
npx trace-to-skill demo mcp-streamable-http
npx trace-to-skill analyze ./runs --format json
npx trace-to-skill codex-report ./runs --output openai-codex-mcp-streamable-http.md
```

This catches signals such as Penpot `JsonRpcMessage deserialize` or response-parse failures, `Content-Type: text/event-stream` framing problems, n8n `initialize` followed by `Transport closed`, DingTalk OAuth/login gates that do not match config expectations, stale `streamable-http` session ids after server restart, missing header/User-Agent requirements, and recovery only after restarting Codex.

Include Codex version, MCP server name, transport URL without secrets, initialize/tools/list/tools/call results, HTTP status, `Content-Type`, SSE event framing, JSON-RPC message shape, session id before and after reconnect or server restart, auth/OAuth expectations, User-Agent/header requirements, exact parse/deserialize error, whether curl or another MCP client succeeds, and whether restarting Codex or reinitializing the transport recovers.

## 28. Codex Hooks Runtime Evidence

Use this when Codex hooks duplicate, stop firing, emit stale deprecation warnings, behave differently across CLI/Desktop/Code Mode/Windows, or become hard to inspect in settings.

```bash
npx trace-to-skill demo hooks-runtime
npx trace-to-skill analyze ./runs --format json
npx trace-to-skill codex-report ./runs --output openai-codex-hooks-runtime.md
```

This catches signals such as duplicate Hooks entries for one tool call, `PostToolUse` running twice, false `codex_hooks` deprecation warnings while `[features].hooks` is enabled, `SessionStart` or `PostToolUse` stopping after rate limits, live `hooks.json` edits or auto-restore, Windows `command_execution` skipping `PreToolUse`, Code Mode `exec` surface gaps, plugin/global hook scope mismatches, and Hooks settings pages that show generic Hook N rows or cannot scroll.

Include Codex app/CLI/extension version, OS, surface, shell or Desktop route, `[features].hooks` and `hooks.json` snippets without secrets, hook event type, matcher, handler command/name, expected versus observed fire count, duplicate event ids, exact deprecation warning, trust state, live-edit/rate-limit/auto-restore timing, Code Mode `exec` versus normal CLI comparison, linked-worktree cwd, Hooks settings UI screenshot if relevant, and whether restart/reload/new session restores behavior.

## 29. Patch Overwrite Guard

Use this before applying a generated patch when you want create/update/delete semantics checked against the actual workspace.

```bash
npx trace-to-skill guard-patch ./change.patch --root .
npx trace-to-skill guard-patch ./change.patch --root . --format json
```

This fails closed when `*** Add File` targets an existing file or symlink, `*** Update File` or `*** Delete File` targets a missing file, or `*** Move to` would overwrite an existing destination. It directly addresses Codex `apply_patch` reports where an add/create operation silently replaced existing contents.

For a public demo report:

```bash
npx trace-to-skill demo patch-overwrite
```

## 30. Sensitive Path Preflight Before Agent Runs

Use this before giving an AI coding agent a repository.

```bash
npx trace-to-skill sensitive-audit . --format json
npx trace-to-skill sensitive-audit . --output sensitive-paths.md
npx trace-to-skill sensitive-audit . --format ignore --ignore-target agentignore --output .agentignore.generated
npx trace-to-skill sensitive-audit . --format ignore --ignore-target codexignore --output .codexignore.generated
```

This finds sensitive-looking paths such as `.env`, `.env.*`, `.npmrc`, `.pypirc`, `.aws/**`, `.ssh/**`, `.kube/**`, `.docker/**`, private keys, certificates, local databases, mobile signing files, and secret manifests without reading file contents or following symlink targets.

The output includes a stable JSON schema plus recommended exclude globs that can seed `.agentignore`, `.aiexclude`, `.codexignore`, `.gitignore`, local sandbox permission profiles, or team security review checklists. `--format ignore` renders a reviewable generated file candidate and still does not mutate the repo. It is a preflight report, not a sandbox boundary.

## 31. Workspace Checkpoint Before Agent Runs

Use this before giving Codex, Claude, Cursor, or another coding agent a dirty repository where untracked local work matters.

```bash
npx trace-to-skill checkpoint . --output .trace-to-skill/checkpoints/before-codex
npx trace-to-skill checkpoint . --format json
```

This writes a local checkpoint bundle with `status.txt`, staged and unstaged binary diffs, a `manifest.json`, restore notes, and copied blobs for changed or untracked files. It is intentionally conservative: it does not auto-restore files and does not run destructive commands. Gitignored files are excluded by default; use `--include-ignored` only when you intentionally need local-only files such as `.env`, and keep that bundle private.

This is useful for OpenAI/Codex `/undo` and `/rewind` discussions where users need workspace protection beyond conversation rewind, especially when untracked files are outside normal commit history.

## 32. OpenAI Codex Issue Report

Use this when you want to file or update an OpenAI/Codex issue with a concise, evidence-backed report instead of pasting a full transcript.

```bash
npx trace-to-skill redact ./runs --output redacted-runs
npx trace-to-skill codex-report redacted-runs --output openai-codex-issue.md
```

The report includes the likely Codex failure class, line-linked evidence, diagnostics to attach, and a privacy checklist. This is useful for issues about auth/connectivity, sandbox setup, remote-control routing, MCP runtime calls, resume/session-state failures, quota mismatches, usage reset drift, and context compaction.

For a cluster-to-command map of current Codex issue patterns, see [CODEX_ISSUE_MAP.md](CODEX_ISSUE_MAP.md).

## 33. Sensitive File Access Evidence

Use this when a trace suggests an agent read, attached, uploaded, diffed, or indexed credential-bearing files.

```bash
npx trace-to-skill analyze ./runs --format json
npx trace-to-skill codex-report ./runs --output openai-codex-issue.md
```

This catches signals such as `.env`, `.env.production`, `.npmrc`, `.pypirc`, `.netrc`, `.aws/credentials`, `.kube/config`, `.docker/config.json`, private-key PEM blocks, `.sqlite`, `.db`, `secrets.yaml`, and production secret manifests entering agent context.

Before publishing evidence, run `trace-to-skill redact` and attach only redacted excerpts plus the file path/class.

## 34. GitHub Context Guard

Use this before an agent reads untrusted GitHub text.

```bash
npx trace-to-skill guard-github-event "$GITHUB_EVENT_PATH"
```

This scans pull request bodies, issue text, comments, discussions, review text, check-run messages, and commit messages for prompt-injection patterns.

Use it when:

- a workflow lets an agent summarize or act on PR comments
- maintainers paste issue text into Codex
- a bot asks Codex to triage untrusted user reports
- logs or comments might contain instructions like "ignore previous instructions" or "print secrets"

## 35. Failed Agent Run To Reviewable Rule

Use this when a coding agent made a repeated workflow mistake.

```bash
npx trace-to-skill analyze ./runs --output agent-learning-report.md
npx trace-to-skill suggest ./runs --target agents-md --output AGENTS.generated.md
npx trace-to-skill eval ./runs --threshold 80
```

Recommended maintainer loop:

1. Store a short redacted trace in `runs/`.
2. Run `analyze` to classify the failure.
3. Run `suggest` to generate candidate `AGENTS.md` or `SKILL.md` text.
4. Copy only evidence-backed rules into the real policy file.
5. Run `eval` or `scorecard` in CI so the same failure does not silently return.

## 36. Privacy-Preserving Adoption

Use this when you want public evidence without leaking private traces.

```bash
npx trace-to-skill redact ./runs --output redacted-runs
npx trace-to-skill analyze ./runs --format json
npx trace-to-skill analyze ./runs --format sarif --output trace-to-skill.sarif
```

Before publishing traces:

- redact secrets, cookies, customer data, and proprietary code
- keep only the lines needed to explain the failure
- treat issue bodies, PR comments, copied logs, and web pages as untrusted input
- prefer short fixtures that reproduce a detector over full transcripts

## Why This Helps Open Source Maintainers

The useful unit is not "an agent wrote code." The useful unit is:

```text
maintainer-visible failure -> evidence-backed rule -> repeatable gate
```

That is the path from ad-hoc AI usage to safer Codex-assisted maintenance.
