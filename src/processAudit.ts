import { loadTraceInputs } from "./parsers.js";
import type { Evidence, TraceInput } from "./types.js";

export type ProcessAuditStatus = "pass" | "warn";

export type ProcessAuditSignalKind =
  | "powershell_cim_polling"
  | "high_cpu_process"
  | "stale_process_manager_entries"
  | "codex_helper_runaway";

export interface ProcessAuditSignal {
  kind: ProcessAuditSignalKind;
  source: string;
  line: number;
  processName?: string;
  pid?: number;
  cpuPercent?: number;
  cpuSeconds?: number;
  ratePerSecond?: number;
  count?: number;
  excerpt: string;
}

export interface ProcessAuditFinding {
  kind: ProcessAuditSignalKind;
  severity: "medium" | "high";
  title: string;
  why: string;
  evidence: Evidence[];
  nextStep: string;
}

export interface ProcessAuditResult {
  generatedAt: string;
  status: ProcessAuditStatus;
  inputs: string[];
  summary: {
    signals: number;
    powershellCimCommands: number;
    highCpuProcesses: number;
    staleProcessManagerSignals: number;
    codexHelperSignals: number;
  };
  signals: ProcessAuditSignal[];
  findings: ProcessAuditFinding[];
  checklist: string[];
}

export async function auditProcessEvidence(targets: string[]): Promise<ProcessAuditResult> {
  return auditProcessEvidenceFromInputs(await loadTraceInputs(targets));
}

export function auditProcessEvidenceFromInputs(inputs: TraceInput[]): ProcessAuditResult {
  const signals: ProcessAuditSignal[] = [];

  for (const input of inputs) {
    const lines = input.content.split(/\r?\n/);
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const excerpt = compactExcerpt(line);
      if (!excerpt) {
        return;
      }

      signals.push(...parseProcessSignals(input.path, lineNumber, excerpt));
    });
  }

  const findings = buildFindings(signals);
  return {
    generatedAt: new Date().toISOString(),
    status: findings.length > 0 ? "warn" : "pass",
    inputs: inputs.map((input) => input.path),
    summary: {
      signals: signals.length,
      powershellCimCommands: signals.filter((signal) => signal.kind === "powershell_cim_polling").length,
      highCpuProcesses: signals.filter((signal) => signal.kind === "high_cpu_process").length,
      staleProcessManagerSignals: signals.filter((signal) => signal.kind === "stale_process_manager_entries").length,
      codexHelperSignals: signals.filter((signal) => signal.kind === "codex_helper_runaway").length
    },
    signals,
    findings,
    checklist: [
      "Attach this report instead of raw full process dumps when filing public issues.",
      "Include Codex app/CLI/extension version, OS, terminal or IDE, model, and whether Browser/Chrome/Computer Use tools were active.",
      "For Windows polling reports, include a 30-60 second sample window, child process count, approximate spawn rate, CPU-seconds, and at least one redacted command line.",
      "For macOS or VS Code high-CPU reports, include process names, CPU percent samples, memory if available, and whether quitting Codex clears the load.",
      "Do not post unrelated command lines, usernames, project paths, environment variables, or customer data from full process snapshots."
    ]
  };
}

