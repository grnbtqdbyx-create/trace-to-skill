import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { lintAgents, renderAgentsLintMarkdown } from "../src/agentsLint.js";
import { analyzeTargets } from "../src/analyze.js";
import { renderBenchmarkMarkdown, runBenchmark } from "../src/benchmark.js";
import { doctorRepo } from "../src/doctor.js";
import { compareAnalyses, evaluate } from "../src/eval.js";
import { analyzeGithubEventContext, extractGithubContextInputs } from "../src/githubContext.js";
import { postPullRequestComment } from "../src/github.js";
import { initProject } from "../src/init.js";
import { redactTargets, redactText } from "../src/redact.js";
import { renderAgentsRules, renderComparison, renderDoctorPrComment, renderPrComment, renderSarif, renderSkill } from "../src/report.js";
import { renderScorecardMarkdown, renderScorecardPrComment, runScorecard } from "../src/scorecard.js";

test("analyzeTargets detects failed agent workflow signals", async () => {
  const result = await analyzeTargets(["fixtures/failed-run.md"]);

  assert.equal(result.inputs.length, 1);
  assert.ok(result.score < 75);
  assert.ok(result.findings.some((finding) => finding.kind === "tests_not_run"));
  assert.ok(result.findings.some((finding) => finding.kind === "test_failure"));
  assert.ok(result.findings.some((finding) => finding.kind === "hallucinated_file"));
  assert.ok(result.findings.some((finding) => finding.kind === "mcp_risk"));
});

test("evaluate fails risky traces and passes healthy traces", async () => {
  const failed = await analyzeTargets(["fixtures/failed-run.md"]);
  const safe = await analyzeTargets(["fixtures/safe-run.md"]);

  assert.equal(evaluate(failed).passed, false);
  assert.equal(safe.score, 100);
  assert.equal(evaluate(safe).passed, true);
});

test("renderers produce reusable AGENTS.md and SKILL.md content", async () => {
  const result = await analyzeTargets(["fixtures/failed-run.md"]);
  const agents = renderAgentsRules(result);
  const skill = renderSkill(result);

  assert.match(agents, /Agent Rules Generated From Failed Runs/);
  assert.match(agents, /validation command/);
  assert.match(skill, /Skill Generated From Agent Traces/);
  assert.match(skill, /Evidence Required/);
});

test("analyzeTargets normalizes Codex-style JSONL traces", async () => {
  const result = await analyzeTargets(["fixtures/codex-session.jsonl"]);

  assert.ok(result.findings.some((finding) => finding.kind === "premature_completion"));
  assert.ok(result.findings.some((finding) => finding.kind === "test_failure"));
});

test("renderPrComment includes marker for update-in-place behavior", async () => {
  const result = await analyzeTargets(["fixtures/failed-run.md"]);
  const comment = renderPrComment(result);

  assert.match(comment, /trace-to-skill-report/);
  assert.match(comment, /Top Findings/);
});

test("postPullRequestComment dry-run resolves pull request event", async () => {
  const message = await postPullRequestComment({
    repository: "owner/repo",
    eventPath: "fixtures/github-pr-event.json",
    body: "test",
    dryRun: true
  });

  assert.equal(message, "dry-run: would post trace-to-skill report to owner/repo#42");
});

test("postPullRequestComment dry-run supports custom report markers", async () => {
  const message = await postPullRequestComment({
    repository: "owner/repo",
    eventPath: "fixtures/github-pr-event.json",
    body: "test",
    marker: "<!-- trace-to-skill-doctor-report -->",
    reportName: "trace-to-skill doctor report",
    dryRun: true
  });

  assert.equal(message, "dry-run: would post trace-to-skill doctor report to owner/repo#42");
});

test("analyzeTargets scores MCP config capabilities and secret env keys", async () => {
  const result = await analyzeTargets(["fixtures/mcp-risk.json"]);
  const mcpFinding = result.findings.find((finding) => finding.kind === "mcp_risk");

  assert.ok(mcpFinding);
  assert.match(mcpFinding.evidence.map((evidence) => evidence.excerpt).join("\n"), /filesystem/);
  assert.match(mcpFinding.evidence.map((evidence) => evidence.excerpt).join("\n"), /GITHUB_TOKEN/);
});

test("analyzeTargets detects contradictory agent instruction files", async () => {
  const result = await analyzeTargets(["fixtures/instruction-drift"]);
  const finding = result.findings.find((item) => item.kind === "ignored_instruction");

  assert.ok(finding);
  assert.match(finding.evidence.map((evidence) => evidence.excerpt).join("\n"), /npm test/);
  assert.match(finding.evidence.map((evidence) => evidence.excerpt).join("\n"), /pnpm test/);
  assert.match(finding.evidence.map((evidence) => evidence.excerpt).join("\n"), /skips validation/);
});

