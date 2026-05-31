import { loadTraceInputs } from "./parsers.js";
import { collectFindings } from "./rules.js";
import type { AnalysisResult, AnalyzeOptions, TraceInput } from "./types.js";

export async function analyzeTargets(targets: string[], options: AnalyzeOptions = {}): Promise<AnalysisResult> {
  const inputs = await loadTraceInputs(targets);
  return analyzeInputs(inputs, options);
}

export function analyzeInputs(inputs: TraceInput[], options: AnalyzeOptions = {}): AnalysisResult {
  const findings = collectFindings(inputs, options.maxFilesChanged);
  const score = calculateScore(findings);

  return {
    generatedAt: new Date().toISOString(),
    inputs: inputs.map((input) => input.path),
    score,
    summary: summarize(score, findings),
    findings,
    recommendations: buildRecommendations(findings)
  };
}

function calculateScore(findings: AnalysisResult["findings"]): number {
  const penalty = findings.reduce((total, finding) => {
    const value = {
      low: 4,
      medium: 9,
      high: 16,
      critical: 25
    }[finding.severity];
    return total + value;
  }, 0);

  return Math.max(0, Math.min(100, 100 - penalty));
}

function summarize(score: number, findings: AnalysisResult["findings"]): string {
  if (findings.length === 0) {
    return "No agent workflow risks detected in the provided traces.";
  }

  if (findings.some((finding) => finding.severity === "critical")) {
    return "Agent workflow is risky. Critical findings must be resolved before this workflow is reused.";
  }

  if (findings.some((finding) => finding.severity === "high")) {
    return "Agent workflow needs clearer verification, instruction, or security hardening before broad reuse.";
  }

  if (score >= 80) {
    return "Agent workflow is mostly healthy, with a few hardening opportunities.";
  }

  if (score >= 60) {
    return "Agent workflow needs clearer verification and instruction hardening before broad reuse.";
  }

  return "Agent workflow is risky. Convert the findings into explicit rules or skills before repeating this workflow.";
}

function buildRecommendations(findings: AnalysisResult["findings"]): string[] {
  const unique = new Set(findings.map((finding) => finding.suggestedRule));
  return Array.from(unique);
}
