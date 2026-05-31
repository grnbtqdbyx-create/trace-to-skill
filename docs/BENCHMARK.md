# trace-to-skill Benchmark

Status: **pass**

This benchmark runs the public fixture pack that ships with the repository and package. It is not a model leaderboard; it checks whether deterministic detectors still catch the agent-workflow failure classes the project claims to cover.

| Case | Fixture | Score | Findings | Critical | Detected kinds | Result |
| --- | --- | ---: | ---: | ---: | --- | --- |
| Clean validated agent run | `fixtures/safe-run.md` | 100 | 0 | 0 | none | pass |
| Failed workflow with missing validation | `fixtures/failed-run.md` | 18 | 5 | 1 | `hallucinated_file`, `mcp_risk`, `premature_completion`, `test_failure`, `tests_not_run` | pass |
| Codex JSONL failed session | `fixtures/codex-session.jsonl` | 50 | 3 | 1 | `premature_completion`, `test_failure`, `weak_evidence` | pass |
| Codex context compaction failure | `fixtures/context-compaction.md` | 75 | 2 | 0 | `context_compaction`, `weak_evidence` | pass |
| Codex sandbox permission failure | `fixtures/sandbox-permission.md` | 75 | 2 | 0 | `sandbox_permission`, `weak_evidence` | pass |
| Codex quota mismatch | `fixtures/quota-mismatch.md` | 75 | 2 | 0 | `quota_mismatch`, `weak_evidence` | pass |
| MCP config with secret exposure | `fixtures/mcp-risk.json` | 59 | 2 | 1 | `mcp_risk`, `secret_exposure` | pass |
| Untrusted PR comment prompt injection | `fixtures/prompt-injection.md` | 50 | 3 | 1 | `premature_completion`, `prompt_injection`, `weak_evidence` | pass |
| Conflicting agent instruction files | `fixtures/instruction-drift` | 84 | 1 | 0 | `ignored_instruction` | pass |

Run it locally:

```bash
trace-to-skill benchmark
trace-to-skill benchmark --format json
```