test("analyzeTargets detects prompt injection in untrusted agent inputs", async () => {
  const result = await analyzeTargets(["fixtures/prompt-injection.md"]);
  const finding = result.findings.find((item) => item.kind === "prompt_injection");

  assert.ok(finding);
  assert.equal(finding.severity, "critical");
  assert.match(finding.suggestedRule, /untrusted data/);
  assert.ok(finding.evidence.length >= 2);
});

test("analyzeTargets detects Codex context compaction failures", async () => {
  const result = await analyzeTargets(["fixtures/context-compaction.md"]);
  const finding = result.findings.find((item) => item.kind === "context_compaction");
  const evidence = finding?.evidence.map((item) => item.excerpt).join("\n") ?? "";

  assert.ok(finding);
  assert.equal(finding.severity, "high");
  assert.match(evidence, /remote compact task/);
  assert.match(evidence, /context_length_exceeded/);
  assert.match(evidence, /unknown variant auto/);
  assert.match(finding.suggestedRule, /compact error/);
});

test("analyzeTargets detects Codex sandbox permission failures", async () => {
  const result = await analyzeTargets(["fixtures/sandbox-permission.md"]);
  const finding = result.findings.find((item) => item.kind === "sandbox_permission");
  const evidence = finding?.evidence.map((item) => item.excerpt).join("\n") ?? "";

  assert.ok(finding);
  assert.equal(finding.severity, "high");
  assert.match(evidence, /setup refresh/);
  assert.match(evidence, /os error 740/);
  assert.match(evidence, /CodexSandboxOffline/);
  assert.match(finding.suggestedRule, /sandbox_mode/);
});

test("analyzeTargets detects Codex quota mismatches", async () => {
  const result = await analyzeTargets(["fixtures/quota-mismatch.md"]);
  const finding = result.findings.find((item) => item.kind === "quota_mismatch");
  const evidence = finding?.evidence.map((item) => item.excerpt).join("\n") ?? "";

  assert.ok(finding);
  assert.equal(finding.severity, "high");
  assert.match(evidence, /You've hit your usage limit/);
  assert.match(evidence, /21% left/);
  assert.match(finding.suggestedRule, /usage dashboard/);
});

test("redactText removes common secrets and private identifiers", () => {
  const raw = [
    "OPENAI_API_KEY=sk-proj-abcdefghijklmnopqrstuvwxyz123456",
    "Authorization: Bearer abcdefghijklmnopqrstuvwxyz.1234567890",
    "github token ghp_abcdefghijklmnopqrstuvwxyz123456",
    "email maintainer@example.com",
    "path /Users/ogun/private-repo"
  ].join("\n");

  const result = redactText(raw);

  assert.doesNotMatch(result.content, /sk-proj-/);
  assert.doesNotMatch(result.content, /ghp_/);
  assert.doesNotMatch(result.content, /maintainer@example\.com/);
  assert.doesNotMatch(result.content, /\/Users\/ogun/);
  assert.match(result.content, /\[REDACTED_OPENAI_KEY\]|\[REDACTED\]/);
  assert.match(result.content, /Bearer \[REDACTED_BEARER_TOKEN\]/);
  assert.equal(result.replacements.email, 1);
  assert.equal(result.replacements.mac_home_path, 1);
});

test("redactTargets writes redacted directory copies", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "trace-to-skill-redact-"));
  const runs = path.join(cwd, "runs");
  const output = path.join(cwd, "redacted");
  await mkdir(runs, { recursive: true });
  await writeFile(path.join(runs, "failed.md"), "token=ghp_abcdefghijklmnopqrstuvwxyz123456\n/Users/ogun/project\n", "utf8");

  const previousCwd = process.cwd();
  process.chdir(cwd);
  try {
    const { result } = await redactTargets(["runs"], "redacted");
    const redacted = await readFile(path.join(output, "runs/failed.md"), "utf8");

    assert.equal(result.files.length, 1);
    assert.equal(result.files[0].outputPath, "redacted/runs/failed.md");
    assert.doesNotMatch(redacted, /ghp_/);
    assert.doesNotMatch(redacted, /\/Users\/ogun/);
    assert.equal(result.totals.github_token, 1);
    assert.equal(result.totals.mac_home_path, 1);
  } finally {
    process.chdir(previousCwd);
  }
});

test("guard-github-event extracts untrusted PR text and detects prompt injection", async () => {
  const result = await analyzeGithubEventContext("fixtures/github-prompt-injection-event.json");

  assert.equal(result.eventPath, "fixtures/github-prompt-injection-event.json");
  assert.ok(result.inputs.includes("github-event/pull_request"));
  assert.ok(result.findings.some((finding) => finding.kind === "prompt_injection"));
  assert.equal(evaluate(result, 80).passed, false);
});

