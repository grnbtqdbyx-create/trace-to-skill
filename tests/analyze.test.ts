import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { lintAgents, renderAgentsLintMarkdown } from "../src/agentsLint.js";
import { analyzeInputs, analyzeTargets } from "../src/analyze.js";
import { renderBenchmarkMarkdown, runBenchmark } from "../src/benchmark.js";
import { auditCodexConfig, renderConfigAuditMarkdown } from "../src/configAudit.js";
import { listDemoScenarios, renderDemoMarkdown, renderDemoScenarioList, runDemo } from "../src/demo.js";
import { createDiagnosticsBundle, renderDiagnosticsBundleMarkdown } from "../src/diagnosticsBundle.js";
import { doctorRepo } from "../src/doctor.js";
import { compareAnalyses, evaluate } from "../src/eval.js";
import { analyzeGithubEventContext, extractGithubContextInputs } from "../src/githubContext.js";
import { postPullRequestComment } from "../src/github.js";
import { initProject } from "../src/init.js";
import { renderOssBriefMarkdown, runOssBrief } from "../src/ossBrief.js";
import { guardPatchContent, guardPatchFile, renderPatchGuardMarkdown } from "../src/patchGuard.js";
import { auditCodexPlugins, renderPluginAuditMarkdown } from "../src/pluginAudit.js";
import { redactTargets, redactText } from "../src/redact.js";
import { renderAgentsRules, renderCodexIssueReport, renderComparison, renderDoctorPrComment, renderPrComment, renderSarif, renderSkill } from "../src/report.js";
import { renderScorecardMarkdown, renderScorecardPrComment, runScorecard } from "../src/scorecard.js";
import { auditCodexSessions, renderSessionAuditMarkdown } from "../src/sessionAudit.js";
import { buildUsageEvidence, buildUsageEvidenceFromInputs, renderUsageEvidenceMarkdown } from "../src/usageEvidence.js";

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

