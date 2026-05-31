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
  | "hidden_unicode"
  | "prompt_injection"
  | "context_compaction"
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
