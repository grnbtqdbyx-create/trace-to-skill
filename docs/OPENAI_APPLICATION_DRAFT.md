# OpenAI Codex for OSS Application Draft

Use this after the project has public usage signals. Do not submit too early if the repository still has no external stars, issues, or users.

## Repository URL

https://github.com/grnbtqdbyx-create/trace-to-skill

https://www.npmjs.com/package/trace-to-skill

## Role

Primary maintainer.

## Why This Repository Qualifies

`trace-to-skill` helps OSS maintainers safely adopt Codex and other coding agents by turning failed agent runs into evidence-backed `AGENTS.md` rules, `SKILL.md` workflows, and eval gates. It targets real maintainer work: PR review, issue triage, release quality, MCP risk, and repeated agent failure reduction.

Current proof points:

- Public repo with Apache-2.0 license.
- Public npm package for one-command use.
- npm Trusted Publishing workflow prepared to reduce manual release friction and avoid long-lived publish tokens.
- Crawler-friendly `llms.txt` and `docs/DISCOVERY.md` for bot/research discovery.
- Public `docs/CODEX_ISSUE_MAP.md` that maps active Codex issue clusters to deterministic report commands.
- CI-backed TypeScript CLI.
- Codex-style JSONL parsing.
- Codex-readiness doctor command for maintainer repositories.
- Focused AGENTS.md / MCP config linter for repository instruction hygiene.
- Missing-path, missing-include, nested-instruction, invalid-UTF-8, and oversized-instruction checks for AGENTS.md and tool instruction files.
- GitHub Action `agents-lint` mode and public AGENTS.md lint report.
- GitHub Action doctor mode with configurable readiness threshold.
- Pull request comments for Codex readiness scores and recommendations.
- Self-dogfooding Codex readiness workflow in the repository.
- Composite Action outputs for downstream maintainer workflows.
- GitHub Actions Job Summary output for generated reports.
- One-command setup for Codex readiness and agent-learning workflows.
- Published JSON schemas for deterministic CLI report contracts.
- Maintainer adoption guide with privacy checklist and PR template.
- Built-in fixture benchmark with public scorecard.
- GitHub Action benchmark and all-in-one modes for CI proof.
- Combined scorecard for reviewer-ready Codex readiness and benchmark proof.
- `oss-brief` command and `docs/OPENAI_OSS_BRIEF.md` for application-ready proof, 500-character summaries, and next-step evidence.
- Zero-setup `demo` command and `docs/DEMO.md` so maintainers can see a real Codex issue report before sharing private traces.
- Scorecard JSON schema and GitHub Action outputs for downstream automation.
- Tag-pinned GitHub Action runtime via `$GITHUB_ACTION_PATH`.
- Scorecard pull request comments with update-in-place marker.
- Prompt-injection detection for untrusted issue, PR, log, and web text.
- Codex-native `codex-readiness-auditor` skill for repeatable maintainer audits.
- GitHub event context guard for scanning PR, issue, comment, discussion, check-run, and commit text before Codex acts on it.
- Privacy-preserving `redact` command for sharing failed traces without common tokens, emails, local paths, or hidden Unicode controls.
- Read-only `sensitive-audit` command that reports sensitive-looking paths and emits reviewable `.agentignore`, `.codexignore`, `.aiexclude`, or `.gitignore` candidates before an agent run without reading file contents.
- Read-only `lsp-audit` command that reports detected repo languages, missing language-server commands, install hints, and evidence files before Codex attempts symbol-aware edits.
- `codex-report` command for turning redacted failed traces into OpenAI/Codex issue-ready Markdown with likely failure class, evidence, diagnostics, and privacy notes.
- Remote compact failure detection for `/compact` and auto-compaction `responses/compact` timeouts, stream disconnects, provider timeout workarounds, and long-thread recovery loss.
- Windows helper path detection for bundled `rg.exe`, `node_repl.exe`, Browser, Chrome, and Computer Use helpers that resolve through blocked WindowsApps/MSIX paths, missing LocalCache bins, broken `CodexSandboxUsers` ACLs, or EFS/copyfile failures.
- Patch overwrite guard for `apply_patch` diffs so `*** Add File` fails before replacing an existing file or symlink target.
- Focused `patch-overwrite` demo and public fixture based on active Codex `apply_patch` overwrite reports.
- Local `session-audit` command for privacy-preserving Codex history diagnostics: rollout JSONL size, line count, largest line size, parse errors, session-index shortness, transcript-like title bloat, subagent lifecycle signal counts, recoverable unindexed thread ids, hashed project groups, and state-file presence.
- Local `config-audit` command for privacy-preserving Codex config diagnostics: legacy profile config, model pins, Speed/Fast persistence drift, sandbox/approval posture, Windows elevated sandbox mode, missing permission profiles, plugin cache drift, and MCP approval sprawl.
- Local `plugin-audit` command for privacy-preserving Codex bundled-plugin diagnostics: plugin cache, manifests, generated marketplaces, optional app-bundle marketplace, Computer Use helper app, `CODEX_HOME`, and unsupported feature flags.
- Local `diagnostics-bundle` command for metadata-only OpenAI support bundles: manifest, README, config audit, plugin audit, and session audit reports without copying raw config, logs, SQLite state, or transcripts.
- Local `checkpoint` command for pre-agent workspace bundles: git status, staged/unstaged binary diffs, restore notes, and copied changed/untracked files without automatic destructive restore.
- Context compaction failure detection for stuck Codex sessions and shareable support traces.
- Sandbox and permission failure detection for Codex setup refresh, Windows `os error 740`, ACL, workspace ownership, and approval-mode drift reports.
- Codex file tree and workspace navigation UI detection for missing `View > Toggle File Tree`, stale floating file panels, and file-preview failures.
- Token-burn attribution for prompt-cache collapse, rapid drain experiments, background polling, idle app activity, compaction/replay overhead, retry loops, cached-token-heavy turns, fast-mode drift, and subagent fan-out.
- Process-audit evidence packaging for Codex Desktop/extension high CPU, Windows PowerShell/pwsh CIM polling, stale process-manager entries, and runaway helpers without posting raw full-machine process dumps.
- Thinking-hang detection for accepted turns, successful local tool calls, delayed first `response_item`, `responses_http` `time.busy` / `time.idle`, stop/interrupt failures, MCP state, and subagent parent/child lifecycle evidence.
- Clipboard/pasted-text attachment detection for `Copy as Markdown` regressions, long pasted prompts becoming `Pasted text.txt`, `/goal` ignoring non-empty fileAttachments, and generated attachments lacking in-app preview/edit/revert actions.
- Deeplink/OAuth launch detection for `codex://oauth_callback`, notification `type=click&tag`, AppX/MSIX protocol registration, browser-extension activation, mobile pairing links, and `codex app <path>` workspace routing regressions.
- Connector auth-cache detection for `401 Reauthentication required`, stale `link_*` ids, `isAccessible: false`, `codex_apps_tools` / `codex_app_directory` cache state, and external MCP fallback evidence.
- Context fork bloat detection for conversation forks that duplicate parent transcript blocks, inflate `input_tokens`, change `prompt_cache_key`, lose prompt-cache lineage, or leak `fork_context` subagent history into child context before new work happens.
- Subagent prompt leakage detection for MultiAgentV2 children that receive assistant/commentary prompt envelopes, sibling prompts, or wrong-task completions despite `fork_turns: "none"`.
- MCP discovery/config-scope detection for CLI-versus-VS Code/Desktop gaps, ignored project `.codex/config.toml`, WSL config path mismatch, `CODEX_HOME` drift, and missing `mcp__*` tool exposure.
- Streamable HTTP MCP detection for Penpot/n8n/DingTalk-style parse, `Content-Type: text/event-stream`, handshake, auth-gate, stale-session, missing-header, and reconnect evidence.
- Hooks runtime detection for duplicate hooks, stale `codex_hooks` warnings, missed `PreToolUse`/`PostToolUse`/`SessionStart` events, live-edit/rate-limit/auto-restore gaps, Code Mode/Windows surface mismatches, and Hooks settings UI evidence.
- Terminal output/scrollback integrity detection for streamed output that disappears, is overwritten, truncates, duplicates, misaligns, snaps to the bottom, or only survives in raw logs/transcripts.
- Subagent lifecycle/state reconciliation detection for stale visible agents, close/readback drift, `thread_spawn_edges`, spawn quota, recent-list child threads, and compaction-lost prior subagent IDs.
- Usage reset schedule drift detection for moving weekly reset anchors, saved usage loss, outage compensation resets, and `/status` versus dashboard reset discrepancies.
- `usage-evidence` reports for scattered `/status`, reset-table, usage-limit, rapid drain experiment, token-total, prompt-cache, cached-input, and orchestration-overhead snippets.
- Resource-leak detection for Codex Desktop, VS Code extension, renderer, GPU, shell snapshot, and helper processes that keep burning CPU/GPU/RAM after the useful work should be idle.
- Quota mismatch detection for usage-limit blocks that contradict `/status`, usage dashboard state, account switching, or reset timing.
- Sensitive-file access detection for `.env`, private keys, package auth files, cloud credentials, local databases, and production secret manifests entering agent context.
- MCP config capability, secret-risk, JSON/TOML static startup-input diagnostics, and Codex config drift checks.
- `AGENTS.md` / `CLAUDE.md` contradiction detection.
- Pull request comment reports.
- SARIF output for GitHub code scanning.
- Before/after eval comparison with keep/revise/reject decisions.
- One-command repository setup via `trace-to-skill init`.
- Public release v0.1.83.
- Current GitHub scorecard: 100/100 Codex-ready, benchmark passing.

500-character version:

> trace-to-skill helps OSS maintainers safely adopt Codex by converting failed agent runs into evidence-backed AGENTS.md rules, SKILL.md workflows, and eval gates. It targets real maintainer work: PR review, issue triage, release quality, MCP risk, and repeated agent failure reduction.

## How API Credits Would Be Used

Credits would power optional trace analysis and before/after eval runs for open-source maintainers: classify failed Codex sessions, generate candidate rules/skills, rerun validation, and produce PR-ready reports. Credits would not be required for local deterministic scanning.

500-character version:

> Credits would power optional trace analysis and before/after eval runs for OSS maintainers: classify failed Codex sessions, generate candidate rules/skills, rerun validation, and produce PR-ready reports. The local deterministic scanner remains free and dependency-light.

## Anything Else

The project is designed around maintainer control: generated rules are suggestions, evidence is line-linked, sensitive path preflights avoid reading secret contents, secrets are redacted, and eval gates fail closed on critical findings.
