import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";
import { lintAgents, renderAgentsLintMarkdown } from "../src/agentsLint.js";
import { analyzeInputs, analyzeTargets } from "../src/analyze.js";
import { renderBenchmarkMarkdown, runBenchmark } from "../src/benchmark.js";
import { createWorkspaceCheckpoint, renderWorkspaceCheckpointMarkdown } from "../src/checkpoint.js";
import { auditCodexConfig, renderConfigAuditMarkdown } from "../src/configAudit.js";
import { listDemoScenarios, renderDemoMarkdown, renderDemoScenarioList, runDemo } from "../src/demo.js";
import { createDiagnosticsBundle, renderDiagnosticsBundleMarkdown } from "../src/diagnosticsBundle.js";
import { doctorRepo } from "../src/doctor.js";
import { compareAnalyses, evaluate } from "../src/eval.js";
import { analyzeGithubEventContext, extractGithubContextInputs } from "../src/githubContext.js";
import { buildGithubIssueMap, buildIssueMap, renderIssueMapMarkdown } from "../src/issueMap.js";
import { postPullRequestComment } from "../src/github.js";
import { initProject } from "../src/init.js";
import { auditLspReadiness, renderLspAuditMarkdown } from "../src/lspAudit.js";
import { renderOssBriefMarkdown, runOssBrief } from "../src/ossBrief.js";
import { guardPatchContent, guardPatchFile, renderPatchGuardMarkdown } from "../src/patchGuard.js";
import { auditCodexPlugins, renderPluginAuditMarkdown } from "../src/pluginAudit.js";
import { auditProcessEvidenceFromInputs, renderProcessAuditMarkdown } from "../src/processAudit.js";
import { redactTargets, redactText } from "../src/redact.js";
import { renderAgentsRules, renderCodexIssueReport, renderComparison, renderDoctorPrComment, renderPrComment, renderSarif, renderSkill } from "../src/report.js";
import { renderScorecardMarkdown, renderScorecardPrComment, runScorecard } from "../src/scorecard.js";
import { auditCodexSessions, renderSessionAuditMarkdown } from "../src/sessionAudit.js";
import { auditSensitivePaths, renderSensitiveAuditMarkdown, renderSensitiveIgnoreFile } from "../src/sensitiveAudit.js";
import { buildUsageEvidence, buildUsageEvidenceFromInputs, renderUsageEvidenceMarkdown } from "../src/usageEvidence.js";

const execFileAsync = promisify(execFile);

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
  assert.ok(scenarios.some((scenario) => scenario.id === "context-fork-bloat"));
  assert.ok(scenarios.some((scenario) => scenario.id === "subagent-prompt-leakage"));
  assert.ok(scenarios.some((scenario) => scenario.id === "windows-helper-path"));
  assert.ok(scenarios.some((scenario) => scenario.id === "latency-regression"));
  assert.ok(scenarios.some((scenario) => scenario.id === "thinking-hang"));
  assert.ok(scenarios.some((scenario) => scenario.id === "clipboard-attachment"));
  assert.ok(scenarios.some((scenario) => scenario.id === "deeplink-launch"));
  assert.ok(scenarios.some((scenario) => scenario.id === "connector-auth-cache"));
  assert.ok(scenarios.some((scenario) => scenario.id === "mcp-discovery-mismatch"));
  assert.ok(scenarios.some((scenario) => scenario.id === "mcp-streamable-http"));
  assert.ok(scenarios.some((scenario) => scenario.id === "hooks-runtime"));
  assert.ok(scenarios.some((scenario) => scenario.id === "terminal-output-integrity"));
  assert.ok(scenarios.some((scenario) => scenario.id === "subagent-lifecycle"));
  assert.ok(scenarios.some((scenario) => scenario.id === "usage-bucket-confusion"));
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
  assert.match(list, /mcp-discovery-mismatch/);
  assert.match(list, /mcp-streamable-http/);
  assert.match(list, /hooks-runtime/);
  assert.match(list, /terminal-output-integrity/);
  assert.match(list, /subagent-lifecycle/);
  assert.match(list, /usage-bucket-confusion/);
  assert.match(list, /remote-compact/);
  assert.match(list, /context-fork-bloat/);
  assert.match(list, /subagent-prompt-leakage/);
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

test("analyzeTargets detects Codex terminal output and scrollback integrity failures", async () => {
  const result = await analyzeTargets(["fixtures/codex-terminal-output-integrity.md"]);
  const finding = result.findings.find((item) => item.kind === "codex_terminal_output_integrity");
  const evidence = finding?.evidence.map((item) => item.excerpt).join("\n") ?? "";
  const report = renderCodexIssueReport(result);

  assert.ok(finding);
  assert.equal(finding.severity, "high");
  assert.match(evidence, /Scrollback does not work correctly/);
  assert.match(evidence, /Output is sometimes overwritten/);
  assert.match(evidence, /Scrolling during streaming output/);
  assert.match(evidence, /tmux_scrollback_repro\.sh/);
  assert.match(finding.suggestedRule, /tmux capture-pane/);
  assert.match(finding.suggestedRule, /numbered-line harness/);
  assert.match(finding.suggestedRule, /transcript mode recovers/);
  assert.match(report, /codex_terminal_output_integrity/);
});

