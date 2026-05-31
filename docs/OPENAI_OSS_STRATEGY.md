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

## OSS Maintainer Value

Maintainers can use the tool to:

- add explicit verification rules to `AGENTS.md`
- create small reusable `SKILL.md` workflows
- block risky agent runs in CI
- explain why an AI-generated PR needs more evidence
- improve Codex workflows without locking into one provider

## What We Should Measure

- number of public repos using the GitHub Action
- number of generated rules accepted by maintainers
- reduction in repeated failure classes across runs
- number of external issue reports with real traces
- star growth from maintainer communities
