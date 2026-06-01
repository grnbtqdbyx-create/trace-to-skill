export type Severity = "low" | "medium" | "high" | "critical";

export type FindingKind =
  | "premature_completion"
  | "tests_not_run"
  | "test_failure"
  | "ignored_instruction"
  | "hallucinated_file"
  | "over_editing"
  | "unsafe_command"
  | "secret_exposure"
  | "sensitive_file_access"
  | "hidden_unicode"
  | "prompt_injection"
  | "codex_remote_compact"
  | "context_compaction"
  | "codex_latest_turn_drift"
  | "codex_latency_regression"
  | "codex_thinking_hang"
  | "codex_clipboard_attachment"
  | "codex_deeplink_launch"
  | "codex_connector_auth_cache"
  | "codex_approval_friction"
  | "sandbox_permission"
  | "codex_windows_helper_path"
  | "codex_connectivity"
  | "codex_remote_control"
  | "codex_terminal_output_integrity"
  | "codex_subagent_lifecycle"
  | "codex_mcp_discovery_mismatch"
  | "codex_mcp_runtime"
  | "codex_mcp_streamable_http"
  | "codex_plugin_runtime"
  | "codex_file_tree_ui"
  | "codex_session_state"
  | "codex_token_burn"
  | "codex_resource_leak"
  | "codex_tool_call_integrity"
  | "codex_usage_reset_drift"
  | "quota_mismatch"
  | "mcp_risk"
  | "weak_evidence";

export interface TraceInput {
  path: string;
  content: string;
}

export interface Evidence {
  file: string;
  line: number;
  excerpt: string;
}

export interface Finding {
  kind: FindingKind;
  severity: Severity;
  title: string;
  why: string;
  evidence: Evidence[];
  suggestedRule: string;
  suggestedSkill?: string;
}

export interface AnalyzeOptions {
  maxFilesChanged?: number;
}

export interface AnalysisResult {
  generatedAt: string;
  inputs: string[];
  score: number;
  summary: string;
  findings: Finding[];
  recommendations: string[];
}
