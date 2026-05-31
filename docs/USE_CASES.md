# Use Cases

`trace-to-skill` is for maintainers who want coding agents to produce reviewable evidence instead of repeating the same mistakes.

## 1. Zero-Setup Demo

Use this before collecting or redacting private traces.

```bash
npx trace-to-skill demo
npx trace-to-skill demo --list
npx trace-to-skill demo latency-regression
```

What it proves:

- packaged fixtures can produce a real Codex issue report immediately
- maintainers can inspect the output shape before sharing any private log
- demos cover approval friction, latency, token burn, sensitive files, and prompt injection

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
- uses: grnbtqdbyx-create/trace-to-skill@v0.1.48
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

## 4. Sandbox And Permission Failure Triage

Use this when Codex cannot start tools, apply patches, or write to the workspace because sandbox setup or permissions fail.

```bash
npx trace-to-skill analyze ./runs --format json
```

This catches signals such as Windows sandbox setup refresh failures, `os error 740`, `CodexSandboxOffline` ownership drift, ACL denial, approval-policy mismatch, and Full Access sessions behaving like workspace-write or on-request mode.

## 5. Codex Auth And Connectivity Triage

Use this when Codex cannot log in, exchange an auth token, stream a response, or connect through a container, proxy, VPN, corporate CA, IPv6 network, or Cloudflare challenge.

```bash
npx trace-to-skill analyze ./runs --format json
```

This catches signals such as `token_exchange_failed`, `auth.openai.com/oauth/token`, `codex_login::server`, `cf-mitigated: challenge`, missing `ca-certificates`, `update-ca-certificates`, `CODEX_CA_CERTIFICATE`, IPv6 fallback evidence, proxy/MITM TLS failures, and `stream disconnected before completion` on `chatgpt.com/backend-api/codex/responses`.

## 6. Codex Mobile And Remote-Control Route Health

Use this when Codex mobile, SSH remote, or desktop remote-control says it is connected but commands do not reach the expected host, workspace, or app-server.

```bash
npx trace-to-skill analyze ./runs --format json
```

This catches signals such as `Waiting for desktop`, `Directory: Unavailable`, stale `server_name` enrollment, stale remote-control listener, `127.0.0.1:14567`, missing cached helper files such as `codex-windows-sandbox-setup.exe` or `codex-command-runner.exe`, empty backend environments, stale Android session lists, and temporary recovery after re-pairing or listener restart.

## 7. Codex MCP Runtime Triage

Use this when MCP tools are configured and visible, but Codex cannot actually call them at runtime.

```bash
npx trace-to-skill analyze ./runs --format json
```

This catches signals such as `user cancelled MCP tool call`, `request_user_input is not supported in exec mode`, `Approve app tool call?`, `tool_call_mcp_elicitation`, routed callable names like `mcp__node_repl__js` becoming `unsupported call`, deferred discovery dropping namespace or `serverName`, `tools/list` succeeding while Codex routing fails, and stdio transport lifecycle failures such as `Transport closed`, `stdin_end`, `stdin_close`, `transport_close`, or stderr backpressure.

## 8. Codex Resume And Session State Triage

Use this when long Codex sessions become difficult to resume, Desktop history rendering gets sluggish, or local state migrations break goals/projects/history.

```bash
npx trace-to-skill analyze ./runs --format json
```

This catches signals such as `codex resume` picker hangs, `codex resume <id>` working while the picker freezes, large `rollout-*.jsonl` histories, high JSONL line and `response_item` / `event_msg` / `function_call` counts, large `input_image` payloads, slow `thread/resume` and `thread/goal/get` timings, `Could not load archived chats`, resume compression dropping the last 3-5 turns, `state_5.sqlite` / `goals_1.sqlite` migration mismatches, `no such table: thread_goals`, stale `projectless-thread-ids`, and `thread-workspace-root-hints` reverting after restart.

## 9. Codex Token Burn Attribution

Use this when Codex usage drains faster than expected and the trace needs to separate useful model work from orchestration overhead.

```bash
npx trace-to-skill analyze ./runs --format json
npx trace-to-skill codex-report ./runs --output openai-codex-issue.md
```

This catches signals such as tokens `burning very fast`, usage dropping by visible percentages after one or two prompts, weekly allowance depletion, 5-hour usage reaching 0%, large `input` plus `cached input` totals, `write_stdin` empty polling, background commands repeatedly reporting no new output, idle app usage, compaction tax, retry/tool loops, and missing attribution between normal turns, compaction, background polling, subagents, and retries.

## 10. Quota And Usage-Limit Evidence

Use this when Codex blocks a prompt with a usage-limit message but another surface still shows remaining quota.

```bash
npx trace-to-skill analyze ./runs --format json
```

This catches traces where `/status` or the usage page shows remaining 5h or weekly quota, accounts appear to share limits unexpectedly, a Team account inherits a Plus account's limit state, or quota reset times jump after logout/login.

## 11. Codex Resource Leak Evidence

Use this when Codex Desktop, the VS Code extension, renderer, app-server, GPU process, shell snapshot, or helper process keeps burning local resources after the useful work should be idle.

```bash
npx trace-to-skill analyze ./runs --format json
npx trace-to-skill codex-report ./runs --output openai-codex-issue.md
```

This catches signals such as high `Code Helper (Renderer)` or `Code Helper (Plugin)` CPU, `Codex Helper Renderer`, `Codex app-server`, `syspolicyd`, `zygote`, `WindowServer`, orphaned `shell-snapshot` subprocesses, `.codex/shell_snapshots`, `chat_processes.json`, repeated `thread-stream-state-changed`, `worker_rpc_response_error`, thinking/shimmer GPU loops, and non-Git workspace CPU runaways.

Include process names/PIDs, CPU/GPU/RSS samples over time, log-loop snippets, workspace Git-root state, animation/reduce-motion state, and whether closing the panel/app, killing exact PIDs, `git init`, rollback, or restart clears the leak.

## 12. OpenAI Codex Issue Report

Use this when you want to file or update an OpenAI/Codex issue with a concise, evidence-backed report instead of pasting a full transcript.

```bash
npx trace-to-skill redact ./runs --output redacted-runs
npx trace-to-skill codex-report redacted-runs --output openai-codex-issue.md
```

The report includes the likely Codex failure class, line-linked evidence, diagnostics to attach, and a privacy checklist. This is useful for issues about auth/connectivity, sandbox setup, remote-control routing, MCP runtime calls, resume/session-state failures, quota mismatches, and context compaction.

For a cluster-to-command map of current Codex issue patterns, see [CODEX_ISSUE_MAP.md](CODEX_ISSUE_MAP.md).

## 13. Sensitive File Access Evidence

Use this when a trace suggests an agent read, attached, uploaded, diffed, or indexed credential-bearing files.

```bash
npx trace-to-skill analyze ./runs --format json
npx trace-to-skill codex-report ./runs --output openai-codex-issue.md
```

This catches signals such as `.env`, `.env.production`, `.npmrc`, `.pypirc`, `.netrc`, `.aws/credentials`, `.kube/config`, `.docker/config.json`, private-key PEM blocks, `.sqlite`, `.db`, `secrets.yaml`, and production secret manifests entering agent context.

Before publishing evidence, run `trace-to-skill redact` and attach only redacted excerpts plus the file path/class.

## 14. GitHub Context Guard

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

## 15. Failed Agent Run To Reviewable Rule

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

## 16. Privacy-Preserving Adoption

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
