# Roadmap

`trace-to-skill` exists to make AI coding-agent improvement evidence-based, maintainer-controlled, and safe to share in open-source projects.

## v0.1

- CLI with `analyze`, `suggest`, and `eval`
- Codex-style JSONL normalization for `response_item`, `function_call`, `function_call_output`, and `event_msg`
- Markdown, text, JSON, and JSONL inputs
- Failure taxonomy for common coding-agent mistakes
- `AGENTS.md` and `SKILL.md` suggestions
- Secret redaction in evidence excerpts
- Eval score and non-zero CI gate
- Pull request comment command with update-in-place marker
- Before/after comparison command for keep/revise/reject decisions
- SARIF output for GitHub code scanning and security dashboards
- `trace-to-skill doctor` for repository Codex-readiness scoring
- GitHub Action doctor mode with score threshold
- Doctor PR summary comments with update-in-place marker
- Marketplace-ready action branding and self-dogfooding workflow
- Composite Action outputs for downstream workflow steps
- Job Summary output for generated reports
- `trace-to-skill init` for Codex readiness and agent-learning workflow setup
- Published JSON schemas for `analyze --format json` and `doctor --format json`
- `trace-to-skill benchmark` for the public fixture scorecard
- GitHub Action `benchmark` and `all` modes
- `trace-to-skill scorecard` for combined reviewer proof
- Scorecard JSON schema and Action outputs
- Tag-pinned GitHub Action runtime via `$GITHUB_ACTION_PATH`
- Scorecard PR comments with update-in-place marker
- Prompt-injection detection for untrusted issue, PR, log, and web text
- Codex-native `codex-readiness-auditor` skill for repeatable maintainer audits
- `guard-github-event` for scanning PR, issue, comment, discussion, check-run, and commit text before an agent acts on it
- `lint-agents` for focused AGENTS.md, tool-instruction, MCP capability, and JSON/TOML static MCP startup-input linting
- GitHub Action `agents-lint` mode and outputs
- `redact` for privacy-preserving trace sharing before public issue reports or fixtures

## v0.2

- Claude Code transcript adapters
- Doctor trend history for readiness score changes across PRs
- SARIF output for security-oriented findings
- Doctor checks for OpenAI API credit usage documentation and maintainer handoff depth
- Fixture pack for common agent failures

## v0.3

- Expanded MCP protocol-level diagnostics beyond the current static config checks
- `AGENTS.md` / `CLAUDE.md` contradiction detection
- Before/after rerun harness that can execute commands, not only compare trace artifacts
- Keep/revert decision report
- Expanded public benchmark: "Do agent rules actually reduce repeated failures?"

## v1.0

- Stable failure taxonomy
- JSON schema compatibility policy
- Multi-agent support matrix
- Maintainer adoption guide
- Signed release artifacts
