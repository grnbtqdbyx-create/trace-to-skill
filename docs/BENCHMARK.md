# trace-to-skill Benchmark

Status: **pass**

This benchmark runs the public fixture pack that ships with the repository and package. It is not a model leaderboard; it checks whether deterministic detectors still catch the agent-workflow failure classes the project claims to cover.

| Case | Fixture | Score | Findings | Critical | Detected kinds | Result |
| --- | --- | ---: | ---: | ---: | --- | --- |
| Clean validated agent run | `fixtures/safe-run.md` | 100 | 0 | 0 | none | pass |
| Failed workflow with missing validation | `fixtures/failed-run.md` | 18 | 5 | 1 | `hallucinated_file`, `mcp_risk`, `premature_completion`, `test_failure`, `tests_not_run` | pass |
| Codex JSONL failed session | `fixtures/codex-session.jsonl` | 50 | 3 | 1 | `premature_completion`, `test_failure`, `weak_evidence` | pass |
| Codex remote compact task failure | `fixtures/codex-remote-compact.md` | 59 | 3 | 0 | `codex_remote_compact`, `context_compaction`, `weak_evidence` | pass |
| Codex context compaction failure | `fixtures/context-compaction.md` | 59 | 3 | 0 | `codex_remote_compact`, `context_compaction`, `weak_evidence` | pass |
| Codex conversation fork context bloat | `fixtures/codex-context-fork-bloat.md` | 59 | 3 | 0 | `codex_context_fork_bloat`, `codex_thinking_hang`, `weak_evidence` | pass |
| Codex subagent prompt leakage or boundary failure | `fixtures/codex-subagent-prompt-leakage.md` | 75 | 2 | 0 | `codex_subagent_prompt_leakage`, `weak_evidence` | pass |
| Codex subagent orchestration and configuration gap | `fixtures/codex-subagent-orchestration.md` | 75 | 2 | 0 | `codex_subagent_orchestration`, `weak_evidence` | pass |
| Codex latest-turn drift after compaction | `fixtures/codex-latest-turn-drift.md` | 59 | 3 | 0 | `codex_latest_turn_drift`, `premature_completion`, `weak_evidence` | pass |
| Codex selected model differs from actual routed model | `fixtures/codex-model-routing-mismatch.md` | 75 | 2 | 0 | `codex_model_routing_mismatch`, `weak_evidence` | pass |
| Codex model and runtime latency regression | `fixtures/codex-latency-regression.md` | 75 | 2 | 0 | `codex_latency_regression`, `weak_evidence` | pass |
| Codex thinking and stream hang | `fixtures/codex-thinking-hang.md` | 75 | 2 | 0 | `codex_thinking_hang`, `weak_evidence` | pass |
| Codex CLI no-response and command execution hang | `fixtures/codex-cli-no-response.md` | 75 | 2 | 0 | `codex_thinking_hang`, `weak_evidence` | pass |
| Codex clipboard, paste, and attachment workflow regression | `fixtures/codex-clipboard-attachment.md` | 75 | 2 | 0 | `codex_clipboard_attachment`, `weak_evidence` | pass |
| Codex deeplink, OAuth callback, and external launch regression | `fixtures/codex-deeplink-launch.md` | 50 | 4 | 0 | `codex_deeplink_launch`, `codex_remote_control`, `hallucinated_file`, `weak_evidence` | pass |
| Codex app connector auth cache and stale link regression | `fixtures/codex-connector-auth-cache.md` | 75 | 2 | 0 | `codex_connector_auth_cache`, `weak_evidence` | pass |
| Codex sign-in and account verification failure | `fixtures/codex-auth-verification.md` | 75 | 2 | 0 | `codex_auth_verification`, `weak_evidence` | pass |
| Codex approval persistence and MCP approval friction | `fixtures/codex-approval-friction.md` | 59 | 3 | 0 | `codex_approval_friction`, `sandbox_permission`, `weak_evidence` | pass |
| Codex sandbox permission failure | `fixtures/sandbox-permission.md` | 59 | 3 | 0 | `codex_windows_helper_path`, `sandbox_permission`, `weak_evidence` | pass |
| Codex Windows helper and bundled tool path failure | `fixtures/codex-windows-helper-path.md` | 43 | 4 | 0 | `codex_plugin_runtime`, `codex_windows_helper_path`, `sandbox_permission`, `weak_evidence` | pass |
| Codex auth and connectivity failure | `fixtures/codex-connectivity.md` | 75 | 2 | 0 | `codex_connectivity`, `weak_evidence` | pass |
| Codex remote-control route health failure | `fixtures/codex-remote-control.md` | 75 | 2 | 0 | `codex_remote_control`, `weak_evidence` | pass |
| Codex terminal output and scrollback integrity failure | `fixtures/codex-terminal-output-integrity.md` | 75 | 2 | 0 | `codex_terminal_output_integrity`, `weak_evidence` | pass |
| Codex subagent lifecycle and state reconciliation failure | `fixtures/codex-subagent-lifecycle.md` | 75 | 2 | 0 | `codex_subagent_lifecycle`, `weak_evidence` | pass |
| Codex quota mismatch | `fixtures/quota-mismatch.md` | 43 | 4 | 0 | `codex_token_burn`, `codex_usage_reset_drift`, `quota_mismatch`, `weak_evidence` | pass |
| MCP config with secret exposure | `fixtures/mcp-risk.json` | 59 | 2 | 1 | `mcp_risk`, `secret_exposure` | pass |
| Sensitive file access in agent context | `fixtures/sensitive-file-access.md` | 75 | 2 | 0 | `sensitive_file_access`, `weak_evidence` | pass |
| Codex MCP runtime failure | `fixtures/codex-mcp-runtime.md` | 75 | 2 | 0 | `codex_mcp_runtime`, `weak_evidence` | pass |
| Codex Streamable HTTP MCP parse and handshake failure | `fixtures/codex-mcp-streamable-http.md` | 75 | 2 | 0 | `codex_mcp_streamable_http`, `weak_evidence` | pass |
| Codex hooks runtime and UI failure | `fixtures/codex-hooks-runtime.md` | 75 | 2 | 0 | `codex_hooks_runtime`, `weak_evidence` | pass |
| Codex MCP discovery and config-scope mismatch | `fixtures/codex-mcp-discovery-mismatch.md` | 75 | 2 | 0 | `codex_mcp_discovery_mismatch`, `weak_evidence` | pass |
| Codex plugin runtime and bundled capability failure | `fixtures/codex-plugin-runtime.md` | 59 | 3 | 0 | `codex_plugin_runtime`, `codex_windows_helper_path`, `weak_evidence` | pass |
| Codex file tree and workspace navigation UI failure | `fixtures/codex-file-tree-ui.md` | 75 | 2 | 0 | `codex_file_tree_ui`, `weak_evidence` | pass |
| Codex session resume and state failure | `fixtures/codex-session-state.md` | 75 | 2 | 0 | `codex_session_state`, `weak_evidence` | pass |
| Codex usage bucket scope and percentage confusion | `fixtures/codex-usage-bucket-confusion.md` | 59 | 3 | 0 | `codex_token_burn`, `codex_usage_bucket_confusion`, `weak_evidence` | pass |
| Codex context or token usage indicator missing | `fixtures/codex-context-visibility.md` | 75 | 2 | 0 | `codex_context_visibility`, `weak_evidence` | pass |
| Codex remote connection or SSH workspace failure | `fixtures/codex-remote-connection.md` | 75 | 2 | 0 | `codex_remote_connection`, `weak_evidence` | pass |
| Codex platform availability and unsupported surface demand | `fixtures/codex-platform-availability.md` | 75 | 2 | 0 | `codex_platform_availability`, `weak_evidence` | pass |
| Codex token burn and usage-drain loop | `fixtures/codex-token-burn.md` | 75 | 2 | 0 | `codex_token_burn`, `weak_evidence` | pass |
| Codex resource leak and runaway process | `fixtures/codex-resource-leak.md` | 75 | 2 | 0 | `codex_resource_leak`, `weak_evidence` | pass |
| Codex tool-call integrity and rollback failure | `fixtures/codex-tool-call-integrity.md` | 43 | 4 | 0 | `codex_resource_leak`, `codex_subagent_lifecycle`, `codex_tool_call_integrity`, `weak_evidence` | pass |
| Codex apply_patch Add File overwrite safety | `fixtures/codex-apply-patch-overwrite.md` | 75 | 2 | 0 | `codex_tool_call_integrity`, `weak_evidence` | pass |
| Codex usage reset schedule drift | `fixtures/codex-usage-reset-drift.md` | 75 | 2 | 0 | `codex_usage_reset_drift`, `weak_evidence` | pass |
| Untrusted PR comment prompt injection | `fixtures/prompt-injection.md` | 50 | 3 | 1 | `premature_completion`, `prompt_injection`, `weak_evidence` | pass |
| Conflicting agent instruction files | `fixtures/instruction-drift` | 84 | 1 | 0 | `ignored_instruction` | pass |

Run it locally:

```bash
trace-to-skill benchmark
trace-to-skill benchmark --format json
```
