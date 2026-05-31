import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { analyzeTargets } from "../src/analyze.js";
import { doctorRepo } from "../src/doctor.js";
import { compareAnalyses, evaluate } from "../src/eval.js";
import { postPullRequestComment } from "../src/github.js";
import { initProject } from "../src/init.js";
import { renderAgentsRules, renderComparison, renderDoctorPrComment, renderPrComment, renderSarif, renderSkill } from "../src/report.js";

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
  assert.match(doctorWorkflow, /mode: doctor/);
  assert.match(doctorWorkflow, /doctor-threshold: "85"/);
  assert.match(doctorWorkflow, /doctor-comment: "true"/);
  assert.match(doctorWorkflow, /job-summary: "true"/);
  assert.match(workflow, /upload-sarif/);
  assert.match(workflow, /mode: traces/);
  assert.match(workflow, /comment: "true"/);
  assert.match(workflow, /job-summary: "true"/);
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
  assert.match(action, /agent-report:/);
  assert.match(action, /steps\.doctor\.outputs\.report/);
  assert.match(action, /steps\.agent-report\.outputs\.report/);
  assert.match(action, /codex-readiness-report\.json/);
  assert.match(action, /mode:/);
  assert.match(action, /doctor-threshold:/);
  assert.match(action, /doctor-comment:/);
  assert.match(action, /job-summary:/);
  assert.match(action, /GITHUB_STEP_SUMMARY/);
  assert.match(action, /trace-to-skill Codex Readiness/);
  assert.match(action, /trace-to-skill Agent Learning/);
  assert.match(action, /trace-to-skill doctor/);
  assert.match(action, /trace-to-skill doctor-comment/);
  assert.match(action, /inputs\.mode == 'doctor' \|\| inputs\.mode == 'both'/);
  assert.match(action, /always\(\) && github\.event_name == 'pull_request' && inputs\.doctor-comment == 'true'/);
  assert.match(action, /github\.event_name == 'pull_request' && inputs\.comment == 'true'/);
  assert.match(action, /mode must be one of: traces, doctor, both/);
});

test("repository dogfoods the local Codex readiness action", async () => {
  const workflow = await readFile(".github/workflows/codex-readiness.yml", "utf8");

  assert.match(workflow, /name: Codex Readiness/);
  assert.match(workflow, /id: readiness/);
  assert.match(workflow, /uses: \.\//);
  assert.match(workflow, /mode: doctor/);
  assert.match(workflow, /doctor-threshold: "95"/);
  assert.match(workflow, /doctor-comment: "true"/);
  assert.match(workflow, /job-summary: "true"/);
  assert.match(workflow, /steps\.readiness\.outputs\.doctor-score/);
});

test("published JSON schemas describe CLI result contracts", async () => {
  const analysisSchema = JSON.parse(await readFile("schemas/analysis-result.schema.json", "utf8")) as {
    required: string[];
    properties: Record<string, unknown>;
    $defs: Record<string, unknown>;
  };
  const doctorSchema = JSON.parse(await readFile("schemas/doctor-result.schema.json", "utf8")) as {
    required: string[];
    properties: Record<string, unknown>;
    $defs: Record<string, unknown>;
  };

  assert.deepEqual(analysisSchema.required, ["generatedAt", "inputs", "score", "summary", "findings", "recommendations"]);
  assert.ok(analysisSchema.properties.score);
  assert.ok(analysisSchema.$defs.finding);
  assert.deepEqual(doctorSchema.required, ["generatedAt", "root", "score", "summary", "checks", "findings"]);
  assert.ok(doctorSchema.properties.checks);
  assert.ok(doctorSchema.$defs.check);
});
