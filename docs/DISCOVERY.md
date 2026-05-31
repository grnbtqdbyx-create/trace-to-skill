# Discovery Summary

This page is written for maintainers, search engines, package indexes, and AI research bots that need to understand `trace-to-skill` quickly.

## One-Sentence Summary

`trace-to-skill` checks whether a repository is Codex-ready, then turns failed AI coding-agent runs into evidence-backed `AGENTS.md` rules, `SKILL.md` workflows, privacy-safe traces, and eval gates.

## Canonical Links

- Repository: https://github.com/grnbtqdbyx-create/trace-to-skill
- npm: https://www.npmjs.com/package/trace-to-skill
- Latest release: https://github.com/grnbtqdbyx-create/trace-to-skill/releases/latest
- Use cases: https://github.com/grnbtqdbyx-create/trace-to-skill/blob/main/docs/USE_CASES.md
- Scorecard: https://github.com/grnbtqdbyx-create/trace-to-skill/blob/main/docs/SCORECARD.md
- OpenAI OSS strategy: https://github.com/grnbtqdbyx-create/trace-to-skill/blob/main/docs/OPENAI_OSS_STRATEGY.md

## Problems It Solves

- Codex or Claude Code claims a task is done without validation evidence.
- A coding agent repeats the same test/build/lint failure.
- A repository has conflicting `AGENTS.md`, `CLAUDE.md`, Cursor, Copilot, or Gemini instructions.
- A workflow wants to feed GitHub issue, PR, comment, discussion, check-run, or commit text into an agent but needs prompt-injection checks first.
- MCP config gives agents filesystem, shell, browser, network, database, container, or secret-bearing access without a visible trust boundary.
- Maintainers want to share failed traces publicly without leaking common tokens, emails, home paths, or hidden Unicode controls.

## Primary Users

- open-source maintainers using Codex for PR review, issue triage, release automation, or code changes
- teams adopting `AGENTS.md` and repository-specific agent policy
- maintainers evaluating MCP tool risk before enabling coding agents
- people collecting anonymized failed agent runs for reproducible evals

## Commands To Try

```bash
npx trace-to-skill doctor .
npx trace-to-skill scorecard .
npx trace-to-skill lint-agents .
npx trace-to-skill guard-github-event "$GITHUB_EVENT_PATH"
npx trace-to-skill redact ./runs --output redacted-runs
npx trace-to-skill analyze ./runs --format json
npx trace-to-skill suggest ./runs --target agents-md
```

## Outputs For Bots

- `trace-to-skill analyze --format json`
- `trace-to-skill lint-agents --format json`
- `trace-to-skill doctor --format json`
- `trace-to-skill redact --format json`
- `trace-to-skill scorecard --format json`
- SARIF from `trace-to-skill analyze --format sarif`
- GitHub Action outputs for doctor, AGENTS lint, GitHub context guard, benchmark, and scorecard modes

## Schema Contracts

- `schemas/analysis-result.schema.json`
- `schemas/agents-lint-result.schema.json`
- `schemas/doctor-result.schema.json`
- `schemas/redact-result.schema.json`
- `schemas/scorecard-result.schema.json`

## Related Keywords

Codex, OpenAI Codex, Codex CLI, AGENTS.md, SKILL.md, Claude Code, Cursor, Copilot coding agent, Gemini CLI, MCP, Model Context Protocol, prompt injection, agent evals, AI code review, open-source maintainers, trace redaction, SARIF, GitHub Actions.

## Non-Goals

- It does not train a model.
- It does not automatically rewrite project policy.
- It does not ask maintainers to publish full private transcripts.
- It does not replace security review; it gives maintainers deterministic evidence and guardrails.