test("extractGithubContextInputs keeps supported event fields scoped", () => {
  const inputs = extractGithubContextInputs({
    pull_request: {
      title: "Update docs",
      body: "Please update README."
    },
    comment: {
      body: "Looks good."
    }
  });

  assert.deepEqual(inputs.map((input) => input.path), ["github-event/pull_request", "github-event/comment"]);
  assert.match(inputs[0].content, /title: Update docs/);
  assert.match(inputs[1].content, /body: Looks good/);
});

test("compareAnalyses keeps improved runs and renders a decision", async () => {
  const before = await analyzeTargets(["fixtures/failed-run.md"]);
  const after = await analyzeTargets(["fixtures/safe-run.md"]);
  const comparison = compareAnalyses(before, after);

  assert.equal(comparison.decision, "keep");
  assert.ok(comparison.delta > 0);
  assert.match(renderComparison(comparison), /Decision: \*\*keep\*\*/);
});

test("renderSarif produces GitHub code-scanning compatible results", async () => {
  const result = await analyzeTargets(["fixtures/mcp-risk.json"]);
  const sarif = JSON.parse(renderSarif(result)) as {
    version: string;
    runs: Array<{
      tool: { driver: { name: string; rules: Array<{ id: string }> } };
      results: Array<{ ruleId: string; level: string; locations: unknown[] }>;
    }>;
  };

  assert.equal(sarif.version, "2.1.0");
  assert.equal(sarif.runs[0].tool.driver.name, "trace-to-skill");
  assert.ok(sarif.runs[0].tool.driver.rules.some((rule) => rule.id === "mcp_risk"));
  assert.ok(sarif.runs[0].results.some((item) => item.ruleId === "mcp_risk" && item.level === "error"));
});

test("initProject scaffolds workflow without overwriting existing files", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "trace-to-skill-init-"));
  const first = await initProject({ cwd, comment: true, sarif: true });
  const second = await initProject({ cwd, comment: true, sarif: true });
  const workflow = await readFile(path.join(cwd, ".github/workflows/agent-learning.yml"), "utf8");
  const doctorWorkflow = await readFile(path.join(cwd, ".github/workflows/codex-readiness.yml"), "utf8");

  assert.ok(first.written.includes(".github/workflows/agent-learning.yml"));
  assert.ok(first.written.includes(".github/workflows/codex-readiness.yml"));
  assert.ok(second.skipped.includes(".github/workflows/agent-learning.yml"));
  assert.ok(second.skipped.includes(".github/workflows/codex-readiness.yml"));
  assert.match(doctorWorkflow, /mode: all/);
  assert.match(doctorWorkflow, /doctor-threshold: "85"/);
  assert.match(doctorWorkflow, /doctor-comment: "true"/);
  assert.match(doctorWorkflow, /scorecard-comment: "true"/);
  assert.match(doctorWorkflow, /job-summary: "true"/);
  assert.match(doctorWorkflow, /benchmark-status/);
  assert.match(workflow, /upload-sarif/);
  assert.match(workflow, /mode: traces/);
  assert.match(workflow, /comment: "true"/);
  assert.match(workflow, /job-summary: "true"/);
  assert.match(workflow, /npx trace-to-skill analyze runs --format sarif/);
  assert.equal(workflow.includes("npx github:grnbtqdbyx-create/trace-to-skill"), false);
});

test("package metadata points npm users back to the public project", async () => {
  const packageJson = JSON.parse(await readFile("package.json", "utf8")) as {
    repository?: { url?: string };
    bugs?: { url?: string };
    homepage?: string;
    main?: string;
    types?: string;
    files?: string[];
    keywords?: string[];
    exports?: Record<string, unknown>;
    publishConfig?: { access?: string };
  };

  assert.equal(packageJson.repository?.url, "git+https://github.com/grnbtqdbyx-create/trace-to-skill.git");
  assert.equal(packageJson.bugs?.url, "https://github.com/grnbtqdbyx-create/trace-to-skill/issues");
  assert.equal(packageJson.homepage, "https://github.com/grnbtqdbyx-create/trace-to-skill#readme");
  assert.equal(packageJson.main, "dist/src/index.js");
  assert.equal(packageJson.types, "dist/src/index.d.ts");
  assert.ok(packageJson.exports?.["."]);
  assert.equal(packageJson.publishConfig?.access, "public");
  assert.ok(packageJson.files?.includes("llms.txt"));
  assert.ok(packageJson.files?.includes("docs/DISCOVERY.md"));
  assert.ok(packageJson.keywords?.includes("openai-codex"));
  assert.ok(packageJson.keywords?.includes("prompt-injection"));
  assert.ok(packageJson.keywords?.includes("context-compaction"));
  assert.ok(packageJson.keywords?.includes("sandbox-permission"));
  assert.ok(packageJson.keywords?.includes("quota-mismatch"));
});

