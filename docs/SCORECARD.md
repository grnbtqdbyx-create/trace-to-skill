# trace-to-skill Scorecard

Status: **pass**

| Signal | Result |
| --- | --- |
| Codex readiness | ready |
| Doctor score | 100/100, threshold 95 |
| Failed doctor checks | 0 |
| Critical findings | 0 |
| Built-in benchmark | pass |
| Benchmark cases | 5 |

## Doctor Summary

Repository is Codex-ready, with clear maintainer controls and validation evidence.

## Benchmark Summary

Status: **pass**

This benchmark runs the public fixture pack that ships with the repository and package. It is not a model leaderboard; it checks whether deterministic detectors still catch the agent-workflow failure classes the project claims to cover.

| Case | Fixture | Score | Findings | Critical | Detected kinds | Result |
| --- | --- | ---: | ---: | ---: | --- | --- |
| Clean validated agent run | `fixtures/safe-run.md` | 100 | 0 | 0 | none | pass |
| Failed workflow with missing validation | `fixtures/failed-run.md` | 18 | 5 | 1 | `hallucinated_file`, `mcp_risk`, `premature_completion`, `test_failure`, `tests_not_run` | pass |
| Codex JSONL failed session | `fixtures/codex-session.jsonl` | 50 | 3 | 1 | `premature_completion`, `test_failure`, `weak_evidence` | pass |
| MCP config with secret exposure | `fixtures/mcp-risk.json` | 59 | 2 | 1 | `mcp_risk`, `secret_exposure` | pass |
| Conflicting agent instruction files | `fixtures/instruction-drift` | 84 | 1 | 0 | `ignored_instruction` | pass |

Run it locally:

```bash
trace-to-skill benchmark
trace-to-skill benchmark --format json
```

## Reviewer Notes

- This scorecard is deterministic and local-first.
- It combines repository Codex readiness with the shipped fixture benchmark.
- Passing the scorecard does not mean agents should change policy automatically; generated rules still need maintainer review.

Run it locally:

```bash
trace-to-skill scorecard .
trace-to-skill scorecard . --format json
```