test("renderCodexIssueReport creates an OpenAI issue-ready triage body", async () => {
  const result = await analyzeTargets(["fixtures/codex-session-state.md"]);
  const report = renderCodexIssueReport(result);

  assert.match(report, /OpenAI Codex Issue Triage Report/);
  assert.match(report, /Copy-Paste Issue Body/);
  assert.match(report, /codex_session_state/);
  assert.match(report, /thread\/resume took 7,760 ms/);
  assert.match(report, /Diagnostics to attach/);
  assert.match(report, /trace-to-skill redact/);
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

test("analyzeTargets detects Codex remote compact task failures", async () => {
  const result = await analyzeTargets(["fixtures/codex-remote-compact.md"]);
  const finding = result.findings.find((item) => item.kind === "codex_remote_compact");
  const evidence = finding?.evidence.map((item) => item.excerpt).join("\n") ?? "";
  const report = renderCodexIssueReport(result);

  assert.ok(finding);
  assert.equal(finding.severity, "high");
  assert.match(evidence, /timeout waiting for child process to exit/);
  assert.match(evidence, /responses\/compact/);
  assert.match(evidence, /stream_idle_timeout_ms/);
  assert.match(evidence, /openai-long-timeout/);
  assert.match(finding.suggestedRule, /provider config without secrets/);
  assert.match(report, /codex_remote_compact/);
});

test("analyzeTargets detects Codex latest-turn drift", async () => {
  const result = await analyzeTargets(["fixtures/codex-latest-turn-drift.md"]);
  const finding = result.findings.find((item) => item.kind === "codex_latest_turn_drift");
  const evidence = finding?.evidence.map((item) => item.excerpt).join("\n") ?? "";
  const report = renderCodexIssueReport(result);

  assert.ok(finding);
  assert.equal(finding.severity, "high");
  assert.match(evidence, /responds to an earlier message instead of the latest request/);
  assert.match(evidence, /ignoring my actual latest message/);
  assert.match(evidence, /jumps to previous tasks/);
  assert.match(evidence, /auto compaction caused it to forget it was mid-task/);
  assert.match(evidence, /write_stdin session_id/);
  assert.match(finding.suggestedRule, /exact latest user request/);
  assert.match(report, /Codex responded to an older turn instead of the latest request/);
});

test("analyzeTargets detects Codex latency regressions", async () => {
  const result = await analyzeTargets(["fixtures/codex-latency-regression.md"]);
  const finding = result.findings.find((item) => item.kind === "codex_latency_regression");
  const evidence = finding?.evidence.map((item) => item.excerpt).join("\n") ?? "";
  const report = renderCodexIssueReport(result);

  assert.ok(finding);
  assert.equal(finding.severity, "high");
  assert.match(evidence, /GPT-5\.5 Fast/);
  assert.match(evidence, /10-20\+ minutes/);
  assert.match(evidence, /thinking phase/);
  assert.match(evidence, /1hr 58 minutes/);
  assert.match(evidence, /8x slower/);
  assert.match(finding.suggestedRule, /pre-first-token/);
  assert.match(report, /Codex model or runtime latency regression/);
});

test("analyzeTargets detects Codex thinking and stream hangs", async () => {
  const result = await analyzeTargets(["fixtures/codex-thinking-hang.md"]);
  const finding = result.findings.find((item) => item.kind === "codex_thinking_hang");
  const evidence = finding?.evidence.map((item) => item.excerpt).join("\n") ?? "";
  const report = renderCodexIssueReport(result);

  assert.ok(finding);
  assert.equal(finding.severity, "high");
  assert.match(evidence, /remain in Thinking after successful tool calls/);
  assert.match(evidence, /no next assistant action/);
  assert.match(evidence, /first response_item type=reasoning/);
  assert.match(evidence, /time\.busy=51\.5ms time\.idle=380s/);
  assert.match(evidence, /minimal `config\.toml` without MCPs/);
  assert.match(finding.suggestedRule, /last successful tool-call output/);
  assert.match(finding.suggestedRule, /time\.busy/);
  assert.match(report, /codex_thinking_hang/);
});

test("analyzeTargets detects Codex clipboard and pasted-text attachment regressions", async () => {
  const result = await analyzeTargets(["fixtures/codex-clipboard-attachment.md"]);
  const finding = result.findings.find((item) => item.kind === "codex_clipboard_attachment");
  const evidence = finding?.evidence.map((item) => item.excerpt).join("\n") ?? "";
  const report = renderCodexIssueReport(result);

  assert.ok(finding);
  assert.equal(finding.severity, "high");
  assert.match(evidence, /Copy as Markdown/);
  assert.match(evidence, /Copy working directory/);
  assert.match(evidence, /automatically converted into `\.txt` attachments/);
  assert.match(evidence, /`Pasted text\.txt` attachment and treated the goal objective as empty/);
  assert.match(evidence, /pasted-text-attachments\.json/);
  assert.match(evidence, /cannot be previewed, edited, expanded, reverted/);
  assert.match(finding.suggestedRule, /visible editor text before submit/);
  assert.match(finding.suggestedRule, /clipboard payload format/);
  assert.match(report, /codex_clipboard_attachment/);
});

test("analyzeTargets detects Codex deeplink and external launch regressions", async () => {
  const result = await analyzeTargets(["fixtures/codex-deeplink-launch.md"]);
  const finding = result.findings.find((item) => item.kind === "codex_deeplink_launch");
  const evidence = finding?.evidence.map((item) => item.excerpt).join("\n") ?? "";
  const report = renderCodexIssueReport(result);

  assert.ok(finding);
  assert.equal(finding.severity, "high");
  assert.match(evidence, /codex:\/\/oauth_callback\?code=/);
  assert.match(evidence, /Unable to find Electron app/);
  assert.match(evidence, /Start-Process "codex:\/\/test"/);
  assert.match(evidence, /type=click&tag=<notification-tag>/);
  assert.match(evidence, /AppUserModelID OpenAI\.Codex/);
  assert.match(evidence, /`codex app \.` only focuses/);
  assert.match(finding.suggestedRule, /AppUserModelID/);
  assert.match(finding.suggestedRule, /manual `codex:\/\/test`/);
  assert.match(report, /codex_deeplink_launch/);
});

test("analyzeTargets detects Codex approval friction", async () => {
  const result = await analyzeTargets(["fixtures/codex-approval-friction.md"]);
  const finding = result.findings.find((item) => item.kind === "codex_approval_friction");
  const evidence = finding?.evidence.map((item) => item.excerpt).join("\n") ?? "";
  const report = renderCodexIssueReport(result);

  assert.ok(finding);
  assert.equal(finding.severity, "high");
  assert.match(evidence, /approve this session/i);
  assert.match(evidence, /Full Access/);
  assert.match(evidence, /item\/fileChange\/requestApproval/);
  assert.match(evidence, /browser_click/);
  assert.match(evidence, /default_tools_approval_mode/);
  assert.match(finding.suggestedRule, /displayed command versus executed command/);
  assert.match(finding.suggestedRule, /MCP server name/);
  assert.match(report, /Codex approval persistence or MCP approval friction/);
});

test("demo command runs packaged scenarios without private traces", async () => {
  const scenarios = listDemoScenarios();
  const result = await runDemo();
  const markdown = renderDemoMarkdown(result);
  const list = renderDemoScenarioList(scenarios);

  assert.ok(scenarios.some((scenario) => scenario.id === "approval-friction"));
  assert.ok(scenarios.some((scenario) => scenario.id === "remote-compact"));
  assert.ok(scenarios.some((scenario) => scenario.id === "windows-helper-path"));
  assert.ok(scenarios.some((scenario) => scenario.id === "latency-regression"));
  assert.ok(scenarios.some((scenario) => scenario.id === "thinking-hang"));
  assert.ok(scenarios.some((scenario) => scenario.id === "clipboard-attachment"));
  assert.ok(scenarios.some((scenario) => scenario.id === "deeplink-launch"));
  assert.ok(scenarios.some((scenario) => scenario.id === "connector-auth-cache"));
  assert.ok(scenarios.some((scenario) => scenario.id === "file-tree-ui"));
  assert.ok(scenarios.some((scenario) => scenario.id === "usage-reset-drift"));
  assert.equal(result.scenario.id, "approval-friction");
  assert.ok(result.analysis.findings.some((finding) => finding.kind === "codex_approval_friction"));
  assert.match(markdown, /trace-to-skill Demo/);
  assert.match(markdown, /Generated Codex Issue Report/);
  assert.match(markdown, /codex_approval_friction/);
  assert.match(list, /latency-regression/);
  assert.match(list, /thinking-hang/);
  assert.match(list, /clipboard-attachment/);
  assert.match(list, /deeplink-launch/);
  assert.match(list, /connector-auth-cache/);
  assert.match(list, /remote-compact/);
  assert.match(list, /windows-helper-path/);
  assert.match(list, /file-tree-ui/);
  assert.match(list, /usage-reset-drift/);
  await assert.rejects(() => runDemo("missing"), /unknown demo scenario/);
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

test("analyzeTargets detects Codex Windows helper path failures", async () => {
  const result = await analyzeTargets(["fixtures/codex-windows-helper-path.md"]);
  const finding = result.findings.find((item) => item.kind === "codex_windows_helper_path");
  const evidence = finding?.evidence.map((item) => item.excerpt).join("\n") ?? "";
  const report = renderCodexIssueReport(result);

  assert.ok(finding);
  assert.equal(finding.severity, "high");
  assert.match(evidence, /WindowsApps\\OpenAI\.Codex/);
  assert.match(evidence, /Program 'rg\.exe' failed to run/);
  assert.match(evidence, /%LOCALAPPDATA%\\OpenAI\\Codex\\bin/);
  assert.match(evidence, /CodexSandboxUsers/);
  assert.match(evidence, /node_repl kernel exited unexpectedly/);
  assert.match(finding.suggestedRule, /Get-Command rg -All/);
  assert.match(report, /codex_windows_helper_path/);
});

test("analyzeTargets detects Codex auth and connectivity failures", async () => {
  const result = await analyzeTargets(["fixtures/codex-connectivity.md"]);
  const finding = result.findings.find((item) => item.kind === "codex_connectivity");
  const evidence = finding?.evidence.map((item) => item.excerpt).join("\n") ?? "";

  assert.ok(finding);
  assert.equal(finding.severity, "high");
  assert.match(evidence, /oauth token exchange transport failure/);
  assert.match(evidence, /chatgpt\.com\/backend-api\/codex\/responses/);
  assert.match(evidence, /ca-certificates/);
  assert.match(finding.suggestedRule, /curl -4\/-6/);
});

test("analyzeTargets detects Codex remote-control route failures", async () => {
  const result = await analyzeTargets(["fixtures/codex-remote-control.md"]);
  const finding = result.findings.find((item) => item.kind === "codex_remote_control");
  const evidence = finding?.evidence.map((item) => item.excerpt).join("\n") ?? "";

  assert.ok(finding);
  assert.equal(finding.severity, "high");
  assert.match(evidence, /127\.0\.0\.1:14567/);
  assert.match(evidence, /Waiting for desktop/);
  assert.match(evidence, /Directory: Unavailable/);
  assert.match(finding.suggestedRule, /listener pid/);
});

test("analyzeTargets detects Codex app connector auth cache regressions", async () => {
  const result = await analyzeTargets(["fixtures/codex-connector-auth-cache.md"]);
  const finding = result.findings.find((item) => item.kind === "codex_connector_auth_cache");
  const evidence = finding?.evidence.map((item) => item.excerpt).join("\n") ?? "";
  const report = renderCodexIssueReport(result);

  assert.ok(finding);
  assert.equal(finding.severity, "high");
  assert.match(evidence, /Reauthentication required/);
  assert.match(evidence, /refresh token was revoked/);
  assert.match(evidence, /codex_apps_tools/);
  assert.match(evidence, /link_69ebf2fff8cc8191a42ae4b585c191f6/);
  assert.match(evidence, /isAccessible: false/);
  assert.match(evidence, /codex mcp add linear/);
  assert.match(finding.suggestedRule, /codex_app_directory/);
  assert.match(finding.suggestedRule, /external MCP workaround/);
  assert.match(report, /codex_connector_auth_cache/);
});

test("analyzeTargets detects Codex MCP runtime failures", async () => {
  const result = await analyzeTargets(["fixtures/codex-mcp-runtime.md"]);
  const finding = result.findings.find((item) => item.kind === "codex_mcp_runtime");
  const evidence = finding?.evidence.map((item) => item.excerpt).join("\n") ?? "";

  assert.ok(finding);
  assert.equal(finding.severity, "high");
  assert.match(evidence, /user cancelled MCP tool call/);
  assert.match(evidence, /unsupported call: mcp__node_repl__js/);
  assert.match(evidence, /Transport closed/);
  assert.match(finding.suggestedRule, /tools\/list/);
});

test("analyzeTargets detects Codex plugin runtime and bundled capability failures", async () => {
  const result = await analyzeTargets(["fixtures/codex-plugin-runtime.md"]);
  const finding = result.findings.find((item) => item.kind === "codex_plugin_runtime");
  const evidence = finding?.evidence.map((item) => item.excerpt).join("\n") ?? "";
  const report = renderCodexIssueReport(result);

  assert.ok(finding);
  assert.equal(finding.severity, "high");
  assert.match(evidence, /Computer Use native pipe path is unavailable/);
  assert.match(evidence, /SKY_CUA_NATIVE_PIPE_DIRECTORY/);
  assert.match(evidence, /unknown variant 'vertical'/);
  assert.match(evidence, /stale version/);
  assert.match(finding.suggestedRule, /plugin cache path/);
  assert.match(report, /Codex plugin runtime or bundled capability failure/);
});

test("analyzeTargets detects Codex file tree and workspace navigation UI failures", async () => {
  const result = await analyzeTargets(["fixtures/codex-file-tree-ui.md"]);
  const finding = result.findings.find((item) => item.kind === "codex_file_tree_ui");
  const evidence = finding?.evidence.map((item) => item.excerpt).join("\n") ?? "";
  const report = renderCodexIssueReport(result);

  assert.ok(finding);
  assert.equal(finding.severity, "high");
  assert.match(evidence, /View > Toggle File Tree/);
  assert.match(evidence, /Shift\+Cmd\+E/);
  assert.match(evidence, /folder icon is gone/);
  assert.match(evidence, /floating file panel/);
  assert.match(evidence, /app-shell:right-panel-width/);
  assert.match(finding.suggestedRule, /screenshots or screen recording/);
  assert.match(report, /codex_file_tree_ui/);
});

test("analyzeTargets detects Codex session resume and state failures", async () => {
  const result = await analyzeTargets(["fixtures/codex-session-state.md"]);
  const finding = result.findings.find((item) => item.kind === "codex_session_state");
  const evidence = finding?.evidence.map((item) => item.excerpt).join("\n") ?? "";

  assert.ok(finding);
  assert.equal(finding.severity, "high");
  assert.match(evidence, /codex resume interactive picker hangs\/freezes/);
  assert.match(evidence, /50,589 JSONL lines/);
  assert.match(evidence, /thread\/resume took 7,760 ms/);
  assert.match(evidence, /no such table: thread_goals/);
  assert.match(finding.suggestedRule, /rollout JSONL size/);
});

test("analyzeTargets detects Codex token burn and usage-drain loops", async () => {
  const result = await analyzeTargets(["fixtures/codex-token-burn.md"]);
  const finding = result.findings.find((item) => item.kind === "codex_token_burn");
  const evidence = finding?.evidence.map((item) => item.excerpt).join("\n") ?? "";

  assert.ok(finding);
  assert.equal(finding.severity, "high");
  assert.match(evidence, /tokens burning very fast/);
  assert.match(evidence, /write_stdin empty poll/);
  assert.match(evidence, /entire conversation history/);
  assert.match(evidence, /Codex is using daily usage/);
  assert.match(finding.suggestedRule, /cached input/);
});

test("analyzeTargets detects Codex resource leaks and runaway processes", async () => {
  const result = await analyzeTargets(["fixtures/codex-resource-leak.md"]);
  const finding = result.findings.find((item) => item.kind === "codex_resource_leak");
  const evidence = finding?.evidence.map((item) => item.excerpt).join("\n") ?? "";
  const report = renderCodexIssueReport(result);

  assert.ok(finding);
  assert.equal(finding.severity, "high");
  assert.match(evidence, /shell-snapshot/);
  assert.match(evidence, /97% CPU/);
  assert.match(evidence, /Code Helper \(Plugin\)/);
  assert.match(evidence, /GPU utilization to 70%/);
  assert.match(finding.suggestedRule, /process names and PIDs/);
  assert.match(report, /codex_resource_leak/);
});

test("analyzeTargets detects Codex tool-call integrity and rollback failures", async () => {
  const result = await analyzeTargets(["fixtures/codex-tool-call-integrity.md"]);
  const finding = result.findings.find((item) => item.kind === "codex_tool_call_integrity");
  const evidence = finding?.evidence.map((item) => item.excerpt).join("\n") ?? "";
  const report = renderCodexIssueReport(result);

  assert.ok(finding);
  assert.equal(finding.severity, "high");
  assert.match(evidence, /apply_patch accepted \*\*\* Add File/);
  assert.match(evidence, /tool_calls/);
  assert.match(evidence, /close_agent can hang forever/);
  assert.match(evidence, /Failed to revert changes/);
  assert.match(finding.suggestedRule, /tool_call_id sequence/);
  assert.match(report, /Codex tool-call integrity or rollback failure/);
});

test("analyzeTargets detects focused Codex apply_patch overwrite failures", async () => {
  const result = await analyzeTargets(["fixtures/codex-apply-patch-overwrite.md"]);
  const finding = result.findings.find((item) => item.kind === "codex_tool_call_integrity");
  const evidence = finding?.evidence.map((item) => item.excerpt).join("\n") ?? "";
  const report = renderCodexIssueReport(result);

  assert.ok(finding);
  assert.equal(finding.severity, "high");
  assert.match(evidence, /\*\*\* Add File/);
  assert.match(evidence, /destructive overwrite/);
  assert.match(report, /codex_tool_call_integrity/);
});

test("guardPatchFile rejects Add File targets that already exist", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "trace-to-skill-patch-"));
  await writeFile(path.join(cwd, "existing.txt"), "original\n", "utf8");
  const patchPath = path.join(cwd, "change.patch");
  await writeFile(patchPath, [
    "*** Begin Patch",
    "*** Add File: existing.txt",
    "+replacement",
    "*** End Patch",
    ""
  ].join("\n"), "utf8");

  const result = await guardPatchFile(patchPath, cwd);
  const markdown = renderPatchGuardMarkdown(result);

  assert.equal(result.status, "fail");
  assert.equal(result.findings[0]?.operation, "add");
  assert.match(result.findings[0]?.message ?? "", /already exists/);
  assert.match(markdown, /Patch Guard/);
  assert.match(markdown, /existing\.txt/);
});

test("guardPatchContent rejects symlink Add File targets and missing Update targets", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "trace-to-skill-patch-"));
  await writeFile(path.join(cwd, "target.txt"), "secret\n", "utf8");
  await symlink(path.join(cwd, "target.txt"), path.join(cwd, "linked.txt"));

  const result = await guardPatchContent([
    "*** Begin Patch",
    "*** Add File: linked.txt",
    "+replacement",
    "*** Update File: missing.txt",
    "@@",
    "-old",
    "+new",
    "*** End Patch",
    ""
  ].join("\n"), { patch: "inline.patch", root: cwd });

  assert.equal(result.status, "fail");
  assert.equal(result.findings.length, 2);
  assert.match(result.findings[0]?.message ?? "", /symlink/);
  assert.match(result.findings[1]?.message ?? "", /does not exist/);
});