test("initProject rejects unsafe workflow arguments", async () => {
  await assert.rejects(
    () => initProject({ traces: "../runs" }),
    /must not contain/
  );
  await assert.rejects(
    () => initProject({ traces: "runs; curl example.com" }),
    /safe relative path/
  );
  await assert.rejects(
    () => initProject({ threshold: "101" }),
    /between 1 and 100/
  );
});

test("doctorRepo scores a Codex-ready repository", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "trace-to-skill-doctor-ready-"));
  await mkdir(path.join(cwd, ".github/workflows"), { recursive: true });
  await mkdir(path.join(cwd, "runs"), { recursive: true });
  await writeFile(path.join(cwd, "AGENTS.md"), "Always run npm test before completion.\n", "utf8");
  await writeFile(path.join(cwd, "README.md"), "# Ready Repo\n", "utf8");
  await writeFile(path.join(cwd, "CONTRIBUTING.md"), "# Contributing\n", "utf8");
  await writeFile(path.join(cwd, "SECURITY.md"), "# Security\n", "utf8");
  await writeFile(path.join(cwd, "LICENSE"), "Apache License\nVersion 2.0\n", "utf8");
  await writeFile(path.join(cwd, "action.yml"), "name: ready\nruns:\n  using: composite\n  steps: []\n", "utf8");
  await writeFile(path.join(cwd, "runs/README.md"), "# Runs\n", "utf8");
  await writeFile(path.join(cwd, ".github/workflows/ci.yml"), "name: CI\non: [push]\njobs: {}\n", "utf8");
  await writeFile(path.join(cwd, "package.json"), JSON.stringify({
    scripts: {
      test: "node --test",
      build: "tsc"
    }
  }), "utf8");

  const result = await doctorRepo(cwd);

  assert.ok(result.score >= 85);
  assert.equal(result.checks.some((check) => check.status === "fail"), false);
  assert.ok(result.checks.some((check) => check.id === "agent-instructions" && check.status === "pass"));
  assert.match(renderDoctorPrComment(result, 85), /trace-to-skill-doctor-report/);
  assert.match(renderDoctorPrComment(result, 85), /Score: \*\*/);
});

test("doctorRepo flags missing controls and MCP risk", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "trace-to-skill-doctor-risk-"));
  await writeFile(path.join(cwd, "README.md"), "# Risky Repo\n", "utf8");
  await writeFile(path.join(cwd, "mcp.json"), JSON.stringify({
    mcpServers: {
      local: {
        command: "npx",
        args: ["@modelcontextprotocol/server-filesystem", "/Users/example/project"],
        env: {
          GITHUB_TOKEN: "ghp_example"
        }
      }
    }
  }, null, 2), "utf8");

  const result = await doctorRepo(cwd);

  assert.ok(result.score < 70);
  assert.ok(result.checks.some((check) => check.id === "agent-instructions" && check.status === "fail"));
  assert.ok(result.checks.some((check) => check.id === "license" && check.status === "fail"));
  assert.ok(result.findings.some((finding) => finding.kind === "mcp_risk"));
});

test("lintAgents passes canonical AGENTS.md and validation controls", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "trace-to-skill-agents-lint-ready-"));
  await writeFile(path.join(cwd, "AGENTS.md"), "Always run npm test before completion.\n", "utf8");
  await writeFile(path.join(cwd, "package.json"), JSON.stringify({
    scripts: {
      test: "node --test"
    }
  }), "utf8");

  const result = await lintAgents(cwd);
  const markdown = renderAgentsLintMarkdown(result);

  assert.equal(result.status, "pass");
  assert.ok(result.score >= 90);
  assert.deepEqual(result.instructionFiles, ["AGENTS.md"]);
  assert.match(markdown, /AGENTS\.md Lint Report/);
});

test("lintAgents fails missing AGENTS.md and conflicting instruction files", async () => {
  const result = await lintAgents("fixtures/instruction-drift");

  assert.equal(result.status, "fail");
  assert.ok(result.score < 90);
  assert.ok(result.instructionFiles.includes("AGENTS.md"));
  assert.ok(result.instructionFiles.includes("CLAUDE.md"));
  assert.ok(result.findings.some((finding) => finding.kind === "ignored_instruction"));
});

