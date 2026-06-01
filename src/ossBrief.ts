import { readFile } from "node:fs/promises";
import path from "node:path";
import { runScorecard, type ScorecardResult } from "./scorecard.js";

export interface OssBriefResult {
  generatedAt: string;
  root: string;
  repository?: string;
  packageName?: string;
  packageVersion?: string;
  license?: string;
  scorecard: {
    passed: boolean;
    doctorScore: number;
    doctorStatus: "ready" | "needs-attention";
    benchmarkStatus: "pass" | "fail";
    benchmarkCases: number;
  };
  qualification: {
    long: string;
    max500: string;
  };
  apiCredits: {
    long: string;
    max500: string;
  };
  evidence: string[];
  nextSteps: string[];
}

interface PackageMetadata {
  name?: string;
  version?: string;
  license?: string;
  repository?: string | { url?: string };
}

export async function runOssBrief(target = process.cwd(), threshold = 85): Promise<OssBriefResult> {
  const root = path.resolve(target);
  const scorecard = await runScorecard(root, threshold);
  const packageJson = await readPackageJson(root);
  const repository = normalizeRepositoryUrl(packageJson?.repository);
  const packageName = packageJson?.name;
  const packageVersion = packageJson?.version;
  const license = packageJson?.license ?? detectLicenseFromDoctor(scorecard);
  const projectName = packageName ?? path.basename(root);
  const commandName = packageName ? `npx ${packageName}` : "trace-to-skill";

  const qualificationLong = [
    `${projectName} helps open-source maintainers adopt Codex safely by turning failed coding-agent runs into evidence-backed rules, reusable workflows, CI gates, and a weekly Codex Issue Radar for live GitHub issue demand.`,
    `It supports real maintenance work: PR review, issue triage, release quality, MCP risk, prompt-injection defense, privacy-preserving trace sharing, and repeat failure reduction.`,
    `The repository is ${scorecard.doctor.status}, scores ${scorecard.doctor.score}/100 on the local Codex readiness doctor, and ships a deterministic benchmark with ${scorecard.benchmark.cases} public fixture cases.`
  ].join(" ");

  const apiCreditsLong = [
    "API credits would power optional maintainer workflows on top of the local deterministic scanner:",
    "classifying failed Codex sessions, mining public GitHub issue clusters, generating candidate AGENTS.md rules or SKILL.md workflows, comparing before/after runs, and producing PR-ready triage reports.",
    "The local CLI remains free, dependency-light, and usable without API credits."
  ].join(" ");

  return {
    generatedAt: new Date().toISOString(),
    root,
    repository,
    packageName,
    packageVersion,
    license,
    scorecard: {
      passed: scorecard.passed,
      doctorScore: scorecard.doctor.score,
      doctorStatus: scorecard.doctor.status,
      benchmarkStatus: scorecard.benchmark.status,
      benchmarkCases: scorecard.benchmark.cases
    },
    qualification: {
      long: qualificationLong,
      max500: fit500(qualificationLong)
    },
    apiCredits: {
      long: apiCreditsLong,
      max500: fit500(apiCreditsLong)
    },
    evidence: buildEvidence(scorecard, commandName, repository, packageName, packageVersion, license),
    nextSteps: buildNextSteps(scorecard)
  };
}

export function renderOssBriefMarkdown(result: OssBriefResult): string {
  const lines = [
    "# OpenAI OSS Brief",
    "",
    "| Field | Value |",
    "| --- | --- |",
    `| Repository | ${result.repository ?? "Add public repository URL"} |`,
    `| Package | ${result.packageName ? `${result.packageName}${result.packageVersion ? `@${result.packageVersion}` : ""}` : "Not detected"} |`,
    `| License | ${result.license ?? "Not detected"} |`,
    `| Codex readiness | ${result.scorecard.doctorStatus} (${result.scorecard.doctorScore}/100) |`,
    `| Benchmark | ${result.scorecard.benchmarkStatus}, ${result.scorecard.benchmarkCases} cases |`,
    "",
    "## Why This Repository Qualifies",
    "",
    result.qualification.long,
    "",
    "### 500-Character Version",
    "",
    blockquote(result.qualification.max500),
    "",
    "## How API Credits Would Be Used",
    "",
    result.apiCredits.long,
    "",
    "### 500-Character Version",
    "",
    blockquote(result.apiCredits.max500),
    "",
    "## Evidence",
    "",
    ...result.evidence.map((item) => `- ${item}`),
    "",
    "## Next Steps Before Submitting",
    "",
    ...result.nextSteps.map((item) => `- ${item}`),
    "",
    "Run it locally:",
    "",
    "```bash",
    "trace-to-skill oss-brief .",
    "trace-to-skill oss-brief . --format json",
    "```",
    ""
  ];

  return lines.join("\n");
}

