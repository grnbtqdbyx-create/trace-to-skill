# trace-to-skill

[![CI](https://github.com/grnbtqdbyx-create/trace-to-skill/actions/workflows/ci.yml/badge.svg)](https://github.com/grnbtqdbyx-create/trace-to-skill/actions/workflows/ci.yml)
[![Codex Readiness](https://github.com/grnbtqdbyx-create/trace-to-skill/actions/workflows/codex-readiness.yml/badge.svg)](https://github.com/grnbtqdbyx-create/trace-to-skill/actions/workflows/codex-readiness.yml)
[![Release](https://img.shields.io/github/v/release/grnbtqdbyx-create/trace-to-skill)](https://github.com/grnbtqdbyx-create/trace-to-skill/releases)
[![npm](https://img.shields.io/npm/v/trace-to-skill)](https://www.npmjs.com/package/trace-to-skill)
[![npm downloads](https://img.shields.io/npm/dm/trace-to-skill)](https://www.npmjs.com/package/trace-to-skill)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-339933.svg)](package.json)

Turn failed AI coding-agent runs into reusable `AGENTS.md` rules, `SKILL.md` files, and eval evidence.

```bash
npx trace-to-skill doctor .
npx trace-to-skill lint-agents .
npx trace-to-skill analyze ./runs
npx trace-to-skill codex-report ./runs
npx trace-to-skill init --comment --sarif
npx trace-to-skill suggest ./runs --target agents-md
npx trace-to-skill eval ./runs --threshold 80
npx trace-to-skill benchmark
npx trace-to-skill scorecard .
npx trace-to-skill scorecard-comment . --dry-run
npx trace-to-skill guard-github-event "$GITHUB_EVENT_PATH"
npx trace-to-skill comment ./runs --dry-run
npx trace-to-skill compare --before ./runs/before --after ./runs/after
```

AI coding agents are getting good enough to change real repositories, but they still repeat the same workflow mistakes: claiming success without tests, ignoring repo instructions, over-editing, inventing files, leaking secrets into traces, or enabling risky MCP tools.

`trace-to-skill` closes that loop:

```text
failed agent run -> failure class -> reusable rule/skill -> eval gate -> keep or revise
```

It is built for maintainers using Codex, Claude Code, Cursor, Copilot coding agent, Gemini CLI, OpenCode, or MCP-enabled workflows.

## Fast Use Cases

Use it when you need to:

- **Gate Codex-ready PRs:** run `trace-to-skill scorecard .` in CI and post a reviewer-friendly readiness comment.
- **Harden agent instructions:** run `trace-to-skill lint-agents .` to catch missing `AGENTS.md`, conflicting tool instructions, missing includes, nested instruction drift, encoding issues, and risky MCP config.
- **Protect agent context:** run `trace-to-skill guard-github-event "$GITHUB_EVENT_PATH"` before feeding issue, PR, comment, discussion, check-run, or commit text into an agent.
- **Share failed traces safely:** run `trace-to-skill redact ./runs --output redacted-runs` before publishing anonymized failure fixtures.
- **Triage stuck Codex sessions:** run `trace-to-skill analyze ./runs` to catch context compaction failures such as compact stream disconnects, `context_length_exceeded`, and schema mismatches.
- **Diagnose sandbox blockers:** run `trace-to-skill analyze ./runs` on Codex traces that fail with sandbox setup refresh, `os error 740`, ACL, ownership, or approval-mode permission errors.
- **Debug Codex auth/connectivity:** run `trace-to-skill analyze ./runs` on logs with `token_exchange_failed`, `auth.openai.com/oauth/token`, Cloudflare challenge, proxy/CA, IPv6, or stream disconnect symptoms.
- **Prove remote-control route health:** run `trace-to-skill analyze ./runs` when Codex mobile/remote sessions show `Waiting for desktop`, `Directory Unavailable`, stale listener/cache, missing helper bundle, or stale enrollment symptoms.
- **Triage Codex MCP runtime failures:** run `trace-to-skill analyze ./runs` when MCP tools are listed but Codex cancels approval, drops namespace/serverName metadata, routes to `unsupported call`, or closes stdio transport.
- **Debug Codex resume/session state:** run `trace-to-skill analyze ./runs` when `codex resume` freezes, large JSONL histories make Desktop sluggish, recent context disappears after resume, or SQLite migration/state errors break goals.
- **Attribute token burn:** run `trace-to-skill analyze ./runs` when Codex drains usage unexpectedly because of background polling, idle app activity, compaction loops, retry spirals, fast-mode drift, or cached-token-heavy turns.
- **File better OpenAI/Codex issues:** run `trace-to-skill codex-report ./runs` to turn a failed trace into a redaction-aware, copy-paste-ready issue body with evidence and diagnostics.
- **Package quota bugs cleanly:** run `trace-to-skill analyze ./runs` on Codex traces where `/status` or the usage page shows remaining quota but the client returns `You've hit your usage limit`.

For copy-paste workflows, see [docs/USE_CASES.md](https://github.com/grnbtqdbyx-create/trace-to-skill/blob/main/docs/USE_CASES.md). For crawler-friendly metadata, see [docs/DISCOVERY.md](https://github.com/grnbtqdbyx-create/trace-to-skill/blob/main/docs/DISCOVERY.md) and [llms.txt](https://github.com/grnbtqdbyx-create/trace-to-skill/blob/main/llms.txt).

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
- Did Codex sandbox setup or workspace permissions block every tool call?
- Did quota accounting, account switching, or reset timing contradict the runtime usage-limit error?
- Did an MCP tool appear in `tools/list` but fail at Codex runtime because approval, namespace routing, or stdio lifecycle broke?
- Did a long local Codex session become impossible to resume because history size, context compression, archived chat loading, or state migration broke?
- Did usage burn come from useful model work, background polling, compaction/replay, retry loops, subagents, or idle app activity?
- Can the failure be reported to OpenAI with line-linked evidence, redaction notes, and the exact diagnostics maintainers need?

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
| Hidden Unicode | Invisible instruction or code-review manipulation |
| Prompt injection | Untrusted issue, PR, log, or web text asks the agent to ignore policy or leak secrets |
| Context compaction | Codex compact task fails, disconnects, loops, or hits `context_length_exceeded` |
| Sandbox permission | Codex sandbox setup, approval mode, ACL, or workspace ownership blocks tool execution |
| Codex connectivity | Auth token exchange, proxy/CA, IPv6, Cloudflare challenge, or ChatGPT transport errors block Codex |
| Codex remote control | Mobile or remote sessions route through stale listeners, stale enrollment, or incomplete helper bundles |
| Codex MCP runtime | MCP tools are configured but approval, namespace routing, unsupported callable names, or stdio transport fail at runtime |
| Codex session state | Resume, history rendering, context compression, archived chats, or local SQLite/global-state migrations break long sessions |
| Codex token burn | Background polling, idle app activity, compaction/replay, cached-token-heavy turns, or retry loops drain usage unexpectedly |
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
```

This removes common API keys, GitHub/npm/Slack tokens, bearer tokens, email addresses, local home paths, and hidden Unicode controls while preserving enough context for maintainer review.

Scaffold a repo:

```bash
trace-to-skill init --comment --sarif
```

`init` writes `.github/workflows/codex-readiness.yml`, `.github/workflows/agent-learning.yml`, `runs/README.md`, and `runs/.gitkeep`. The generated workflows use the published GitHub Action, expose score/report outputs, and will not overwrite existing files unless `--force` is passed.

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
- `.json`
- `.jsonl`

JSONL traces are normalized by extracting common fields such as `message`, `content`, `text`, `output`, and `error`. Codex-style JSONL traces with `response_item`, `function_call`, `function_call_output`, and `event_msg` payloads are normalized into readable evidence lines.

MCP configs with `mcpServers`, `.mcp.json`, or project-local `.codex/config.toml` are parsed for capability hints such as filesystem, shell, browser, network, database, container, and secret-bearing environment variables. `lint-agents` also checks static startup inputs such as `command`, `cwd`, env placeholders, unresolved `$VARS`, `${CLAUDE_PLUGIN_ROOT}`-style plugin placeholders, local stdio commands without explicit `cwd`, and the common JSON `mcp_servers` / `mcpServers` casing mismatch. Codex config hygiene checks catch deprecated `[features].codex_hooks`, missing `default_permissions` profile definitions, and machine-local `projects.* trusted_level` metadata in synced config files.

Instruction files such as `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.cursor/rules`, and `.github/copilot-instructions.md` are checked for obvious contradictions in validation commands, test requirements, destructive-command approval rules, invalid UTF-8, missing include targets, and nested `AGENTS.md` files that may not be loaded automatically.

## JSON Schemas

Stable machine-readable contracts are published with the npm package and release tarball:

- [`schemas/analysis-result.schema.json`](schemas/analysis-result.schema.json) describes `trace-to-skill analyze --format json`.
- [`schemas/agents-lint-result.schema.json`](schemas/agents-lint-result.schema.json) describes `trace-to-skill lint-agents --format json`.
- [`schemas/doctor-result.schema.json`](schemas/doctor-result.schema.json) describes `trace-to-skill doctor --format json`.
- [`schemas/redact-result.schema.json`](schemas/redact-result.schema.json) describes `trace-to-skill redact --format json`.
- [`schemas/scorecard-result.schema.json`](schemas/scorecard-result.schema.json) describes `trace-to-skill scorecard --format json`.

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
      - uses: grnbtqdbyx-create/trace-to-skill@v0.1.38
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
  uses: grnbtqdbyx-create/trace-to-skill@v0.1.38
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

By default, generated reports are also appended to the GitHub Actions Job Summary. Set `job-summary: "false"` to disable that UI output.

Tagged Action releases build and run the CLI from `$GITHUB_ACTION_PATH`, so a workflow pinned to a release tag such as `@v0.1.38` executes that release's checked-out source instead of pulling the default branch at runtime.

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
