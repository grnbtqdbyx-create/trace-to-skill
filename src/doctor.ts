import { promises as fs } from "node:fs";
import path from "node:path";
import { collectFindings } from "./rules.js";
import type { Finding, TraceInput } from "./types.js";

export type DoctorStatus = "pass" | "warn" | "fail";

export interface DoctorCheck {
  id: string;
  status: DoctorStatus;
  title: string;
  detail: string;
  recommendation?: string;
}

export interface DoctorResult {
  generatedAt: string;
  root: string;
  score: number;
  summary: string;
  checks: DoctorCheck[];
  findings: Finding[];
}

const SKIP_DIRS = new Set([".git", "node_modules", "dist", "coverage", ".next", "build"]);
const INSTRUCTION_FILES = [
  "AGENTS.md",
  "CLAUDE.md",
  "GEMINI.md",
  ".github/copilot-instructions.md"
];

export async function doctorRepo(target = process.cwd()): Promise<DoctorResult> {
  const root = path.resolve(target);
  const stats = await fs.stat(root);
  if (!stats.isDirectory()) {
    throw new Error("doctor requires a repository directory");
  }

  const files = await listFiles(root);
  const fileSet = new Set(files);
  const checks = await buildChecks(root, files, fileSet);
  const findings = await collectRepoFindings(root, files);
  const score = calculateDoctorScore(checks, findings);

  return {
    generatedAt: new Date().toISOString(),
    root,
    score,
    summary: summarizeDoctor(score, checks, findings),
    checks,
    findings
  };
}

async function buildChecks(root: string, files: string[], fileSet: Set<string>): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];
  const instructionFiles = files.filter((file) => isInstructionFile(file));
  checks.push(checkInstructions(instructionFiles));
  checks.push(checkCi(files));
  checks.push(await checkValidation(root, fileSet));
  checks.push(await checkLicense(root, fileSet));
  checks.push(checkOssHealth(fileSet));
  checks.push(checkDistribution(fileSet));
  checks.push(checkTraceLoop(fileSet));
  return checks;
}

function checkInstructions(instructionFiles: string[]): DoctorCheck {
  if (instructionFiles.includes("AGENTS.md")) {
    return {
      id: "agent-instructions",
      status: "pass",
      title: "Codex instructions found",
      detail: "AGENTS.md is present, so Codex and other agents have a repository-level source of truth."
    };
  }

  if (instructionFiles.length > 0) {
    return {
      id: "agent-instructions",
      status: "warn",
      title: "Agent instructions are tool-specific",
      detail: `Found ${instructionFiles.join(", ")} but no AGENTS.md.`,
      recommendation: "Add AGENTS.md as the shared maintainer-controlled instruction file, and have tool-specific files reference it."
    };
  }

  return {
    id: "agent-instructions",
    status: "fail",
    title: "No agent instruction file found",
    detail: "The repository has no AGENTS.md, CLAUDE.md, GEMINI.md, Cursor rules, or Copilot instruction file.",
    recommendation: "Add AGENTS.md with validation, scope, safety, and completion-evidence rules before handing work to coding agents."
  };
}

function checkCi(files: string[]): DoctorCheck {
  const workflows = files.filter((file) => /^\.github\/workflows\/.+\.ya?ml$/i.test(file));
  if (workflows.length > 0) {
    return {
      id: "ci",
      status: "pass",
      title: "GitHub Actions workflow found",
      detail: `Found ${workflows.length} workflow file(s).`
    };
  }

  return {
    id: "ci",
    status: "fail",
    title: "No GitHub Actions workflow found",
    detail: "Codex-generated changes need a CI signal that maintainers and contributors can see.",
    recommendation: "Add at least one GitHub Actions workflow for tests, typecheck, lint, or agent-learning evaluation."
  };
}