test("guardPatchContent passes safe create and update operations", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "trace-to-skill-patch-"));
  await writeFile(path.join(cwd, "existing.txt"), "old\n", "utf8");

  const result = await guardPatchContent([
    "*** Begin Patch",
    "*** Add File: new.txt",
    "+hello",
    "*** Update File: existing.txt",
    "@@",
    "-old",
    "+new",
    "*** End Patch",
    ""
  ].join("\n"), { root: cwd });

  assert.equal(result.status, "pass");
  assert.deepEqual(result.findings, []);
});

test("auditCodexSessions reports large rollout, huge lines, parse errors, and short session index", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "trace-to-skill-session-"));
  const sessionDir = path.join(cwd, "sessions/2026/05/31");
  await mkdir(sessionDir, { recursive: true });
  await writeFile(path.join(cwd, "state_5.sqlite"), "sqlite placeholder", "utf8");
  await writeFile(path.join(cwd, "session_index.jsonl"), `${JSON.stringify({ id: "019e" })}\n`, "utf8");
  await writeFile(path.join(sessionDir, "rollout-2026-05-31T10-00-00-019eaaa.jsonl"), [
    JSON.stringify({ type: "session_meta", payload: { id: "019eaaa" } }),
    JSON.stringify({ type: "response_item", item: { type: "function_call", name: "shell" } }),
    JSON.stringify({ type: "event_msg", msg: "thread/resume took 7760 ms" }),
    "not-json",
    ""
  ].join("\n"), "utf8");
  await writeFile(path.join(sessionDir, "rollout-2026-05-31T10-05-00-019ebbb.jsonl"), [
    JSON.stringify({ type: "response_item", item: { type: "input_image", data: "x".repeat(80) } }),
    ""
  ].join("\n"), "utf8");

  const result = await auditCodexSessions(cwd, {
    largeFileBytes: 120,
    hugeLineBytes: 60
  });
  const markdown = renderSessionAuditMarkdown(result);

  assert.equal(result.status, "fail");
  assert.equal(result.summary.rolloutFiles, 2);
  assert.ok(result.findings.some((finding) => finding.kind === "large_rollout"));
  assert.ok(result.findings.some((finding) => finding.kind === "huge_jsonl_line"));
  assert.ok(result.findings.some((finding) => finding.kind === "json_parse_error"));
  assert.ok(result.findings.some((finding) => finding.kind === "short_session_index"));
  assert.ok(result.findings.some((finding) => finding.kind === "state_file_present"));
  assert.match(markdown, /Codex Session Audit/);
  assert.match(markdown, /thread_resume/);
});

