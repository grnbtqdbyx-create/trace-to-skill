# Announcement Copy

## Short

I built `trace-to-skill`: an open-source CLI that checks whether a repo is Codex-ready, then turns failed Codex / Claude Code / Cursor runs into reusable `AGENTS.md` rules, `SKILL.md` files, and eval evidence.

The loop is simple:

```text
repo doctor -> failed agent run -> failure class -> reusable rule/skill -> eval gate
```

GitHub: https://github.com/grnbtqdbyx-create/trace-to-skill
npm: https://www.npmjs.com/package/trace-to-skill

## Reddit / Hacker News

Title:

```text
Show HN: trace-to-skill checks Codex readiness and turns failed agent runs into rules
```

Body:

```text
I built trace-to-skill, a small open-source CLI for maintainers using Codex, Claude Code, Cursor, Copilot, or MCP-enabled coding agents.

The problem: agents often repeat the same workflow failures: claiming success without tests, inventing files, ignoring repo instructions, leaking secrets into traces, or using risky MCP tools without a trust boundary.

trace-to-skill checks repo readiness and scans agent traces/logs to generate:

- a Codex Readiness Doctor score
- a focused AGENTS.md / MCP/Codex config linter with instruction composition, JSON/TOML startup, and drift checks
- a GitHub Action readiness gate
- a PR comment with the readiness score and top recommendations
- a self-dogfooding workflow for its own Codex readiness
- Action outputs for downstream workflows
- GitHub Actions Job Summary reports
- one-command setup for Codex readiness and agent-learning workflows
- JSON schemas for deterministic CLI report contracts
- crawler-friendly `llms.txt` and discovery metadata
- a maintainer adoption guide with privacy checklist and PR template
- a built-in fixture benchmark and public scorecard
- GitHub Action benchmark and all-in-one modes
- a combined scorecard for reviewer-ready proof
- scorecard JSON schema and Action outputs
- tag-pinned GitHub Action runtime
- scorecard PR comments with update-in-place marker
- a GitHub event context guard for prompt-injection checks before agents read PR/issue/comment text
- a redaction command for privacy-preserving failed trace sharing
- Codex sandbox setup and permission failure detection for setup refresh, ACL, ownership, and approval-mode problems
- Codex auth/connectivity detection for token exchange, CA certificate, proxy, IPv6, Cloudflare challenge, and stream disconnect evidence
- Codex mobile/remote-control route health detection for stale listener, stale enrollment, missing helper bundle, and `Waiting for desktop` evidence
- Codex MCP runtime detection for cancelled approvals, unsupported routed tool calls, dropped namespace/serverName metadata, and closed stdio transports
- Codex quota mismatch detection for usage-limit, account-switching, reset-time, and rate-limit evidence
- a Codex-native readiness auditor skill
- an Agent Learning Report
- suggested AGENTS.md rules
- suggested SKILL.md content
- an eval score that can fail CI

It is deterministic and local-first right now; no runtime network calls.

Example:

npx trace-to-skill init --comment --sarif
npx trace-to-skill doctor .
npx trace-to-skill lint-agents .
npx trace-to-skill redact ./runs --output redacted-runs
npx trace-to-skill doctor . --threshold 85
npx trace-to-skill benchmark
npx trace-to-skill scorecard .
npx trace-to-skill scorecard-comment . --dry-run
npx trace-to-skill guard-github-event "$GITHUB_EVENT_PATH"
npx trace-to-skill doctor-comment . --threshold 85 --dry-run

I’m especially looking for anonymized failed agent traces and feedback from OSS maintainers who review AI-generated PRs.

Repo: https://github.com/grnbtqdbyx-create/trace-to-skill
npm: https://www.npmjs.com/package/trace-to-skill
```

## X / LinkedIn

```text
I built trace-to-skill:

failed Codex / Claude / Cursor run
repo doctor
-> failure class
-> AGENTS.md rule or SKILL.md
-> eval gate

The goal is not autonomous policy rewrites. It is evidence-backed agent improvement for OSS maintainers.

https://github.com/grnbtqdbyx-create/trace-to-skill
https://www.npmjs.com/package/trace-to-skill
```
