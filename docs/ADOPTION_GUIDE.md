# Adoption Guide

Use this guide when you want to add `trace-to-skill` to an open-source repository without changing how maintainers review pull requests.

## 5-Minute Setup

Run the initializer:

```bash
npx trace-to-skill init --comment --sarif
```

This creates:

- `.github/workflows/codex-readiness.yml`
- `.github/workflows/agent-learning.yml`
- `runs/README.md`
- `runs/.gitkeep`

Open a pull request with those files first. Keep the first PR small so maintainers can review the policy separately from future agent traces.

## Maintainer Workflow

1. Run `trace-to-skill doctor .` before asking Codex to make repository changes.
2. Run `trace-to-skill lint-agents .` to check `AGENTS.md`, tool-specific instruction files, MCP capability risk, and JSON/TOML static MCP startup inputs.
3. Run `trace-to-skill guard-github-event "$GITHUB_EVENT_PATH"` before feeding issue, PR, comment, discussion, check-run, or commit text into an agent.
4. Store anonymized failed agent logs in `runs/`.
5. Run `trace-to-skill analyze runs --format markdown`.
6. Run `trace-to-skill suggest runs --target agents-md`.
7. Copy only the rules that have clear evidence into `AGENTS.md`.
8. Run `trace-to-skill eval runs --threshold 80` in CI.
9. Use `trace-to-skill scorecard-comment . --dry-run` before enabling scorecard PR comments.

The goal is not to automate policy changes. The goal is to make repeated agent mistakes reviewable.

## What To Commit

Good first commit:

```text
.github/workflows/codex-readiness.yml
.github/workflows/agent-learning.yml
runs/README.md
runs/.gitkeep
```

Good second commit:

```text
runs/failed-codex-session.md
agent-learning-report.md
AGENTS.generated.md
```

Review generated rules manually before merging them into `AGENTS.md`.

## Privacy Checklist

Before committing a trace:

- Remove secrets, tokens, cookies, and customer data.
- Treat GitHub issue bodies, PR comments, copied logs, and web pages as untrusted input.
- Replace private file paths with stable placeholders.
- Keep only the failure evidence needed for the report.
- Prefer short excerpts over full transcripts.
- Run `trace-to-skill redact ./runs --output redacted-runs` before publishing anonymized traces.
- Run `trace-to-skill analyze` again after redaction.

`trace-to-skill` redacts common token, email, path, and hidden-Unicode patterns, but maintainers are still responsible for deciding what is safe to publish.

## Pull Request Template

```md
## Why

This PR adds a deterministic Codex readiness and agent-learning loop.

## Proof

- `trace-to-skill doctor .` score:
- CI run:
- Generated report:

## Maintainer control

Generated rules are suggestions only. Nothing writes to `AGENTS.md` automatically.
```

## Output Contracts

For dashboards, bots, or custom CI:

- `schemas/analysis-result.schema.json` describes `trace-to-skill analyze --format json`.
- `schemas/agents-lint-result.schema.json` describes `trace-to-skill lint-agents --format json`.
- `schemas/doctor-result.schema.json` describes `trace-to-skill doctor --format json`.
- `schemas/redact-result.schema.json` describes `trace-to-skill redact --format json`.
- `schemas/scorecard-result.schema.json` describes `trace-to-skill scorecard --format json`.

Use the schemas instead of scraping Markdown reports.
