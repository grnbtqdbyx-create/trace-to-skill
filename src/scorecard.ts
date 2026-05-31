import type { BenchmarkResult } from "./benchmark.js";
import { renderBenchmarkMarkdown, runBenchmark } from "./benchmark.js";
import { doctorRepo, type DoctorResult } from "./doctor.js";

export interface ScorecardResult {
  generatedAt: string;
  passed: boolean;
  threshold: number;
  doctor: {
    score: number;
    status: "ready" | "needs-attention";
    summary: string;
    failedChecks: number;
    criticalFindings: number;
  };
  benchmark: {
    status: "pass" | "fail";
    cases: number;
  };
  reports: {
    doctor: DoctorResult;
    benchmark: BenchmarkResult;
  };
}

export async function runScorecard(target = process.cwd(), threshold = 85): Promise<ScorecardResult> {
  const doctor = await doctorRepo(target);
  const benchmark = await runBenchmark();
  const failedChecks = doctor.checks.filter((check) => check.status === "fail").length;
  const criticalFindings = doctor.findings.filter((finding) => finding.severity === "critical").length;
  const doctorReady = failedChecks === 0 && criticalFindings === 0 && doctor.score >= threshold;
  const passed = doctorReady && benchmark.passed;

  return {
    generatedAt: new Date().toISOString(),
    passed,
    threshold,
    doctor: {
      score: doctor.score,
      status: doctorReady ? "ready" : "needs-attention",
      summary: doctor.summary,
      failedChecks,
      criticalFindings
    },
    benchmark: {
      status: benchmark.passed ? "pass" : "fail",
      cases: benchmark.cases.length
    },
    reports: {
      doctor,
      benchmark
    }
  };
}

export function renderScorecardMarkdown(result: ScorecardResult): string {
  const lines = [
    "# trace-to-skill Scorecard",
    "",
    `Status: **${result.passed ? "pass" : "fail"}**`,
    "",
    "| Signal | Result |",
    "| --- | --- |",
    `| Codex readiness | ${result.doctor.status} |`,
    `| Doctor score | ${result.doctor.score}/100, threshold ${result.threshold} |`,
    `| Failed doctor checks | ${result.doctor.failedChecks} |`,
    `| Critical findings | ${result.doctor.criticalFindings} |`,
    `| Built-in benchmark | ${result.benchmark.status} |`,
    `| Benchmark cases | ${result.benchmark.cases} |`,
    "",
    "## Doctor Summary",
    "",
    result.doctor.summary,
    "",
    "## Benchmark Summary",
    "",
    renderBenchmarkMarkdown(result.reports.benchmark).replace(/^# trace-to-skill Benchmark\n\n/, ""),
    "## Reviewer Notes",
    "",
    "- This scorecard is deterministic and local-first.",
    "- It combines repository Codex readiness with the shipped fixture benchmark.",
    "- Passing the scorecard does not mean agents should change policy automatically; generated rules still need maintainer review.",
    "",
    "Run it locally:",
    "",
    "```bash",
    "trace-to-skill scorecard .",
    "trace-to-skill scorecard . --format json",
    "```",
    ""
  ];

  return lines.join("\n");
}

export function renderScorecardPrComment(result: ScorecardResult): string {
  return [
    "<!-- trace-to-skill-scorecard-report -->",
    renderScorecardMarkdown(result)
  ].join("\n");
}