test("analyzeTargets detects Codex subagent lifecycle and state reconciliation failures", async () => {
  const result = await analyzeTargets(["fixtures/codex-subagent-lifecycle.md"]);
  const finding = result.findings.find((item) => item.kind === "codex_subagent_lifecycle");
  const evidence = finding?.evidence.map((item) => item.excerpt).join("\n") ?? "";
  const report = renderCodexIssueReport(result);

  assert.ok(finding);
  assert.equal(finding.severity, "high");
  assert.match(evidence, /Completed or closed subagents remain visible/);
  assert.match(evidence, /thread_spawn_edges status count/);
  assert.match(evidence, /stale and refusing to close/);
  assert.match(evidence, /MCP connections/);
  assert.match(finding.suggestedRule, /thread_spawn_edges status counts/);
  assert.match(finding.suggestedRule, /max_threads\/quota evidence/);
  assert.match(finding.suggestedRule, /stale agents are UI-only/);
  assert.match(report, /codex_subagent_lifecycle/);
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

test("analyzeTargets detects Codex Streamable HTTP MCP failures", async () => {
  const result = await analyzeTargets(["fixtures/codex-mcp-streamable-http.md"]);
  const finding = result.findings.find((item) => item.kind === "codex_mcp_streamable_http");
  const evidence = finding?.evidence.map((item) => item.excerpt).join("\n") ?? "";
  const report = renderCodexIssueReport(result);

  assert.ok(finding);
  assert.equal(finding.severity, "high");
  assert.match(evidence, /Streamable HTTP MCP server `penpot`/);
  assert.match(evidence, /JsonRpcMessage deserialize error/);
  assert.match(evidence, /Content-Type: text\/event-stream/);
  assert.match(evidence, /stale streamable-http session id/);
  assert.match(finding.suggestedRule, /Content-Type/);
  assert.match(finding.suggestedRule, /session id/);
  assert.match(report, /codex_mcp_streamable_http/);
});

test("analyzeTargets detects Codex hooks runtime failures", async () => {
  const result = await analyzeTargets(["fixtures/codex-hooks-runtime.md"]);
  const finding = result.findings.find((item) => item.kind === "codex_hooks_runtime");
  const evidence = finding?.evidence.map((item) => item.excerpt).join("\n") ?? "";
  const report = renderCodexIssueReport(result);

  assert.ok(finding);
  assert.equal(finding.severity, "high");
  assert.match(evidence, /PostToolUse hook twice/);
  assert.match(evidence, /deprecated `codex_hooks` warning/);
  assert.match(evidence, /SessionStart and PostToolUse hooks stop firing/);
  assert.match(evidence, /Windows command_execution does not emit PreToolUse hooks/);
  assert.match(finding.suggestedRule, /hooks.json/);
  assert.match(finding.suggestedRule, /matcher/);
  assert.match(report, /codex_hooks_runtime/);
});

test("analyzeTargets detects Codex context fork bloat", async () => {
  const result = await analyzeTargets(["fixtures/codex-context-fork-bloat.md"]);
  const finding = result.findings.find((item) => item.kind === "codex_context_fork_bloat");
  const evidence = finding?.evidence.map((item) => item.excerpt).join("\n") ?? "";
  const report = renderCodexIssueReport(result);

  assert.ok(finding);
  assert.equal(finding.severity, "high");
  assert.match(evidence, /conversation fork from an existing long thread/);
  assert.match(evidence, /prompt size to grow from 118k tokens to 289k tokens/);
  assert.match(evidence, /repeated parent conversation turns after the fork boundary/);
  assert.match(evidence, /`prompt_cache_key` changes/);
  assert.match(evidence, /`fork_context` subagent inherited parent intent/);
  assert.match(finding.suggestedRule, /fork boundary/);
  assert.match(finding.suggestedRule, /prompt_cache_key/);
  assert.match(report, /codex_context_fork_bloat/);
});

test("analyzeTargets detects Codex subagent prompt leakage", async () => {
  const result = await analyzeTargets(["fixtures/codex-subagent-prompt-leakage.md"]);
  const finding = result.findings.find((item) => item.kind === "codex_subagent_prompt_leakage");
  const evidence = finding?.evidence.map((item) => item.excerpt).join("\n") ?? "";
  const report = renderCodexIssueReport(result);

  assert.ok(finding);
  assert.equal(finding.severity, "high");
  assert.match(evidence, /`spawn_agent` was called with `fork_turns: "none"`/);
  assert.match(evidence, /assistant\/commentary JSON envelope/);
  assert.match(evidence, /child A received sibling child B's prompt envelope/);
  assert.match(evidence, /`multi_tool_use.parallel`/);
  assert.match(evidence, /`wait_agent` and `close_agent` reported completion/);
  assert.match(finding.suggestedRule, /fork_turns/);
  assert.match(finding.suggestedRule, /sibling prompt/);
  assert.match(report, /codex_subagent_prompt_leakage/);
});

test("analyzeTargets detects Codex MCP discovery and config-scope mismatches", async () => {
  const result = await analyzeTargets(["fixtures/codex-mcp-discovery-mismatch.md"]);
  const finding = result.findings.find((item) => item.kind === "codex_mcp_discovery_mismatch");
  const evidence = finding?.evidence.map((item) => item.excerpt).join("\n") ?? "";
  const report = renderCodexIssueReport(result);

  assert.ok(finding);
  assert.equal(finding.severity, "high");
  assert.match(evidence, /MCP servers not detected/);
  assert.match(evidence, /Open config\.toml in WSL environment/);
  assert.match(evidence, /CODEX_HOME differs/);
  assert.match(finding.suggestedRule, /effective CODEX_HOME/);
  assert.match(finding.suggestedRule, /codex mcp list/);
  assert.match(finding.suggestedRule, /moving the same server to user-global config/);
  assert.match(report, /codex_mcp_discovery_mismatch/);
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

test("analyzeTargets detects Codex usage bucket confusion", async () => {
  const result = await analyzeTargets(["fixtures/codex-usage-bucket-confusion.md"]);
  const finding = result.findings.find((item) => item.kind === "codex_usage_bucket_confusion");
  const evidence = finding?.evidence.map((item) => item.excerpt).join("\n") ?? "";
  const report = renderCodexIssueReport(result);

  assert.ok(finding);
  assert.equal(finding.severity, "high");
  assert.match(evidence, /short-term and weekly buckets/);
  assert.match(evidence, /5h: 97% remaining/);
  assert.match(evidence, /Weekly: 95% remaining/);
  assert.match(evidence, /percentages mean used or remaining/);
  assert.match(evidence, /natural week, rolling 7-day window, or account-wide pool/);
  assert.match(finding.suggestedRule, /5h percentage/);
  assert.match(finding.suggestedRule, /weekly percentage/);
  assert.match(report, /codex_usage_bucket_confusion/);
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
  const bloatedTitle = [
    "Visible thread",
    "assistant: here is a large transcript chunk that should not be stored as a sidebar title",
    "response_item function_call tool_call Pasted text fileAttachments",
    "x".repeat(260)
  ].join(" ");
  await writeFile(path.join(cwd, "session_index.jsonl"), `${JSON.stringify({ id: "019eaaa", thread_name: bloatedTitle, updated_at: "2026-05-31T10:01:00Z" })}\n`, "utf8");
  await writeFile(path.join(sessionDir, "rollout-2026-05-31T10-00-00-019eaaa.jsonl"), [
    JSON.stringify({ type: "session_meta", timestamp: "2026-05-31T10:00:00Z", payload: { id: "019eaaa", cwd: "/Users/test/VisibleProject", originator: "Codex Desktop", cli_version: "0.135.0-alpha.1", timestamp: "2026-05-31T10:00:00Z" } }),
    JSON.stringify({ type: "response_item", item: { type: "function_call", name: "spawn_agent" } }),
    JSON.stringify({ type: "response_item", item: { type: "function_call", name: "wait_agent" } }),
    JSON.stringify({ type: "response_item", item: { type: "function_call", name: "close_agent" } }),
    JSON.stringify({ type: "event_msg", msg: "thread_spawn_edges status count: closed=549, open=3" }),
    JSON.stringify({ type: "event_msg", msg: "collab spawn failed: agent thread limit reached" }),
    JSON.stringify({ type: "event_msg", msg: "Subagents panel still shows stale subagent cards after close_agent returned not_found" }),
    JSON.stringify({ type: "event_msg", msg: "subagent child threads appear as top-level recent conversations after compaction" }),
    JSON.stringify({ type: "response_item", item: { type: "function_call", name: "shell" } }),
    JSON.stringify({ type: "event_msg", msg: "thread/resume took 7760 ms" }),
    "not-json",
    ""
  ].join("\n"), "utf8");
  await writeFile(path.join(sessionDir, "rollout-2026-05-31T10-05-00-019ebbb.jsonl"), [
    JSON.stringify({ type: "session_meta", timestamp: "2026-05-31T10:05:00Z", payload: { id: "019ebbb", cwd: "/Users/test/HiddenProject", originator: "Codex Desktop", cli_version: "0.135.0-alpha.1", timestamp: "2026-05-31T10:05:00Z" } }),
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
  assert.equal(result.summary.rolloutThreads, 2);
  assert.equal(result.summary.indexedThreads, 1);
  assert.equal(result.summary.unindexedRolloutThreads, 1);
  assert.equal(result.summary.bloatedIndexTitles, 1);
  assert.equal(result.summary.subagentSignalFiles, 1);
  assert.ok(result.summary.subagentSignals >= 6);
  assert.ok(result.subagentSignals.some((signal) => signal.kind === "thread_spawn_edges"));
  assert.ok(result.subagentSignals.some((signal) => signal.kind === "agent_thread_limit"));
  assert.ok(result.subagentSignals.some((signal) => signal.kind === "stale_subagent_ui"));
  assert.equal(result.threads.find((thread) => thread.id === "019eaaa")?.indexed, true);
  assert.ok((result.threads.find((thread) => thread.id === "019eaaa")?.indexTitleBytes ?? 0) > 240);
  assert.ok(result.threads.find((thread) => thread.id === "019eaaa")?.indexTitleSignals?.includes("long_title"));
  assert.ok(result.threads.find((thread) => thread.id === "019eaaa")?.indexTitleSignals?.includes("transcript_marker"));
  assert.equal(result.threads.find((thread) => thread.id === "019ebbb")?.indexed, false);
  assert.equal(result.threads.find((thread) => thread.id === "019ebbb")?.cwdBasename, "HiddenProject");
  assert.equal(result.threads.find((thread) => thread.id === "019ebbb")?.recoverCommand, "codex resume 019ebbb");
  assert.ok(result.findings.some((finding) => finding.kind === "large_rollout"));
  assert.ok(result.findings.some((finding) => finding.kind === "huge_jsonl_line"));
  assert.ok(result.findings.some((finding) => finding.kind === "json_parse_error"));
  assert.ok(result.findings.some((finding) => finding.kind === "short_session_index"));
  assert.ok(result.findings.some((finding) => finding.kind === "unindexed_rollout_thread"));
  assert.ok(result.findings.some((finding) => finding.kind === "bloated_index_title"));
  assert.ok(result.findings.some((finding) => finding.kind === "subagent_lifecycle_signal"));
  assert.ok(result.findings.some((finding) => finding.kind === "state_file_present"));
  assert.match(markdown, /Codex Session Audit/);
  assert.match(markdown, /Recoverable Thread Index/);
  assert.match(markdown, /Subagent lifecycle signal files: 1/);
  assert.match(markdown, /Subagent Lifecycle Signals/);
  assert.match(markdown, /agent_thread_limit/);
  assert.match(markdown, /Bloated index titles: 1/);
  assert.match(markdown, /bloated_index_title/);
  assert.match(markdown, /codex resume 019ebbb/);
  assert.match(markdown, /thread_resume/);
});

test("auditCodexSessions passes small healthy session directories", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "trace-to-skill-session-"));
  const sessionDir = path.join(cwd, "sessions");
  await mkdir(sessionDir, { recursive: true });
  await writeFile(path.join(sessionDir, "rollout-2026-05-31T10-00-00-019eaaa.jsonl"), [
    JSON.stringify({ type: "session_meta", payload: { id: "019eaaa", cwd: "/Users/test/ReadyProject" } }),
    JSON.stringify({ type: "response_item", item: { type: "message", content: "ok" } }),
    ""
  ].join("\n"), "utf8");

  const result = await auditCodexSessions(cwd, {
    largeFileBytes: 1024 * 1024,
    hugeLineBytes: 1024
  });

  assert.equal(result.status, "pass");
  assert.equal(result.summary.jsonlFiles, 1);
  assert.equal(result.summary.rolloutThreads, 1);
  assert.equal(result.summary.subagentSignals, 0);
  assert.equal(result.findings.length, 0);
});

test("auditCodexConfig reports risky Codex config drift", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "trace-to-skill-config-"));
  await writeFile(path.join(cwd, "config.toml"), [
    "profile = \"safe-auto\"",
    "model = \"gpt-5.5\"",
    "service_tier = \"fast\"",
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
  await writeFile(path.join(cwd, ".codex-global-state.json"), JSON.stringify({
    "electron-persisted-atom-state": {
      "default-service-tier": null,
      "has-user-changed-service-tier": true
    }
  }, null, 2), "utf8");

  const result = await auditCodexConfig(cwd);
  const markdown = renderConfigAuditMarkdown(result);
  const kinds = result.findings.map((finding) => finding.kind);

  assert.equal(result.status, "fail");
  assert.equal(result.summary.exists, true);
  assert.equal(result.summary.globalStateExists, true);
  assert.equal(result.values.model, "gpt-5.5");
  assert.equal(result.values.serviceTier, "fast");
  assert.equal(result.values.globalDefaultServiceTier, null);
  assert.equal(result.values.globalHasUserChangedServiceTier, true);
  assert.ok(kinds.includes("legacy_profile_config"));
  assert.ok(kinds.includes("model_pin"));
  assert.ok(kinds.includes("service_tier_persistence_drift"));
  assert.ok(kinds.includes("danger_full_access"));
  assert.ok(kinds.includes("windows_elevated_sandbox"));
  assert.ok(kinds.includes("default_permissions_missing"));
  assert.ok(kinds.includes("deprecated_codex_hooks"));
  assert.ok(kinds.includes("machine_local_project_state"));
  assert.ok(kinds.includes("plugin_cache_missing"));
  assert.match(markdown, /Codex Config Audit/);
  assert.match(markdown, /gpt-5\.5/);
  assert.match(markdown, /global default-service-tier: `null`/);
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
  assert.equal(result.summary.globalStateExists, false);
});

test("auditSensitivePaths reports sensitive paths without reading file contents", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "trace-to-skill-sensitive-"));
  await mkdir(path.join(cwd, ".aws"), { recursive: true });
  await mkdir(path.join(cwd, ".ssh"), { recursive: true });
  await mkdir(path.join(cwd, "src"), { recursive: true });
  await writeFile(path.join(cwd, ".env.local"), "OPENAI_API_KEY=sk-should-not-appear-in-report", "utf8");
  await writeFile(path.join(cwd, ".npmrc"), "//registry.npmjs.org/:_authToken=npm_should_not_appear", "utf8");
  await writeFile(path.join(cwd, ".aws", "credentials"), "aws_secret_access_key=should-not-appear", "utf8");
  await writeFile(path.join(cwd, ".ssh", "id_ed25519"), "PRIVATE KEY should-not-appear", "utf8");
  await writeFile(path.join(cwd, "local.sqlite"), "private rows", "utf8");
  await writeFile(path.join(cwd, "src", "index.ts"), "export const ok = true;", "utf8");
  await symlink(path.join(cwd, ".env.local"), path.join(cwd, "linked-env.key"));

  const result = await auditSensitivePaths(cwd);
  const markdown = renderSensitiveAuditMarkdown(result);
  const codexIgnore = renderSensitiveIgnoreFile(result, "codexignore");
  const kinds = result.findings.map((finding) => finding.kind);
  const serialized = JSON.stringify(result);

  assert.equal(result.status, "fail");
  assert.ok(result.summary.scannedEntries >= 7);
  assert.ok(kinds.includes("env_file"));
  assert.ok(kinds.includes("package_auth_config"));
  assert.ok(kinds.includes("cloud_credentials"));
  assert.ok(kinds.includes("ssh_credentials"));
  assert.ok(kinds.includes("database_file"));
  assert.ok(kinds.includes("sensitive_symlink"));
  assert.ok(result.recommendedExcludes.includes("**/.env*"));
  assert.ok(result.recommendedExcludes.includes("**/.aws/**"));
  assert.ok(result.ignoreFiles.some((candidate) => candidate.target === "agentignore" && candidate.filename === ".agentignore"));
  assert.ok(result.ignoreFiles.some((candidate) => candidate.target === "codexignore" && candidate.filename === ".codexignore"));
  assert.ok(result.ignoreFiles.every((candidate) => candidate.patterns.includes("**/.env*")));
  assert.match(codexIgnore, /Target: \.codexignore/);
  assert.match(codexIgnore, /\*\*\/\.aws\/\*\*/);
  assert.match(codexIgnore, /filename\/path based and did not read file contents/);
  assert.match(markdown, /Sensitive Path Audit/);
  assert.match(markdown, /does not read file contents/);
  assert.doesNotMatch(serialized, /sk-should-not-appear|npm_should_not_appear|PRIVATE KEY|private rows/);
  assert.doesNotMatch(markdown, /sk-should-not-appear|npm_should_not_appear|PRIVATE KEY|private rows/);
});