export function renderProcessAuditMarkdown(result: ProcessAuditResult): string {
  const lines = [
    "# trace-to-skill Codex Process Audit",
    "",
    `Status: **${result.status}**`,
    "",
    "## Summary",
    "",
    `- Inputs: ${result.inputs.length}`,
    `- Signals: ${result.summary.signals}`,
    `- PowerShell CIM polling commands: ${result.summary.powershellCimCommands}`,
    `- High-CPU process signals: ${result.summary.highCpuProcesses}`,
    `- Stale process-manager signals: ${result.summary.staleProcessManagerSignals}`,
    `- Codex helper signals: ${result.summary.codexHelperSignals}`,
    ""
  ];

  if (result.findings.length > 0) {
    lines.push("## Findings", "");
    for (const finding of result.findings) {
      lines.push(`### ${finding.title}`, "");
      lines.push(`- Severity: ${finding.severity}`);
      lines.push(`- Why: ${finding.why}`);
      lines.push(`- Next step: ${finding.nextStep}`);
      for (const evidence of finding.evidence.slice(0, 4)) {
        lines.push(`- Evidence: ${evidence.file}:${evidence.line} - ${evidence.excerpt}`);
      }
      lines.push("");
    }
  }

  lines.push("## Signals", "");
  if (result.signals.length === 0) {
    lines.push("_No Codex process health signals found._", "");
  } else {
    lines.push("| Kind | Process | PID | CPU % | CPU seconds | Rate/sec | Count | Source | Excerpt |");
    lines.push("| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |");
    for (const signal of result.signals.slice(0, 25)) {
      lines.push([
        signal.kind,
        signal.processName ?? "",
        formatNumber(signal.pid),
        formatNumber(signal.cpuPercent),
        formatNumber(signal.cpuSeconds),
        formatNumber(signal.ratePerSecond),
        formatNumber(signal.count),
        `${signal.source}:${signal.line}`,
        signal.excerpt
      ].map(escapeCell).join(" | ").replace(/^/, "| ").replace(/$/, " |"));
    }
    lines.push("");
  }

  lines.push("## Checklist", "");
  for (const item of result.checklist) {
    lines.push(`- ${item}`);
  }
  lines.push("");

  return lines.join("\n");
}

function parseProcessSignals(source: string, line: number, excerpt: string): ProcessAuditSignal[] {
  const signals: ProcessAuditSignal[] = [];
  const processName = extractProcessName(excerpt);
  const pid = extractNumber(excerpt, /\b(?:pid|processid|process id)\s*[:=]?\s*(\d{2,8})\b/i);
  const cpuPercent = extractNumber(excerpt, /\b(?:cpu|percentprocessortime|percent processor time)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*%?\b/i) ?? extractNumber(excerpt, /\b(\d+(?:\.\d+)?)\s*%\s*(?:cpu|processor)\b/i);
  const cpuSeconds = extractNumber(excerpt, /\b(\d+(?:\.\d+)?)\s*CPU-?seconds?\b/i);
  const ratePerSecond = extractNumber(excerpt, /\b(\d+(?:\.\d+)?)\s*(?:\/|per)\s*(?:sec|second)\b/i);
  const count = extractNumber(excerpt, /\b(\d+)\s*(?:PowerShell|powershell|pwsh|process(?:es)?|entries)\b/i);

  if (/\b(?:powershell|pwsh)(?:\.exe)?\b/i.test(excerpt) && (/\b(?:Get-CimInstance|Win32_Process|Win32_PerfFormattedData_PerfProc_Process|ConvertTo-Json)\b/i.test(excerpt) || cpuSeconds !== undefined || ratePerSecond !== undefined)) {
    signals.push({ kind: "powershell_cim_polling", source, line, processName: processName ?? "powershell.exe", pid, cpuPercent, cpuSeconds, ratePerSecond, count, excerpt });
  }

  if (/\b(?:chat_processes\.json|process_manager)\b/i.test(excerpt) && /\b(?:stale|orphan|old|leftover|entries)\b/i.test(excerpt)) {
    signals.push({ kind: "stale_process_manager_entries", source, line, processName, pid, count, excerpt });
  }

  if (processName && /(?:Codex|Code Helper|Renderer|shell-snapshot|powershell|pwsh)/i.test(processName) && (isHighCpu(cpuPercent) || /\b(?:high CPU|runaway|overheating|hot|sustained load)\b/i.test(excerpt))) {
    signals.push({ kind: "high_cpu_process", source, line, processName, pid, cpuPercent, cpuSeconds, ratePerSecond, count, excerpt });
  }

  if (processName && /(?:Codex Helper|Code Helper|Renderer|shell-snapshot)/i.test(processName) && /\b(?:high CPU|runaway|orphan|leak|sustained|GPU|memory|RAM|CPU)\b/i.test(excerpt)) {
    signals.push({ kind: "codex_helper_runaway", source, line, processName, pid, cpuPercent, cpuSeconds, ratePerSecond, count, excerpt });
  }

  return dedupeSignals(signals);
}

