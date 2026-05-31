#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { analyzeTargets } from "./analyze.js";
import { doctorRepo } from "./doctor.js";
import { compareAnalyses, evaluate } from "./eval.js";
import { postPullRequestComment } from "./github.js";
import { initProject } from "./init.js";
import { renderAgentsRules, renderComparison, renderDoctorMarkdown, renderDoctorPrComment, renderMarkdown, renderPrComment, renderSarif, renderSkill } from "./report.js";

interface ParsedArgs {
  command: string;
  targets: string[];
  flags: Record<string, string | boolean>;
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));

  if (parsed.flags.help || parsed.command === "help") {
    printHelp();
    return;
  }

  if (parsed.command === "analyze") {
    const result = await analyzeTargets(parsed.targets);
    const format = String(parsed.flags.format ?? "markdown");
    const output = renderAnalysis(result, format);
    await writeOutput(output, parsed.flags.output);
    return;
  }

  if (parsed.command === "suggest") {
    const result = await analyzeTargets(parsed.targets);
    const target = String(parsed.flags.target ?? "agents-md");
    const output = target === "skill" ? renderSkill(result) : renderAgentsRules(result);
    await writeOutput(output, parsed.flags.output);
    return;
  }

  if (parsed.command === "eval") {
    const threshold = Number(parsed.flags.threshold ?? 75);
    const result = await analyzeTargets(parsed.targets);
    const evalResult = evaluate(result, threshold);
    const format = String(parsed.flags.format ?? "text");
    const output = format === "json" ? `${JSON.stringify(evalResult, null, 2)}\n` : `${evalResult.message}\n`;
    await writeOutput(output, parsed.flags.output);
    process.exitCode = evalResult.passed ? 0 : 1;
    return;
  }

  if (parsed.command === "comment") {
    const result = await analyzeTargets(parsed.targets);
    const body = renderPrComment(result);
    const message = await postPullRequestComment({
      body,
      token: stringFlag(parsed.flags.token),
      repository: stringFlag(parsed.flags.repository),
      eventPath: stringFlag(parsed.flags.event),
      dryRun: Boolean(parsed.flags["dry-run"])
    });
    process.stdout.write(`${message}\n`);
    return;
  }

  if (parsed.command === "compare") {
    const before = stringFlag(parsed.flags.before) ?? parsed.targets[0];
    const after = stringFlag(parsed.flags.after) ?? parsed.targets[1];
    if (!before || !after) {
      throw new Error("compare requires --before <trace> and --after <trace>, or two positional paths.");
    }

    const beforeResult = await analyzeTargets([before]);
    const afterResult = await analyzeTargets([after]);
    const comparison = compareAnalyses(beforeResult, afterResult);
    const format = String(parsed.flags.format ?? "markdown");
    const output = format === "json" ? `${JSON.stringify(comparison, null, 2)}\n` : renderComparison(comparison);
    await writeOutput(output, parsed.flags.output);
    process.exitCode = comparison.decision === "reject" ? 1 : 0;
    return;
  }

  if (parsed.command === "doctor") {
    const result = await doctorRepo(parsed.targets[0] ?? process.cwd());
    const threshold = numberFlag(parsed.flags.threshold);
    const format = String(parsed.flags.format ?? "markdown");
    const output = format === "json" ? `${JSON.stringify(result, null, 2)}\n` :
      format === "comment" ? renderDoctorPrComment(result, threshold) :
        renderDoctorMarkdown(result);
    await writeOutput(output, parsed.flags.output);
    process.exitCode = doctorPassed(result, threshold) ? 0 : 1;
    return;
  }

  if (parsed.command === "doctor-comment") {
    const result = await doctorRepo(parsed.targets[0] ?? process.cwd());
    const threshold = numberFlag(parsed.flags.threshold);
    const body = renderDoctorPrComment(result, threshold);
    const message = await postPullRequestComment({
      body,
      token: stringFlag(parsed.flags.token),
      repository: stringFlag(parsed.flags.repository),
      eventPath: stringFlag(parsed.flags.event),
      dryRun: Boolean(parsed.flags["dry-run"]),
      marker: "<!-- trace-to-skill-doctor-report -->",
      reportName: "trace-to-skill doctor report"
    });
    process.stdout.write(`${message}\n`);
    process.exitCode = doctorPassed(result, threshold) ? 0 : 1;
    return;
  }

  if (parsed.command === "init") {
    const result = await initProject({
      traces: stringFlag(parsed.flags.traces),
      threshold: stringFlag(parsed.flags.threshold),
      comment: Boolean(parsed.flags.comment),
      sarif: Boolean(parsed.flags.sarif),
      force: Boolean(parsed.flags.force),
      dryRun: Boolean(parsed.flags["dry-run"])
    });
    process.stdout.write(`${result.message}\n`);
    result.written.forEach((file) => process.stdout.write(`write ${file}\n`));
    result.skipped.forEach((file) => process.stdout.write(`skip ${file}\n`));
    return;
  }

  printHelp();
  process.exitCode = 1;
}

