# Duplicate Audit

Generated: 2026-06-01T05:27:29.534Z
Source: fixture:codex-duplicate-audit
Issue: [#25507 Windows Computer Use unavailable: nativePipe missing and SKY_CUA_NATIVE_PIPE_DIRECTORY not injected](https://github.com/openai/codex/issues/25507)
Suggested duplicates: #25391, #25488

This report checks duplicate suggestions against detected failure kinds, labels, platform/surface signals, and title overlap. Use it to confirm true duplicates or write a narrower non-duplicate clarification.

```bash
trace-to-skill duplicate-audit --repo openai/codex --issue 25507 --format markdown
trace-to-skill duplicate-audit duplicate-audit.json --format json
```

## Summary

- Candidates: 2
- Likely duplicates: 1
- Related but not exact duplicates: 1
- Needs human review: 0
- Weak matches: 0

## Candidates

| Verdict | Confidence | Candidate | Shared kinds | Shared surfaces | Differentiators | Next action |
| --- | ---: | --- | --- | --- | --- | --- |
| likely_duplicate | 100 | [#25391 Windows Computer Use native pipe path missing after plugin update](https://github.com/openai/codex/issues/25391) | codex_plugin_runtime, codex_windows_helper_path | computer-use, desktop-app, windows | none | Close or merge only after confirming the newer issue adds no unique reproduction detail. |
| related_not_duplicate | 80 | [#25488 Windows Codex Desktop: node_repl / Computer Use fails with "windows sandbox failed: spawn setup refresh"](https://github.com/openai/codex/issues/25488) | codex_windows_helper_path | computer-use, desktop-app, windows | issue-only kinds: codex_plugin_runtime; candidate-only kinds: sandbox_permission; candidate-only surfaces: browser, sandbox | Keep open or cross-link with a short note naming the narrower differentiator. |

## Reasoning

### #25391 Windows Computer Use native pipe path missing after plugin update

Verdict: **likely_duplicate** (100/100).
Title overlap: 0.38.
- Shared detected failure kinds: codex_plugin_runtime, codex_windows_helper_path.
- Shared surface/platform signals: computer-use, desktop-app, windows.
- Shared labels: app, bug, computer-use, windows-os.
- Title token overlap is 0.38.

### #25488 Windows Codex Desktop: node_repl / Computer Use fails with "windows sandbox failed: spawn setup refresh"

Verdict: **related_not_duplicate** (80/100).
Title overlap: 0.14.
- Shared detected failure kinds: codex_windows_helper_path.
- Shared surface/platform signals: computer-use, desktop-app, windows.
- Shared labels: app, bug, computer-use, windows-os.
- Differentiating failure kinds: issue-only codex_plugin_runtime; candidate-only sandbox_permission.
- Differentiating surfaces: issue-only none; candidate-only browser, sandbox.
- Title token overlap is 0.14.
