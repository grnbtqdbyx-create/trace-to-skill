#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { lintAgents, renderAgentsLintMarkdown } from "./agentsLint.js";
import { analyzeTargets } from "./analyze.js";
import { renderBenchmarkMarkdown, runBenchmark } from "./benchmark.js";
import { createWorkspaceCheckpoint, renderWorkspaceCheckpointMarkdown } from "./checkpoint.js";
import { auditCodexConfig, renderConfigAuditMarkdown } from "./configAudit.js";
import { listDemoScenarios, renderDemoMarkdown, renderDemoScenarioList, runDemo } from "./demo.js";
import { createDiagnosticsBundle, renderDiagnosticsBundleMarkdown } from "./diagnosticsBundle.js";
import { doctorRepo } from "./doctor.js";
import { compareAnalyses, evaluate } from "./eval.js";
import { analyzeGithubEventContext } from "./githubContext.js";
import { buildGithubIssueMap, buildIssueMapFromSources, renderIssueMapMarkdown } from "./issueMap.js";
import { postIssueComment, postPullRequestComment } from "./github.js";
import { initProject } from "./init.js";
import { auditLspReadiness, renderLspAuditMarkdown } from "./lspAudit.js";
import { renderOssBriefMarkdown, runOssBrief } from "./ossBrief.js";
import { guardPatchFile, renderPatchGuardMarkdown } from "./patchGuard.js";
import { auditCodexPlugins, renderPluginAuditMarkdown } from "./pluginAudit.js";
import { auditProcessEvidence, renderProcessAuditMarkdown } from "./processAudit.js";
import { redactTargets } from "./redact.js";
import { renderAgentsRules, renderCodexIssueReport, renderComparison, renderDoctorMarkdown, renderDoctorPrComment, renderMarkdown, renderPrComment, renderSarif, renderSkill } from "./report.js";
import { renderScorecardMarkdown, renderScorecardPrComment, runScorecard } from "./scorecard.js";
import { auditCodexSessions, renderSessionAuditMarkdown } from "./sessionAudit.js";
import { auditSensitivePaths, normalizeSensitiveIgnoreTarget, renderSensitiveAuditMarkdown, renderSensitiveIgnoreFile } from "./sensitiveAudit.js";
import { buildSurfaceMatrix, renderSurfaceMatrixMarkdown } from "./surfaceMatrix.js";
import { buildUsageEvidence, renderUsageEvidenceMarkdown } from "./usageEvidence.js";

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

  if (parsed.command === "demo") {
    const format = String(parsed.flags.format ?? "markdown");
    if (parsed.flags.list) {
      const scenarios = listDemoScenarios();
      const output = format === "json" ? `${JSON.stringify({ scenarios }, null, 2)}\n` : renderDemoScenarioList(scenarios);
      await writeOutput(output, parsed.flags.output);
      return;
    }

    const result = await runDemo(parsed.targets[0]);
    const output = format === "json" ? `${JSON.stringify(result, null, 2)}\n` : renderDemoMarkdown(result);
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

  if (parsed.command === "codex-report") {
    const result = await analyzeTargets(parsed.targets);
    await writeOutput(renderCodexIssueReport(result), parsed.flags.output);
    return;
  }

  if (parsed.command === "usage-evidence" || parsed.command === "usage-doctor") {
    const result = await buildUsageEvidence(parsed.targets);
    const format = String(parsed.flags.format ?? "markdown");
    const output = format === "json" ? `${JSON.stringify(result, null, 2)}\n` : renderUsageEvidenceMarkdown(result);
    await writeOutput(output, parsed.flags.output);
    return;
  }

  if (parsed.command === "process-audit") {
    const result = await auditProcessEvidence(parsed.targets);
    const format = String(parsed.flags.format ?? "markdown");
    const output = format === "json" ? `${JSON.stringify(result, null, 2)}\n` : renderProcessAuditMarkdown(result);
    await writeOutput(output, parsed.flags.output);
    process.exitCode = result.status === "warn" ? 1 : 0;
    return;
  }

  if (parsed.command === "checkpoint") {
    const result = await createWorkspaceCheckpoint(parsed.targets[0] ?? process.cwd(), {
      output: stringFlag(parsed.flags.output),
      includeUntracked: parsed.flags["no-untracked"] !== true,
      includeIgnored: Boolean(parsed.flags["include-ignored"])
    });
    const format = String(parsed.flags.format ?? "markdown");
    const output = format === "json" ? `${JSON.stringify(result, null, 2)}\n` : renderWorkspaceCheckpointMarkdown(result);
    process.stdout.write(output);
    return;
  }

  if (parsed.command === "lint-agents") {
    const result = await lintAgents(parsed.targets[0] ?? process.cwd());
    const format = String(parsed.flags.format ?? "markdown");
    const output = format === "json" ? `${JSON.stringify(result, null, 2)}\n` : renderAgentsLintMarkdown(result);
    await writeOutput(output, parsed.flags.output);
    process.exitCode = result.status === "fail" ? 1 : 0;
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

  if (parsed.command === "redact") {
    const { result, content } = await redactTargets(parsed.targets, stringFlag(parsed.flags.output));
    const format = String(parsed.flags.format ?? "text");
    if (format === "json") {
      await writeOutput(`${JSON.stringify(result, null, 2)}\n`, undefined);
      return;
    }

    if (content !== undefined) {
      process.stdout.write(content);
      return;
    }

    const replacementCount = Object.values(result.totals).reduce((sum, count) => sum + count, 0);
    process.stdout.write(`redacted ${result.files.length} file(s), ${replacementCount} replacement(s)\n`);
    return;
  }

  if (parsed.command === "sensitive-audit") {
    const result = await auditSensitivePaths(parsed.targets[0] ?? process.cwd());
    const format = String(parsed.flags.format ?? "markdown");
    const output = format === "json" ? `${JSON.stringify(result, null, 2)}\n` :
      format === "ignore" ? renderSensitiveIgnoreFile(result, normalizeSensitiveIgnoreTarget(String(parsed.flags["ignore-target"] ?? "agentignore"))) :
        renderSensitiveAuditMarkdown(result);
    await writeOutput(output, parsed.flags.output);
    process.exitCode = result.status === "fail" ? 1 : 0;
    return;
  }

  if (parsed.command === "lsp-audit") {
    const result = await auditLspReadiness(parsed.targets[0] ?? process.cwd());
    const format = String(parsed.flags.format ?? "markdown");
    const output = format === "json" ? `${JSON.stringify(result, null, 2)}\n` : renderLspAuditMarkdown(result);
    await writeOutput(output, parsed.flags.output);
    process.exitCode = result.status === "fail" ? 1 : 0;
    return;
  }

  if (parsed.command === "benchmark") {
    const result = await runBenchmark();
    const format = String(parsed.flags.format ?? "markdown");
    const output = format === "json" ? `${JSON.stringify(result, null, 2)}\n` : renderBenchmarkMarkdown(result);
    await writeOutput(output, parsed.flags.output);
    process.exitCode = result.passed ? 0 : 1;
    return;
  }

  if (parsed.command === "scorecard") {
    const threshold = numberFlag(parsed.flags.threshold) ?? 85;
    const result = await runScorecard(parsed.targets[0] ?? process.cwd(), threshold);
    const format = String(parsed.flags.format ?? "markdown");
    const output = format === "json" ? `${JSON.stringify(result, null, 2)}\n` : renderScorecardMarkdown(result);
    await writeOutput(output, parsed.flags.output);
    process.exitCode = result.passed ? 0 : 1;
    return;
  }

  if (parsed.command === "scorecard-comment") {
    const threshold = numberFlag(parsed.flags.threshold) ?? 85;
    const result = await runScorecard(parsed.targets[0] ?? process.cwd(), threshold);
    const body = renderScorecardPrComment(result);
    const message = await postPullRequestComment({
      body,
      token: stringFlag(parsed.flags.token),
      repository: stringFlag(parsed.flags.repository),
      eventPath: stringFlag(parsed.flags.event),
      dryRun: Boolean(parsed.flags["dry-run"]),
      marker: "<!-- trace-to-skill-scorecard-report -->",
      reportName: "trace-to-skill scorecard report"
    });
    process.stdout.write(`${message}\n`);
    process.exitCode = result.passed ? 0 : 1;
    return;
  }

  if (parsed.command === "oss-brief") {
    const threshold = numberFlag(parsed.flags.threshold) ?? 85;
    const result = await runOssBrief(parsed.targets[0] ?? process.cwd(), threshold);
    const format = String(parsed.flags.format ?? "markdown");
    const output = format === "json" ? `${JSON.stringify(result, null, 2)}\n` : renderOssBriefMarkdown(result);
    await writeOutput(output, parsed.flags.output);
    process.exitCode = result.scorecard.passed ? 0 : 1;
    return;
  }

  if (parsed.command === "issue-map") {
    const issueMapOptions = {
      top: numberFlag(parsed.flags.top)
    };
    const repo = stringFlag(parsed.flags.repo);
    const result = repo ?
      await buildGithubIssueMap(repo, {
        ...issueMapOptions,
        state: githubIssueStateFlag(parsed.flags.state),
        limit: numberFlag(parsed.flags.limit),
        token: stringFlag(parsed.flags.token)
      }) :
      await buildIssueMapFromCliTargets(parsed.targets, issueMapOptions);
    const format = String(parsed.flags.format ?? "markdown");
    const output = format === "json" ? `${JSON.stringify(result, null, 2)}\n` : renderIssueMapMarkdown(result);
    await writeOutput(output, parsed.flags.output);
    return;
  }

  if (parsed.command === "issue-map-comment") {
    const issueMapOptions = {
      top: numberFlag(parsed.flags.top)
    };
    const repo = stringFlag(parsed.flags.repo);
    const result = repo ?
      await buildGithubIssueMap(repo, {
        ...issueMapOptions,
        state: githubIssueStateFlag(parsed.flags.state),
        limit: numberFlag(parsed.flags.limit),
        token: stringFlag(parsed.flags.token)
      }) :
      await buildIssueMapFromCliTargets(parsed.targets, issueMapOptions);
    const body = `<!-- trace-to-skill-issue-map-report -->\n${renderIssueMapMarkdown(result)}`;
    const message = await postIssueComment({
      body,
      token: stringFlag(parsed.flags.token),
      repository: stringFlag(parsed.flags["comment-repository"]) ?? stringFlag(parsed.flags.repository),
      issueNumber: positiveIntegerFlag(parsed.flags["issue-number"], "--issue-number"),
      dryRun: Boolean(parsed.flags["dry-run"]),
      marker: "<!-- trace-to-skill-issue-map-report -->",
      reportName: "trace-to-skill issue-map report"
    });
    process.stdout.write(`${message}\n`);
    return;
  }

  if (parsed.command === "surface-matrix") {
    const issueMapOptions = {
      top: numberFlag(parsed.flags.top)
    };
    const repo = stringFlag(parsed.flags.repo);
    const issueMap = repo ?
      await buildGithubIssueMap(repo, {
        ...issueMapOptions,
        state: githubIssueStateFlag(parsed.flags.state),
        limit: numberFlag(parsed.flags.limit),
        token: stringFlag(parsed.flags.token)
      }) :
      await buildIssueMapFromCliTargets(parsed.targets, issueMapOptions);
    const result = buildSurfaceMatrix(issueMap);
    const format = String(parsed.flags.format ?? "markdown");
    const output = format === "json" ? `${JSON.stringify(result, null, 2)}\n` : renderSurfaceMatrixMarkdown(result);
    await writeOutput(output, parsed.flags.output);
    return;
  }

  if (parsed.command === "guard-github-event") {
    const eventPath = parsed.targets[0] ?? stringFlag(parsed.flags.event) ?? process.env.GITHUB_EVENT_PATH;
    if (!eventPath) {
      throw new Error("guard-github-event requires an event JSON path or GITHUB_EVENT_PATH.");
    }

    const threshold = numberFlag(parsed.flags.threshold) ?? 80;
    const result = await analyzeGithubEventContext(eventPath);
    const evalResult = evaluate(result, threshold);
    const format = String(parsed.flags.format ?? "markdown");
    const output = format === "json" ? `${JSON.stringify(result, null, 2)}\n` : renderAnalysis(result, "markdown");
    await writeOutput(output, parsed.flags.output);
    process.exitCode = evalResult.passed ? 0 : 1;
    return;
  }

  if (parsed.command === "guard-patch") {
    const patchPath = parsed.targets[0];
    if (!patchPath) {
      throw new Error("guard-patch requires a patch file path.");
    }

    const result = await guardPatchFile(patchPath, stringFlag(parsed.flags.root) ?? process.cwd());
    const format = String(parsed.flags.format ?? "markdown");
    const output = format === "json" ? `${JSON.stringify(result, null, 2)}\n` : renderPatchGuardMarkdown(result);
    await writeOutput(output, parsed.flags.output);
    process.exitCode = result.status === "pass" ? 0 : 1;
    return;
  }

  if (parsed.command === "session-audit") {
    const result = await auditCodexSessions(parsed.targets[0] ?? "~/.codex", {
      largeFileBytes: byteFlag(parsed.flags["large-mb"], 1024 * 1024),
      hugeLineBytes: byteFlag(parsed.flags["huge-line-kb"], 1024)
    });
    const format = String(parsed.flags.format ?? "markdown");
    const output = format === "json" ? `${JSON.stringify(result, null, 2)}\n` : renderSessionAuditMarkdown(result);
    await writeOutput(output, parsed.flags.output);
    process.exitCode = result.status === "fail" ? 1 : 0;
    return;
  }

  if (parsed.command === "config-audit") {
    const result = await auditCodexConfig(parsed.targets[0] ?? "~/.codex");
    const format = String(parsed.flags.format ?? "markdown");
    const output = format === "json" ? `${JSON.stringify(result, null, 2)}\n` : renderConfigAuditMarkdown(result);
    await writeOutput(output, parsed.flags.output);
    process.exitCode = result.status === "fail" ? 1 : 0;
    return;
  }

  if (parsed.command === "plugin-audit") {
    const result = await auditCodexPlugins(parsed.targets[0] ?? "~/.codex", {
      appPath: stringFlag(parsed.flags.app)
    });
    const format = String(parsed.flags.format ?? "markdown");
    const output = format === "json" ? `${JSON.stringify(result, null, 2)}\n` : renderPluginAuditMarkdown(result);
    await writeOutput(output, parsed.flags.output);
    process.exitCode = result.status === "fail" ? 1 : 0;
    return;
  }

  if (parsed.command === "diagnostics-bundle") {
    const result = await createDiagnosticsBundle(
      parsed.targets[0] ?? "~/.codex",
      stringFlag(parsed.flags.output) ?? "trace-to-skill-codex-diagnostics",
      {
        appPath: stringFlag(parsed.flags.app),
        largeFileBytes: byteFlag(parsed.flags["large-mb"], 1024 * 1024),
        hugeLineBytes: byteFlag(parsed.flags["huge-line-kb"], 1024),
        force: Boolean(parsed.flags.force)
      }
    );
    const format = String(parsed.flags.format ?? "markdown");
    const output = format === "json" ? `${JSON.stringify(result, null, 2)}\n` : renderDiagnosticsBundleMarkdown(result);
    await writeOutput(output, undefined);
    process.exitCode = result.status === "fail" ? 1 : 0;
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
      doctorThreshold: stringFlag(parsed.flags["doctor-threshold"]),
      issueMapRepo: stringFlag(parsed.flags["issue-map-repo"]),
      issueMapState: githubIssueStateFlag(parsed.flags["issue-map-state"]),
      issueMapLimit: stringFlag(parsed.flags["issue-map-limit"]),
      issueMapCommentIssue: stringFlag(parsed.flags["issue-map-comment-issue"]),
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

function positiveIntegerFlag(value: string | boolean | undefined, flagName: string): number {
  if (typeof value !== "string" || !/^[0-9]{1,10}$/.test(value)) {
    throw new Error(`${flagName} must be a positive integer.`);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${flagName} must be a positive integer.`);
  }

  return parsed;
}

function byteFlag(value: string | boolean | undefined, multiplier: number): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || !/^[0-9]{1,6}$/.test(value)) {
    throw new Error("byte threshold flags must be positive integers");
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error("byte threshold flags must be positive integers");
  }

  return parsed * multiplier;
}

function githubIssueStateFlag(value: string | boolean | undefined): "open" | "closed" | "all" | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === "open" || value === "closed" || value === "all") {
    return value;
  }

  throw new Error("--state must be one of: open, closed, all");
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

async function buildIssueMapFromCliTargets(targets: string[], options: { top?: number }) {
  if (targets.length === 0) {
    if (!process.stdin.isTTY) {
      const raw = await readStdin();
      if (!raw.trim()) {
        throw new Error("issue-map received empty stdin. Pipe GitHub issue JSON, pass an export file, or use --repo owner/name.");
      }
      return buildIssueMapFromSources([{ source: "stdin", raw }], options);
    }
    throw new Error("issue-map requires at least one GitHub issue export file, stdin input, or --repo owner/name.");
  }

  const sources: Array<{ source: string; raw: string }> = [];
  let stdinRaw: string | undefined;
  for (const target of targets) {
    if (target === "-") {
      stdinRaw ??= await readStdin();
      if (!stdinRaw.trim()) {
        throw new Error("issue-map received empty stdin. Pipe GitHub issue JSON before using issue-map -.");
      }
      sources.push({ source: "stdin", raw: stdinRaw });
      continue;
    }
    sources.push({ source: target, raw: await readFile(target, "utf8") });
  }

  return buildIssueMapFromSources(sources, options);
}

async function readStdin(): Promise<string> {
  let raw = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) {
    raw += chunk;
  }
  return raw;
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
  trace-to-skill demo [scenario] [--list] [--format markdown|json] [--output docs/DEMO.md]
  trace-to-skill analyze <trace-file-or-dir> [--format markdown|json|sarif] [--output report.md]
  trace-to-skill codex-report <trace-file-or-dir> [--output openai-codex-issue.md]
  trace-to-skill usage-evidence <usage-log-file-or-dir> [--format markdown|json] [--output usage-evidence.md]
  trace-to-skill usage-doctor <usage-log-file-or-dir> [--format markdown|json] [--output usage-evidence.md]
  trace-to-skill process-audit <process-log-file-or-dir> [--format markdown|json] [--output process-audit.md]
  trace-to-skill checkpoint [repo-dir] [--output checkpoint-dir] [--format markdown|json] [--no-untracked] [--include-ignored]
  trace-to-skill suggest <trace-file-or-dir> [--target agents-md|skill] [--output AGENTS.generated.md]
  trace-to-skill lint-agents [repo-dir] [--format markdown|json] [--output report.md]
  trace-to-skill redact <trace-file-or-dir> [--output redacted-runs] [--format text|json]
  trace-to-skill sensitive-audit [repo-dir] [--format markdown|json|ignore] [--ignore-target agentignore|codexignore|aiexclude|gitignore] [--output sensitive-paths.md]
  trace-to-skill lsp-audit [repo-dir] [--format markdown|json] [--output lsp-readiness.md]
  trace-to-skill eval <trace-file-or-dir> [--threshold 75] [--format text|json]
  trace-to-skill benchmark [--format markdown|json] [--output docs/BENCHMARK.md]
  trace-to-skill scorecard [repo-dir] [--threshold 85] [--format markdown|json] [--output docs/SCORECARD.md]
  trace-to-skill scorecard-comment [repo-dir] [--threshold 85] [--dry-run] [--token $GITHUB_TOKEN]
  trace-to-skill oss-brief [repo-dir] [--threshold 85] [--format markdown|json] [--output docs/OPENAI_OSS_BRIEF.md]
  trace-to-skill issue-map <github-issues.json-or-md> [--top 12] [--format markdown|json] [--output codex-issue-map.md]
  trace-to-skill surface-matrix <github-issues.json-or-md> [--top 12] [--format markdown|json] [--output codex-surface-matrix.md]
  gh issue list --repo openai/codex --json number,title,body,url,labels,comments,updatedAt | trace-to-skill issue-map - [--format markdown|json]
  trace-to-skill issue-map --repo openai/codex [--state open|closed|all] [--limit 100] [--token $GITHUB_TOKEN] [--format markdown|json]
  trace-to-skill surface-matrix --repo openai/codex [--state open|closed|all] [--limit 100] [--token $GITHUB_TOKEN] [--format markdown|json]
  trace-to-skill issue-map-comment --repo openai/codex --issue-number 8 [--comment-repository owner/repo] [--state open|closed|all] [--limit 100] [--dry-run] [--token $GITHUB_TOKEN]
  trace-to-skill guard-github-event [event.json] [--threshold 80] [--format markdown|json] [--output report.md]
  trace-to-skill guard-patch <patch-file> [--root repo-dir] [--format markdown|json] [--output report.md]
  trace-to-skill session-audit [codex-home-or-sessions-dir] [--large-mb 10] [--huge-line-kb 512] [--format markdown|json]
  trace-to-skill config-audit [codex-home-or-config.toml] [--format markdown|json]
  trace-to-skill plugin-audit [codex-home] [--app /Applications/Codex.app] [--format markdown|json]
  trace-to-skill diagnostics-bundle [codex-home] [--output codex-diagnostics] [--force] [--format markdown|json]
  trace-to-skill comment <trace-file-or-dir> [--dry-run] [--token $GITHUB_TOKEN]
  trace-to-skill compare --before <old-run> --after <new-run> [--format markdown|json]
  trace-to-skill doctor [repo-dir] [--threshold 85] [--format markdown|json|comment] [--output report.md]
  trace-to-skill doctor-comment [repo-dir] [--threshold 85] [--dry-run] [--token $GITHUB_TOKEN]
  trace-to-skill init [--traces runs] [--threshold 80] [--doctor-threshold 85] [--issue-map-repo owner/name] [--issue-map-state open|closed|all] [--issue-map-limit 100] [--issue-map-comment-issue 8] [--comment] [--sarif] [--dry-run]

Examples:
  trace-to-skill demo
  trace-to-skill demo latency-regression
  trace-to-skill analyze ./runs
  trace-to-skill codex-report ./runs --output openai-codex-issue.md
  trace-to-skill usage-evidence ./usage-notes.md --output usage-evidence.md
  trace-to-skill usage-doctor ./usage-notes.md --format json
  trace-to-skill process-audit ./process-notes.md --output process-audit.md
  trace-to-skill checkpoint . --output .trace-to-skill/checkpoints/before-codex
  trace-to-skill suggest ./runs --target skill --output skills/verification-before-completion/SKILL.md
  trace-to-skill lint-agents .
  trace-to-skill redact ./runs --output redacted-runs
  trace-to-skill sensitive-audit .
  trace-to-skill sensitive-audit . --format ignore --ignore-target codexignore --output .codexignore.generated
  trace-to-skill lsp-audit .
  trace-to-skill eval ./runs --threshold 80
  trace-to-skill benchmark
  trace-to-skill surface-matrix --repo openai/codex --output codex-surface-matrix.md
  trace-to-skill scorecard .
  trace-to-skill scorecard-comment . --threshold 85
  trace-to-skill oss-brief . --output docs/OPENAI_OSS_BRIEF.md
  gh issue list --repo openai/codex --state open --limit 100 --json number,title,body,url,labels,comments,createdAt,updatedAt > codex-issues.json
  trace-to-skill issue-map codex-issues.json --output codex-issue-map.md
  gh issue list --repo openai/codex --state all --limit 100 --json number,title,body,url,labels,comments,updatedAt | trace-to-skill issue-map - --format json
  trace-to-skill issue-map --repo openai/codex --limit 100 --output codex-issue-map.md
  trace-to-skill issue-map-comment --repo openai/codex --issue-number 8 --comment-repository owner/repo --dry-run
  trace-to-skill guard-github-event "$GITHUB_EVENT_PATH"
  trace-to-skill guard-patch ./change.patch --root .
  trace-to-skill session-audit ~/.codex --format json
  trace-to-skill config-audit ~/.codex --format json
  trace-to-skill plugin-audit ~/.codex --app /Applications/Codex.app --format json
  trace-to-skill diagnostics-bundle ~/.codex --output codex-diagnostics
  trace-to-skill comment ./runs
  trace-to-skill compare --before ./runs/before --after ./runs/after
  trace-to-skill doctor . --threshold 85
  trace-to-skill doctor-comment . --threshold 85
  trace-to-skill init --comment --sarif
  trace-to-skill init --issue-map-repo openai/codex --issue-map-state all --issue-map-limit 100
  trace-to-skill init --issue-map-repo openai/codex --issue-map-comment-issue 8
`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`trace-to-skill: ${message}\n`);
  process.exitCode = 1;
});