async function checkValidation(root: string, fileSet: Set<string>): Promise<DoctorCheck> {
  const packageJson = await readJsonObject(path.join(root, "package.json"));
  const scripts = asObject(packageJson?.scripts);
  const validationScripts = scripts
    ? Object.keys(scripts).filter((name) => /^(test|check|build|lint|typecheck|ci)$/i.test(name))
    : [];

  if (validationScripts.length > 0) {
    return {
      id: "validation",
      status: "pass",
      title: "Validation scripts found",
      detail: `package.json exposes ${validationScripts.map((name) => `"${name}"`).join(", ")}.`
    };
  }

  const knownManifests = ["Cargo.toml", "go.mod", "pyproject.toml", "pom.xml", "build.gradle", "Package.swift"];
  if (knownManifests.some((file) => fileSet.has(file))) {
    return {
      id: "validation",
      status: "warn",
      title: "Project manifest found without obvious validation script",
      detail: "A language manifest exists, but doctor could not find a standard validation entrypoint.",
      recommendation: "Document the canonical test/build/lint command in AGENTS.md and CI."
    };
  }

  return {
    id: "validation",
    status: "warn",
    title: "No validation command detected",
    detail: "Doctor could not find a package.json validation script or common language manifest.",
    recommendation: "Add a repeatable validation command so Codex can prove changes before completion."
  };
}

async function checkLicense(root: string, fileSet: Set<string>): Promise<DoctorCheck> {
  const licenseFile = filesFirst(fileSet, ["LICENSE", "LICENSE.md", "COPYING"]);
  if (!licenseFile) {
    return {
      id: "license",
      status: "fail",
      title: "No license file found",
      detail: "Open-source users and program reviewers need clear reuse terms.",
      recommendation: "Add a standard OSI-approved license such as Apache-2.0 or MIT."
    };
  }

  const content = await fs.readFile(path.join(root, licenseFile), "utf8");
  const normalized = content.toLowerCase();
  const license = normalized.includes("apache license") ? "Apache-2.0" :
    normalized.includes("mit license") ? "MIT" :
      normalized.includes("bsd") ? "BSD-style" :
        "custom or unrecognized";

  return {
    id: "license",
    status: license === "custom or unrecognized" ? "warn" : "pass",
    title: "License file found",
    detail: `${licenseFile} appears to be ${license}.`,
    recommendation: license === "custom or unrecognized" ? "Prefer a standard OSI-approved license to reduce adoption friction." : undefined
  };
}

function checkOssHealth(fileSet: Set<string>): DoctorCheck {
  const present = ["README.md", "CONTRIBUTING.md", "SECURITY.md", "CODE_OF_CONDUCT.md"].filter((file) => fileSet.has(file));
  if (present.length >= 3 && present.includes("README.md")) {
    return {
      id: "oss-health",
      status: "pass",
      title: "Open-source maintenance files found",
      detail: `Found ${present.join(", ")}.`
    };
  }

  return {
    id: "oss-health",
    status: "warn",
    title: "Open-source maintenance metadata is thin",
    detail: `Found ${present.join(", ") || "none of README.md, CONTRIBUTING.md, SECURITY.md, CODE_OF_CONDUCT.md"}.`,
    recommendation: "Add README, contribution, security, and conduct docs so contributors and agent-generated PRs have a clear path."
  };
}

function checkDistribution(fileSet: Set<string>): DoctorCheck {
  const channels = [
    fileSet.has("package.json") ? "npm package" : undefined,
    fileSet.has("action.yml") || fileSet.has("action.yaml") ? "GitHub Action" : undefined,
    fileSet.has("Dockerfile") ? "Docker image" : undefined
  ].filter((item): item is string => Boolean(item));

  if (channels.length > 0) {
    return {
      id: "distribution",
      status: "pass",
      title: "Distribution surface found",
      detail: `Detected ${channels.join(", ")}.`
    };
  }

  return {
    id: "distribution",
    status: "warn",
    title: "No obvious installation surface found",
    detail: "Users are more likely to try and star a project when installation is one command.",
    recommendation: "Provide an npm package, GitHub Action, Docker image, or binary release."
  };
}

