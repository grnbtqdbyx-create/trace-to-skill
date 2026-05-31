# OpenAI OSS Strategy

This project is designed to be useful to OpenAI and to open-source maintainers without pretending that agents should run unchecked.

## Why OpenAI Should Care

Codex gets more useful when maintainers can repeatedly improve repository-specific agent behavior from real evidence. The hard parts of OSS maintenance are not only code generation:

- reading long issue history
- checking stale reports
- reviewing PRs
- enforcing project-specific rules
- preserving security and release quality
- preventing repeated agent mistakes

`trace-to-skill` turns those repeated failures into reviewable instructions and skills.

The first public release already supports Codex-style JSONL normalization and pull request comment reports, so maintainers can connect real agent runs to GitHub review workflows.

The `codex-report` command now turns redacted traces into OpenAI/Codex issue-ready Markdown, which helps users file concise reports with line-linked evidence instead of pasting entire private transcripts.

The public Codex Issue Map connects active issue clusters to the right detector and command, making the project easier for Codex users, OpenAI triage, and search crawlers to understand quickly.

SARIF output also lets maintainers surface agent workflow risks inside GitHub code scanning, which makes MCP and instruction-risk findings visible in existing security review surfaces.

## OSS Maintainer Value

Maintainers can use the tool to:

- add explicit verification rules to `AGENTS.md`
- create small reusable `SKILL.md` workflows
- block risky agent runs in CI
- explain why an AI-generated PR needs more evidence
- improve Codex workflows without locking into one provider
- file better OpenAI/Codex issues with redacted evidence and diagnostics
- detect when sensitive files such as `.env`, private keys, package auth files, cloud credentials, or local databases entered agent context
- attribute unexpected usage drain to background polling, compaction tax, retry loops, idle app activity, or other orchestration overhead

## Current Wedge

GitHub discovery research points to three active categories where maintainers are already paying attention:

- `AGENTS.md` playbooks and rule packs
- MCP and prompt-injection security tooling
- coding-agent evals and reviewer proof

`trace-to-skill` sits at the intersection: it does not try to replace those tools, it gives maintainers a deterministic loop for turning real agent failures into reviewable rules and CI evidence.

## What We Should Measure

- number of public repos using the GitHub Action
- number of generated rules accepted by maintainers
- reduction in repeated failure classes across runs
- number of external issue reports with real traces
- star growth from maintainer communities