function stringFlag(value: string | boolean | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function numberFlag(value: string | boolean | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || !/^[0-9]{1,3}$/.test(value)) {
    throw new Error("--threshold must be an integer between 1 and 100");
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new Error("--threshold must be an integer between 1 and 100");
  }

  return parsed;
}

function doctorPassed(result: Awaited<ReturnType<typeof doctorRepo>>, threshold: number | undefined): boolean {
  if (result.checks.some((check) => check.status === "fail")) {
    return false;
  }

  if (result.findings.some((finding) => finding.severity === "critical")) {
    return false;
  }

  return threshold === undefined || result.score >= threshold;
}

function renderAnalysis(result: Awaited<ReturnType<typeof analyzeTargets>>, format: string): string {
  if (format === "json") {
    return `${JSON.stringify(result, null, 2)}\n`;
  }

  if (format === "sarif") {
    return renderSarif(result);
  }

  return renderMarkdown(result);
}

function parseArgs(args: string[]): ParsedArgs {
  const [command = "help", ...rest] = args;
  const targets: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index];
    if (!value.startsWith("--")) {
      targets.push(value);
      continue;
    }

    const [key, inlineValue] = value.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      flags[key] = inlineValue;
      continue;
    }

    const next = rest[index + 1];
    if (next && !next.startsWith("--")) {
      flags[key] = next;
      index += 1;
    } else {
      flags[key] = true;
    }
  }

  return { command, targets, flags };
}

async function writeOutput(output: string, outputPath: string | boolean | undefined): Promise<void> {
  if (typeof outputPath === "string") {
    await writeFile(outputPath, output, "utf8");
    return;
  }

  process.stdout.write(output);
}

function printHelp(): void {
  process.stdout.write(`trace-to-skill

Turn failed AI coding-agent runs into reusable rules, skills, and eval evidence.

Usage:
  trace-to-skill analyze <trace-file-or-dir> [--format markdown|json|sarif] [--output report.md]
  trace-to-skill suggest <trace-file-or-dir> [--target agents-md|skill] [--output AGENTS.generated.md]
  trace-to-skill eval <trace-file-or-dir> [--threshold 75] [--format text|json]
  trace-to-skill comment <trace-file-or-dir> [--dry-run] [--token $GITHUB_TOKEN]
  trace-to-skill compare --before <old-run> --after <new-run> [--format markdown|json]
  trace-to-skill doctor [repo-dir] [--threshold 85] [--format markdown|json|comment] [--output report.md]
  trace-to-skill doctor-comment [repo-dir] [--threshold 85] [--dry-run] [--token $GITHUB_TOKEN]
  trace-to-skill init [--traces runs] [--threshold 80] [--comment] [--sarif] [--dry-run]

Examples:
  trace-to-skill analyze ./runs
  trace-to-skill suggest ./runs --target skill --output skills/verification-before-completion/SKILL.md
  trace-to-skill eval ./runs --threshold 80
  trace-to-skill comment ./runs
  trace-to-skill compare --before ./runs/before --after ./runs/after
  trace-to-skill doctor . --threshold 85
  trace-to-skill doctor-comment . --threshold 85
  trace-to-skill init --comment --sarif
`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`trace-to-skill: ${message}\n`);
  process.exitCode = 1;
});
