# Launch Plan

The launch goal is to reach maintainers who already use Codex, Claude Code, Cursor, Copilot coding agent, or MCP tools and have felt repeated agent workflow failures.

## Positioning

Primary headline:

> Turn failed AI coding-agent runs into reusable AGENTS.md rules and SKILL.md files.

Secondary headline:

> Make Codex and Claude Code learn from failed runs without training a model.

## Communities

- r/codex
- r/OpenAI
- r/ClaudeAI
- r/ClaudeCode
- r/mcp
- r/opensource
- Hacker News Show HN
- GitHub Discussions in agent tooling projects when relevant and non-spammy

## Launch Checklist

- [x] Public GitHub repo
- [x] Apache-2.0 license
- [x] CI passing
- [x] README with example output
- [x] npm package available
- [x] GitHub Action example
- [x] demo traces for failed runs, safe runs, Codex JSONL, MCP risk, and instruction drift
- [x] first issue labels and roadmap issues
- [x] first release tag
- [x] zero-setup demo command with packaged public fixture output
- [x] SARIF output for GitHub code scanning
- [x] Codex readiness scorecard with `trace-to-skill doctor`
- [x] GitHub Action doctor mode with score threshold
- [x] Doctor PR summary comments
- [x] Action metadata branding and self-dogfooding Codex readiness workflow
- [x] Composite Action outputs for score, status, summary, and report paths
- [x] GitHub Actions Job Summary output for generated reports
- [x] one-command Codex readiness and agent-learning setup with `trace-to-skill init`
- [x] published JSON schemas for deterministic CLI report contracts
- [x] maintainer adoption guide with copy-paste PR template
- [x] built-in fixture benchmark and public scorecard
- [x] GitHub Action benchmark and all-in-one modes
- [x] combined scorecard for reviewer proof
- [x] scorecard JSON schema and Action outputs
- [x] tag-pinned GitHub Action runtime via `$GITHUB_ACTION_PATH`
- [x] scorecard PR comments with update-in-place marker
- [x] discovery PR to awesome-codex-cli: https://github.com/milisp/awesome-codex-cli/pull/35
- [x] discovery PR to awesome-harness-engineering: https://github.com/ai-boost/awesome-harness-engineering/pull/45
- [x] discovery PR to awesome-codex-cli: https://github.com/RoggeOhta/awesome-codex-cli/pull/63
- [x] discovery PR to awesome-codex-skills: https://github.com/ComposioHQ/awesome-codex-skills/pull/90
- [x] crawler-friendly `llms.txt` and `docs/DISCOVERY.md`
- [x] npm Trusted Publishing workflow prepared for release automation without repeated local web auth
- [x] OpenAI/Codex issue-ready report command with redaction-first workflow
- [x] Codex token-burn detector for usage drain, background polling, idle app, compaction tax, and cached-token evidence
- [x] Codex usage reset drift detector for moving weekly reset anchors and saved-usage loss reports
- [x] Codex resource-leak detector for high CPU/GPU/RAM, orphaned shell snapshots, renderer/helper loops, and thinking-animation GPU reports
- [x] Codex issue map linking active issue clusters to deterministic report commands
- [x] Maintainer Roadmap in issue-map output with next artifact and command recommendations
- [x] Live Codex Issue Radar demo generated from public `openai/codex` issues
- [x] Sensitive-file access detector for `.env`, private keys, package auth files, cloud credentials, and local databases
- [x] Codex file tree/workspace navigation UI detector for `View > Toggle File Tree`, stale file panels, and preview failures

## Current Public Proof

- Repository: https://github.com/grnbtqdbyx-create/trace-to-skill
- npm: https://www.npmjs.com/package/trace-to-skill
- Latest release: https://github.com/grnbtqdbyx-create/trace-to-skill/releases/tag/v0.1.102
- CI: passing on `main`
- Codex issue map: https://github.com/grnbtqdbyx-create/trace-to-skill/blob/main/docs/CODEX_ISSUE_MAP.md
- Codex Issue Radar demo: https://github.com/grnbtqdbyx-create/trace-to-skill/blob/main/docs/CODEX_ISSUE_RADAR.md
- Demo: https://github.com/grnbtqdbyx-create/trace-to-skill/blob/main/docs/DEMO.md
- Profile README: https://github.com/grnbtqdbyx-create/grnbtqdbyx-create

## npm Install

The package is published on npm:

```bash
npx trace-to-skill demo
npx trace-to-skill doctor .
npm install -D trace-to-skill
```

## Non-Spam Rule

Do not comment on unrelated issues just to promote the project. Only comment when a maintainer is explicitly discussing repeated agent failures, Codex/Claude instruction drift, MCP risk, or trace-based evals.