test("auditCodexSessions passes small healthy session directories", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "trace-to-skill-session-"));
  const sessionDir = path.join(cwd, "sessions");
  await mkdir(sessionDir, { recursive: true });
  await writeFile(path.join(sessionDir, "rollout-2026-05-31T10-00-00-019eaaa.jsonl"), [
    JSON.stringify({ type: "session_meta", payload: { id: "019eaaa" } }),
    JSON.stringify({ type: "response_item", item: { type: "message", content: "ok" } }),
    ""
  ].join("\n"), "utf8");

  const result = await auditCodexSessions(cwd, {
    largeFileBytes: 1024 * 1024,
    hugeLineBytes: 1024
  });

  assert.equal(result.status, "pass");
  assert.equal(result.summary.jsonlFiles, 1);
  assert.equal(result.findings.length, 0);
});

test("auditCodexConfig reports risky Codex config drift", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "trace-to-skill-config-"));
  await writeFile(path.join(cwd, "config.toml"), [
    "profile = \"safe-auto\"",
    "model = \"gpt-5.5\"",
    "sandbox_mode = \"danger-full-access\"",
    "default_permissions = \"trusted\"",
    "",
    "[windows]",
    "sandbox = \"elevated\"",
    "",
    "[features]",
    "codex_hooks = true",
    "",
    "[profiles.safe-auto]",
    "sandbox_mode = \"workspace-write\"",
    "",
    "[projects.\"C:\\\\Users\\\\user\\\\repo\"]",
    "trusted_level = \"trusted\"",
    "",
    "[plugins.\"chrome@openai-bundled\"]",
    "enabled = true",
    ""
  ].join("\n"), "utf8");

  const result = await auditCodexConfig(cwd);
  const markdown = renderConfigAuditMarkdown(result);
  const kinds = result.findings.map((finding) => finding.kind);

  assert.equal(result.status, "fail");
  assert.equal(result.summary.exists, true);
  assert.equal(result.values.model, "gpt-5.5");
  assert.ok(kinds.includes("legacy_profile_config"));
  assert.ok(kinds.includes("model_pin"));
  assert.ok(kinds.includes("danger_full_access"));
  assert.ok(kinds.includes("windows_elevated_sandbox"));
  assert.ok(kinds.includes("default_permissions_missing"));
  assert.ok(kinds.includes("deprecated_codex_hooks"));
  assert.ok(kinds.includes("machine_local_project_state"));
  assert.ok(kinds.includes("plugin_cache_missing"));
  assert.match(markdown, /Codex Config Audit/);
  assert.match(markdown, /gpt-5\.5/);
});

test("auditCodexConfig passes a minimal portable config", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "trace-to-skill-config-"));
  await writeFile(path.join(cwd, "config.toml"), [
    "approval_policy = \"on-request\"",
    "sandbox_mode = \"workspace-write\"",
    "",
    "[permissions.trusted]",
    "description = \"trusted local repo\"",
    ""
  ].join("\n"), "utf8");

  const result = await auditCodexConfig(path.join(cwd, "config.toml"));

  assert.equal(result.status, "pass");
  assert.equal(result.findings.length, 0);
  assert.equal(result.values.sandboxMode, "workspace-write");
});

