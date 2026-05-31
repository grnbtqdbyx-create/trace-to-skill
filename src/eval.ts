import type { AnalysisResult } from "./types.js";

export interface EvalResult {
  passed: boolean;
  score: number;
  threshold: number;
  criticalFindings: number;
  message: string;
}

export function evaluate(result: AnalysisResult, threshold = 75): EvalResult {
  const criticalFindings = result.findings.filter((finding) => finding.severity === "critical").length;
  const passed = result.score >= threshold && criticalFindings === 0;

  return {
    passed,
    score: result.score,
    threshold,
    criticalFindings,
    message: passed
      ? `Agent workflow passed with score ${result.score}/100.`
      : `Agent workflow failed: score ${result.score}/100, critical findings ${criticalFindings}.`
  };
}
