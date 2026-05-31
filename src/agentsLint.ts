import { promises as fs } from "node:fs";
import path from "node:path";
import { doctorRepo, type DoctorCheck } from "./doctor.js";
import type { Finding } from "./types.js";

export interface AgentsLintResult {
  generatedAt: string;
  root: string;
  status: "pass" | "warn" | "fail";
  score: number;
  instructionFiles: string[];
  mcpConfigs: string[];
  checks: DoctorCheck[];
  findings: Finding[];
  summary: string;
}

const SKIP_DIRS = new Set([".git", "node_modules", "dist", "coverage", ".next", "build"]);

export async function lintAgents(target = process.cwd()): Promise<AgentsLintResult> {
  const root = path.resolve(target);
  const files = await listFiles(root);
  const lintableFiles = files.filter((file) => !isEvidenceArchive(file));
  const instructionFiles = lintableFiles.filter((file) => isInstructionFile(file));
  const mcpConfigs = lintableFiles.filter((file) => isMcpConfigCandidate(file));
  const doctor = await doctorRepo(root);
  const checks = doctor.checks.filter((check) => check.id === "agent-instructions" || check.id === "validation");
  const findings = doctor.findings.filter((finding) =>
    finding.kind === "ignored_instruction" ||
    finding.kind === "mcp_risk" ||
    finding.kind === "secret_exposure" ||
    finding.kind === "hidden_unicode" ||
    finding.kind === "prompt_injection"
  );
  const score = calculateAgentsLintScore(checks, findings);
  const status = statusFrom(score, checks, findings);

  return {
    generatedAt: new Date().toISOString(),
    root,
    status,
    score,
    instructionFiles,
    mcpConfigs,
    checks,
    findings,
    summary: summarizeAgentsLint(status, instructionFiles, mcpConfigs, findings)
  };
}

export function renderAgentsLintMarkdown(result: AgentsLintResult): string {
  const lines = [
    "# AGENTS.md Lint Report",
    "",
    `Status: **${result.status}**`,
    `Score: **${result.score}/100**`,
    "",
    result.summary,
    "",
    `Repository: \`${result.root}\``,
    `Generated: ${result.generatedAt}`,
    "",
    "## Instruction Files",
    ""
  ];

  if (result.instructionFiles.length > 0) {
    result.instructionFiles.forEach((file) => lines.push(`- \`${file}\``));
  } else {
    lines.push("No AGENTS.md, CLAUDE.md, GEMINI.md, Cursor rules, or Copilot instruction files found.");
  }

  lines.push("", "## MCP Configs", "");
  if (result.mcpConfigs.length > 0) {
    result.mcpConfigs.forEach((file) => lines.push(`- \`${file}\``));
  } else {
    lines.push("No MCP config files detected.");
  }

  lines.push("", "## Checks", "");
  result.checks.forEach((check) => {
    lines.push(`- **${check.status.toUpperCase()}** ${check.title}: ${check.detail}`);
    if (check.recommendation) {
      lines.push(`  Recommendation: ${check.recommendation}`);
    }
  });

  lines.push("", "## Findings", "");
  if (result.findings.length === 0) {
    lines.push("No instruction or MCP findings detected.");
  } else {
    result.findings.forEach((finding) => {
      const firstEvidence = finding.evidence[0];
      const evidence = firstEvidence ? ` Evidence: \`${firstEvidence.file}:${firstEvidence.line}\`.` : "";
      lines.push(`- **${finding.severity}** ${finding.title}.${evidence}`);
    });
  }

  lines.push(
    "",
    "## Suggested Next Step",
    "",
    result.status === "pass"
      ? "Keep AGENTS.md as the canonical maintainer-controlled instruction file, and make tool-specific files reference it."
      : "Fix failed checks or high-risk findings before letting Codex act broadly on this repository."
  );

  return `${lines.join("\n")}\n`;
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

function calculateAgentsLintScore(checks: DoctorCheck[], findings: Finding[]): number {
  const checkPenalty = checks.reduce((total, check) => {
    if (check.status === "fail") {
      return total + 30;
    }
    if (check.status === "warn") {
      return total + 10;
    }
    return total;
  }, 0);
  const findingPenalty = findings.reduce((total, finding) => {
    const value = {
      low: 5,
      medium: 10,
      high: 25,
      critical: 35
    }[finding.severity];
    return total + value;
  }, 0);

  return Math.max(0, Math.min(100, 100 - checkPenalty - findingPenalty));
}

function statusFrom(checksScore: number, checks: DoctorCheck[], findings: Finding[]): AgentsLintResult["status"] {
  if (checks.some((check) => check.status === "fail") || findings.some((finding) => finding.severity === "critical" || finding.severity === "high")) {
    return "fail";
  }

  if (checksScore < 90 || checks.some((check) => check.status === "warn") || findings.length > 0) {
    return "warn";
  }

  return "pass";
}

function summarizeAgentsLint(status: AgentsLintResult["status"], instructionFiles: string[], mcpConfigs: string[], findings: Finding[]): string {
  if (status === "pass") {
    return "Agent instructions look consistent and ready for Codex use.";
  }

  if (status === "fail") {
    return "Agent instructions or MCP configuration need fixes before broad Codex automation.";
  }

  const missingAgents = instructionFiles.includes("AGENTS.md") ? "" : " Add AGENTS.md as the shared source of truth.";
  const mcpNote = mcpConfigs.length > 0 && findings.length === 0 ? " MCP configs were detected; keep their trust boundaries documented." : "";
  return `Agent instructions are usable but need tightening.${missingAgents}${mcpNote}`.trim();
}

function isInstructionFile(file: string): boolean {
  return /(^|\/)(AGENTS|CLAUDE|GEMINI|COPILOT|copilot-instructions)\.md$/i.test(file) ||
    /^\.cursor\/rules\/.+/i.test(file);
}

function isMcpConfigCandidate(file: string): boolean {
  return /(^|\/)(mcp|\.mcp|mcp-config|model-context)\.(json|jsonc)$/i.test(file) ||
    /(^|\/)\.cursor\/mcp\.json$/i.test(file);
}

function isEvidenceArchive(file: string): boolean {
  return /^(fixtures|examples|runs)\//i.test(file);
}