test("auditCodexPlugins reports bundled plugin cache and marketplace drift", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "trace-to-skill-plugins-"));
  const homeDir = path.join(cwd, "home");
  const appPath = path.join(cwd, "Codex.app");
  const runtimeMarketplace = path.join(cwd, ".tmp/bundled-marketplaces/openai-bundled/.agents/plugins");
  const appMarketplace = path.join(appPath, "Contents/Resources/plugins/openai-bundled/.agents/plugins");
  await mkdir(path.join(cwd, "plugins/cache/openai-bundled/computer-use"), { recursive: true });
  await mkdir(path.join(cwd, "plugins/cache/openai-bundled/browser-use"), { recursive: true });
  await mkdir(path.join(cwd, "plugins/cache/openai-bundled/browser-use/tool"), { recursive: true });
  await mkdir(runtimeMarketplace, { recursive: true });
  await mkdir(appMarketplace, { recursive: true });
  await writeFile(path.join(cwd, "plugins/cache/openai-bundled/browser-use/tool/.mcp.json"), "{}", "utf8");
  await writeFile(path.join(runtimeMarketplace, "marketplace.json"), JSON.stringify({ plugins: ["browser-use"] }), "utf8");
  await writeFile(path.join(appMarketplace, "marketplace.json"), JSON.stringify({ plugins: ["browser-use", "computer-use"] }), "utf8");
  await writeFile(path.join(cwd, "config.toml"), [
    "[features]",
    "workspace_dependencies = true",
    "",
    "[plugins.\"computer-use@openai-bundled\"]",
    "enabled = true",
    "",
    "[plugins.\"missing@openai-bundled\"]",
    "enabled = true",
    ""
  ].join("\n"), "utf8");

  const result = await auditCodexPlugins(cwd, {
    appPath,
    env: { CODEX_HOME: path.join(cwd, "other-home") },
    platform: "darwin",
    homeDir
  });
  const markdown = renderPluginAuditMarkdown(result);
  const kinds = result.findings.map((finding) => finding.kind);

  assert.equal(result.status, "warn");
  assert.equal(result.summary.enabledPlugins, 2);
  assert.equal(result.summary.cachePlugins, 2);
  assert.ok(kinds.includes("codex_home_env_mismatch"));
  assert.ok(kinds.includes("unsupported_feature_flag"));
  assert.ok(kinds.includes("enabled_plugin_cache_missing"));
  assert.ok(kinds.includes("plugin_manifest_missing"));
  assert.ok(kinds.includes("bundled_marketplace_mismatch"));
  assert.ok(kinds.includes("computer_use_helper_missing"));
  assert.match(markdown, /Codex Plugin Audit/);
  assert.match(markdown, /computer-use@openai-bundled/);
});

test("auditCodexPlugins passes a healthy cached plugin", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "trace-to-skill-plugins-"));
  const pluginDir = path.join(cwd, "plugins/cache/openai-bundled/browser-use/tool");
  await mkdir(pluginDir, { recursive: true });
  await writeFile(path.join(pluginDir, ".mcp.json"), "{}", "utf8");
  await writeFile(path.join(cwd, "config.toml"), [
    "[plugins.\"browser-use@openai-bundled\"]",
    "enabled = true",
    ""
  ].join("\n"), "utf8");

  const result = await auditCodexPlugins(cwd, { env: {}, platform: "linux" });

  assert.equal(result.status, "pass");
  assert.equal(result.summary.enabledPlugins, 1);
  assert.equal(result.summary.pluginsMissingManifest, 0);
  assert.equal(result.findings.length, 0);
});

test("createDiagnosticsBundle writes metadata-only Codex support reports", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "trace-to-skill-bundle-"));
  const outputDir = path.join(cwd, "bundle");
  const sessionDir = path.join(cwd, "sessions");
  await mkdir(sessionDir, { recursive: true });
  await writeFile(path.join(cwd, "config.toml"), [
    "profile = \"safe-auto\"",
    "model = \"gpt-5-codex\"",
    ""
  ].join("\n"), "utf8");
  await writeFile(path.join(sessionDir, "rollout-2026-05-31T10-00-00-019eaaa.jsonl"), [
    JSON.stringify({ type: "session_meta", payload: { id: "019eaaa" } }),
    JSON.stringify({ type: "response_item", item: { type: "message", content: "private prompt is not copied" } }),
    ""
  ].join("\n"), "utf8");

  const result = await createDiagnosticsBundle(cwd, outputDir);
  const markdown = renderDiagnosticsBundleMarkdown(result);
  const manifest = JSON.parse(await readFile(path.join(outputDir, "manifest.json"), "utf8")) as typeof result;
  const readme = await readFile(path.join(outputDir, "README.md"), "utf8");
  const configJson = await readFile(path.join(outputDir, "config-audit.json"), "utf8");
  const sessionJson = await readFile(path.join(outputDir, "session-audit.json"), "utf8");

  assert.equal(result.status, "warn");
  assert.equal(result.privacy.mode, "metadata-only");
  assert.equal(result.privacy.rawFilesIncluded, false);
  assert.equal(result.summary.configStatus, "warn");
  assert.equal(result.summary.pluginStatus, "pass");
  assert.equal(result.summary.sessionStatus, "pass");
  assert.equal(result.recommendedAttachments.length, 8);
  assert.deepEqual(manifest.recommendedAttachments, result.recommendedAttachments);
  assert.match(markdown, /Diagnostics Bundle/);
  assert.match(readme, /Do Not Publicly Attach/);
  assert.match(readme, /logs_2\.sqlite/);
  assert.match(configJson, /legacy_profile_config/);
  assert.match(await readFile(path.join(outputDir, "plugin-audit.json"), "utf8"), /"plugins"/);
  assert.doesNotMatch(sessionJson, /private prompt is not copied/);
});

test("createDiagnosticsBundle refuses non-empty output directories without force", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "trace-to-skill-bundle-"));
  const outputDir = path.join(cwd, "bundle");
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, "keep.txt"), "do not overwrite", "utf8");
  await writeFile(path.join(cwd, "config.toml"), "sandbox_mode = \"workspace-write\"\n", "utf8");
  await writeFile(path.join(cwd, "session_index.jsonl"), `${JSON.stringify({ id: "019e" })}\n`, "utf8");

  await assert.rejects(
    () => createDiagnosticsBundle(cwd, outputDir),
    /output directory is not empty/
  );

  const result = await createDiagnosticsBundle(cwd, outputDir, { force: true });
  assert.equal(result.outputDir, outputDir);
  assert.equal(await readFile(path.join(outputDir, "keep.txt"), "utf8"), "do not overwrite");
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