test("lintAgents detects missing paths and oversized instruction files", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "trace-to-skill-agents-lint-paths-"));
  const largeInstruction = `${"Review `src/missing.ts` before editing.\n"}${"Keep validation visible.\n".repeat(1300)}`;
  await writeFile(path.join(cwd, "AGENTS.md"), largeInstruction, "utf8");
  await writeFile(path.join(cwd, "package.json"), JSON.stringify({
    scripts: {
      test: "node --test"
    }
  }), "utf8");

  const result = await lintAgents(cwd);
  const markdown = renderAgentsLintMarkdown(result);

  assert.equal(result.status, "warn");
  assert.ok(result.findings.some((finding) => finding.kind === "hallucinated_file" && /src\/missing\.ts/.test(finding.evidence[0]?.excerpt ?? "")));
  assert.ok(result.findings.some((finding) => finding.kind === "ignored_instruction" && /Large agent instruction/.test(finding.title)));
  assert.match(markdown, /Agent instruction references missing paths/);
});

test("lintAgents detects static MCP config startup problems", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "trace-to-skill-agents-lint-mcp-"));
  await writeFile(path.join(cwd, "AGENTS.md"), "Always run npm test before completion.\n", "utf8");
  await writeFile(path.join(cwd, "package.json"), JSON.stringify({
    scripts: {
      test: "node --test"
    }
  }), "utf8");
  await writeFile(path.join(cwd, ".mcp.json"), JSON.stringify({
    mcp_servers: {
      docs: {
        command: "./missing-server",
        cwd: "missing-dir",
        env: {
          OPENAI_API_KEY: "$TRACE_TO_SKILL_TEST_MISSING_KEY",
          GITHUB_TOKEN: "your-token"
        }
      }
    }
  }, null, 2), "utf8");

  const result = await lintAgents(cwd);
  const mcpFinding = result.findings.find((finding) => finding.kind === "mcp_risk" && /unresolved startup/.test(finding.title));
  const evidence = mcpFinding?.evidence.map((item) => item.excerpt).join("\n") ?? "";

  assert.equal(result.status, "warn");
  assert.ok(mcpFinding);
  assert.match(evidence, /mcp_servers/);
  assert.match(evidence, /missing-server/);
  assert.match(evidence, /missing-dir/);
  assert.match(evidence, /TRACE_TO_SKILL_TEST_MISSING_KEY/);
  assert.match(evidence, /placeholder value/);
});

test("lintAgents detects project Codex TOML MCP startup problems", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "trace-to-skill-agents-lint-codex-toml-"));
  await mkdir(path.join(cwd, ".codex"), { recursive: true });
  await writeFile(path.join(cwd, "AGENTS.md"), "Always run npm test before completion.\n", "utf8");
  await writeFile(path.join(cwd, "package.json"), JSON.stringify({
    scripts: {
      test: "node --test"
    }
  }), "utf8");
  await writeFile(path.join(cwd, ".codex/config.toml"), [
    "[mcp_servers.laravel-boost]",
    "command = \"php\"",
    "args = [\"artisan\", \"boost:mcp\", \"${CLAUDE_PLUGIN_ROOT}\"]",
    "enabled = true",
    ""
  ].join("\n"), "utf8");

  const result = await lintAgents(cwd);
  const mcpFinding = result.findings.find((finding) => finding.kind === "mcp_risk" && /unresolved startup/.test(finding.title));
  const evidence = mcpFinding?.evidence.map((item) => item.excerpt).join("\n") ?? "";

  assert.equal(result.status, "warn");
  assert.ok(result.mcpConfigs.includes(".codex/config.toml"));
  assert.ok(mcpFinding);
  assert.match(evidence, /local stdio command without explicit cwd/);
  assert.match(evidence, /CLAUDE_PLUGIN_ROOT/);
});

test("lintAgents detects drift-prone Codex config settings", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "trace-to-skill-agents-lint-codex-config-"));
  await mkdir(path.join(cwd, ".codex"), { recursive: true });
  await writeFile(path.join(cwd, "AGENTS.md"), "Always run npm test before completion.\n", "utf8");
  await writeFile(path.join(cwd, "package.json"), JSON.stringify({
    scripts: {
      test: "node --test"
    }
  }), "utf8");
  await writeFile(path.join(cwd, ".codex/config.toml"), [
    "default_permissions = \"repo_full\"",
    "",
    "[features]",
    "codex_hooks = true",
    "",
    "[projects.\"/Users/example/project\"]",
    "trusted_level = 'trusted'",
    ""
  ].join("\n"), "utf8");

  const result = await lintAgents(cwd);
  const finding = result.findings.find((item) => item.kind === "ignored_instruction" && /Codex config/.test(item.title));
  const evidence = finding?.evidence.map((item) => item.excerpt).join("\n") ?? "";

  assert.equal(result.status, "warn");
  assert.ok(finding);
  assert.match(evidence, /missing permissions profile/);
  assert.match(evidence, /codex_hooks/);
  assert.match(evidence, /trusted_level/);
  assert.match(evidence, /machine-local path/);
});

