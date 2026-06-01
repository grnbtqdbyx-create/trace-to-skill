# trace-to-skill

[![CI](https://github.com/grnbtqdbyx-create/trace-to-skill/actions/workflows/ci.yml/badge.svg)](https://github.com/grnbtqdbyx-create/trace-to-skill/actions/workflows/ci.yml)
[![Codex Readiness](https://github.com/grnbtqdbyx-create/trace-to-skill/actions/workflows/codex-readiness.yml/badge.svg)](https://github.com/grnbtqdbyx-create/trace-to-skill/actions/workflows/codex-readiness.yml)
[![Release](https://img.shields.io/github/v/release/grnbtqdbyx-create/trace-to-skill)](https://github.com/grnbtqdbyx-create/trace-to-skill/releases)
[![npm](https://img.shields.io/npm/v/trace-to-skill)](https://www.npmjs.com/package/trace-to-skill)
[![npm downloads](https://img.shields.io/npm/dm/trace-to-skill)](https://www.npmjs.com/package/trace-to-skill)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-339933.svg)](package.json)

Codex Issue Radar and maintainer-readiness tooling for open-source projects using AI coding agents.

`trace-to-skill` turns live GitHub issue demand, failed Codex/agent runs, and repository readiness checks into evidence-backed reports, `AGENTS.md` rules, `SKILL.md` workflows, and CI gates.

## Start Here

Run a live Codex issue radar:

```bash
npx trace-to-skill issue-map --repo openai/codex --state all --limit 100 --output codex-issue-radar.md
```

Install a weekly radar in any repository:

```bash
npx trace-to-skill init --issue-map-repo openai/codex --issue-map-state all --issue-map-limit 100
npx trace-to-skill init --issue-map-repo openai/codex --issue-map-comment-issue 8
```

Check whether a repo is Codex-ready:

```bash
npx trace-to-skill scorecard .
```

Package a failed run into a better OpenAI/Codex issue:

```bash
npx trace-to-skill codex-report ./runs --output openai-codex-issue.md
```

See the live generated example: [docs/CODEX_ISSUE_RADAR.md](docs/CODEX_ISSUE_RADAR.md), the recency-weighted heat map: [docs/CODEX_ISSUE_HEAT.md](docs/CODEX_ISSUE_HEAT.md), and the surface support matrix: [docs/CODEX_SURFACE_MATRIX.md](docs/CODEX_SURFACE_MATRIX.md). For the full command catalog, use [docs/USE_CASES.md](docs/USE_CASES.md).

AI coding agents are getting good enough to change real repositories, but they still repeat the same workflow mistakes: claiming success without tests, ignoring repo instructions, over-editing, inventing files, leaking secrets into traces, or enabling risky MCP tools.

`trace-to-skill` closes that loop:

```text
failed agent run -> failure class -> reusable rule/skill -> eval gate -> keep or revise
```

It is built for maintainers using Codex, Claude Code, Cursor, Copilot coding agent, Gemini CLI, OpenCode, or MCP-enabled workflows.

## Fast Use Cases

Use it when you need to:

- **Gate Codex-ready PRs:** run `trace-to-skill scorecard .` in CI and post a reviewer-friendly readiness comment.
- **Try it before collecting traces:** run `trace-to-skill demo` to generate a real Codex issue report from packaged public fixtures in one command.
- **Prepare OpenAI OSS evidence:** run `trace-to-skill oss-brief .` to generate application-ready proof, 500-character summary fields, readiness score, benchmark status, license, and next steps.
- **Mine GitHub issue demand:** run `trace-to-skill issue-map --repo openai/codex` or pass an exported issue JSON file to rank maintainer pain by deterministic failure class, comments, reactions, and evidence gaps.
- **See what is heating up right now:** run `trace-to-skill issue-heat --repo openai/codex --state open --limit 100 --window-hours 24` to rank recent GitHub issue movement by recency, comments, labels, reactions, severity, and the first support command to run.
- **Install a weekly issue radar:** run `trace-to-skill init --issue-map-repo owner/name` to add a scheduled GitHub Action that turns the repo's hottest issues into a Codex failure-class report in the job summary.
- **Harden agent instructions:** run `trace-to-skill lint-agents .` to catch missing `AGENTS.md`, conflicting tool instructions, missing includes, nested instruction drift, encoding issues, and risky MCP config.
- **Protect agent context:** run `trace-to-skill guard-github-event "$GITHUB_EVENT_PATH"` before feeding issue, PR, comment, discussion, check-run, or commit text into an agent.
- **Prevent unsafe patch overwrites:** run `trace-to-skill guard-patch ./change.patch --root .` before applying generated patches so `*** Add File` cannot silently replace an existing file or symlink target.
- **Audit local Codex session history:** run `trace-to-skill session-audit ~/.codex --format json` to summarize rollout JSONL sizes, huge lines, parse errors, state files, short `session_index.jsonl` evidence, bloated transcript-like sidebar titles, subagent lifecycle signals, and recoverable unindexed thread ids without publishing private transcripts.
- **Preflight sensitive paths before agent runs:** run `trace-to-skill sensitive-audit . --format json` to find `.env`, private keys, package auth files, cloud credentials, local databases, signing files, and secret manifests by filename/path without reading file contents. The report now checks project-level `.codexignore`, `.agentignore`, `.aiexclude`, and `.gitignore` coverage for the recommended patterns; add `--format ignore --ignore-target codexignore` to generate a reviewable `.codexignore` candidate without mutating the repo.
- **Preflight language-server readiness:** run `trace-to-skill lsp-audit . --format json` to detect repo languages, missing LSP commands, install hints, and evidence files before asking Codex for symbol-aware edits.
- **Audit Codex config drift:** run `trace-to-skill config-audit ~/.codex --format json` to summarize legacy profile config, model pins, Speed/Fast service-tier persistence drift, sandbox/approval posture, Windows elevated sandbox mode, missing permission profiles, plugin cache drift, and MCP approval sprawl.
- **Audit bundled plugin drift:** run `trace-to-skill plugin-audit ~/.codex --app /Applications/Codex.app --format json` to check Browser, Chrome, Computer Use, bundled marketplace, plugin cache, manifest, helper app, `CODEX_HOME`, and unsupported feature-flag drift without posting raw logs.
- **Bundle Codex diagnostics safely:** run `trace-to-skill diagnostics-bundle ~/.codex --output codex-diagnostics` to create a metadata-only support folder with manifest, README, config, plugin, and session audit reports while excluding raw logs, SQLite state, raw config, and transcripts.
- **Package Codex usage evidence:** run `trace-to-skill usage-doctor ./usage-notes.md --output usage-evidence.md` to turn `/status`, reset tables, usage-limit errors, token totals, prompt-cache collapse rows, rapid drain experiments, and orchestration-overhead clues into a redaction-aware usage receipt with attribution buckets and confidence.
- **Clarify usage bucket reports:** run `trace-to-skill codex-report ./runs` when the usage popover shows confusing 5h vs weekly percentages and does not explain remaining/used, rolling/calendar, or account/workspace scope.
- **Package Codex process evidence:** run `trace-to-skill process-audit ./process-notes.md --output process-audit.md` to turn Task Manager, System Informer, `Get-CimInstance`, `ps`, or `top` snippets into a privacy-aware report for PowerShell CIM polling, stale process-manager entries, high CPU helpers, and runaway renderers.
- **Bookmark a workspace before agent edits:** run `trace-to-skill checkpoint . --output .trace-to-skill/checkpoints/before-codex` to store git diffs plus copied changed/untracked files before Codex, Claude, Cursor, or another agent touches a dirty repo. It does not auto-restore or run destructive commands.
- **Share failed traces safely:** run `trace-to-skill redact ./runs --output redacted-runs` before publishing anonymized failure fixtures.
- **Catch sensitive file access:** run `trace-to-skill analyze ./runs` when an agent trace includes `.env`, private keys, `.npmrc`, cloud credentials, local databases, or production secret manifests.
- **Report remote compact failures:** run `trace-to-skill codex-report ./runs` when `/compact` or auto-compaction fails with `responses/compact` timeouts, stream disconnects, provider timeout workarounds, or long-thread recovery loss.
- **Diagnose context fork bloat:** run `trace-to-skill codex-report ./runs` when a conversation fork duplicates parent transcript blocks, inflates `input_tokens`, changes `prompt_cache_key`, or loses prompt-cache lineage before new work happens.
- **Catch subagent prompt leakage:** run `trace-to-skill codex-report ./runs` when `spawn_agent` with `fork_turns: "none"` records the delegated task as an assistant/commentary envelope or a parallel child sees a sibling prompt.
- **Map subagent orchestration demand:** run `trace-to-skill demo subagent-orchestration` when users ask for official subagents, per-agent model/reasoning config, role definitions, MCP tool scoping, or repo-level subagent files.
- **Diagnose Windows helper path failures:** run `trace-to-skill codex-report ./runs` when Codex Desktop resolves `rg.exe`, `node_repl.exe`, Browser, Chrome, or Computer Use helpers through blocked WindowsApps/MSIX paths, missing LocalCache bins, or broken `CodexSandboxUsers` ACLs.
- **Triage stuck Codex sessions:** run `trace-to-skill analyze ./runs` to catch context compaction failures such as compact stream disconnects, `context_length_exceeded`, and schema mismatches.
- **Catch latest-turn drift:** run `trace-to-skill analyze ./runs` when Codex answers an older prompt, repeats a previous response, forgets recent edits after compaction, or leaks raw tool payload text into chat.
- **Measure Codex latency regressions:** run `trace-to-skill analyze ./runs` when GPT-5.5 Fast feels like Standard, simple tasks take 10-20+ minutes, thinking stalls, or search/read/compaction delays dominate the session.
- **Report Thinking hangs:** run `trace-to-skill codex-report ./runs` when Codex accepts a turn or finishes local tools but stays on Thinking/Working with no streamed follow-up.
- **Report CLI no-response hangs:** run `trace-to-skill demo cli-no-response` when Codex CLI accepts prompts but never streams output, shows `100% left`, hangs during command execution, or requires Ctrl+C/forced kill.
- **Report clipboard and pasted-text attachment regressions:** run `trace-to-skill codex-report ./runs` when `Copy as Markdown` disappears, long prompts become `Pasted text.txt`, generated attachments cannot be previewed/edited, or `/goal` treats attached pasted text as empty.
- **Report deeplink and OAuth launch regressions:** run `trace-to-skill codex-report ./runs` when `codex://oauth_callback`, notification clicks, browser-extension activation, mobile links, or `codex app <path>` fail to route back into Codex.
- **Diagnose stale connector auth/cache:** run `trace-to-skill codex-report ./runs` when Codex app connectors return `401 Reauthentication required`, keep the same `link_*`, report `isAccessible: false`, or survive restart/plugin reinstall/cache clearing.
- **Explain missing MCP tools across Codex surfaces:** run `trace-to-skill codex-report ./runs` when MCP servers work in CLI or user-global config but are absent in VS Code, Desktop, WSL, or project-local sessions.
- **Diagnose Streamable HTTP MCP failures:** run `trace-to-skill codex-report ./runs` when Penpot, n8n, DingTalk, or another HTTP/SSE MCP server initializes but fails response parsing, handshakes, OAuth gating, stale session reuse, missing headers, or reconnects.
- **Map hooks contract gaps:** run `trace-to-skill demo hooks-contract` when users need documented hook events, blocking/async semantics, matcher coverage, `additionalContext`, or lifecycle coverage for guardrails and automation.
- **Triage Codex hooks failures:** run `trace-to-skill codex-report ./runs` when hooks duplicate, stop firing after rate limits or live edits, emit stale `codex_hooks` warnings, skip Code Mode/Windows/Desktop surfaces, or become unusable in the Hooks settings page.
- **Report terminal output and scrollback integrity failures:** run `trace-to-skill codex-report ./runs` when Codex terminal output disappears, gets overwritten, truncates numbered lines, snaps scrollback to the bottom, or only survives in logs/transcripts.
- **Triage subagent lifecycle drift:** run `trace-to-skill codex-report ./runs` when completed or closed subagents stay visible, stale spawn edges remain open, child threads crowd the recent list, `agent thread limit reached` blocks new work, or compaction loses prior subagent IDs.
- **Reduce approval friction:** run `trace-to-skill analyze ./runs` when `Approve for this session` is not remembered, repeated prompts push users toward Full Access, or trusted MCP tools like Playwright require dozens of approvals.
- **Diagnose sandbox blockers:** run `trace-to-skill analyze ./runs` on Codex traces that fail with sandbox setup refresh, `os error 740`, ACL, ownership, or approval-mode permission errors.
- **Debug Codex auth/connectivity:** run `trace-to-skill analyze ./runs` on logs with `token_exchange_failed`, `auth.openai.com/oauth/token`, Cloudflare challenge, proxy/CA, IPv6, or stream disconnect symptoms.
- **Triage remote SSH workspaces:** run `trace-to-skill codex-report ./runs` when Codex Desktop remote connections, Settings > Connections, `remote_connections`, SSH hosts, local tunnels, remote app-server, model lists, or remote folder browsing fail.
- **Map platform availability demand:** run `trace-to-skill demo platform-availability` when users need Codex Desktop on macOS Intel or Linux, a Universal build, package-format support, or a JetBrains IDE extension.
- **Publish a Codex surface support matrix:** run `trace-to-skill surface-matrix --repo openai/codex --state all --limit 100` to turn platform, remote, MCP, plugin, file-tree, and context-visibility demand into blocked/degraded surface rows with support-policy questions and evidence checklists.
- **Prove remote-control route health:** run `trace-to-skill analyze ./runs` when Codex mobile/remote sessions show `Waiting for desktop`, `Directory Unavailable`, stale listener/cache, missing helper bundle, or stale enrollment symptoms.
- **Triage Codex MCP runtime failures:** run `trace-to-skill analyze ./runs` when MCP tools are listed but Codex cancels approval, drops namespace/serverName metadata, routes to `unsupported call`, or closes stdio transport.
- **Debug Codex plugin runtime failures:** run `trace-to-skill analyze ./runs` when Browser, Computer Use, Chrome, connectors, or bundled plugins are advertised but fail with missing native pipe paths, plugin-list schema errors, or stale plugin cache state.
- **Report Codex file tree UI failures:** run `trace-to-skill analyze ./runs` when `View > Toggle File Tree`, the folder icon, floating file panel, or built-in file preview disappears, goes stale, or stops revealing workspace files.
- **Debug Codex resume/session state:** run `trace-to-skill analyze ./runs` when `codex resume` freezes, large JSONL histories make Desktop sluggish, recent context disappears after resume, or SQLite migration/state errors break goals.
- **Attribute token burn:** run `trace-to-skill usage-doctor ./usage-notes.md --format json` when Codex drains usage unexpectedly and you need confidence-ranked buckets for backend quota-window accounting, rapid-drain repros, prompt-cache collapse, large cached-context replay, compaction loops, retry/tool loops, background polling, subagent fan-out, and idle drain.
- **Report usage reset drift:** run `trace-to-skill analyze ./runs` when weekly or 5-hour reset times move unexpectedly, saved usage is lost, or `/status` and the dashboard disagree about the reset anchor.
- **Bundle quota evidence:** run `trace-to-skill usage-evidence ./usage-notes.md` when you have polling tables, `/status` percentages, reset timestamps, `input_tokens`/`cached_input_tokens`/`prompt_cache_key` rows, rapid burn notes like `1% in 4 minutes` or `22 credits`, or `You've hit your usage limit` messages.
- **Report resource leaks:** run `trace-to-skill analyze ./runs` when Codex Desktop, VS Code extension, app-server, renderer, GPU, or orphaned helper processes keep burning CPU/GPU/memory after the work should be idle.
- **Catch tool-call integrity failures:** run `trace-to-skill analyze ./runs` when `apply_patch`, `*** Add File` overwrite behavior, rollback/undo, subagent shutdown, or `tool_call_id` protocol failures threaten file safety or strand a session.
- **File better OpenAI/Codex issues:** run `trace-to-skill codex-report ./runs` to turn a failed trace into a redaction-aware, copy-paste-ready issue body with evidence and diagnostics.
- **Package quota bugs cleanly:** run `trace-to-skill analyze ./runs` on Codex traces where `/status` or the usage page shows remaining quota but the client returns `You've hit your usage limit`.

For copy-paste workflows, see [docs/USE_CASES.md](https://github.com/grnbtqdbyx-create/trace-to-skill/blob/main/docs/USE_CASES.md). For live Codex issue demand, see [docs/CODEX_ISSUE_RADAR.md](https://github.com/grnbtqdbyx-create/trace-to-skill/blob/main/docs/CODEX_ISSUE_RADAR.md), [docs/CODEX_SURFACE_MATRIX.md](https://github.com/grnbtqdbyx-create/trace-to-skill/blob/main/docs/CODEX_SURFACE_MATRIX.md), [docs/CODEX_ISSUE_MAP.md](https://github.com/grnbtqdbyx-create/trace-to-skill/blob/main/docs/CODEX_ISSUE_MAP.md), and [docs/CODEX_GITHUB_ISSUE_PAIN_MAP.md](https://github.com/grnbtqdbyx-create/trace-to-skill/blob/main/docs/CODEX_GITHUB_ISSUE_PAIN_MAP.md). For crawler-friendly metadata, see [docs/DISCOVERY.md](https://github.com/grnbtqdbyx-create/trace-to-skill/blob/main/docs/DISCOVERY.md) and [llms.txt](https://github.com/grnbtqdbyx-create/trace-to-skill/blob/main/llms.txt).

## Why This Exists

Open-source maintainers do not need more AI-generated noise. They need agents that learn from concrete failures and produce reviewable evidence.

`trace-to-skill` helps teams answer:

- Is this repository ready for Codex-driven OSS maintenance?
- Why did this Codex or Claude run fail?
- Was the failure caused by missing repo instructions?
- Should this become an `AGENTS.md` rule?
- Should this become a reusable `SKILL.md` workflow?
- Did the proposed rule actually improve the next run?
- Can this be reported in a PR without leaking secrets?
- Did a long Codex session fail during context compaction?
- Did `/compact` or auto-compaction fail against the remote `responses/compact` endpoint, forcing a new thread or provider-timeout workaround?
- Did Codex Desktop on Windows expose `rg`, `node_repl`, Browser, Chrome, or Computer Use helper paths that were discoverable but not executable?
- Did an `apply_patch` create operation actually overwrite an existing file or symlink target?
- Can a generated patch be guarded before it touches the workspace?
- Which local Codex rollout JSONL or `session_index.jsonl` files make `codex resume`, project history, search, or Desktop history sluggish/incomplete?
- Which `config.toml` or `.codex-global-state.json` setting explains a sandbox, approval, plugin, model, Speed/Fast, or Preferences save regression?
- Which bundled plugin/cache/marketplace/helper-app mismatch explains a Browser, Chrome, Computer Use, or MCP runtime failure?
- Can I attach one safe diagnostics folder to OpenAI without posting raw `config.toml`, SQLite state, local logs, or transcripts?
- Can I prove a project thread still exists on disk and get the `codex resume <id>` command when Desktop search/sidebar hides it?
- Can I report Codex high-CPU or PowerShell polling without posting a full raw process dump?
- Which public Codex issue clusters are heating up on GitHub, and which failure class should become the next fixture, report, or OpenAI-ready support artifact?
- Can I create a local checkpoint before an agent run so untracked dirty files are not lost if I need a manual rewind?
- Which files in this repo should be excluded from agent context before Codex, Claude, Cursor, or Gemini reads the workspace?
- Which language servers should be installed before Codex attempts symbol-aware navigation, diagnostics, rename, or go-to-definition work?
- Did Codex sandbox setup or workspace permissions block every tool call?
- Did quota accounting, account switching, or reset timing contradict the runtime usage-limit error?
- Did an MCP tool appear in `tools/list` but fail at Codex runtime because approval, namespace routing, or stdio lifecycle broke?
- Did a long local Codex session become impossible to resume because history size, context compression, archived chat loading, or state migration broke?
- Did usage burn come from useful model work, background polling, compaction/replay, retry loops, subagents, or idle app activity?
- Did a model/runtime latency regression make Fast behave like Standard, stall before first output, or spend minutes in thinking, search, read, or compaction phases?
- Did Codex accept a turn, finish local tools, or keep a Responses request open while the UI/CLI stayed on Thinking with no streamed follow-up?
- Did copy/export, long-paste conversion, generated `Pasted text.txt`, or `/goal` attachment handling break the prompt or support-report workflow?
- Did `codex://` OAuth callbacks, notification clicks, browser-extension launches, mobile pairing links, or `codex app <path>` fail to open the right Codex route?
- Did a Codex app connector keep stale `link_*` or `isAccessible: false` metadata after `401 Reauthentication required`, restart, plugin reinstall, or cache regeneration?
- Did MCP servers work in Codex CLI, `~/.codex/config.toml`, or a new conversation, but disappear from VS Code, Desktop, WSL, project `.codex/config.toml`, or an older session?
- Did Codex terminal scrollback, streamed output, or transcript rendering drop, overwrite, truncate, duplicate, or hide evidence lines that still exist in raw logs?
- Did completed, closed, interrupted, or stale subagents diverge between the Desktop UI, live registry, `thread_spawn_edges`, spawn quota, recent-list/sidebar, and parent-agent discoverability?
- Did Codex App reset Speed from Fast to Standard after restart even though `service_tier = "fast"` or `default-service-tier = "priority"` was still present?
- Did repeated approval prompts make a safer scoped mode unusable or require huge per-tool MCP approval configs?
- Can the failure be reported to OpenAI with line-linked evidence, redaction notes, and the exact diagnostics maintainers need?
- Can we produce an application-ready OpenAI OSS brief from the repo's actual license, distribution, readiness, and benchmark state?

## Example Output

```text
Agent workflow failed: score 25/100, critical findings 1.
```

Markdown report:

```md
# Agent Learning Report

Score: 25/100

## Findings

### Agent claimed completion without verifiable proof
Severity: high
Evidence:
- fixtures/failed-run.md:7 Done. The parser is fixed and all set.

Suggested rule:
> Before claiming completion, run the relevant validation command or clearly state the exact validation that could not be run and why.
```

Generated `AGENTS.md` snippet:

```md
# Agent Rules Generated From Failed Runs

- Every code-changing task must end with a named validation command and its result, even when the command fails.
- Before editing or referencing a path, verify it exists with a file search command such as rg --files.
```

## What It Detects

`doctor` checks repo-level readiness:

| Check | Why maintainers care |
| --- | --- |
| `AGENTS.md` | Codex needs clear repository instructions |
| CI workflow | Agent changes need visible validation |
| Validation scripts | Completion claims need repeatable proof |
| License | OSS adoption and review need clear terms |
| Maintainer docs | Contributors and agent PRs need process |
| Distribution | Users should be able to try the project in one command |
| Release automation | npm packages should publish from OIDC-backed CI, not local long-lived tokens or repeated browser auth |
| Agent learning loop | Failed runs should become evidence, not folklore |

Trace analysis detects run-level failures:

| Finding | Why maintainers care |
| --- | --- |
| Premature completion | Agent says "done" without proof |
| Tests not run | Review load moves back to maintainers |
| Test/build failure | Completion should be blocked |
| Hallucinated file | Agent invented a path or module |
| Instruction drift | `AGENTS.md`, `CLAUDE.md`, and tool-specific files conflict |
| Over-editing | Diff is broader than the task needs |
| Unsafe command | Destructive shell or remote script execution |
| Secret exposure | Tokens/API keys in traces or PR comments |
| Sensitive file access | `.env`, private keys, package auth files, cloud credentials, local databases, or production secret manifests entered agent context |
| Hidden Unicode | Invisible instruction or code-review manipulation |
| Prompt injection | Untrusted issue, PR, log, or web text asks the agent to ignore policy or leak secrets |
| Context compaction | Codex compact task fails, disconnects, loops, or hits `context_length_exceeded` |
| Codex context fork bloat | Conversation forks duplicate parent turns, inflate token counts, break prompt-cache lineage, or mix `fork_context` history into child context |
| Codex subagent prompt leakage | MultiAgentV2 children receive assistant/commentary prompt envelopes or sibling prompts despite `fork_turns: "none"` |
| Codex subagent orchestration | Official subagent support, role definitions, per-agent model/reasoning config, MCP tool scoping, repo/user overrides, or context isolation are missing or unclear |
| Codex latest-turn drift | Long or compacted conversations answer stale prompts, redo old tasks, forget recent edits, or expose raw tool payloads |
| Codex latency regression | Model/runtime routing, thinking stalls, search/read, or compaction latency makes simple tasks take minutes or hours |
| Codex thinking hang | A turn, tool call, or Responses stream appears accepted but no assistant follow-up arrives while the UI stays on Thinking/Working |
| Codex clipboard attachment | Copy/export, long pasted prompts, generated `Pasted text.txt`, or `/goal` attachment handling breaks instruction and report workflows |
| Codex deeplink launch | OAuth callbacks, notification clicks, browser-extension activation, mobile links, or `codex app <path>` are treated as bad Electron/app paths instead of Codex routes |
| Codex connector auth cache | App connectors keep stale `link_*` auth/discovery metadata after reauth-required responses, plugin reinstall, or cache regeneration |
| Codex approval friction | Session approvals are not remembered, MCP tools reprompt repeatedly, or users fall back to unsafe full access |
| Sandbox permission | Codex sandbox setup, approval mode, ACL, or workspace ownership blocks tool execution |
| Codex connectivity | Auth token exchange, proxy/CA, IPv6, Cloudflare challenge, or ChatGPT transport errors block Codex |
| Codex remote connection | Desktop SSH/remote workspaces, Settings > Connections, local tunnels, remote app-server, model lists, or remote folder browsing fail |
| Codex remote control | Mobile or remote sessions route through stale listeners, stale enrollment, or incomplete helper bundles |
| Codex MCP discovery mismatch | MCP works in CLI or one config scope but disappears in VS Code, Desktop, WSL, project config, or an older session |
| Codex Streamable HTTP MCP | HTTP/SSE MCP servers initialize but fail JSON-RPC parsing, `text/event-stream` framing, handshakes, auth gating, stale session ids, or reconnects |
| Codex hooks contract | Hook event names, config schema, blocking/async semantics, `additionalContext`, matcher coverage, or lifecycle coverage are missing or undocumented |
| Codex hooks runtime | Hooks duplicate, stop firing, warn about stale config, skip Code Mode/Desktop/Windows surfaces, or become hard to inspect in settings |
| Codex terminal output integrity | Terminal scrollback, streamed output, or transcript rendering drops, overwrites, truncates, duplicates, or hides lines that raw logs still contain |
| Codex subagent lifecycle | Completed, closed, stale, or interrupted subagents diverge across UI, registry, persisted spawn edges, quota, recent list, or parent discoverability |
| Codex MCP runtime | MCP tools are configured but approval, namespace routing, unsupported callable names, or stdio transport fail at runtime |
| Codex plugin runtime | Browser, Computer Use, Chrome, connectors, or bundled plugins are advertised but fail because helper paths, plugin-list schemas, or cache state drift |
| Codex file tree UI | Desktop file tree, floating file panel, or file preview cannot be revealed, refreshes stale entries, or loses workspace navigation |
| Codex session state | Resume, history rendering, context compression, archived chats, or local SQLite/global-state migrations break long sessions |
| Codex usage bucket confusion | Usage popover 5h and weekly percentages do not explain remaining/used, rolling/calendar, or account/workspace scope |
| Codex token burn | Background polling, idle app activity, compaction/replay, cached-token-heavy turns, or retry loops drain usage unexpectedly |
| Codex usage reset drift | Weekly or 5-hour reset anchors move unexpectedly, saved usage is lost, or reset display differs from enforcement |
| Codex resource leak | Desktop/app/extension/helper processes, shell snapshots, renderer, GPU, or log loops keep consuming local resources |
| Codex tool-call integrity | Patch safety, rollback/undo, subagent shutdown, or missing tool-call responses break maintainer trust |
| Quota mismatch | Codex usage dashboard, `/status`, account state, or reset timing contradicts a usage-limit block |
| MCP risk | Tool permissions and trust boundaries are unclear |

## Installation

Run from npm:

```bash
npx trace-to-skill analyze ./runs
```

Or install in a repository:

```bash
npm install -D trace-to-skill
```

GitHub source installs also work:

```bash
npx github:grnbtqdbyx-create/trace-to-skill analyze ./runs
```

Requires Node.js 20+.

## CLI

Try a packaged public demo before collecting private traces:

```bash
trace-to-skill demo
trace-to-skill demo --list
trace-to-skill demo context-fork-bloat
trace-to-skill demo subagent-prompt-leakage
trace-to-skill demo subagent-orchestration
trace-to-skill demo latency-regression
trace-to-skill demo thinking-hang
trace-to-skill demo clipboard-attachment
trace-to-skill demo deeplink-launch
trace-to-skill demo connector-auth-cache
trace-to-skill demo mcp-discovery-mismatch
trace-to-skill demo mcp-streamable-http
trace-to-skill demo hooks-contract
trace-to-skill demo hooks-runtime
trace-to-skill demo usage-bucket-confusion
trace-to-skill demo terminal-output-integrity
trace-to-skill demo subagent-lifecycle
trace-to-skill demo patch-overwrite
trace-to-skill guard-patch ./change.patch --root .
trace-to-skill session-audit ~/.codex --format json
trace-to-skill sensitive-audit . --format json
trace-to-skill sensitive-audit . --format ignore --ignore-target agentignore --output .agentignore.generated
trace-to-skill lsp-audit . --format json
trace-to-skill config-audit ~/.codex --format json
trace-to-skill plugin-audit ~/.codex --app /Applications/Codex.app --format json
trace-to-skill diagnostics-bundle ~/.codex --output codex-diagnostics
trace-to-skill demo --format json
```

See this repository's generated demo in [docs/DEMO.md](docs/DEMO.md).

Check whether a repository is ready for Codex automation:

```bash
trace-to-skill doctor .
trace-to-skill doctor . --threshold 85
trace-to-skill doctor . --format json
trace-to-skill doctor . --format comment
```

Lint `AGENTS.md`, tool-specific agent instruction files, and MCP config risk:

```bash
trace-to-skill lint-agents .
trace-to-skill lint-agents . --format json
```

This focused linter checks whether `AGENTS.md` exists as the canonical instruction source, whether validation commands are discoverable, whether `AGENTS.md` / `CLAUDE.md` / Cursor / Copilot guidance conflicts, whether instruction files reference missing paths, missing `@file.md` includes, nested `AGENTS.md` files that the root instructions do not mention, invalid UTF-8, or grow large enough to risk ignored guidance, and whether JSON or `.codex/config.toml` MCP/Codex configs expose risky capabilities, secrets, unresolved commands, missing `cwd` values, placeholder env vars, wrong `mcpServers` casing, unresolved plugin placeholders, deprecated `codex_hooks`, missing `default_permissions` profiles, or synced `projects.* trusted_level` state.

Redact traces before sharing them:

```bash
trace-to-skill redact ./runs --output redacted-runs
trace-to-skill redact ./runs/failed-run.md > failed-run.redacted.md
trace-to-skill redact ./runs --output redacted-runs --format json
trace-to-skill sensitive-audit . --output sensitive-paths.md
trace-to-skill sensitive-audit . --format ignore --ignore-target codexignore --output .codexignore.generated
trace-to-skill lsp-audit . --output lsp-readiness.md
```

This removes common API keys, GitHub/npm/Slack tokens, bearer tokens, email addresses, local home paths, and hidden Unicode controls while preserving enough context for maintainer review. `sensitive-audit` is filename/path-only, can emit `.agentignore`, `.codexignore`, `.aiexclude`, or `.gitignore` candidates, and reports whether existing project ignore files already cover the recommended patterns. `.gitignore` coverage is shown as hygiene evidence, not as proof of an agent read-deny boundary; `lsp-audit` detects repo language signals and missing language-server commands without installing anything.

Scaffold a repo:

```bash
trace-to-skill init --comment --sarif
trace-to-skill init --issue-map-repo openai/codex --issue-map-state all --issue-map-limit 100
```

`init` writes `.github/workflows/codex-readiness.yml`, `.github/workflows/agent-learning.yml`, `runs/README.md`, and `runs/.gitkeep`. When `--issue-map-repo owner/name` is provided, it also writes `.github/workflows/codex-issue-radar.yml`, a weekly/manual workflow that fetches live issues and publishes a Codex issue pain map to the job summary. The generated workflows use the published GitHub Action, expose score/report outputs, and will not overwrite existing files unless `--force` is passed.

Analyze traces:

```bash
trace-to-skill analyze ./runs --format markdown --output agent-learning-report.md
trace-to-skill analyze ./runs --format json
trace-to-skill analyze ./runs --format sarif --output trace-to-skill.sarif
```

Create an OpenAI Codex issue-ready report:

```bash
trace-to-skill codex-report ./runs --output openai-codex-issue.md
```

This renders a copy-paste issue body with the likely Codex failure class, evidence lines, diagnostics to attach, and privacy/redaction reminders. It is designed for high-signal reports in `openai/codex` issues without forcing maintainers to read full private transcripts.

Package Codex usage, reset, and quota evidence:

```bash
trace-to-skill usage-doctor ./usage-notes.md --output usage-evidence.md
trace-to-skill usage-evidence ./usage-notes.md --format json
```

This parses Markdown polling tables, CSV-like rows, JSON/JSONL snapshots, `/status` excerpts, `reset_at` timestamps, usage-limit messages, rapid drain experiment notes such as `1% in 4 minutes` or `22 credits`, prompt-cache rows with `input_tokens`, `cached_input_tokens` / `cached_tokens`, `prompt_cache_key`, and `response id`, and `Token usage: total=... cached` lines into a concise report for Codex rate-limit, reset-drift, prompt-cache-collapse, and token-burn issues. `usage-doctor` is an alias for the same parser with a clearer name for public support workflows; the JSON receipt includes attribution buckets, confidence, signal counts, line-linked evidence, and the next evidence to collect.

Generate reusable rules:

```bash
trace-to-skill suggest ./runs --target agents-md --output AGENTS.generated.md
trace-to-skill suggest ./runs --target skill --output skills/verification-before-completion/SKILL.md
```

Use as an eval gate:

```bash
trace-to-skill eval ./runs --threshold 80
```

The eval command exits non-zero when the score is below the threshold or critical findings exist.

Run the built-in fixture benchmark:

```bash
trace-to-skill benchmark
trace-to-skill benchmark --format json
```

See the current public scorecard in [docs/BENCHMARK.md](docs/BENCHMARK.md).

Generate a combined Codex readiness and benchmark scorecard:

```bash
trace-to-skill scorecard .
trace-to-skill scorecard . --format json
```

See this repository's current public scorecard in [docs/SCORECARD.md](docs/SCORECARD.md).

Generate an OpenAI OSS support/application brief:

```bash
trace-to-skill oss-brief .
trace-to-skill oss-brief . --format json
trace-to-skill oss-brief . --output docs/OPENAI_OSS_BRIEF.md
```

See this repository's current brief in [docs/OPENAI_OSS_BRIEF.md](docs/OPENAI_OSS_BRIEF.md).

Mine public GitHub issue demand into a maintainer pain map:

```bash
trace-to-skill issue-map --repo openai/codex --state all --limit 100 --output codex-issue-radar.md
trace-to-skill issue-map --repo openai/codex --format json
trace-to-skill issue-heat --repo openai/codex --state open --limit 100 --window-hours 24 --output codex-issue-heat.md
trace-to-skill issue-heat-comment --repo openai/codex --issue-number 8 --comment-repository owner/repo --dry-run
trace-to-skill duplicate-audit --repo openai/codex --issue 25507 --output codex-duplicate-audit.md
trace-to-skill duplicate-audit --repo openai/codex --issue 25507 --candidates 25391,25488 --format json
trace-to-skill init --issue-map-repo openai/codex --issue-map-state all --issue-map-limit 100
gh issue list --repo openai/codex --state open --limit 100 --json number,title,body,url,labels,comments,createdAt,updatedAt > codex-issues.json
trace-to-skill issue-map codex-issues.json --output codex-issue-map.md
trace-to-skill issue-map codex-issues.json --format json
gh issue list --repo openai/codex --state all --limit 100 --json number,title,body,url,labels,comments,updatedAt | trace-to-skill issue-map - --format json
```

`issue-map` can fetch a public GitHub repository directly through the GitHub REST API, read JSON exported by `gh issue list` / `gh search issues`, or consume piped GitHub CLI JSON through `issue-map -`. It analyzes each issue with the same deterministic failure detectors, ranks clusters by issue count, comment count, reactions, and severity, then emits a Maintainer Roadmap with the next artifact and command to run. Use it to decide what people are actively asking for on GitHub before adding the next fixture, Codex report template, diagnostic bundle, or OpenAI-ready support artifact.

`issue-heat` uses the same detectors but ranks recent issue movement. It is useful when all-time demand is dominated by older high-reaction threads and maintainers need to know what broke or became noisy in the last 24-72 hours. Use `issue-heat-comment` or the `mode: issue-heat` Action to keep a stable tracking issue updated without committing generated reports.

`duplicate-audit` checks Codex Action "Potential duplicates" suggestions before maintainers close or merge issues. It fetches the current issue, bot-suggested candidates, and candidate comments from GitHub, then compares deterministic failure kinds, labels, platform/surface signals, and title overlap. The output separates `likely_duplicate` from `related_not_duplicate`, so users can write a narrow clarification instead of adding noisy "not a duplicate" comments.

For a live generated radar, see [docs/CODEX_ISSUE_RADAR.md](docs/CODEX_ISSUE_RADAR.md). For recent movement, see [docs/CODEX_ISSUE_HEAT.md](docs/CODEX_ISSUE_HEAT.md). For duplicate triage, see [docs/CODEX_DUPLICATE_AUDIT.md](docs/CODEX_DUPLICATE_AUDIT.md). For blocked/degraded surfaces, see [docs/CODEX_SURFACE_MATRIX.md](docs/CODEX_SURFACE_MATRIX.md). To map a Codex problem to the right failure class and report command, see [docs/CODEX_ISSUE_MAP.md](docs/CODEX_ISSUE_MAP.md).

Create a local pre-agent workspace checkpoint:

```bash
trace-to-skill checkpoint . --output .trace-to-skill/checkpoints/before-codex
trace-to-skill checkpoint . --format json
```

The checkpoint stores `git status`, staged and unstaged binary diffs, and local copies of changed or untracked files. Gitignored files are excluded unless `--include-ignored` is passed; keep those bundles local because they can contain secrets.

Post or update a pull request comment with the combined scorecard:

```bash
trace-to-skill scorecard-comment . --threshold 85 --token "$GITHUB_TOKEN"
```

Guard untrusted GitHub event text before an agent acts on it:

```bash
trace-to-skill guard-github-event "$GITHUB_EVENT_PATH"
trace-to-skill guard-github-event fixtures/github-prompt-injection-event.json --format json
```

This extracts PR titles/bodies, issue bodies, review comments, discussion text, check-run output, and commit messages from a GitHub event payload, then scans that text for prompt injection, leaked secrets, unsafe command requests, and weak evidence patterns.

Post or update a GitHub pull request comment:

```bash
trace-to-skill comment ./runs --token "$GITHUB_TOKEN"
```

Post or update a GitHub pull request comment with the Codex readiness doctor:

```bash
trace-to-skill doctor-comment . --threshold 85 --token "$GITHUB_TOKEN"
```

Compare an agent run before and after a generated rule or skill:

```bash
trace-to-skill compare --before ./runs/before --after ./runs/after
```

## Supported Inputs

`trace-to-skill` scans directories or individual files:

- `.md`
- `.txt`
- `.log`
- `.csv`
- `.json`
- `.jsonl`

JSONL traces are normalized by extracting common fields such as `message`, `content`, `text`, `output`, and `error`. Codex-style JSONL traces with `response_item`, `function_call`, `function_call_output`, and `event_msg` payloads are normalized into readable evidence lines.

MCP configs with `mcpServers`, `.mcp.json`, or project-local `.codex/config.toml` are parsed for capability hints such as filesystem, shell, browser, network, database, container, and secret-bearing environment variables. `lint-agents` also checks static startup inputs such as `command`, `cwd`, env placeholders, unresolved `$VARS`, `${CLAUDE_PLUGIN_ROOT}`-style plugin placeholders, local stdio commands without explicit `cwd`, and the common JSON `mcp_servers` / `mcpServers` casing mismatch. Codex config hygiene checks catch deprecated `[features].codex_hooks`, missing `default_permissions` profile definitions, machine-local `projects.* trusted_level` metadata in synced config files, and Speed/Fast persistence drift between `config.toml` and `.codex-global-state.json`.

Instruction files such as `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.cursor/rules`, and `.github/copilot-instructions.md` are checked for obvious contradictions in validation commands, test requirements, destructive-command approval rules, invalid UTF-8, missing include targets, and nested `AGENTS.md` files that may not be loaded automatically.

## JSON Schemas

Stable machine-readable contracts are published with the npm package and release tarball:

- [`schemas/analysis-result.schema.json`](schemas/analysis-result.schema.json) describes `trace-to-skill analyze --format json`.
- [`schemas/agents-lint-result.schema.json`](schemas/agents-lint-result.schema.json) describes `trace-to-skill lint-agents --format json`.
- [`schemas/doctor-result.schema.json`](schemas/doctor-result.schema.json) describes `trace-to-skill doctor --format json`.
- [`schemas/redact-result.schema.json`](schemas/redact-result.schema.json) describes `trace-to-skill redact --format json`.
- [`schemas/sensitive-audit-result.schema.json`](schemas/sensitive-audit-result.schema.json) describes `trace-to-skill sensitive-audit --format json`.
- [`schemas/lsp-audit-result.schema.json`](schemas/lsp-audit-result.schema.json) describes `trace-to-skill lsp-audit --format json`.
- [`schemas/scorecard-result.schema.json`](schemas/scorecard-result.schema.json) describes `trace-to-skill scorecard --format json`.
- [`schemas/oss-brief-result.schema.json`](schemas/oss-brief-result.schema.json) describes `trace-to-skill oss-brief --format json`.
- [`schemas/patch-guard-result.schema.json`](schemas/patch-guard-result.schema.json) describes `trace-to-skill guard-patch --format json`.
- [`schemas/config-audit-result.schema.json`](schemas/config-audit-result.schema.json) describes `trace-to-skill config-audit --format json`.
- [`schemas/diagnostics-bundle-result.schema.json`](schemas/diagnostics-bundle-result.schema.json) describes `trace-to-skill diagnostics-bundle --format json`.
- [`schemas/plugin-audit-result.schema.json`](schemas/plugin-audit-result.schema.json) describes `trace-to-skill plugin-audit --format json`.
- [`schemas/session-audit-result.schema.json`](schemas/session-audit-result.schema.json) describes `trace-to-skill session-audit --format json`.
- [`schemas/usage-evidence-result.schema.json`](schemas/usage-evidence-result.schema.json) describes `trace-to-skill usage-evidence --format json`.
- [`schemas/process-audit-result.schema.json`](schemas/process-audit-result.schema.json) describes `trace-to-skill process-audit --format json`.
- [`schemas/issue-map-result.schema.json`](schemas/issue-map-result.schema.json) describes `trace-to-skill issue-map --format json`.
- [`schemas/duplicate-audit-action-outputs.schema.json`](schemas/duplicate-audit-action-outputs.schema.json) describes the duplicate-audit Action output mapping in `fixtures/duplicate-audit-action-outputs.json`.
- [`schemas/workspace-checkpoint-result.schema.json`](schemas/workspace-checkpoint-result.schema.json) describes `trace-to-skill checkpoint --format json`.

These schemas let downstream Codex workflows, dashboards, and CI bots consume reports without scraping Markdown.

## Adoption Guide

For a copy-paste maintainer rollout, see [docs/ADOPTION_GUIDE.md](docs/ADOPTION_GUIDE.md). It includes the first PR shape, privacy checklist, and a short pull request template for adding Codex readiness checks without handing policy changes to an agent.

## Release Hygiene

Releases are prepared for npm Trusted Publishing through the [`Publish npm`](.github/workflows/npm-publish.yml) workflow. Once npm trusts `grnbtqdbyx-create/trace-to-skill` and workflow filename `npm-publish.yml`, a GitHub release can publish without a long-lived npm token or repeated local browser authentication. See [docs/RELEASE.md](docs/RELEASE.md).

## GitHub Action

Run the Codex readiness doctor as a GitHub Action:

```yaml
name: Codex Readiness

on:
  pull_request:
  workflow_dispatch:

jobs:
  codex-readiness:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
      issues: write
    steps:
      - uses: actions/checkout@v5
      - uses: grnbtqdbyx-create/trace-to-skill@v0.1.111
        with:
          mode: all
          doctor-threshold: "85"
          doctor-comment: "true"
          scorecard-comment: "true"
          job-summary: "true"
          github-token: ${{ github.token }}
```

Add this to `.github/workflows/agent-learning.yml` for trace analysis:

```yaml
name: Agent Learning Report

on:
  pull_request:
  workflow_dispatch:

jobs:
  agent-learning:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
      issues: write
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 20
      - run: npx trace-to-skill analyze ./runs --output agent-learning-report.md
      - run: npx trace-to-skill comment ./runs --token "${{ github.token }}"
      - run: npx trace-to-skill eval ./runs --threshold 80
```

Code scanning / SARIF upload:

```yaml
- run: npx trace-to-skill analyze ./runs --format sarif --output trace-to-skill.sarif
- uses: github/codeql-action/upload-sarif@v4
  with:
    sarif_file: trace-to-skill.sarif
```

Composite action usage:

```yaml
- id: trace-to-skill
  uses: grnbtqdbyx-create/trace-to-skill@v0.1.111
  with:
    mode: all
    doctor-threshold: "85"
    doctor-comment: "true"
    scorecard-comment: "true"
    job-summary: "true"
    traces: ./runs
    threshold: "80"
    comment: "true"
    github-token: ${{ github.token }}
- run: echo "Codex readiness score is ${{ steps.trace-to-skill.outputs.doctor-score }}"
```

Issue-map action usage for direct GitHub issue demand mining:

```yaml
- id: codex-issue-map
  uses: grnbtqdbyx-create/trace-to-skill@v0.1.111
  with:
    mode: issue-map
    issue-map-repo: openai/codex
    issue-map-state: all
    issue-map-limit: "100"
    issue-map-comment: "true"
    issue-map-comment-issue: "8"
    job-summary: "true"
    github-token: ${{ github.token }}
- run: echo "Top Codex issue cluster is ${{ steps.codex-issue-map.outputs.issue-map-top-kind }}"
```

Issue-heat action usage for recency-weighted GitHub issue movement:

```yaml
- id: codex-issue-heat
  uses: grnbtqdbyx-create/trace-to-skill@v0.1.111
  with:
    mode: issue-heat
    issue-heat-repo: openai/codex
    issue-heat-state: open
    issue-heat-limit: "100"
    issue-heat-window-hours: "24"
    issue-heat-comment: "true"
    issue-heat-comment-issue: "8"
    job-summary: "true"
    github-token: ${{ github.token }}
- run: echo "Hottest recent Codex issue cluster is ${{ steps.codex-issue-heat.outputs.issue-heat-top-kind }}"
```

Duplicate-audit action usage for checking Codex Action duplicate suggestions:

```yaml
- id: codex-duplicate-audit
  uses: grnbtqdbyx-create/trace-to-skill@v0.1.111
  with:
    mode: duplicate-audit
    duplicate-audit-repo: openai/codex
    duplicate-audit-issue: "25507"
    duplicate-audit-candidates: "25391,25488"
    job-summary: "true"
    github-token: ${{ github.token }}
- run: echo "Top duplicate verdict is ${{ steps.codex-duplicate-audit.outputs.duplicate-audit-top-verdict }}"
```

Action outputs:

| Output | Description |
| --- | --- |
| `doctor-score` | Codex readiness score from 0 to 100 |
| `doctor-status` | `ready` or `needs-attention` |
| `doctor-summary` | Human-readable doctor summary |
| `doctor-report` | Markdown report path |
| `doctor-json` | JSON report path |
| `agent-report` | Agent learning report path |
| `agents-lint-score` | AGENTS.md linter score from 0 to 100 |
| `agents-lint-status` | `pass`, `warn`, or `fail` |
| `agents-lint-report` | Markdown AGENTS.md linter report path |
| `agents-lint-json` | JSON AGENTS.md linter report path |
| `context-score` | Untrusted GitHub event context score from 0 to 100 |
| `context-status` | `pass` or `fail` |
| `context-report` | Markdown GitHub context guard report path |
| `context-json` | JSON GitHub context guard report path |
| `benchmark-status` | Built-in fixture benchmark status, `pass` or `fail` |
| `benchmark-cases` | Number of benchmark cases executed |
| `benchmark-report` | Markdown benchmark report path |
| `benchmark-json` | JSON benchmark report path |
| `scorecard-status` | Combined scorecard status, `pass` or `fail` |
| `scorecard-report` | Markdown scorecard report path |
| `scorecard-json` | JSON scorecard report path |
| `issue-map-issues` | Number of GitHub issues analyzed by issue-map mode |
| `issue-map-matched` | Number of issues matched to deterministic failure classes |
| `issue-map-top-kind` | Highest-priority issue-map failure class |
| `issue-map-report` | Markdown issue-map report path |
| `issue-map-json` | JSON issue-map report path |
| `issue-heat-issues` | Number of GitHub issues fetched by issue-heat mode |
| `issue-heat-considered` | Number of recent issues considered after filters |
| `issue-heat-matched` | Number of recent issues matched to known failure classes |
| `issue-heat-top-kind` | Hottest recent issue failure class |
| `issue-heat-report` | Markdown issue-heat report path |
| `issue-heat-json` | JSON issue-heat report path |
| `duplicate-audit-candidates` | Number of duplicate candidates checked |
| `duplicate-audit-likely` | Number of likely duplicate candidates |
| `duplicate-audit-related` | Number of related but not exact duplicate candidates |
| `duplicate-audit-needs-review` | Number of duplicate candidates needing human review |
| `duplicate-audit-weak` | Number of weak duplicate matches |
| `duplicate-audit-top-verdict` | Highest-confidence duplicate audit verdict |
| `duplicate-audit-report` | Markdown duplicate-audit report path |
| `duplicate-audit-json` | JSON duplicate-audit report path |

Duplicate-audit Action output mapping:

| Output | Step output | Source |
| --- | --- | --- |
| `duplicate-audit-candidates` | `candidates` | `summary.candidateCount` |
| `duplicate-audit-likely` | `likely` | `summary.likelyDuplicates` |
| `duplicate-audit-related` | `related` | `summary.relatedNotDuplicates` |
| `duplicate-audit-needs-review` | `needs-review` | `summary.needsHumanReview` |
| `duplicate-audit-weak` | `weak` | `summary.weakMatches` |
| `duplicate-audit-top-verdict` | `top-verdict` | `candidates[].verdict` |
| `duplicate-audit-report` | `report` | `trace-to-skill-duplicate-audit.md` |
| `duplicate-audit-json` | `json` | `trace-to-skill-duplicate-audit.json` |

The machine-readable mapping lives in [`fixtures/duplicate-audit-action-outputs.json`](fixtures/duplicate-audit-action-outputs.json) and is described by [`schemas/duplicate-audit-action-outputs.schema.json`](schemas/duplicate-audit-action-outputs.schema.json). The regression test checks that JSON-derived outputs point at fields in [`schemas/duplicate-audit-result.schema.json`](schemas/duplicate-audit-result.schema.json).

By default, generated reports are also appended to the GitHub Actions Job Summary. Set `job-summary: "false"` to disable that UI output.

Tagged Action releases build and run the CLI from `$GITHUB_ACTION_PATH`, so a workflow pinned to a release tag such as `@v0.1.111` executes that release's checked-out source instead of pulling the default branch at runtime.

Action inputs are passed into bash steps through environment variables before the CLI receives them. The regression fixture at `fixtures/action-malicious-inputs.json` keeps quote, newline, command-substitution, and shell-separator examples out of `run:` scripts so workflow inputs are treated as data.

## Codex Skill

This repository also ships a Codex-native skill for maintainers who want the agent itself to run a repeatable readiness audit:

```bash
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo grnbtqdbyx-create/trace-to-skill \
  --path skills/codex-readiness-auditor \
  --name codex-readiness-auditor
```

The skill tells Codex to run the scorecard, treat issue/PR text as untrusted data, avoid committing generated policy without maintainer review, and report exact validation evidence.

## OpenAI / Codex Use Case

This project is designed to support open-source maintainers who use Codex for:

- pull request review
- issue triage
- release workflow automation
- security review
- repository-specific agent skills
- maintainer handoff reports

The goal is not to let agents autonomously rewrite project policy. The goal is to turn repeated, evidence-backed agent failures into small, reviewable improvements that maintainers can accept or reject.

## Roadmap

- Codex session JSONL adapters
- Claude Code transcript adapters
- `AGENTS.md` contradiction detector
- MCP/Codex config parser with explicit capability scoring, JSON/TOML startup diagnostics, and config drift checks
- GitHub PR comment mode
- before/after eval runner
- SARIF output for GitHub code scanning
- `trace-to-skill doctor` for Codex readiness scoring
- GitHub Action doctor mode with score threshold
- Doctor PR summary comments
- Marketplace-ready action branding and self-dogfooding workflow
- Composite Action outputs for downstream workflow steps
- Job Summary output for generated reports
- `trace-to-skill init` for Codex readiness and agent-learning workflow setup
- Published JSON schemas for deterministic CLI report contracts
- `trace-to-skill benchmark` for public fixture scorecards
- GitHub Action `benchmark` and `all` modes
- `trace-to-skill scorecard` for combined reviewer proof
- `trace-to-skill oss-brief` for OpenAI OSS application-ready evidence
- Codex file tree and workspace navigation UI failure detection
- Codex remote connection and SSH workspace failure detection
- Codex usage reset schedule drift detection
- Scorecard JSON schema and Action outputs
- Tag-pinned GitHub Action runtime via `$GITHUB_ACTION_PATH`
- Scorecard PR comments with update-in-place marker
- public benchmark of common agent failure classes

See [docs/ROADMAP.md](docs/ROADMAP.md).

## Design Principles

- Evidence first: every suggestion must point to trace lines.
- Maintainer control: generated rules are suggestions, not automatic policy changes.
- No secret leakage: reports redact common token patterns.
- Model agnostic: useful for Codex, Claude Code, Cursor, Copilot, Gemini CLI, and other coding agents.
- Small surface area: no runtime dependencies in the CLI.

## Contributing

Contributions are welcome, especially:

- real-world anonymized failed agent traces
- new failure detectors
- adapters for Codex, Claude Code, Cursor, Copilot, and Gemini CLI
- eval fixtures proving a rule improves behavior
- docs for maintainer workflows

Read [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).

## License

Apache-2.0. See [LICENSE](LICENSE).