test("buildUsageEvidence packages reset drift, token burn, and quota mismatch evidence", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "trace-to-skill-usage-"));
  const fixture = path.join(cwd, "usage-notes.md");
  await writeFile(fixture, [
    "sample time | type1 | pct1 | reset1 | type2 | pct2 | reset2",
    "-- | -- | -- | -- | -- | -- | --",
    "2025-11-30 16:05:07 | 5h | 38 | 2025-11-30 16:17:57 | 7d | 75 | 2025-12-02 17:00:03",
    "2025-11-30 16:45:04 | 5h | 5 | 2025-11-30 21:18:04 | 7d | 78 | **2025-11-30 16:50:02**",
    "2025-11-30 17:05:02 | 5h | 9 | 2025-11-30 21:18:04 | 7d | 1 | 2025-12-07 16:50:09",
    "/status says weekly 21% left, reset_at 2025-12-07 16:50:09",
    "Codex says: You've hit your usage limit.",
    "Token usage: total=742,555 input=697,188 (+ 9,077,504 cached) output=45,367 (reasoning 11,450)",
    ""
  ].join("\n"), "utf8");

  const result = await buildUsageEvidence([fixture]);
  const markdown = renderUsageEvidenceMarkdown(result);
  const kinds = result.findings.map((finding) => finding.kind);

  assert.equal(result.status, "warn");
  assert.ok(result.summary.snapshots >= 6);
  assert.equal(result.summary.tokenUsageRecords, 1);
  assert.ok(kinds.includes("reset_timestamp_drift"));
  assert.ok(kinds.includes("quota_percentage_jump"));
  assert.ok(kinds.includes("usage_limit_with_remaining_quota"));
  assert.ok(kinds.includes("high_cached_input"));
  assert.match(markdown, /Codex Usage Evidence/);
  assert.match(markdown, /Usage Snapshots/);
  assert.match(markdown, /9,077,504/);
});

test("buildUsageEvidenceFromInputs parses JSONL-style usage snapshots", () => {
  const result = buildUsageEvidenceFromInputs([
    {
      path: "usage.jsonl",
      content: [
        JSON.stringify({ sampleTime: "2026-05-31T10:00:00Z", window: "7d", percent: 62, resetAt: "2026-06-03T10:00:00Z" }),
        JSON.stringify({ timestamp: "2026-05-31T10:20:00Z", type: "5h", pct: "14%", reset_at: "2026-05-31T15:20:00Z" })
      ].join("\n")
    }
  ]);

  assert.equal(result.status, "pass");
  assert.equal(result.snapshots.length, 2);
  assert.equal(result.snapshots[0]?.window, "7d");
  assert.equal(result.snapshots[1]?.window, "5h");
});

test("analyzeTargets detects Codex usage reset schedule drift", async () => {
  const result = await analyzeTargets(["fixtures/codex-usage-reset-drift.md"]);
  const finding = result.findings.find((item) => item.kind === "codex_usage_reset_drift");
  const evidence = finding?.evidence.map((item) => item.excerpt).join("\n") ?? "";
  const report = renderCodexIssueReport(result);

  assert.ok(finding);
  assert.equal(finding.severity, "high");
  assert.match(evidence, /weekly limit reset due on Nov 3/);
  assert.match(evidence, /first prompt after the blackout period/);
  assert.match(evidence, /14 hours ahead/);
  assert.match(evidence, /7d reset timestamp flips/);
  assert.match(finding.suggestedRule, /previous and new reset_at values/);
  assert.match(report, /codex_usage_reset_drift/);
});

