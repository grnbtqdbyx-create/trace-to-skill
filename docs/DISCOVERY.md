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
- A long Codex thread fails during context compaction with stream disconnects, `context_length_exceeded`, endless auto-compaction, or `unknown variant auto` errors.
- Codex cannot start tools because sandbox setup refresh, Windows `os error 740`, ACL, ownership, or approval-mode permission failures block execution.
- Codex login or response streaming fails because of `token_exchange_failed`, `auth.openai.com/oauth/token`, missing CA certificates, proxy/MITM, IPv6 fallback, Cloudflare challenge, or `stream disconnected before completion`.
- Codex reports `You've hit your usage limit` even though `/status` or the usage dashboard shows quota left, or quota appears shared across accounts.
- A repository has conflicting `AGENTS.md`, `CLAUDE.md`, Cursor, Copilot, or Gemini instructions.
- A monorepo has nested `AGENTS.md` files, `@file.md` instruction includes, or invalid instruction-file encoding that makes Codex load the wrong policy.
- A workflow wants to feed GitHub issue, PR, comment, discussion, check-run, or commit text into an agent but needs prompt-injection checks first.
- MCP config gives agents filesystem, shell, browser, network, database, container, or secret-bearing access without a visible trust boundary.
- MCP config looks valid at a glance but has broken startup inputs, such as missing commands, bad `cwd`, placeholder env vars, unresolved `$VARS`, unresolved plugin placeholders, local stdio commands without explicit `cwd`, or the wrong JSON `mcp_servers` wrapper key.
- Codex config contains drift-prone settings such as deprecated `codex_hooks`, missing `default_permissions` profiles, or synced `projects.* trusted_level` project metadata.
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

Codex, OpenAI Codex, Codex CLI, Codex sandbox, Windows sandbox, Codex auth, token_exchange_failed, Codex connectivity, stream disconnected, Codex quota, usage limit, rate limits, AGENTS.md, SKILL.md, Claude Code, Cursor, Copilot coding agent, Gemini CLI, MCP, Model Context Protocol, prompt injection, agent evals, AI code review, open-source maintainers, trace redaction, SARIF, GitHub Actions.

## Non-Goals

- It does not train a model.
- It does not automatically rewrite project policy.
- It does not ask maintainers to publish full private transcripts.
- It does not replace security review; it gives maintainers deterministic evidence and guardrails.