function checkTraceLoop(fileSet: Set<string>): DoctorCheck {
  const hasRuns = fileSet.has("runs/README.md") || fileSet.has("runs/.gitkeep");
  const hasTraceToSkillWorkflow = Array.from(fileSet).some((file) => /^\.github\/workflows\/.+\.ya?ml$/i.test(file));

  if (hasRuns && hasTraceToSkillWorkflow) {
    return {
      id: "agent-learning-loop",
      status: "pass",
      title: "Agent learning loop scaffold found",
      detail: "A runs directory and GitHub workflow are present."
    };
  }

  return {
    id: "agent-learning-loop",
    status: "warn",
    title: "Agent learning loop is not scaffolded",
    detail: "Doctor did not find both a runs directory scaffold and GitHub workflow.",
    recommendation: "Run trace-to-skill init --comment --sarif to collect traces, report findings, and gate repeated failures."
  };
}

async function collectRepoFindings(root: string, files: string[]): Promise<Finding[]> {
  const candidates = files.filter((file) => !isEvidenceArchive(file) && (isInstructionFile(file) || isMcpConfigCandidate(file)));
  if (candidates.length === 0) {
    return [];
  }

  const inputs: TraceInput[] = [];
  for (const file of candidates.slice(0, 40)) {
    const fullPath = path.join(root, file);
    const content = await fs.readFile(fullPath, "utf8");
    inputs.push({ path: file, content });
  }

  return collectFindings(inputs).filter((finding) =>
    finding.kind === "ignored_instruction" ||
    finding.kind === "mcp_risk" ||
    finding.kind === "secret_exposure" ||
    finding.kind === "hidden_unicode"
  );
}

async function listFiles(root: string): Promise<string[]> {
  const files: string[] = [];

  async function visit(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relative = path.relative(root, fullPath).split(path.sep).join("/");
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) {
          await visit(fullPath);
        }
        continue;
      }

      if (entry.isFile()) {
        files.push(relative);
      }
    }
  }

  await visit(root);
  return files.sort((a, b) => a.localeCompare(b));
}

function calculateDoctorScore(checks: DoctorCheck[], findings: Finding[]): number {
  const checkPenalty = checks.reduce((total, check) => {
    if (check.status === "fail") {
      return total + 15;
    }
    if (check.status === "warn") {
      return total + 7;
    }
    return total;
  }, 0);
  const findingPenalty = findings.reduce((total, finding) => {
    const value = {
      low: 2,
      medium: 5,
      high: 10,
      critical: 20
    }[finding.severity];
    return total + value;
  }, 0);

  return Math.max(0, Math.min(100, 100 - checkPenalty - findingPenalty));
}

function summarizeDoctor(score: number, checks: DoctorCheck[], findings: Finding[]): string {
  if (checks.some((check) => check.status === "fail") || findings.some((finding) => finding.severity === "critical")) {
    return "Repository is not ready for broad Codex automation. Fix failed checks and critical findings first.";
  }

  if (score >= 85) {
    return "Repository is Codex-ready, with clear maintainer controls and validation evidence.";
  }

  if (score >= 70) {
    return "Repository is close to Codex-ready, but a few maintainer controls should be tightened.";
  }

  return "Repository needs clearer agent instructions, validation, or OSS maintenance metadata before broad automation.";
}

function isInstructionFile(file: string): boolean {
  return INSTRUCTION_FILES.includes(file) ||
    /(^|\/)(AGENTS|CLAUDE|GEMINI|COPILOT|copilot-instructions)\.md$/i.test(file) ||
    /^\.cursor\/rules\/.+/i.test(file);
}

function isMcpConfigCandidate(file: string): boolean {
  return /(^|\/)(mcp|\.mcp|mcp-config|model-context)\.(json|jsonc)$/i.test(file) ||
    /(^|\/)\.cursor\/mcp\.json$/i.test(file) ||
    /(^|\/)\.codex\/config\.toml$/i.test(file);
}

function isEvidenceArchive(file: string): boolean {
  return /^(fixtures|examples|runs)\//i.test(file);
}

function filesFirst(fileSet: Set<string>, names: string[]): string | undefined {
  return names.find((name) => fileSet.has(name));
}

async function readJsonObject(filePath: string): Promise<Record<string, unknown> | undefined> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return asObject(JSON.parse(raw) as unknown);
  } catch {
    return undefined;
  }
}

function asObject(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}