test("auditSensitivePaths passes ordinary source trees", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "trace-to-skill-sensitive-"));
  await mkdir(path.join(cwd, "src"), { recursive: true });
  await writeFile(path.join(cwd, "src", "index.ts"), "export const ok = true;", "utf8");
  await writeFile(path.join(cwd, "README.md"), "# ok", "utf8");

  const result = await auditSensitivePaths(cwd);

  assert.equal(result.status, "pass");
  assert.equal(result.findings.length, 0);
  assert.equal(result.recommendedExcludes.length, 0);
  assert.ok(result.ignoreFiles.every((candidate) => candidate.patterns.length === 0));
});

test("auditLspReadiness reports detected languages and missing servers", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "trace-to-skill-lsp-"));
  await mkdir(path.join(cwd, "src"), { recursive: true });
  await writeFile(path.join(cwd, "package.json"), "{\"type\":\"module\"}", "utf8");
  await writeFile(path.join(cwd, "tsconfig.json"), "{}", "utf8");
  await writeFile(path.join(cwd, "src", "index.ts"), "export const ok = true;", "utf8");
  await writeFile(path.join(cwd, "pyproject.toml"), "[project]\nname = \"demo\"\n", "utf8");
  await writeFile(path.join(cwd, "app.py"), "print('ok')\n", "utf8");
  const previousPath = process.env.PATH;
  process.env.PATH = "";

  try {
    const result = await auditLspReadiness(cwd);
    const markdown = renderLspAuditMarkdown(result);
    const languageIds = result.languages.map((language) => language.id);

    assert.equal(result.status, "warn");
    assert.equal(result.summary.detectedLanguages, 2);
    assert.equal(result.summary.installedServers, 0);
    assert.equal(result.summary.missingServers, 2);
    assert.ok(languageIds.includes("typescript"));
    assert.ok(languageIds.includes("python"));
    assert.ok(result.recommendedInstalls.includes("npm install --save-dev typescript typescript-language-server"));
    assert.ok(result.recommendedInstalls.includes("npm install --global pyright"));
    assert.match(markdown, /LSP Readiness Audit/);
    assert.match(markdown, /typescript-language-server is \*\*missing\*\*/);
    assert.match(markdown, /pyright-langserver is \*\*missing\*\*/);
  } finally {
    process.env.PATH = previousPath;
  }
});

