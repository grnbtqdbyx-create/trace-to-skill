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
  | "context_compaction"
  | "codex_latest_turn_drift"
  | "codex_latency_regression"
  | "codex_approval_friction"
  | "sandbox_permission"
  | "codex_connectivity"
  | "codex_remote_control"
  | "codex_mcp_runtime"
  | "codex_plugin_runtime"
  | "codex_session_state"
  | "codex_token_burn"
  | "codex_resource_leak"
  | "codex_tool_call_integrity"
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