function buildFindings(signals: ProcessAuditSignal[]): ProcessAuditFinding[] {
  const findings: ProcessAuditFinding[] = [];
  const byKind = new Map<ProcessAuditSignalKind, ProcessAuditSignal[]>();
  for (const signal of signals) {
    byKind.set(signal.kind, [...(byKind.get(signal.kind) ?? []), signal]);
  }

  const powershell = byKind.get("powershell_cim_polling") ?? [];
  if (powershell.length > 0) {
    findings.push({
      kind: "powershell_cim_polling",
      severity: powershell.some((signal) => (signal.ratePerSecond ?? 0) >= 0.5 || (signal.cpuSeconds ?? 0) >= 10 || (signal.count ?? 0) >= 10) ? "high" : "medium",
      title: "PowerShell CIM process polling detected",
      why: "Codex Desktop appears to be repeatedly launching PowerShell/pwsh for Win32_Process or PerfProc process scans, which can create sustained CPU load on Windows.",
      evidence: powershell.map(toEvidence),
      nextStep: "Attach a 30-60 second sample with spawn count, approximate rate, CPU-seconds, parent Codex.exe PID, and one redacted command line."
    });
  }

  addFinding(findings, byKind, "high_cpu_process", "High-CPU Codex-related process signal", "A Codex, helper, renderer, shell snapshot, or PowerShell process appears in a high-CPU sample.", "Attach repeated samples and note whether quitting Codex, disabling Browser/Computer Use, or clearing stale process-manager state changes the load.");
  addFinding(findings, byKind, "stale_process_manager_entries", "Stale process-manager state detected", "Local process-manager state appears to contain stale or orphaned conversation process entries.", "Include counts only; avoid posting full process-manager files publicly because command lines can include local paths.");
  addFinding(findings, byKind, "codex_helper_runaway", "Codex helper or renderer runaway signal", "A Codex helper, renderer, or shell snapshot process appears in a resource-leak style sample.", "Capture process name, PID, CPU/memory samples, and whether the helper exits after closing the app or conversation.");

  return findings;
}

function addFinding(findings: ProcessAuditFinding[], byKind: Map<ProcessAuditSignalKind, ProcessAuditSignal[]>, kind: ProcessAuditSignalKind, title: string, why: string, nextStep: string): void {
  const signals = byKind.get(kind) ?? [];
  if (signals.length === 0) {
    return;
  }

  findings.push({
    kind,
    severity: signals.some((signal) => isHighCpu(signal.cpuPercent) || (signal.cpuSeconds ?? 0) >= 10) ? "high" : "medium",
    title,
    why,
    evidence: signals.map(toEvidence),
    nextStep
  });
}

function toEvidence(signal: ProcessAuditSignal): Evidence {
  return { file: signal.source, line: signal.line, excerpt: signal.excerpt };
}

function extractProcessName(excerpt: string): string | undefined {
  const quoted = excerpt.match(/"([^"]*(?:Codex|Code Helper|Renderer|shell-snapshot|powershell|pwsh)[^"]*)"/i)?.[1];
  if (quoted) {
    return quoted;
  }

  return excerpt.match(/\b(Codex Helper(?: Renderer)?|Code Helper(?: Renderer)?|Codex(?:\.exe)?|shell-snapshot|powershell(?:\.exe)?|pwsh(?:\.exe)?)\b/i)?.[1];
}

function extractNumber(excerpt: string, pattern: RegExp): number | undefined {
  const match = excerpt.match(pattern);
  if (!match) {
    return undefined;
  }

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isHighCpu(value: number | undefined): boolean {
  return value !== undefined && value >= 50;
}

function dedupeSignals(signals: ProcessAuditSignal[]): ProcessAuditSignal[] {
  const seen = new Set<string>();
  return signals.filter((signal) => {
    const key = `${signal.kind}:${signal.source}:${signal.line}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function compactExcerpt(line: string): string {
  return line.replace(/\s+/g, " ").trim().slice(0, 500);
}

function formatNumber(value: number | undefined): string {
  return value === undefined ? "" : String(value);
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}