test("auditLspReadiness detects installed language server commands on PATH", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "trace-to-skill-lsp-"));
  const bin = path.join(cwd, "bin");
  await mkdir(path.join(cwd, "src"), { recursive: true });
  await mkdir(bin, { recursive: true });
  await writeFile(path.join(cwd, "tsconfig.json"), "{}", "utf8");
  await writeFile(path.join(cwd, "src", "index.ts"), "export const ok = true;", "utf8");
  await writeFile(path.join(bin, "typescript-language-server"), "#!/bin/sh\n", "utf8");
  await chmod(path.join(bin, "typescript-language-server"), 0o755);
  const previousPath = process.env.PATH;
  process.env.PATH = bin;

  try {
    const result = await auditLspReadiness(cwd);

    assert.equal(result.status, "pass");
    assert.equal(result.summary.detectedLanguages, 1);
    assert.equal(result.summary.installedServers, 1);
    assert.equal(result.summary.missingServers, 0);
    assert.equal(result.recommendedInstalls.length, 0);
    assert.equal(result.languages[0]?.server.installed, true);
  } finally {
    process.env.PATH = previousPath;
  }
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
    "Previous WebSocket request: input_tokens=183,426 cached_input_tokens=152,448 prompt_cache_key=\"019e74ff-6cf1-7d40-80ce-0c8baa3ad6cf\" id=\"resp_0442f7dc\" outcome=incremental",
    "Reconnect request: input_tokens=184,739 cached_tokens=91,520 prompt_cache_key=\"019e74ff-6cf1-7d40-80ce-0c8baa3ad6cf\" id=\"resp_0fd6c965\" outcome=incremental websocket reconnect",
    "Recovered request: input_tokens=185,010 cached_input_tokens=153,000 prompt_cache_key=\"019e74ff-6cf1-7d40-80ce-0c8baa3ad6cf\" id=\"resp_1a2b3c\" outcome=incremental",
    "GPT-5.4 on a Pro account consumed 22 credits and 1% of weekly usage within 4 minutes 24 seconds for 3 prompts.",
    "I burned through 70% of my weekly limit in a single day on the same normal workload.",
    "empty write_stdin polling kept reporting no new output in the background",
    "compaction launched but the context window stayed above 75%, so it compacted again in a loop",
    "the same failed operation kept retrying again with no progress",
    ""
  ].join("\n"), "utf8");

  const result = await buildUsageEvidence([fixture]);
  const markdown = renderUsageEvidenceMarkdown(result);
  const kinds = result.findings.map((finding) => finding.kind);

  assert.equal(result.status, "warn");
  assert.ok(result.summary.snapshots >= 6);
  assert.equal(result.summary.tokenUsageRecords, 1);
  assert.equal(result.summary.cacheRecords, 3);
  assert.equal(result.summary.cacheCollapseEvents, 1);
  assert.equal(result.summary.drainExperiments, 2);
  assert.equal(result.summary.overheadSignals, 3);
  assert.ok(kinds.includes("reset_timestamp_drift"));
  assert.ok(kinds.includes("quota_percentage_jump"));
  assert.ok(kinds.includes("usage_limit_with_remaining_quota"));
  assert.ok(kinds.includes("high_cached_input"));
  assert.ok(kinds.includes("prompt_cache_collapse"));
  assert.ok(kinds.includes("orchestration_overhead_signal"));
  assert.ok(kinds.includes("rapid_quota_drain_experiment"));
  assert.equal(result.receipt.localTokenTotals.cachedInput, 9_077_504);
  assert.equal(result.cacheRecords[0]?.cacheHitPercent, 83.11);
  assert.equal(result.cacheCollapseEvents[0]?.previousCachedInputTokens, 152_448);
  assert.equal(result.cacheCollapseEvents[0]?.cachedInputTokens, 91_520);
  assert.equal(result.cacheCollapseEvents[0]?.dropPercent, 39.97);
  assert.equal(result.drainExperiments[0]?.percentDelta, 1);
  assert.equal(result.drainExperiments[0]?.credits, 22);
  assert.equal(result.drainExperiments[0]?.durationMinutes, 4.4);
  assert.equal(result.drainExperiments[0]?.model, "GPT-5.4");
  assert.equal(result.drainExperiments[0]?.plan, "Pro");
  assert.ok(result.receipt.suspectedCauses.includes("background polling"));
  assert.ok(result.receipt.suspectedCauses.includes("prompt-cache collapse"));
  assert.ok(result.receipt.suspectedCauses.includes("compaction loop"));
  assert.ok(result.receipt.suspectedCauses.includes("rapid quota-drain experiment"));
  assert.ok(result.receipt.suspectedCauses.includes("retry or tool loop"));
  assert.match(markdown, /Codex Usage Evidence/);
  assert.match(markdown, /Usage Receipt/);
  assert.match(markdown, /Prompt Cache Evidence/);
  assert.match(markdown, /Cache Collapse Events/);
  assert.match(markdown, /Drain Experiments/);
  assert.match(markdown, /Overhead Signals/);
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

