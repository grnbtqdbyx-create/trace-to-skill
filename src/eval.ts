import type { AnalysisResult } from "./types.js";

export interface EvalResult {
  passed: boolean;
  score: number;
  threshold: number;
  criticalFindings: number;
  message: string;
}

export interface ComparisonResult {
  decision: "keep" | "revise" | "reject";
  beforeScore: number;
  afterScore: number;
  delta: number;
  beforeCriticalFindings: number;
  afterCriticalFindings: number;
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

export function compareAnalyses(before: AnalysisResult, after: AnalysisResult): ComparisonResult {
  const beforeCriticalFindings = countCritical(before);
  const afterCriticalFindings = countCritical(after);
  const delta = after.score - before.score;
  const criticalDelta = afterCriticalFindings - beforeCriticalFindings;
  const decision = decide(delta, criticalDelta, afterCriticalFindings);

  return {
    decision,
    beforeScore: before.score,
    afterScore: after.score,
    delta,
    beforeCriticalFindings,
    afterCriticalFindings,
    message: buildComparisonMessage(decision, delta, beforeCriticalFindings, afterCriticalFindings)
  };
}

function decide(delta: number, criticalDelta: number, afterCriticalFindings: number): ComparisonResult["decision"] {
  if (criticalDelta > 0 || delta < -5) {
    return "reject";
  }

  if (delta >= 5 && afterCriticalFindings === 0) {
    return "keep";
  }

  return "revise";
}

function countCritical(result: AnalysisResult): number {
  return result.findings.filter((finding) => finding.severity === "critical").length;
}

function buildComparisonMessage(
  decision: ComparisonResult["decision"],
  delta: number,
  beforeCriticalFindings: number,
  afterCriticalFindings: number
): string {
  return `Decision: ${decision}. Score delta ${formatDelta(delta)}. Critical findings ${beforeCriticalFindings} -> ${afterCriticalFindings}.`;
}

function formatDelta(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}
