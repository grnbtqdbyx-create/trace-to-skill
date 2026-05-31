# Agent Instructions

This repository builds `trace-to-skill`, a CLI that turns failed AI coding-agent runs into reusable rules, skills, and eval evidence.

## Core Rules

- Keep runtime dependencies at zero unless a new dependency removes substantial complexity.
- Every detector must include a fixture and a `node:test` test.
- Every finding must include line-level evidence and a maintainer-readable suggested rule.
- Do not add network calls to the CLI runtime.
- Redact secrets in any trace excerpt before printing or writing reports.
- Before claiming completion, run `npm run check` and report the result.

## Design Boundaries

- Generated `AGENTS.md` and `SKILL.md` content is advisory. Do not auto-commit generated policy files.
- Prefer deterministic rules before LLM-based analysis.
- Keep outputs useful in GitHub PR comments: concise, evidence-backed, and safe to share.

## Release Checks

Run:

```bash
npm run check
npm pack --dry-run
```

The package should include `dist/src`, `README.md`, `LICENSE`, and `package.json`, not compiled tests.