test("issue-map ranks GitHub issue exports by detected Codex failure classes", async () => {
  const result = await buildIssueMap(["fixtures/github-codex-issues-export.json"], { top: 8 });
  const markdown = renderIssueMapMarkdown(result);
  const kinds = result.summaries.map((summary) => summary.kind);

  assert.equal(result.issueCount, 5);
  assert.ok(result.matchedIssueCount >= 4);
  assert.ok(kinds.includes("codex_token_burn"));
  assert.ok(kinds.includes("codex_remote_compact"));
  assert.ok(kinds.includes("codex_mcp_discovery_mismatch"));
  assert.ok(kinds.includes("codex_usage_bucket_confusion"));
  assert.equal(result.summaries[0]?.kind, "codex_token_burn");
  assert.match(markdown, /GitHub Issue Pain Map/);
  assert.match(markdown, /#14593 Burning tokens very fast/);
  assert.match(markdown, /gh issue list --repo openai\/codex/);
});

test("issue-map fetches repository issues from GitHub-compatible API", async () => {
  const originalFetch = globalThis.fetch;
  const requests: string[] = [];
  globalThis.fetch = async (input, init) => {
    requests.push(String(input));
    assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer test-token");
    return new Response(JSON.stringify([
      {
        number: 14593,
        title: "Burning tokens very fast",
        body: "Codex is burning tokens very fast while idle with weekly usage drain, compaction loops, retries, background polling, and cached input tokens replaying.",
        html_url: "https://github.com/openai/codex/issues/14593",
        labels: [{ name: "bug" }, { name: "rate-limits" }],
        comments: 593,
        reactions: { total_count: 41 },
        updated_at: "2026-06-01T00:00:00Z"
      },
      {
        number: 1,
        title: "Pull request should be ignored",
        body: "This PR mentions token burn but should not count as an issue.",
        html_url: "https://github.com/openai/codex/pull/1",
        pull_request: { html_url: "https://github.com/openai/codex/pull/1" },
        labels: [],
        comments: 100
      }
    ]), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };

  try {
    const result = await buildGithubIssueMap("openai/codex", {
      apiBaseUrl: "https://api.example.test",
      limit: 25,
      state: "open",
      token: "test-token"
    });

    assert.equal(result.sources[0], "github:openai/codex");
    assert.equal(result.issueCount, 1);
    assert.equal(result.matchedIssueCount, 1);
    assert.equal(result.summaries[0]?.kind, "codex_token_burn");
    assert.match(requests[0] ?? "", /state=open/);
    assert.match(requests[0] ?? "", /sort=comments/);
    assert.match(requests[0] ?? "", /direction=desc/);
    assert.match(requests[0] ?? "", /per_page=25/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("process audit packages Codex process polling and high CPU evidence", () => {
  const result = auditProcessEvidenceFromInputs([
    {
      path: "process-notes.md",
      content: [
        "30.05s sample: observed 23 PowerShell/pwsh processes, approximately 0.77/sec, consuming about 48.95 CPU-seconds total.",
        "powershell.exe -NoProfile -NonInteractive -Command \"Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId | ConvertTo-Json -Depth 2\"",
        "~/.codex/process_manager/chat_processes.json had 15 stale entries from previous conversations.",
        "Codex Helper Renderer pid=1234 CPU=92% sustained load after closing the app.",
        ""
      ].join("\n")
    }
  ]);
  const markdown = renderProcessAuditMarkdown(result);

  assert.equal(result.status, "warn");
  assert.equal(result.summary.powershellCimCommands, 2);
  assert.equal(result.summary.highCpuProcesses, 1);
  assert.equal(result.summary.staleProcessManagerSignals, 1);
  assert.equal(result.summary.codexHelperSignals, 1);
  assert.ok(result.findings.some((finding) => finding.kind === "powershell_cim_polling" && finding.severity === "high"));
  assert.ok(result.signals.some((signal) => signal.kind === "high_cpu_process" && signal.cpuPercent === 92));
  assert.match(markdown, /Codex Process Audit/);
  assert.match(markdown, /PowerShell CIM process polling detected/);
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
  const first = await initProject({ cwd, comment: true, sarif: true, issueMapRepo: "openai/codex", issueMapState: "all", issueMapLimit: "75" });
  const second = await initProject({ cwd, comment: true, sarif: true, issueMapRepo: "openai/codex", issueMapState: "all", issueMapLimit: "75" });
  const workflow = await readFile(path.join(cwd, ".github/workflows/agent-learning.yml"), "utf8");
  const doctorWorkflow = await readFile(path.join(cwd, ".github/workflows/codex-readiness.yml"), "utf8");
  const issueRadarWorkflow = await readFile(path.join(cwd, ".github/workflows/codex-issue-radar.yml"), "utf8");

  assert.ok(first.written.includes(".github/workflows/agent-learning.yml"));
  assert.ok(first.written.includes(".github/workflows/codex-readiness.yml"));
  assert.ok(first.written.includes(".github/workflows/codex-issue-radar.yml"));
  assert.ok(second.skipped.includes(".github/workflows/agent-learning.yml"));
  assert.ok(second.skipped.includes(".github/workflows/codex-readiness.yml"));
  assert.ok(second.skipped.includes(".github/workflows/codex-issue-radar.yml"));
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
  assert.match(issueRadarWorkflow, /name: Codex Issue Radar/);
  assert.match(issueRadarWorkflow, /cron: '17 8 \* \* 1'/);
  assert.match(issueRadarWorkflow, /mode: issue-map/);
  assert.match(issueRadarWorkflow, /issue-map-repo: openai\/codex/);
  assert.match(issueRadarWorkflow, /issue-map-state: all/);
  assert.match(issueRadarWorkflow, /issue-map-limit: "75"/);
  assert.match(issueRadarWorkflow, /github-token: \$\{\{ github\.token \}\}/);
});

test("createWorkspaceCheckpoint captures tracked, untracked, and requested ignored files", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "trace-to-skill-checkpoint-"));
  await execFileAsync("git", ["init"], { cwd });
  await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd });
  await execFileAsync("git", ["config", "user.name", "Test User"], { cwd });
  await writeFile(path.join(cwd, "tracked.txt"), "base\n", "utf8");
  await execFileAsync("git", ["add", "tracked.txt"], { cwd });
  await execFileAsync("git", ["commit", "-m", "base"], { cwd });
  await writeFile(path.join(cwd, "tracked.txt"), "changed\n", "utf8");
  await writeFile(path.join(cwd, "note.txt"), "untracked\n", "utf8");
  await writeFile(path.join(cwd, ".gitignore"), ".env\nnode_modules/\n", "utf8");
  await writeFile(path.join(cwd, ".env"), "SECRET=local\n", "utf8");
  await mkdir(path.join(cwd, "node_modules/pkg"), { recursive: true });
  await writeFile(path.join(cwd, "node_modules/pkg/index.js"), "module.exports = 1;\n", "utf8");

  const result = await createWorkspaceCheckpoint(cwd, { output: path.join(cwd, "checkpoint") });
  const markdown = renderWorkspaceCheckpointMarkdown(result);
  const paths = result.files.map((file) => file.path);

  assert.equal(result.includeUntracked, true);
  assert.equal(result.includeIgnored, false);
  assert.ok(paths.includes("tracked.txt"));
  assert.ok(paths.includes("note.txt"));
  assert.equal(paths.includes(".env"), false);
  assert.ok(result.files.every((file) => file.sha256 === undefined || /^[a-f0-9]{64}$/.test(file.sha256)));
  assert.match(await readFile(result.artifacts.status, "utf8"), /tracked\.txt/);
  assert.match(await readFile(result.artifacts.unstagedDiff, "utf8"), /changed/);
  assert.match(markdown, /does not automatically restore files or run destructive commands/);

  const ignored = await createWorkspaceCheckpoint(cwd, {
    output: path.join(cwd, "checkpoint-with-ignored"),
    includeIgnored: true
  });
  const ignoredPaths = ignored.files.map((file) => file.path);

  assert.ok(ignoredPaths.includes(".env"));
  assert.equal(ignoredPaths.some((file) => file.startsWith("node_modules/")), false);
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
  assert.ok(packageJson.keywords?.includes("codex-context-fork"));
  assert.ok(packageJson.keywords?.includes("context-bloat"));
  assert.ok(packageJson.keywords?.includes("codex-subagent-prompt"));
  assert.ok(packageJson.keywords?.includes("subagent-prompt-leak"));
  assert.ok(packageJson.keywords?.includes("codex-usage-bucket"));
  assert.ok(packageJson.keywords?.includes("usage-popover"));
  assert.ok(packageJson.keywords?.includes("sandbox-permission"));
  assert.ok(packageJson.keywords?.includes("codex-connectivity"));
  assert.ok(packageJson.keywords?.includes("codex-remote-compact"));
  assert.ok(packageJson.keywords?.includes("codex-windows-helper"));
  assert.ok(packageJson.keywords?.includes("codex-remote-control"));
  assert.ok(packageJson.keywords?.includes("codex-mcp"));
  assert.ok(packageJson.keywords?.includes("mcp-runtime"));
  assert.ok(packageJson.keywords?.includes("codex-mcp-streamable-http"));
  assert.ok(packageJson.keywords?.includes("streamable-http-mcp"));
  assert.ok(packageJson.keywords?.includes("codex-hooks-runtime"));
  assert.ok(packageJson.keywords?.includes("hooks-json"));
  assert.ok(packageJson.keywords?.includes("codex-file-tree"));
  assert.ok(packageJson.keywords?.includes("codex-navigation"));
  assert.ok(packageJson.keywords?.includes("codex-session"));
  assert.ok(packageJson.keywords?.includes("codex-resume"));
  assert.ok(packageJson.keywords?.includes("codex-history-map"));
  assert.ok(packageJson.keywords?.includes("codex-project-history"));
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
  assert.ok(packageJson.keywords?.includes("codex-process-audit"));
  assert.ok(packageJson.keywords?.includes("powershell-polling"));
  assert.ok(packageJson.keywords?.includes("codex-approval"));
  assert.ok(packageJson.keywords?.includes("mcp-approval"));
  assert.ok(packageJson.keywords?.includes("quota-mismatch"));
  assert.ok(packageJson.keywords?.includes("sensitive-files"));
  assert.ok(packageJson.keywords?.includes("codex-privacy"));
  assert.ok(packageJson.keywords?.includes("codex-rewind"));
  assert.ok(packageJson.keywords?.includes("codex-undo"));
  assert.ok(packageJson.keywords?.includes("workspace-checkpoint"));
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
  await assert.rejects(
    () => initProject({ issueMapRepo: "openai/codex; curl example.com" }),
    /owner\/name/
  );
  await assert.rejects(
    () => initProject({ issueMapLimit: "0" }),
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
  assert.match(action, /issue-map-issues:/);
  assert.match(action, /issue-map-matched:/);
  assert.match(action, /issue-map-top-kind:/);
  assert.match(action, /issue-map-report:/);
  assert.match(action, /issue-map-json:/);
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
  assert.match(action, /steps\.issue-map\.outputs\.top-kind/);
  assert.match(action, /codex-readiness-report\.json/);
  assert.match(action, /agents-lint-report\.json/);
  assert.match(action, /github-context-report\.json/);
  assert.match(action, /trace-to-skill-benchmark\.json/);
  assert.match(action, /trace-to-skill-scorecard\.json/);
  assert.match(action, /trace-to-skill-issue-map\.json/);
  assert.match(action, /mode:/);
  assert.match(action, /issue-map-path:/);
  assert.match(action, /issue-map-repo:/);
  assert.match(action, /issue-map-state:/);
  assert.match(action, /issue-map-limit:/);
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
  assert.match(action, /trace-to-skill GitHub Issue Pain Map/);
  assert.match(action, /trace-to-skill Scorecard/);
  assert.match(action, /node "\$TRACE_TO_SKILL_CLI" doctor/);
  assert.match(action, /node "\$TRACE_TO_SKILL_CLI" lint-agents/);
  assert.match(action, /node "\$TRACE_TO_SKILL_CLI" guard-github-event/);
  assert.match(action, /github\.event_name != 'push'/);
  assert.match(action, /node "\$TRACE_TO_SKILL_CLI" doctor-comment/);
  assert.match(action, /node "\$TRACE_TO_SKILL_CLI" benchmark/);
  assert.match(action, /node "\$TRACE_TO_SKILL_CLI" issue-map/);
  assert.match(action, /issue-map --repo "\$\{\{ inputs\.issue-map-repo \}\}" --state "\$\{\{ inputs\.issue-map-state \}\}" --limit "\$\{\{ inputs\.issue-map-limit \}\}"/);
  assert.match(action, /node "\$TRACE_TO_SKILL_CLI" scorecard/);
  assert.match(action, /node "\$TRACE_TO_SKILL_CLI" scorecard-comment/);
  assert.match(action, /inputs\.mode == 'agents-lint' \|\| inputs\.mode == 'all'/);
  assert.match(action, /inputs\.mode == 'github-context' \|\| inputs\.mode == 'all'/);
  assert.match(action, /inputs\.mode == 'doctor' \|\| inputs\.mode == 'both' \|\| inputs\.mode == 'all'/);
  assert.match(action, /inputs\.mode == 'benchmark' \|\| inputs\.mode == 'all'/);
  assert.match(action, /inputs\.mode == 'issue-map'/);
  assert.match(action, /always\(\) && github\.event_name == 'pull_request' && inputs\.doctor-comment == 'true'/);
  assert.match(action, /always\(\) && github\.event_name == 'pull_request' && inputs\.scorecard-comment == 'true'/);
  assert.match(action, /github\.event_name == 'pull_request' && inputs\.comment == 'true'/);
  assert.match(action, /mode must be one of: traces, agents-lint, github-context, doctor, benchmark, issue-map, both, all/);
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
  assert.match(workflow, /id: issue-map/);
  assert.match(workflow, /mode: issue-map/);
  assert.match(workflow, /issue-map-path: fixtures\/github-codex-issues-export\.json/);
  assert.match(workflow, /steps\.issue-map\.outputs\.issue-map-top-kind/);
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
  const usageEvidenceSchema = JSON.parse(await readFile("schemas/usage-evidence-result.schema.json", "utf8")) as {
    required: string[];
    properties: Record<string, unknown>;
    $defs: Record<string, unknown>;
  };
  const processAuditSchema = JSON.parse(await readFile("schemas/process-audit-result.schema.json", "utf8")) as {
    required: string[];
    properties: Record<string, unknown>;
    $defs: Record<string, unknown>;
  };
  const issueMapSchema = JSON.parse(await readFile("schemas/issue-map-result.schema.json", "utf8")) as {
    required: string[];
    properties: Record<string, unknown>;
    $defs: Record<string, unknown>;
  };
  const checkpointSchema = JSON.parse(await readFile("schemas/workspace-checkpoint-result.schema.json", "utf8")) as {
    required: string[];
    properties: Record<string, unknown>;
    $defs: Record<string, unknown>;
  };
  const sensitiveAuditSchema = JSON.parse(await readFile("schemas/sensitive-audit-result.schema.json", "utf8")) as {
    required: string[];
    properties: Record<string, unknown>;
    $defs: Record<string, unknown>;
  };
  const lspAuditSchema = JSON.parse(await readFile("schemas/lsp-audit-result.schema.json", "utf8")) as {
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
  assert.ok((analysisSchema.$defs.findingKind as { enum: string[] }).enum.includes("codex_context_fork_bloat"));
  assert.ok((analysisSchema.$defs.findingKind as { enum: string[] }).enum.includes("codex_subagent_prompt_leakage"));
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
  assert.ok((analysisSchema.$defs.findingKind as { enum: string[] }).enum.includes("codex_terminal_output_integrity"));
  assert.ok((analysisSchema.$defs.findingKind as { enum: string[] }).enum.includes("codex_subagent_lifecycle"));
  assert.ok((analysisSchema.$defs.findingKind as { enum: string[] }).enum.includes("codex_mcp_discovery_mismatch"));
  assert.ok((analysisSchema.$defs.findingKind as { enum: string[] }).enum.includes("codex_mcp_runtime"));
  assert.ok((analysisSchema.$defs.findingKind as { enum: string[] }).enum.includes("codex_mcp_streamable_http"));
  assert.ok((analysisSchema.$defs.findingKind as { enum: string[] }).enum.includes("codex_hooks_runtime"));
  assert.ok((analysisSchema.$defs.findingKind as { enum: string[] }).enum.includes("codex_plugin_runtime"));
  assert.ok((analysisSchema.$defs.findingKind as { enum: string[] }).enum.includes("codex_file_tree_ui"));
  assert.ok((analysisSchema.$defs.findingKind as { enum: string[] }).enum.includes("codex_session_state"));
  assert.ok((analysisSchema.$defs.findingKind as { enum: string[] }).enum.includes("codex_usage_bucket_confusion"));
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
  assert.deepEqual(configAuditSchema.required, ["generatedAt", "target", "configPath", "globalStatePath", "status", "summary", "values", "findings"]);
  assert.ok(configAuditSchema.properties.values);
  assert.ok(configAuditSchema.$defs.finding);
  assert.deepEqual(diagnosticsBundleSchema.required, ["generatedAt", "target", "outputDir", "status", "privacy", "summary", "recommendedAttachments", "reports"]);
  assert.ok(diagnosticsBundleSchema.properties.privacy);
  assert.ok(diagnosticsBundleSchema.$defs.report);
  assert.deepEqual(pluginAuditSchema.required, ["generatedAt", "target", "status", "environment", "summary", "plugins", "marketplaces", "helperApps", "findings"]);
  assert.ok(pluginAuditSchema.properties.plugins);
  assert.ok(pluginAuditSchema.$defs.finding);
  assert.deepEqual(sessionAuditSchema.required, ["generatedAt", "root", "status", "thresholds", "summary", "files", "threads", "subagentSignals", "stateFiles", "findings"]);
  assert.ok(sessionAuditSchema.properties.summary);
  assert.ok(sessionAuditSchema.properties.threads);
  assert.ok(sessionAuditSchema.properties.subagentSignals);
  assert.ok(sessionAuditSchema.$defs.file);
  assert.ok(sessionAuditSchema.$defs.thread);
  assert.ok(sessionAuditSchema.$defs.subagentSignal);
  assert.ok((sessionAuditSchema.$defs.finding as { properties: { kind: { enum: string[] } } }).properties.kind.enum.includes("unindexed_rollout_thread"));
  assert.ok((sessionAuditSchema.$defs.finding as { properties: { kind: { enum: string[] } } }).properties.kind.enum.includes("bloated_index_title"));
  assert.ok((sessionAuditSchema.$defs.finding as { properties: { kind: { enum: string[] } } }).properties.kind.enum.includes("subagent_lifecycle_signal"));
  assert.deepEqual(usageEvidenceSchema.required, ["generatedAt", "status", "inputs", "summary", "snapshots", "tokenUsage", "cacheRecords", "cacheCollapseEvents", "drainExperiments", "receipt", "findings", "checklist"]);
  assert.ok(usageEvidenceSchema.properties.receipt);
  assert.ok(usageEvidenceSchema.properties.drainExperiments);
  assert.ok(usageEvidenceSchema.properties.cacheRecords);
  assert.ok(usageEvidenceSchema.properties.cacheCollapseEvents);
  assert.ok(usageEvidenceSchema.$defs.receipt);
  assert.ok(usageEvidenceSchema.$defs.cacheRecord);
  assert.ok(usageEvidenceSchema.$defs.cacheCollapseEvent);
  assert.ok(usageEvidenceSchema.$defs.drainExperiment);
  assert.ok(usageEvidenceSchema.$defs.overheadSignal);
  assert.ok((usageEvidenceSchema.$defs.finding as { properties: { kind: { enum: string[] } } }).properties.kind.enum.includes("orchestration_overhead_signal"));
  assert.ok((usageEvidenceSchema.$defs.finding as { properties: { kind: { enum: string[] } } }).properties.kind.enum.includes("rapid_quota_drain_experiment"));
  assert.ok((usageEvidenceSchema.$defs.finding as { properties: { kind: { enum: string[] } } }).properties.kind.enum.includes("prompt_cache_collapse"));
  assert.deepEqual(processAuditSchema.required, ["generatedAt", "status", "inputs", "summary", "signals", "findings", "checklist"]);
  assert.ok(processAuditSchema.properties.signals);
  assert.ok(processAuditSchema.$defs.signal);
  assert.ok((processAuditSchema.$defs.kind as { enum: string[] }).enum.includes("powershell_cim_polling"));
  assert.deepEqual(issueMapSchema.required, ["generatedAt", "sources", "issueCount", "matchedIssueCount", "unmatchedIssueCount", "summaries", "unmatchedIssues"]);
  assert.ok(issueMapSchema.properties.summaries);
  assert.ok(issueMapSchema.$defs.summary);
  assert.ok(issueMapSchema.$defs.example);
  assert.deepEqual(checkpointSchema.required, ["generatedAt", "root", "outputDir", "includeUntracked", "includeIgnored", "summary", "files", "artifacts"]);
  assert.ok(checkpointSchema.properties.artifacts);
  assert.ok(checkpointSchema.$defs.file);
  assert.deepEqual(sensitiveAuditSchema.required, ["generatedAt", "root", "status", "summary", "findings", "recommendedExcludes", "ignoreFiles"]);
  assert.ok(sensitiveAuditSchema.properties.recommendedExcludes);
  assert.ok(sensitiveAuditSchema.properties.ignoreFiles);
  assert.ok(sensitiveAuditSchema.$defs.ignoreFile);
  assert.ok((sensitiveAuditSchema.$defs.finding as { properties: { kind: { enum: string[] } } }).properties.kind.enum.includes("env_file"));
  assert.ok((sensitiveAuditSchema.$defs.finding as { properties: { kind: { enum: string[] } } }).properties.kind.enum.includes("sensitive_symlink"));
  assert.deepEqual(lspAuditSchema.required, ["generatedAt", "root", "status", "summary", "languages", "recommendedInstalls"]);
  assert.ok(lspAuditSchema.properties.recommendedInstalls);
  assert.ok(lspAuditSchema.$defs.language);
  assert.ok(lspAuditSchema.$defs.server);
  assert.deepEqual(redactSchema.required, ["generatedAt", "files", "totals"]);
  assert.ok(redactSchema.properties.files);
  assert.ok(redactSchema.$defs.redactedFile);
});

test("benchmark covers public fixture failure classes", async () => {
  const benchmark = await runBenchmark();
  const markdown = renderBenchmarkMarkdown(benchmark);

  assert.equal(benchmark.passed, true);
  assert.equal(benchmark.cases.length, 38);
  assert.ok(benchmark.cases.some((item) => item.id === "clean-validated-run" && item.score === 100));
  assert.ok(benchmark.cases.some((item) => item.id === "failed-workflow" && item.detectedKinds.includes("test_failure")));
  assert.ok(benchmark.cases.some((item) => item.id === "context-compaction" && item.detectedKinds.includes("context_compaction")));
  assert.ok(benchmark.cases.some((item) => item.id === "codex-context-fork-bloat" && item.detectedKinds.includes("codex_context_fork_bloat")));
  assert.ok(benchmark.cases.some((item) => item.id === "codex-subagent-prompt-leakage" && item.detectedKinds.includes("codex_subagent_prompt_leakage")));
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
  assert.ok(benchmark.cases.some((item) => item.id === "codex-terminal-output-integrity" && item.detectedKinds.includes("codex_terminal_output_integrity")));
  assert.ok(benchmark.cases.some((item) => item.id === "codex-subagent-lifecycle" && item.detectedKinds.includes("codex_subagent_lifecycle")));
  assert.ok(benchmark.cases.some((item) => item.id === "codex-mcp-runtime" && item.detectedKinds.includes("codex_mcp_runtime")));
  assert.ok(benchmark.cases.some((item) => item.id === "codex-mcp-streamable-http" && item.detectedKinds.includes("codex_mcp_streamable_http")));
  assert.ok(benchmark.cases.some((item) => item.id === "codex-hooks-runtime" && item.detectedKinds.includes("codex_hooks_runtime")));
  assert.ok(benchmark.cases.some((item) => item.id === "codex-mcp-discovery-mismatch" && item.detectedKinds.includes("codex_mcp_discovery_mismatch")));
  assert.ok(benchmark.cases.some((item) => item.id === "codex-plugin-runtime" && item.detectedKinds.includes("codex_plugin_runtime")));
  assert.ok(benchmark.cases.some((item) => item.id === "codex-file-tree-ui" && item.detectedKinds.includes("codex_file_tree_ui")));
  assert.ok(benchmark.cases.some((item) => item.id === "codex-session-state" && item.detectedKinds.includes("codex_session_state")));
  assert.ok(benchmark.cases.some((item) => item.id === "codex-usage-bucket-confusion" && item.detectedKinds.includes("codex_usage_bucket_confusion")));
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
  assert.equal(scorecard.benchmark.cases, 38);
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
  assert.equal(brief.scorecard.benchmarkCases, 38);
  assert.equal(brief.packageName, "trace-to-skill");
  assert.equal(brief.packageVersion, "0.1.88");
  assert.equal(brief.license, "Apache-2.0");
  assert.ok(brief.repository?.includes("github.com/grnbtqdbyx-create/trace-to-skill"));
  assert.ok(brief.qualification.max500.length <= 500);
  assert.ok(brief.apiCredits.max500.length <= 500);
  assert.match(markdown, /OpenAI OSS Brief/);
  assert.match(markdown, /Why This Repository Qualifies/);
  assert.match(markdown, /500-Character Version/);
  assert.match(markdown, /npx trace-to-skill@0\.1\.88/);
  assert.match(markdown, /Weekly Codex Issue Radar/);
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
