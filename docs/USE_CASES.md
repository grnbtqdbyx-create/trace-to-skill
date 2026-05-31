# Use Cases

`trace-to-skill` is for maintainers who want coding agents to produce reviewable evidence instead of repeating the same mistakes.

## 1. Codex Readiness Gate

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
- uses: grnbtqdbyx-create/trace-to-skill@v0.1.34
  with:
    mode: all
    doctor-threshold: "85"
    doctor-comment: "true"
    scorecard-comment: "true"
    job-summary: "true"
    github-token: ${{ github.token }}
```

## 2. AGENTS.md And MCP Hygiene

Use this before giving Codex broad repository access.

```bash
npx trace-to-skill lint-agents .
```

This checks:

- whether repository-level agent instructions exist
- whether `AGENTS.md`, `CLAUDE.md`, Cursor rules, Copilot instructions, or other tool guidance conflict
- whether instruction files reference paths that no longer exist or have grown large enough to risk ignored guidance
- whether MCP config hints at risky capabilities such as filesystem, shell, browser, network, database, container, or secret-bearing environment variables
- whether JSON or `.codex/config.toml` MCP startup inputs are obviously broken before launch, including wrong JSON `mcp_servers` casing, missing commands, missing `cwd`, placeholder env values, unresolved `$VARS`, unresolved plugin placeholders, or local stdio commands without explicit `cwd`
- whether Codex config has drift-prone settings such as deprecated `codex_hooks`, missing `default_permissions` profile definitions, or synced `projects.* trusted_level` metadata

The goal is not to ban powerful tools. The goal is to make trust boundaries visible before an agent acts.

## 3. GitHub Context Guard

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

## 4. Failed Agent Run To Reviewable Rule

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

## 5. Privacy-Preserving Adoption

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