test("lintAgents detects instruction include, nested AGENTS, and encoding risks", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "trace-to-skill-agents-lint-includes-"));
  await mkdir(path.join(cwd, "docs"), { recursive: true });
  await mkdir(path.join(cwd, "packages/api"), { recursive: true });
  await writeFile(path.join(cwd, "AGENTS.md"), [
    "Always run npm test before completion.",
    "Shared policy: @docs/shared.md",
    "Missing policy: @docs/missing.md",
    ""
  ].join("\n"), "utf8");
  await writeFile(path.join(cwd, "docs/shared.md"), "# Shared\n", "utf8");
  await writeFile(path.join(cwd, "packages/api/AGENTS.md"), "Run API tests for package changes.\n", "utf8");
  await writeFile(path.join(cwd, "CLAUDE.md"), Buffer.from([0xff, 0xfe, 0x41, 0x00]));
  await writeFile(path.join(cwd, "package.json"), JSON.stringify({
    scripts: {
      test: "node --test"
    }
  }), "utf8");

  const result = await lintAgents(cwd);
  const evidence = result.findings.flatMap((finding) => finding.evidence.map((item) => item.excerpt)).join("\n");

  assert.equal(result.status, "warn");
  assert.ok(result.findings.some((finding) => finding.title === "Agent instruction include references missing paths"));
  assert.ok(result.findings.some((finding) => finding.title === "Nested AGENTS.md may not be loaded automatically"));
  assert.ok(result.findings.some((finding) => finding.title === "Agent instruction file may fail UTF-8 loading"));
  assert.match(evidence, /docs\/missing\.md/);
  assert.match(evidence, /packages\/api/);
  assert.match(evidence, /valid UTF-8/);
});

test("composite action exposes Codex readiness doctor mode", async () => {
  const action = await readFile("action.yml", "utf8");

  assert.match(action, /branding:/);
  assert.match(action, /icon: check-circle/);
  assert.match(action, /color: green/);
  assert.match(action, /outputs:/);
  assert.match(action, /doctor-score:/);
  assert.match(action, /doctor-status:/);
  assert.match(action, /doctor-summary:/);
  assert.match(action, /doctor-report:/);
  assert.match(action, /benchmark-status:/);
  assert.match(action, /benchmark-cases:/);
  assert.match(action, /benchmark-report:/);
  assert.match(action, /benchmark-json:/);
  assert.match(action, /scorecard-status:/);
  assert.match(action, /scorecard-report:/);
  assert.match(action, /scorecard-json:/);
  assert.match(action, /agent-report:/);
  assert.match(action, /agents-lint-score:/);
  assert.match(action, /agents-lint-status:/);
  assert.match(action, /agents-lint-report:/);
  assert.match(action, /agents-lint-json:/);
  assert.match(action, /context-score:/);
  assert.match(action, /context-status:/);
  assert.match(action, /context-report:/);
  assert.match(action, /context-json:/);
  assert.match(action, /steps\.doctor\.outputs\.report/);
  assert.match(action, /steps\.agents-lint\.outputs\.status/);
  assert.match(action, /steps\.agent-report\.outputs\.report/);
  assert.match(action, /steps\.github-context\.outputs\.status/);
  assert.match(action, /steps\.benchmark\.outputs\.status/);
  assert.match(action, /steps\.scorecard\.outputs\.status/);
  assert.match(action, /codex-readiness-report\.json/);
  assert.match(action, /agents-lint-report\.json/);
  assert.match(action, /github-context-report\.json/);
  assert.match(action, /trace-to-skill-benchmark\.json/);
  assert.match(action, /trace-to-skill-scorecard\.json/);
  assert.match(action, /mode:/);
  assert.match(action, /context-threshold:/);
  assert.match(action, /doctor-threshold:/);
  assert.match(action, /doctor-comment:/);
  assert.match(action, /scorecard-comment:/);
  assert.match(action, /job-summary:/);
  assert.match(action, /GITHUB_STEP_SUMMARY/);
  assert.match(action, /GITHUB_ACTION_PATH/);
  assert.match(action, /TRACE_TO_SKILL_CLI/);
  assert.match(action, /cd "\$GITHUB_ACTION_PATH"/);
  assert.match(action, /npm ci/);
  assert.match(action, /npm run build/);
  assert.equal(action.includes("npx github:grnbtqdbyx-create/trace-to-skill"), false);
  assert.match(action, /trace-to-skill Codex Readiness/);
  assert.match(action, /trace-to-skill AGENTS\.md Lint/);
  assert.match(action, /trace-to-skill GitHub Context Guard/);
  assert.match(action, /trace-to-skill Agent Learning/);
  assert.match(action, /trace-to-skill Benchmark/);
  assert.match(action, /trace-to-skill Scorecard/);
  assert.match(action, /node "\$TRACE_TO_SKILL_CLI" doctor/);
  assert.match(action, /node "\$TRACE_TO_SKILL_CLI" lint-agents/);
  assert.match(action, /node "\$TRACE_TO_SKILL_CLI" guard-github-event/);
  assert.match(action, /node "\$TRACE_TO_SKILL_CLI" doctor-comment/);
  assert.match(action, /node "\$TRACE_TO_SKILL_CLI" benchmark/);
  assert.match(action, /node "\$TRACE_TO_SKILL_CLI" scorecard/);
  assert.match(action, /node "\$TRACE_TO_SKILL_CLI" scorecard-comment/);
  assert.match(action, /inputs\.mode == 'agents-lint' \|\| inputs\.mode == 'all'/);
  assert.match(action, /inputs\.mode == 'github-context' \|\| inputs\.mode == 'all'/);
  assert.match(action, /inputs\.mode == 'doctor' \|\| inputs\.mode == 'both' \|\| inputs\.mode == 'all'/);
  assert.match(action, /inputs\.mode == 'benchmark' \|\| inputs\.mode == 'all'/);
  assert.match(action, /always\(\) && github\.event_name == 'pull_request' && inputs\.doctor-comment == 'true'/);
  assert.match(action, /always\(\) && github\.event_name == 'pull_request' && inputs\.scorecard-comment == 'true'/);
  assert.match(action, /github\.event_name == 'pull_request' && inputs\.comment == 'true'/);
  assert.match(action, /mode must be one of: traces, agents-lint, github-context, doctor, benchmark, both, all/);
});

