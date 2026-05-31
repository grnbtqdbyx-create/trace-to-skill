# OpenAI Codex for OSS Application Draft

Use this after the project has public usage signals. Do not submit too early if the repository still has no external stars, issues, or users.

## Repository URL

https://github.com/grnbtqdbyx-create/trace-to-skill

https://www.npmjs.com/package/trace-to-skill

## Role

Primary maintainer.

## Why This Repository Qualifies

`trace-to-skill` helps OSS maintainers safely adopt Codex and other coding agents by turning failed agent runs into evidence-backed `AGENTS.md` rules, `SKILL.md` workflows, and eval gates. It targets real maintainer work: PR review, issue triage, release quality, MCP risk, and repeated agent failure reduction.

Current proof points:

- Public repo with Apache-2.0 license.
- Public npm package for one-command use.
- Crawler-friendly `llms.txt` and `docs/DISCOVERY.md` for bot/research discovery.
- CI-backed TypeScript CLI.
- Codex-style JSONL parsing.
- Codex-readiness doctor command for maintainer repositories.
- Focused AGENTS.md / MCP config linter for repository instruction hygiene.
- Missing-path, missing-include, nested-instruction, invalid-UTF-8, and oversized-instruction checks for AGENTS.md and tool instruction files.
- GitHub Action `agents-lint` mode and public AGENTS.md lint report.
- GitHub Action doctor mode with configurable readiness threshold.
- Pull request comments for Codex readiness scores and recommendations.
- Self-dogfooding Codex readiness workflow in the repository.
- Composite Action outputs for downstream maintainer workflows.
- GitHub Actions Job Summary output for generated reports.
- One-command setup for Codex readiness and agent-learning workflows.
- Published JSON schemas for deterministic CLI report contracts.
- Maintainer adoption guide with privacy checklist and PR template.
- Built-in fixture benchmark with public scorecard.
- GitHub Action benchmark and all-in-one modes for CI proof.
- Combined scorecard for reviewer-ready Codex readiness and benchmark proof.
- Scorecard JSON schema and GitHub Action outputs for downstream automation.
- Tag-pinned GitHub Action runtime via `$GITHUB_ACTION_PATH`.
- Scorecard pull request comments with update-in-place marker.
- Prompt-injection detection for untrusted issue, PR, log, and web text.
- Codex-native `codex-readiness-auditor` skill for repeatable maintainer audits.
- GitHub event context guard for scanning PR, issue, comment, discussion, check-run, and commit text before Codex acts on it.
- Privacy-preserving `redact` command for sharing failed traces without common tokens, emails, local paths, or hidden Unicode controls.
- MCP config capability, secret-risk, JSON/TOML static startup-input diagnostics, and Codex config drift checks.
- `AGENTS.md` / `CLAUDE.md` contradiction detection.
- Pull request comment reports.
- SARIF output for GitHub code scanning.
- Before/after eval comparison with keep/revise/reject decisions.
- One-command repository setup via `trace-to-skill init`.
- Public release v0.1.35.
- Current GitHub scorecard: 100/100 Codex-ready, benchmark passing.

500-character version:

> trace-to-skill helps OSS maintainers safely adopt Codex by converting failed agent runs into evidence-backed AGENTS.md rules, SKILL.md workflows, and eval gates. It targets real maintainer work: PR review, issue triage, release quality, MCP risk, and repeated agent failure reduction.

## How API Credits Would Be Used

Credits would power optional trace analysis and before/after eval runs for open-source maintainers: classify failed Codex sessions, generate candidate rules/skills, rerun validation, and produce PR-ready reports. Credits would not be required for local deterministic scanning.

500-character version:

> Credits would power optional trace analysis and before/after eval runs for OSS maintainers: classify failed Codex sessions, generate candidate rules/skills, rerun validation, and produce PR-ready reports. The local deterministic scanner remains free and dependency-light.

## Anything Else

The project is designed around maintainer control: generated rules are suggestions, evidence is line-linked, secrets are redacted, and eval gates fail closed on critical findings.