async function readPackageJson(root: string): Promise<PackageMetadata | undefined> {
  try {
    const raw = await readFile(path.join(root, "package.json"), "utf8");
    return JSON.parse(raw) as PackageMetadata;
  } catch {
    return undefined;
  }
}

function normalizeRepositoryUrl(repository: PackageMetadata["repository"]): string | undefined {
  const raw = typeof repository === "string" ? repository : repository?.url;
  if (!raw) {
    return undefined;
  }

  return raw
    .replace(/^git\+/, "")
    .replace(/\.git$/, "");
}

function detectLicenseFromDoctor(scorecard: ScorecardResult): string | undefined {
  const license = scorecard.reports.doctor.checks.find((check) => check.id === "license");
  const match = license?.detail.match(/appears to be ([^.]+)\./);
  return match?.[1];
}

function buildEvidence(
  scorecard: ScorecardResult,
  commandName: string,
  repository: string | undefined,
  packageName: string | undefined,
  packageVersion: string | undefined,
  license: string | undefined
): string[] {
  return [
    repository ? `Public repository: ${repository}` : "Add the public repository URL before submitting.",
    packageName ? `One-command package: ${commandName}${packageVersion ? `@${packageVersion}` : ""}` : "Add a package or action distribution surface for easy adoption.",
    license ? `Open-source license: ${license}` : "Add an OSI-approved license such as Apache-2.0 or MIT.",
    `Codex readiness doctor: ${scorecard.doctor.status}, ${scorecard.doctor.score}/100, ${scorecard.doctor.failedChecks} failed checks.`,
    `Public fixture benchmark: ${scorecard.benchmark.status}, ${scorecard.benchmark.cases} cases.`,
    "GitHub issue demand mining: issue-map ranks exported OpenAI/Codex issues by failure class, comments, reactions, and evidence gaps.",
    "Weekly Codex Issue Radar: init --issue-map-repo owner/name scaffolds a scheduled Action that fetches live GitHub issues and publishes the pain map to the job summary or a stable tracking issue comment.",
    "Maintainer control: generated rules are suggestions, evidence is line-linked, and secrets can be redacted before sharing."
  ];
}

function buildNextSteps(scorecard: ScorecardResult): string[] {
  const steps = [
    "Add current GitHub stars, npm monthly downloads, downstream users, or adoption examples before submitting the application.",
    "Link the latest release, CI run, readiness report, and benchmark report as public proof.",
    "Describe your maintainer role and the recurring PR review, issue triage, release, or security workload this project reduces."
  ];

  if (!scorecard.passed) {
    steps.unshift("Fix failing readiness or benchmark checks before using this brief as application evidence.");
  }

  return steps;
}

function fit500(value: string): string {
  if (value.length <= 500) {
    return value;
  }

  const sliced = value.slice(0, 500);
  const sentenceEnd = Math.max(sliced.lastIndexOf(". "), sliced.lastIndexOf("; "), sliced.lastIndexOf(", "));
  const candidate = sentenceEnd >= 300 ? sliced.slice(0, sentenceEnd + 1) : sliced.slice(0, 497);
  return candidate.trimEnd().replace(/[.,;:]$/, "") + "...";
}

function blockquote(value: string): string {
  return value.split("\n").map((line) => `> ${line}`).join("\n");
}
