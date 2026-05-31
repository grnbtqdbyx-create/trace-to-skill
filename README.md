# trace-to-skill

[![CI](https://github.com/grnbtqdbyx-create/trace-to-skill/actions/workflows/ci.yml/badge.svg)](https://github.com/grnbtqdbyx-create/trace-to-skill/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/grnbtqdbyx-create/trace-to-skill)](https://github.com/grnbtqdbyx-create/trace-to-skill/releases)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-339933.svg)](package.json)

Turn failed AI coding-agent runs into reusable `AGENTS.md` rules, `SKILL.md` files, and eval evidence.

```bash
npx github:grnbtqdbyx-create/trace-to-skill analyze ./runs
npx github:grnbtqdbyx-create/trace-to-skill suggest ./runs --target agents-md
npx github:grnbtqdbyx-create/trace-to-skill eval ./runs --threshold 80
npx github:grnbtqdbyx-create/trace-to-skill comment ./runs --dry-run
npx github:grnbtqdbyx-create/trace-to-skill compare --before ./runs/before --after ./runs/after
```

AI coding agents are getting good enough to change real repositories, but they still repeat the same workflow mistakes: claiming success without tests, ignoring repo instructions, over-editing, inventing files, leaking secrets into traces, or enabling risky MCP tools.

`trace-to-skill` closes that loop:

```text
failed agent run -> failure class -> reusable rule/skill -> eval gate -> keep or revise
```

It is built for maintainers using Codex, Claude Code, Cursor, Copilot coding agent, Gemini CLI, OpenCode, or MCP-enabled workflows.

## Why This Exists

Open-source maintainers do not need more AI-generated noise. They need agents that learn from concrete failures and produce reviewable evidence.

`trace-to-skill` helps teams answer:

- Why did this Codex or Claude run fail?
- Was the failure caused by missing repo instructions?
- Should this become an `AGENTS.md` rule?
- Should this become a reusable `SKILL.md` workflow?
- Did the proposed rule actually improve the next run?
- Can this be reported in a PR without leaking secrets?

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
| MCP risk | Tool permissions and trust boundaries are unclear |

## Installation

The GitHub release is available now:

```bash
npx github:grnbtqdbyx-create/trace-to-skill analyze ./runs
```

After npm publication:

```bash
npm install -D trace-to-skill
```

or:

```bash
npx trace-to-skill analyze ./runs
```

Requires Node.js 20+.

## CLI

Analyze traces:

```bash
trace-to-skill analyze ./runs --format markdown --output agent-learning-report.md
trace-to-skill analyze ./runs --format json
```

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

Post or update a GitHub pull request comment:

```bash
trace-to-skill comment ./runs --token "$GITHUB_TOKEN"
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

MCP configs with `mcpServers` are parsed for capability hints such as filesystem, shell, browser, network, database, container, and secret-bearing environment variables.

Instruction files such as `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.cursor/rules`, and `.github/copilot-instructions.md` are checked for obvious contradictions in validation commands, test requirements, and destructive-command approval rules.

## GitHub Action

Add this to `.github/workflows/agent-learning.yml`:

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
      - run: npx github:grnbtqdbyx-create/trace-to-skill analyze ./runs --output agent-learning-report.md
      - run: npx github:grnbtqdbyx-create/trace-to-skill comment ./runs --token "${{ github.token }}"
      - run: npx github:grnbtqdbyx-create/trace-to-skill eval ./runs --threshold 80
```

Composite action usage:

```yaml
- uses: grnbtqdbyx-create/trace-to-skill@v0.1.4
  with:
    traces: ./runs
    threshold: "80"
    comment: "true"
    github-token: ${{ github.token }}
```

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
- MCP config parser with explicit capability scoring
- GitHub PR comment mode
- before/after eval runner
- `trace-to-skill init` for repository setup
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
