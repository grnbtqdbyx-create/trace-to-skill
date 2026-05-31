#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { analyzeTargets } from "./analyze.js";
import { evaluate } from "./eval.js";
import { postPullRequestComment } from "./github.js";
import { renderAgentsRules, renderMarkdown, renderPrComment, renderSkill } from "./report.js";

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
    const output = format === "json" ? `${JSON.stringify(result, null, 2)}\n` : renderMarkdown(result);
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

  printHelp();
  process.exitCode = 1;
}

function stringFlag(value: string | boolean | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
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
  trace-to-skill analyze <trace-file-or-dir> [--format markdown|json] [--output report.md]
  trace-to-skill suggest <trace-file-or-dir> [--target agents-md|skill] [--output AGENTS.generated.md]
  trace-to-skill eval <trace-file-or-dir> [--threshold 75] [--format text|json]
  trace-to-skill comment <trace-file-or-dir> [--dry-run] [--token $GITHUB_TOKEN]

Examples:
  trace-to-skill analyze ./runs
  trace-to-skill suggest ./runs --target skill --output skills/verification-before-completion/SKILL.md
  trace-to-skill eval ./runs --threshold 80
  trace-to-skill comment ./runs
`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`trace-to-skill: ${message}\n`);
  process.exitCode = 1;
});
