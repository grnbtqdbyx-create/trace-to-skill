# Announcement Copy

## Short

I built `trace-to-skill`: an open-source CLI that checks whether a repo is Codex-ready, then turns failed Codex / Claude Code / Cursor runs into reusable `AGENTS.md` rules, `SKILL.md` files, and eval evidence.

The loop is simple:

```text
repo doctor -> failed agent run -> failure class -> reusable rule/skill -> eval gate
```

GitHub: https://github.com/grnbtqdbyx-create/trace-to-skill

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
- a GitHub Action readiness gate
- a PR comment with the readiness score and top recommendations
- a self-dogfooding workflow for its own Codex readiness
- Action outputs for downstream workflows
- GitHub Actions Job Summary reports
- one-command setup for Codex readiness and agent-learning workflows
- JSON schemas for deterministic CLI report contracts
- a maintainer adoption guide with privacy checklist and PR template
- an Agent Learning Report
- suggested AGENTS.md rules
- suggested SKILL.md content
- an eval score that can fail CI

It is deterministic and local-first right now; no runtime network calls.

Example:

npx github:grnbtqdbyx-create/trace-to-skill doctor .
npx github:grnbtqdbyx-create/trace-to-skill doctor . --threshold 85
npx github:grnbtqdbyx-create/trace-to-skill doctor-comment . --threshold 85 --dry-run

I’m especially looking for anonymized failed agent traces and feedback from OSS maintainers who review AI-generated PRs.

Repo: https://github.com/grnbtqdbyx-create/trace-to-skill
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
```
