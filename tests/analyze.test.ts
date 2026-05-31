import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeTargets } from "../src/analyze.js";
import { evaluate } from "../src/eval.js";
import { renderAgentsRules, renderSkill } from "../src/report.js";

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
