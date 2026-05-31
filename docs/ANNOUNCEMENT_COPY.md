# Announcement Copy

## Short

I built `trace-to-skill`: an open-source CLI that turns failed Codex / Claude Code / Cursor runs into reusable `AGENTS.md` rules, `SKILL.md` files, and eval evidence.

The loop is simple:

```text
failed agent run -> failure class -> reusable rule/skill -> eval gate
```

GitHub: https://github.com/grnbtqdbyx-create/trace-to-skill

## Reddit / Hacker News

Title:

```text
Show HN: trace-to-skill turns failed AI coding-agent runs into reusable rules
```

Body:

```text
I built trace-to-skill, a small open-source CLI for maintainers using Codex, Claude Code, Cursor, Copilot, or MCP-enabled coding agents.

The problem: agents often repeat the same workflow failures: claiming success without tests, inventing files, ignoring repo instructions, leaking secrets into traces, or using risky MCP tools without a trust boundary.

trace-to-skill scans agent traces/logs and generates:

- an Agent Learning Report
- suggested AGENTS.md rules
- suggested SKILL.md content
- an eval score that can fail CI

It is deterministic and local-first right now; no runtime network calls.

Example:

npx github:grnbtqdbyx-create/trace-to-skill analyze ./runs

I’m especially looking for anonymized failed agent traces and feedback from OSS maintainers who review AI-generated PRs.

Repo: https://github.com/grnbtqdbyx-create/trace-to-skill
```

## X / LinkedIn

```text
I built trace-to-skill:

failed Codex / Claude / Cursor run
-> failure class
-> AGENTS.md rule or SKILL.md
-> eval gate

The goal is not autonomous policy rewrites. It is evidence-backed agent improvement for OSS maintainers.

https://github.com/grnbtqdbyx-create/trace-to-skill
```

