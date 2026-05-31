import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeTargets } from "../src/analyze.js";
import { compareAnalyses, evaluate } from "../src/eval.js";
import { postPullRequestComment } from "../src/github.js";
import { renderAgentsRules, renderComparison, renderPrComment, renderSkill } from "../src/report.js";

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