test("analyzeTargets detects sensitive file access in agent context", async () => {
  const result = await analyzeTargets(["fixtures/sensitive-file-access.md"]);
  const finding = result.findings.find((item) => item.kind === "sensitive_file_access");
  const evidence = finding?.evidence.map((item) => item.excerpt).join("\n") ?? "";
  const report = renderCodexIssueReport(result);

  assert.ok(finding);
  assert.equal(finding.severity, "high");
  assert.match(evidence, /\.env\.production/);
  assert.match(evidence, /\.aws\/credentials/);
  assert.match(evidence, /PRIVATE KEY/);
  assert.match(finding.suggestedRule, /exclude sensitive files/);
  assert.match(report, /sensitive_file_access/);
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

test("guard-github-event does not flag ordinary detector commit messages", async () => {
  const result = analyzeInputs(extractGithubContextInputs({
    commits: [
      { message: "Detect Codex remote control route failures" },
      { message: "Detect Codex auth connectivity failures" },
      { message: "Detect Codex MCP runtime failures" },
      { message: "Detect Codex session state failures" },
      { message: "Detect Codex token burn reports" },
      { message: "Detect Codex resource leak reports" }
    ]
  }));

  assert.equal(result.findings.some((finding) => finding.kind === "codex_remote_control"), false);
  assert.equal(result.findings.some((finding) => finding.kind === "codex_connectivity"), false);
  assert.equal(result.findings.some((finding) => finding.kind === "codex_mcp_runtime"), false);
  assert.equal(result.findings.some((finding) => finding.kind === "codex_session_state"), false);
  assert.equal(result.findings.some((finding) => finding.kind === "codex_token_burn"), false);
  assert.equal(result.findings.some((finding) => finding.kind === "codex_resource_leak"), false);
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
  assert.ok(packageJson.files?.includes("docs/CODEX_ISSUE_MAP.md"));
  assert.ok(packageJson.files?.includes("docs/DEMO.md"));
  assert.ok(packageJson.files?.includes("docs/OPENAI_OSS_BRIEF.md"));
  assert.ok(packageJson.keywords?.includes("openai-codex"));
  assert.ok(packageJson.keywords?.includes("prompt-injection"));
  assert.ok(packageJson.keywords?.includes("context-compaction"));
  assert.ok(packageJson.keywords?.includes("sandbox-permission"));
  assert.ok(packageJson.keywords?.includes("codex-connectivity"));
  assert.ok(packageJson.keywords?.includes("codex-remote-compact"));
  assert.ok(packageJson.keywords?.includes("codex-windows-helper"));
  assert.ok(packageJson.keywords?.includes("codex-remote-control"));
  assert.ok(packageJson.keywords?.includes("codex-mcp"));
  assert.ok(packageJson.keywords?.includes("mcp-runtime"));
  assert.ok(packageJson.keywords?.includes("codex-file-tree"));
  assert.ok(packageJson.keywords?.includes("codex-navigation"));
  assert.ok(packageJson.keywords?.includes("codex-session"));
  assert.ok(packageJson.keywords?.includes("codex-resume"));
  assert.ok(packageJson.keywords?.includes("codex-issue-report"));
  assert.ok(packageJson.keywords?.includes("openai-triage"));
  assert.ok(packageJson.keywords?.includes("openai-oss"));
  assert.ok(packageJson.keywords?.includes("oss-maintainers"));
  assert.ok(packageJson.keywords?.includes("codex-demo"));
  assert.ok(packageJson.keywords?.includes("codex-token-burn"));
  assert.ok(packageJson.keywords?.includes("codex-usage"));
  assert.ok(packageJson.keywords?.includes("codex-reset"));
  assert.ok(packageJson.keywords?.includes("codex-usage-reset"));
  assert.ok(packageJson.keywords?.includes("codex-resource-leak"));
  assert.ok(packageJson.keywords?.includes("codex-performance"));
  assert.ok(packageJson.keywords?.includes("codex-approval"));
  assert.ok(packageJson.keywords?.includes("mcp-approval"));
  assert.ok(packageJson.keywords?.includes("quota-mismatch"));
  assert.ok(packageJson.keywords?.includes("sensitive-files"));
  assert.ok(packageJson.keywords?.includes("codex-privacy"));
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
  assert.ok(result.checks.some((check) => check.id === "release-automation" && check.status === "warn"));
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
  const doctor = await doctorRepo(".");

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
  assert.match(releaseGuide, /npx npm@11\.16\.0 trust github trace-to-skill/);
  assert.match(releaseGuide, /--repo grnbtqdbyx-create\/trace-to-skill/);
  assert.match(releaseGuide, /--allow-publish/);
  assert.match(releaseGuide, /Workflow filename: `npm-publish\.yml`/);
  assert.match(releaseGuide, /Allowed action: `npm publish`/);
  assert.ok(doctor.checks.some((check) => check.id === "release-automation" && check.status === "pass"));
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
  const ossBriefSchema = JSON.parse(await readFile("schemas/oss-brief-result.schema.json", "utf8")) as {
    required: string[];
    properties: Record<string, unknown>;
    $defs: Record<string, unknown>;
  };
  const patchGuardSchema = JSON.parse(await readFile("schemas/patch-guard-result.schema.json", "utf8")) as {
    required: string[];
    properties: Record<string, unknown>;
    $defs: Record<string, unknown>;
  };
  const configAuditSchema = JSON.parse(await readFile("schemas/config-audit-result.schema.json", "utf8")) as {
    required: string[];
    properties: Record<string, unknown>;
    $defs: Record<string, unknown>;
  };
  const diagnosticsBundleSchema = JSON.parse(await readFile("schemas/diagnostics-bundle-result.schema.json", "utf8")) as {
    required: string[];
    properties: Record<string, unknown>;
    $defs: Record<string, unknown>;
  };
  const pluginAuditSchema = JSON.parse(await readFile("schemas/plugin-audit-result.schema.json", "utf8")) as {
    required: string[];
    properties: Record<string, unknown>;
    $defs: Record<string, unknown>;
  };
  const sessionAuditSchema = JSON.parse(await readFile("schemas/session-audit-result.schema.json", "utf8")) as {
    required: string[];
    properties: Record<string, unknown>;
    $defs: Record<string, unknown>;
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
  assert.ok((analysisSchema.$defs.findingKind as { enum: string[] }).enum.includes("codex_latest_turn_drift"));
  assert.ok((analysisSchema.$defs.findingKind as { enum: string[] }).enum.includes("codex_latency_regression"));
  assert.ok((analysisSchema.$defs.findingKind as { enum: string[] }).enum.includes("codex_thinking_hang"));
  assert.ok((analysisSchema.$defs.findingKind as { enum: string[] }).enum.includes("codex_clipboard_attachment"));
  assert.ok((analysisSchema.$defs.findingKind as { enum: string[] }).enum.includes("codex_deeplink_launch"));
  assert.ok((analysisSchema.$defs.findingKind as { enum: string[] }).enum.includes("codex_connector_auth_cache"));
  assert.ok((analysisSchema.$defs.findingKind as { enum: string[] }).enum.includes("codex_approval_friction"));
  assert.ok((analysisSchema.$defs.findingKind as { enum: string[] }).enum.includes("sandbox_permission"));
  assert.ok((analysisSchema.$defs.findingKind as { enum: string[] }).enum.includes("codex_connectivity"));
  assert.ok((analysisSchema.$defs.findingKind as { enum: string[] }).enum.includes("codex_remote_control"));
  assert.ok((analysisSchema.$defs.findingKind as { enum: string[] }).enum.includes("codex_mcp_runtime"));
  assert.ok((analysisSchema.$defs.findingKind as { enum: string[] }).enum.includes("codex_plugin_runtime"));
  assert.ok((analysisSchema.$defs.findingKind as { enum: string[] }).enum.includes("codex_file_tree_ui"));
  assert.ok((analysisSchema.$defs.findingKind as { enum: string[] }).enum.includes("codex_session_state"));
  assert.ok((analysisSchema.$defs.findingKind as { enum: string[] }).enum.includes("codex_token_burn"));
  assert.ok((analysisSchema.$defs.findingKind as { enum: string[] }).enum.includes("codex_resource_leak"));
  assert.ok((analysisSchema.$defs.findingKind as { enum: string[] }).enum.includes("codex_tool_call_integrity"));
  assert.ok((analysisSchema.$defs.findingKind as { enum: string[] }).enum.includes("codex_usage_reset_drift"));
  assert.ok((analysisSchema.$defs.findingKind as { enum: string[] }).enum.includes("quota_mismatch"));
  assert.ok((analysisSchema.$defs.findingKind as { enum: string[] }).enum.includes("sensitive_file_access"));
  assert.deepEqual(agentsLintSchema.required, ["generatedAt", "root", "status", "score", "instructionFiles", "mcpConfigs", "checks", "findings", "summary"]);
  assert.ok(agentsLintSchema.properties.instructionFiles);
  assert.ok(agentsLintSchema.properties.mcpConfigs);
  assert.deepEqual(doctorSchema.required, ["generatedAt", "root", "score", "summary", "checks", "findings"]);
  assert.ok(doctorSchema.properties.checks);
  assert.ok(doctorSchema.$defs.check);
  assert.deepEqual(scorecardSchema.required, ["generatedAt", "passed", "threshold", "doctor", "benchmark", "reports"]);
  assert.ok(scorecardSchema.properties.doctor);
  assert.ok(scorecardSchema.properties.benchmark);
  assert.deepEqual(ossBriefSchema.required, ["generatedAt", "root", "scorecard", "qualification", "apiCredits", "evidence", "nextSteps"]);
  assert.ok(ossBriefSchema.properties.scorecard);
  assert.ok(ossBriefSchema.$defs.briefText);
  assert.deepEqual(patchGuardSchema.required, ["generatedAt", "patch", "root", "status", "findings"]);
  assert.ok(patchGuardSchema.properties.findings);
  assert.ok(patchGuardSchema.$defs.finding);
  assert.deepEqual(configAuditSchema.required, ["generatedAt", "target", "configPath", "status", "summary", "values", "findings"]);
  assert.ok(configAuditSchema.properties.values);
  assert.ok(configAuditSchema.$defs.finding);
  assert.deepEqual(diagnosticsBundleSchema.required, ["generatedAt", "target", "outputDir", "status", "privacy", "summary", "recommendedAttachments", "reports"]);
  assert.ok(diagnosticsBundleSchema.properties.privacy);
  assert.ok(diagnosticsBundleSchema.$defs.report);
  assert.deepEqual(pluginAuditSchema.required, ["generatedAt", "target", "status", "environment", "summary", "plugins", "marketplaces", "helperApps", "findings"]);
  assert.ok(pluginAuditSchema.properties.plugins);
  assert.ok(pluginAuditSchema.$defs.finding);
  assert.deepEqual(sessionAuditSchema.required, ["generatedAt", "root", "status", "thresholds", "summary", "files", "stateFiles", "findings"]);
  assert.ok(sessionAuditSchema.properties.summary);
  assert.ok(sessionAuditSchema.$defs.file);
  assert.deepEqual(redactSchema.required, ["generatedAt", "files", "totals"]);
  assert.ok(redactSchema.properties.files);
  assert.ok(redactSchema.$defs.redactedFile);
});

test("benchmark covers public fixture failure classes", async () => {
  const benchmark = await runBenchmark();
  const markdown = renderBenchmarkMarkdown(benchmark);

  assert.equal(benchmark.passed, true);
  assert.equal(benchmark.cases.length, 30);
  assert.ok(benchmark.cases.some((item) => item.id === "clean-validated-run" && item.score === 100));
  assert.ok(benchmark.cases.some((item) => item.id === "failed-workflow" && item.detectedKinds.includes("test_failure")));
  assert.ok(benchmark.cases.some((item) => item.id === "context-compaction" && item.detectedKinds.includes("context_compaction")));
  assert.ok(benchmark.cases.some((item) => item.id === "codex-remote-compact" && item.detectedKinds.includes("codex_remote_compact")));
  assert.ok(benchmark.cases.some((item) => item.id === "codex-latest-turn-drift" && item.detectedKinds.includes("codex_latest_turn_drift")));
  assert.ok(benchmark.cases.some((item) => item.id === "codex-latency-regression" && item.detectedKinds.includes("codex_latency_regression")));
  assert.ok(benchmark.cases.some((item) => item.id === "codex-thinking-hang" && item.detectedKinds.includes("codex_thinking_hang")));
  assert.ok(benchmark.cases.some((item) => item.id === "codex-clipboard-attachment" && item.detectedKinds.includes("codex_clipboard_attachment")));
  assert.ok(benchmark.cases.some((item) => item.id === "codex-deeplink-launch" && item.detectedKinds.includes("codex_deeplink_launch")));
  assert.ok(benchmark.cases.some((item) => item.id === "codex-connector-auth-cache" && item.detectedKinds.includes("codex_connector_auth_cache")));
  assert.ok(benchmark.cases.some((item) => item.id === "codex-approval-friction" && item.detectedKinds.includes("codex_approval_friction")));
  assert.ok(benchmark.cases.some((item) => item.id === "sandbox-permission" && item.detectedKinds.includes("sandbox_permission")));
  assert.ok(benchmark.cases.some((item) => item.id === "codex-windows-helper-path" && item.detectedKinds.includes("codex_windows_helper_path")));
  assert.ok(benchmark.cases.some((item) => item.id === "codex-connectivity" && item.detectedKinds.includes("codex_connectivity")));
  assert.ok(benchmark.cases.some((item) => item.id === "codex-remote-control" && item.detectedKinds.includes("codex_remote_control")));
  assert.ok(benchmark.cases.some((item) => item.id === "codex-mcp-runtime" && item.detectedKinds.includes("codex_mcp_runtime")));
  assert.ok(benchmark.cases.some((item) => item.id === "codex-plugin-runtime" && item.detectedKinds.includes("codex_plugin_runtime")));
  assert.ok(benchmark.cases.some((item) => item.id === "codex-file-tree-ui" && item.detectedKinds.includes("codex_file_tree_ui")));
  assert.ok(benchmark.cases.some((item) => item.id === "codex-session-state" && item.detectedKinds.includes("codex_session_state")));
  assert.ok(benchmark.cases.some((item) => item.id === "codex-token-burn" && item.detectedKinds.includes("codex_token_burn")));
  assert.ok(benchmark.cases.some((item) => item.id === "codex-resource-leak" && item.detectedKinds.includes("codex_resource_leak")));
  assert.ok(benchmark.cases.some((item) => item.id === "codex-tool-call-integrity" && item.detectedKinds.includes("codex_tool_call_integrity")));
  assert.ok(benchmark.cases.some((item) => item.id === "codex-apply-patch-overwrite" && item.detectedKinds.includes("codex_tool_call_integrity")));
  assert.ok(benchmark.cases.some((item) => item.id === "codex-usage-reset-drift" && item.detectedKinds.includes("codex_usage_reset_drift")));
  assert.ok(benchmark.cases.some((item) => item.id === "quota-mismatch" && item.detectedKinds.includes("quota_mismatch")));
  assert.ok(benchmark.cases.some((item) => item.id === "mcp-risk" && item.detectedKinds.includes("secret_exposure")));
  assert.ok(benchmark.cases.some((item) => item.id === "sensitive-file-access" && item.detectedKinds.includes("sensitive_file_access")));
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
  assert.equal(scorecard.benchmark.cases, 30);
  assert.match(markdown, /trace-to-skill Scorecard/);
  assert.match(markdown, /Codex readiness/);
  assert.match(markdown, /Benchmark Summary/);
  assert.match(comment, /trace-to-skill-scorecard-report/);
  assert.match(comment, /trace-to-skill Scorecard/);
});

test("oss-brief creates OpenAI application-ready evidence", async () => {
  const brief = await runOssBrief(".", 95);
  const markdown = renderOssBriefMarkdown(brief);

  assert.equal(brief.scorecard.passed, true);
  assert.equal(brief.scorecard.doctorStatus, "ready");
  assert.equal(brief.scorecard.doctorScore, 100);
  assert.equal(brief.scorecard.benchmarkStatus, "pass");
  assert.equal(brief.scorecard.benchmarkCases, 30);
  assert.equal(brief.packageName, "trace-to-skill");
  assert.equal(brief.packageVersion, "0.1.63");
  assert.equal(brief.license, "Apache-2.0");
  assert.ok(brief.repository?.includes("github.com/grnbtqdbyx-create/trace-to-skill"));
  assert.ok(brief.qualification.max500.length <= 500);
  assert.ok(brief.apiCredits.max500.length <= 500);
  assert.match(markdown, /OpenAI OSS Brief/);
  assert.match(markdown, /Why This Repository Qualifies/);
  assert.match(markdown, /500-Character Version/);
  assert.match(markdown, /npx trace-to-skill@0\.1\.63/);
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
