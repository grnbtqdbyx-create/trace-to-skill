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

## v0.2

- Claude Code transcript adapters
- GitHub Action that comments on pull requests
- SARIF output for security-oriented findings
- `trace-to-skill init`
- Fixture pack for common agent failures

## v0.3

- MCP config capability scoring
- `AGENTS.md` / `CLAUDE.md` contradiction detection
- Before/after rerun harness that can execute commands, not only compare trace artifacts
- Keep/revert decision report
- Public benchmark: "Do agent rules actually reduce repeated failures?"

## v1.0

- Stable failure taxonomy
- Stable JSON schema
- Multi-agent support matrix
- Maintainer adoption guide
- Signed release artifacts
