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
- [ ] npm package available
- [x] GitHub Action example
- [x] demo traces for failed runs, safe runs, Codex JSONL, MCP risk, and instruction drift
- [x] first issue labels and roadmap issues
- [x] first release tag
- [x] SARIF output for GitHub code scanning
- [x] one-command repository setup with `trace-to-skill init`
- [x] discovery PR to awesome-codex-cli: https://github.com/milisp/awesome-codex-cli/pull/35
- [x] discovery PR to awesome-harness-engineering: https://github.com/ai-boost/awesome-harness-engineering/pull/45

## Current Public Proof

- Repository: https://github.com/grnbtqdbyx-create/trace-to-skill
- Latest release: https://github.com/grnbtqdbyx-create/trace-to-skill/releases/tag/v0.1.6
- CI: passing on `main`
- Profile README: https://github.com/grnbtqdbyx-create/grnbtqdbyx-create

## Blocked Until Account Action

Npm publication is blocked until `npm adduser` is completed locally. After authentication:

```bash
npm publish --access public
```

## Non-Spam Rule

Do not comment on unrelated issues just to promote the project. Only comment when a maintainer is explicitly discussing repeated agent failures, Codex/Claude instruction drift, MCP risk, or trace-based evals.
