# trace-to-skill Benchmark

Status: **pass**

This benchmark runs the public fixture pack that ships with the repository and package. It is not a model leaderboard; it checks whether deterministic detectors still catch the agent-workflow failure classes the project claims to cover.

| Case | Fixture | Score | Findings | Critical | Detected kinds | Result |
| --- | --- | ---: | ---: | ---: | --- | --- |
| Clean validated agent run | `fixtures/safe-run.md` | 100 | 0 | 0 | none | pass |
| Failed workflow with missing validation | `fixtures/failed-run.md` | 18 | 5 | 1 | `hallucinated_file`, `mcp_risk`, `premature_completion`, `test_failure`, `tests_not_run` | pass |
| Codex JSONL failed session | `fixtures/codex-session.jsonl` | 50 | 3 | 1 | `premature_completion`, `test_failure`, `weak_evidence` | pass |
| Codex context compaction failure | `fixtures/context-compaction.md` | 75 | 2 | 0 | `context_compaction`, `weak_evidence` | pass |
| Codex latest-turn drift after compaction | `fixtures/codex-latest-turn-drift.md` | 59 | 3 | 0 | `codex_latest_turn_drift`, `premature_completion`, `weak_evidence` | pass |
| Codex model and runtime latency regression | `fixtures/codex-latency-regression.md` | 75 | 2 | 0 | `codex_latency_regression`, `weak_evidence` | pass |
| Codex approval persistence and MCP approval friction | `fixtures/codex-approval-friction.md` | 59 | 3 | 0 | `codex_approval_friction`, `sandbox_permission`, `weak_evidence` | pass |
| Codex sandbox permission failure | `fixtures/sandbox-permission.md` | 75 | 2 | 0 | `sandbox_permission`, `weak_evidence` | pass |
| Codex auth and connectivity failure | `fixtures/codex-connectivity.md` | 75 | 2 | 0 | `codex_connectivity`, `weak_evidence` | pass |
| Codex remote-control route health failure | `fixtures/codex-remote-control.md` | 75 | 2 | 0 | `codex_remote_control`, `weak_evidence` | pass |
| Codex quota mismatch | `fixtures/quota-mismatch.md` | 75 | 2 | 0 | `quota_mismatch`, `weak_evidence` | pass |
| MCP config with secret exposure | `fixtures/mcp-risk.json` | 59 | 2 | 1 | `mcp_risk`, `secret_exposure` | pass |
| Sensitive file access in agent context | `fixtures/sensitive-file-access.md` | 75 | 2 | 0 | `sensitive_file_access`, `weak_evidence` | pass |
| Codex MCP runtime failure | `fixtures/codex-mcp-runtime.md` | 75 | 2 | 0 | `codex_mcp_runtime`, `weak_evidence` | pass |
| Codex plugin runtime and bundled capability failure | `fixtures/codex-plugin-runtime.md` | 75 | 2 | 0 | `codex_plugin_runtime`, `weak_evidence` | pass |
| Codex session resume and state failure | `fixtures/codex-session-state.md` | 59 | 3 | 0 | `codex_resource_leak`, `codex_session_state`, `weak_evidence` | pass |
| Codex token burn and usage-drain loop | `fixtures/codex-token-burn.md` | 59 | 3 | 0 | `codex_resource_leak`, `codex_token_burn`, `weak_evidence` | pass |
| Codex resource leak and runaway process | `fixtures/codex-resource-leak.md` | 75 | 2 | 0 | `codex_resource_leak`, `weak_evidence` | pass |
| Codex tool-call integrity and rollback failure | `fixtures/codex-tool-call-integrity.md` | 59 | 3 | 0 | `codex_resource_leak`, `codex_tool_call_integrity`, `weak_evidence` | pass |
| Untrusted PR comment prompt injection | `fixtures/prompt-injection.md` | 50 | 3 | 1 | `premature_completion`, `prompt_injection`, `weak_evidence` | pass |
| Conflicting agent instruction files | `fixtures/instruction-drift` | 84 | 1 | 0 | `ignored_instruction` | pass |

Run it locally:

```bash
trace-to-skill benchmark
trace-to-skill benchmark --format json
```