test("repository dogfoods the local Codex readiness action", async () => {
  const workflow = await readFile(".github/workflows/codex-readiness.yml", "utf8");

  assert.match(workflow, /name: Codex Readiness/);
  assert.match(workflow, /id: readiness/);
  assert.match(workflow, /uses: \.\//);
  assert.match(workflow, /mode: all/);
  assert.match(workflow, /doctor-threshold: "95"/);
  assert.match(workflow, /doctor-comment: "true"/);
  assert.match(workflow, /scorecard-comment: "true"/);
  assert.match(workflow, /job-summary: "true"/);
  assert.match(workflow, /steps\.readiness\.outputs\.doctor-score/);
  assert.match(workflow, /steps\.readiness\.outputs\.agents-lint-status/);
  assert.match(workflow, /steps\.readiness\.outputs\.context-status/);
  assert.match(workflow, /steps\.readiness\.outputs\.benchmark-status/);
  assert.match(workflow, /steps\.readiness\.outputs\.scorecard-status/);
});

test("repository publishes npm through trusted publishing workflow", async () => {
  const workflow = await readFile(".github/workflows/npm-publish.yml", "utf8");
  const releaseGuide = await readFile("docs/RELEASE.md", "utf8");

  assert.match(workflow, /name: Publish npm/);
  assert.match(workflow, /types:\n\s+- published/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /node-version: 24/);
  assert.match(workflow, /registry-url: https:\/\/registry\.npmjs\.org/);
  assert.match(workflow, /npm run check/);
  assert.match(workflow, /GITHUB_REF_NAME/);
  assert.match(workflow, /npm view "trace-to-skill@\$\{PACKAGE_VERSION\}" version/);
  assert.match(workflow, /npm publish --provenance --access public/);
  assert.match(releaseGuide, /npm trust github trace-to-skill/);
  assert.match(releaseGuide, /--repo grnbtqdbyx-create\/trace-to-skill/);
  assert.match(releaseGuide, /Workflow filename: `npm-publish\.yml`/);
  assert.match(releaseGuide, /Allowed action: `npm publish`/);
});

test("published JSON schemas describe CLI result contracts", async () => {
  const analysisSchema = JSON.parse(await readFile("schemas/analysis-result.schema.json", "utf8")) as {
    required: string[];
    properties: Record<string, unknown>;
    $defs: Record<string, unknown>;
  };
  const agentsLintSchema = JSON.parse(await readFile("schemas/agents-lint-result.schema.json", "utf8")) as {
    required: string[];
    properties: Record<string, unknown>;
  };
  const doctorSchema = JSON.parse(await readFile("schemas/doctor-result.schema.json", "utf8")) as {
    required: string[];
    properties: Record<string, unknown>;
    $defs: Record<string, unknown>;
  };
  const scorecardSchema = JSON.parse(await readFile("schemas/scorecard-result.schema.json", "utf8")) as {
    required: string[];
    properties: Record<string, unknown>;
  };
  const redactSchema = JSON.parse(await readFile("schemas/redact-result.schema.json", "utf8")) as {
    required: string[];
    properties: Record<string, unknown>;
    $defs: Record<string, unknown>;
  };

  assert.deepEqual(analysisSchema.required, ["generatedAt", "inputs", "score", "summary", "findings", "recommendations"]);
  assert.ok(analysisSchema.properties.score);
  assert.ok(analysisSchema.$defs.finding);
  assert.ok((analysisSchema.$defs.findingKind as { enum: string[] }).enum.includes("context_compaction"));
  assert.ok((analysisSchema.$defs.findingKind as { enum: string[] }).enum.includes("sandbox_permission"));
  assert.ok((analysisSchema.$defs.findingKind as { enum: string[] }).enum.includes("quota_mismatch"));
  assert.deepEqual(agentsLintSchema.required, ["generatedAt", "root", "status", "score", "instructionFiles", "mcpConfigs", "checks", "findings", "summary"]);
  assert.ok(agentsLintSchema.properties.instructionFiles);
  assert.ok(agentsLintSchema.properties.mcpConfigs);
  assert.deepEqual(doctorSchema.required, ["generatedAt", "root", "score", "summary", "checks", "findings"]);
  assert.ok(doctorSchema.properties.checks);
  assert.ok(doctorSchema.$defs.check);
  assert.deepEqual(scorecardSchema.required, ["generatedAt", "passed", "threshold", "doctor", "benchmark", "reports"]);
  assert.ok(scorecardSchema.properties.doctor);
  assert.ok(scorecardSchema.properties.benchmark);
  assert.deepEqual(redactSchema.required, ["generatedAt", "files", "totals"]);
  assert.ok(redactSchema.properties.files);
  assert.ok(redactSchema.$defs.redactedFile);
});

test("benchmark covers public fixture failure classes", async () => {
  const benchmark = await runBenchmark();
  const markdown = renderBenchmarkMarkdown(benchmark);

  assert.equal(benchmark.passed, true);
  assert.equal(benchmark.cases.length, 9);
  assert.ok(benchmark.cases.some((item) => item.id === "clean-validated-run" && item.score === 100));
  assert.ok(benchmark.cases.some((item) => item.id === "failed-workflow" && item.detectedKinds.includes("test_failure")));
  assert.ok(benchmark.cases.some((item) => item.id === "context-compaction" && item.detectedKinds.includes("context_compaction")));
  assert.ok(benchmark.cases.some((item) => item.id === "sandbox-permission" && item.detectedKinds.includes("sandbox_permission")));
  assert.ok(benchmark.cases.some((item) => item.id === "quota-mismatch" && item.detectedKinds.includes("quota_mismatch")));
  assert.ok(benchmark.cases.some((item) => item.id === "mcp-risk" && item.detectedKinds.includes("secret_exposure")));
  assert.ok(benchmark.cases.some((item) => item.id === "prompt-injection" && item.detectedKinds.includes("prompt_injection")));
  assert.match(markdown, /trace-to-skill Benchmark/);
  assert.match(markdown, /Codex JSONL failed session/);
  assert.match(markdown, /Untrusted PR comment prompt injection/);
});

test("scorecard combines doctor readiness and benchmark evidence", async () => {
  const scorecard = await runScorecard(".", 95);
  const markdown = renderScorecardMarkdown(scorecard);
  const comment = renderScorecardPrComment(scorecard);

  assert.equal(scorecard.passed, true);
  assert.equal(scorecard.doctor.status, "ready");
  assert.equal(scorecard.doctor.score, 100);
  assert.equal(scorecard.benchmark.status, "pass");
  assert.equal(scorecard.benchmark.cases, 9);
  assert.match(markdown, /trace-to-skill Scorecard/);
  assert.match(markdown, /Codex readiness/);
  assert.match(markdown, /Benchmark Summary/);
  assert.match(comment, /trace-to-skill-scorecard-report/);
  assert.match(comment, /trace-to-skill Scorecard/);
});

test("scorecard-comment dry-run resolves pull request event", async () => {
  const scorecard = await runScorecard(".", 95);
  const message = await postPullRequestComment({
    repository: "owner/repo",
    eventPath: "fixtures/github-pr-event.json",
    body: renderScorecardPrComment(scorecard),
    marker: "<!-- trace-to-skill-scorecard-report -->",
    reportName: "trace-to-skill scorecard report",
    dryRun: true
  });

  assert.equal(message, "dry-run: would post trace-to-skill scorecard report to owner/repo#42");
});
