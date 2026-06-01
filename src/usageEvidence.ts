import { loadTraceInputs } from "./parsers.js";
import type { Evidence, TraceInput } from "./types.js";

export type UsageEvidenceStatus = "pass" | "warn";

export type UsageEvidenceFindingKind =
  | "reset_timestamp_drift"
  | "quota_percentage_jump"
  | "usage_limit_with_remaining_quota"
  | "high_cached_input"
  | "prompt_cache_collapse"
  | "high_total_tokens"
  | "orchestration_overhead_signal"
  | "rapid_quota_drain_experiment";

export interface UsageSnapshot {
  source: string;
  line: number;
  window: string;
  percent?: number;
  resetAt?: string;
  sampleTime?: string;
  excerpt: string;
}

export interface TokenUsageRecord {
  source: string;
  line: number;
  total?: number;
  input?: number;
  cachedInput?: number;
  output?: number;
  reasoning?: number;
  excerpt: string;
}

export interface PromptCacheRecord {
  source: string;
  line: number;
  inputTokens?: number;
  cachedInputTokens?: number;
  cacheHitPercent?: number;
  promptCacheKey?: string;
  responseId?: string;
  transport?: string;
  outcome?: string;
  excerpt: string;
}

export interface PromptCacheCollapseEvent {
  source: string;
  line: number;
  previousLine: number;
  inputTokens?: number;
  cachedInputTokens: number;
  previousCachedInputTokens: number;
  dropPercent: number;
  promptCacheKey?: string;
  responseId?: string;
  previousResponseId?: string;
  excerpt: string;
}

export type UsageAttributionBucket =
  | "quota_window_accounting"
  | "rapid_drain_repro"
  | "prompt_cache_collapse"
  | "large_cached_context_replay"
  | "background_polling"
  | "compaction_loop"
  | "retry_or_tool_loop"
  | "subagent_fanout"
  | "idle_background_drain"
  | "missing_evidence";

export interface UsageAttribution {
  bucket: UsageAttributionBucket;
  confidence: "low" | "medium" | "high";
  signals: number;
  evidence: Evidence[];
  nextEvidence: string;
}

export type UsageOverheadKind =
  | "background_polling"
  | "compaction_loop"
  | "retry_or_tool_loop"
  | "subagent_fanout"
  | "idle_drain";

export interface UsageOverheadSignal {
  kind: UsageOverheadKind;
  source: string;
  line: number;
  excerpt: string;
}

export interface UsageDrainExperiment {
  source: string;
  line: number;
  window: string;
  percentDelta?: number;
  credits?: number;
  promptCount?: number;
  durationMinutes?: number;
  model?: string;
  plan?: string;
  excerpt: string;
}

export interface UsageReceipt {
  quotaWindows: Array<{
    window: string;
    samples: number;
    firstPercent?: number;
    lastPercent?: number;
    resetValues: string[];
  }>;
  localTokenTotals: {
    total?: number;
    input?: number;
    cachedInput?: number;
    output?: number;
    reasoning?: number;
  };
  drainExperiments: UsageDrainExperiment[];
  overheadSignals: UsageOverheadSignal[];
  cacheCollapseEvents: PromptCacheCollapseEvent[];
  suspectedCauses: string[];
  attribution: UsageAttribution[];
}

export interface UsageEvidenceFinding {
  kind: UsageEvidenceFindingKind;
  severity: "medium" | "high";
  title: string;
  why: string;
  evidence: Evidence[];
  nextStep: string;
}

export interface UsageEvidenceResult {
  generatedAt: string;
  status: UsageEvidenceStatus;
  inputs: string[];
  summary: {
    snapshots: number;
    tokenUsageRecords: number;
    usageLimitSignals: number;
    resetDriftWindows: number;
    highCachedInputRecords: number;
    cacheRecords: number;
    cacheCollapseEvents: number;
    drainExperiments: number;
    overheadSignals: number;
  };
  snapshots: UsageSnapshot[];
  tokenUsage: TokenUsageRecord[];
  cacheRecords: PromptCacheRecord[];
  cacheCollapseEvents: PromptCacheCollapseEvent[];
  drainExperiments: UsageDrainExperiment[];
  receipt: UsageReceipt;
  findings: UsageEvidenceFinding[];
  checklist: string[];
}

interface UsageLimitSignal {
  source: string;
  line: number;
  excerpt: string;
}

export async function buildUsageEvidence(targets: string[]): Promise<UsageEvidenceResult> {
  return buildUsageEvidenceFromInputs(await loadTraceInputs(targets));
}

export function buildUsageEvidenceFromInputs(inputs: TraceInput[]): UsageEvidenceResult {
  const snapshots: UsageSnapshot[] = [];
  const tokenUsage: TokenUsageRecord[] = [];
  const cacheRecords: PromptCacheRecord[] = [];
  const usageLimitSignals: UsageLimitSignal[] = [];
  const overheadSignals: UsageOverheadSignal[] = [];
  const drainExperiments: UsageDrainExperiment[] = [];

  for (const input of inputs) {
    const lines = input.content.split(/\r?\n/);
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const excerpt = compactExcerpt(line);
      if (!excerpt) {
        return;
      }

      const jsonSnapshots = parseJsonUsage(input.path, lineNumber, excerpt);
      snapshots.push(...jsonSnapshots);
      snapshots.push(...parseMarkdownUsageRows(input.path, lineNumber, excerpt));
      const naturalSnapshot = jsonSnapshots.length > 0 ? undefined : parseNaturalUsageSnapshot(input.path, lineNumber, excerpt);
      if (naturalSnapshot) {
        snapshots.push(naturalSnapshot);
      }

      const tokenRecord = parseTokenUsage(input.path, lineNumber, excerpt);
      if (tokenRecord) {
        tokenUsage.push(tokenRecord);
      }

      const cacheRecord = parsePromptCacheRecord(input.path, lineNumber, excerpt);
      if (cacheRecord) {
        cacheRecords.push(cacheRecord);
      }

      const overheadSignal = parseOverheadSignal(input.path, lineNumber, excerpt);
      if (overheadSignal) {
        overheadSignals.push(overheadSignal);
      }

      const drainExperiment = parseDrainExperiment(input.path, lineNumber, excerpt);
      if (drainExperiment) {
        drainExperiments.push(drainExperiment);
      }

      if (/\b(hit|reached|exceeded).{0,80}\b(usage|rate|quota|weekly|5-hour|5 hour|limit)\b/i.test(excerpt) || /you(?:'|')?ve hit your usage limit/i.test(excerpt)) {
        usageLimitSignals.push({ source: input.path, line: lineNumber, excerpt });
      }
    });
  }

  const cacheCollapseEvents = findPromptCacheCollapseEvents(cacheRecords);
  const findings = buildFindings(snapshots, tokenUsage, cacheCollapseEvents, usageLimitSignals, overheadSignals, drainExperiments);
  const receipt = buildReceipt(snapshots, tokenUsage, cacheCollapseEvents, overheadSignals, usageLimitSignals, drainExperiments);
  return {
    generatedAt: new Date().toISOString(),
    status: findings.length > 0 ? "warn" : "pass",
    inputs: inputs.map((input) => input.path),
    summary: {
      snapshots: snapshots.length,
      tokenUsageRecords: tokenUsage.length,
      usageLimitSignals: usageLimitSignals.length,
      resetDriftWindows: findings.filter((finding) => finding.kind === "reset_timestamp_drift").length,
      highCachedInputRecords: findings.filter((finding) => finding.kind === "high_cached_input").length,
      cacheRecords: cacheRecords.length,
      cacheCollapseEvents: cacheCollapseEvents.length,
      drainExperiments: drainExperiments.length,
      overheadSignals: overheadSignals.length
    },
    snapshots,
    tokenUsage,
    cacheRecords,
    cacheCollapseEvents,
    drainExperiments,
    receipt,
    findings,
    checklist: [
      "Attach this report instead of raw private transcripts.",
      "Add plan/workspace, Codex app or CLI version, OS, model, reasoning/speed mode, and whether fast mode or subagents were enabled.",
      "Capture before/after `/status` output, usage dashboard timestamp, and timezone for every reset value.",
      "Note whether a prompt was running during reset and whether an outage or compensation reset was announced.",
      "Include token totals when available: total, input, cached input, output, and reasoning.",
      "For prompt-cache reports, include adjacent request rows with input_tokens, cached_input_tokens or cached_tokens, prompt_cache_key, response id, transport, and reconnect/outcome notes.",
      "If reporting a sudden burn regression, add a tiny experiment row with model, plan, prompt count, elapsed time, percent or credits consumed, and before/after usage state.",
      "Separate quota-window percentage changes from local token totals and orchestration overhead signals.",
      "Add one minimal reproduction or polling table that shows the percentage and reset timestamp changing."
    ]
  };
}

export function renderUsageEvidenceMarkdown(result: UsageEvidenceResult): string {
  const lines = [
    "# trace-to-skill Codex Usage Evidence",
    "",
    `Status: **${result.status}**`,
    "",
    "## Summary",
    "",
    `- Inputs: ${result.inputs.length}`,
    `- Usage snapshots: ${result.summary.snapshots}`,
    `- Token usage records: ${result.summary.tokenUsageRecords}`,
    `- Prompt cache records: ${result.summary.cacheRecords}`,
    `- Prompt cache collapse events: ${result.summary.cacheCollapseEvents}`,
    `- Usage limit signals: ${result.summary.usageLimitSignals}`,
    `- Reset drift windows: ${result.summary.resetDriftWindows}`,
    `- High cached-input records: ${result.summary.highCachedInputRecords}`,
    `- Drain experiments: ${result.summary.drainExperiments}`,
    `- Overhead signals: ${result.summary.overheadSignals}`,
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

  lines.push("## Usage Receipt", "");
  lines.push("This section separates backend quota-window evidence, local token totals, and orchestration-overhead signals so reports do not collapse every symptom into one number.", "");
  lines.push("### Quota Windows", "");
  if (result.receipt.quotaWindows.length === 0) {
    lines.push("_No quota-window snapshots found._", "");
  } else {
    lines.push("| Window | Samples | First Percent | Last Percent | Reset Values |");
    lines.push("| --- | ---: | ---: | ---: | --- |");
    for (const window of result.receipt.quotaWindows) {
      lines.push([
        escapeCell(window.window),
        String(window.samples),
        formatNumber(window.firstPercent),
        formatNumber(window.lastPercent),
        escapeCell(window.resetValues.join(", "))
      ].join(" | ").replace(/^/, "| ").replace(/$/, " |"));
    }
    lines.push("");
  }

  lines.push("### Local Token Totals", "");
  lines.push("| Total | Input | Cached Input | Output | Reasoning |");
  lines.push("| ---: | ---: | ---: | ---: | ---: |");
  lines.push([
    formatNumber(result.receipt.localTokenTotals.total),
    formatNumber(result.receipt.localTokenTotals.input),
    formatNumber(result.receipt.localTokenTotals.cachedInput),
    formatNumber(result.receipt.localTokenTotals.output),
    formatNumber(result.receipt.localTokenTotals.reasoning)
  ].join(" | ").replace(/^/, "| ").replace(/$/, " |"));
  lines.push("");

  lines.push("### Drain Experiments", "");
  if (result.receipt.drainExperiments.length === 0) {
    lines.push("_No rapid quota-drain experiment rows found._", "");
  } else {
    lines.push("| Source | Line | Window | Percent/Credits | Duration | Prompts | Model | Plan |");
    lines.push("| --- | ---: | --- | --- | ---: | ---: | --- | --- |");
    for (const experiment of result.receipt.drainExperiments.slice(0, 12)) {
      const amount = [
        experiment.percentDelta === undefined ? undefined : `${experiment.percentDelta}%`,
        experiment.credits === undefined ? undefined : `${experiment.credits} credits`
      ].filter(Boolean).join(" / ");
      lines.push([
        escapeCell(experiment.source),
        String(experiment.line),
        escapeCell(experiment.window),
        escapeCell(amount),
        formatNumber(experiment.durationMinutes),
        formatNumber(experiment.promptCount),
        escapeCell(experiment.model ?? ""),
        escapeCell(experiment.plan ?? "")
      ].join(" | ").replace(/^/, "| ").replace(/$/, " |"));
    }
    lines.push("");
  }

  lines.push("### Overhead Signals", "");
  if (result.receipt.overheadSignals.length === 0) {
    lines.push("_No background polling, compaction loop, retry/tool loop, subagent fan-out, or idle-drain signals found._", "");
  } else {
    for (const signal of result.receipt.overheadSignals.slice(0, 12)) {
      lines.push(`- **${signal.kind}**: ${signal.source}:${signal.line} - ${signal.excerpt}`);
    }
    lines.push("");
  }

  lines.push("### Cache Collapse Events", "");
  if (result.receipt.cacheCollapseEvents.length === 0) {
    lines.push("_No adjacent prompt-cache collapse events found._", "");
  } else {
    lines.push("| Source | Line | Previous Line | Prompt Cache Key | Cached Input | Previous Cached Input | Drop | Response | Previous Response |");
    lines.push("| --- | ---: | ---: | --- | ---: | ---: | ---: | --- | --- |");
    for (const event of result.receipt.cacheCollapseEvents.slice(0, 12)) {
      lines.push([
        escapeCell(event.source),
        String(event.line),
        String(event.previousLine),
        escapeCell(event.promptCacheKey ?? ""),
        formatNumber(event.cachedInputTokens),
        formatNumber(event.previousCachedInputTokens),
        `${event.dropPercent}%`,
        escapeCell(event.responseId ?? ""),
        escapeCell(event.previousResponseId ?? "")
      ].join(" | ").replace(/^/, "| ").replace(/$/, " |"));
    }
    lines.push("");
  }

  lines.push("### Attribution Triage", "");
  if (result.receipt.attribution.length === 0) {
    lines.push("_No attribution buckets inferred from the supplied evidence._", "");
  } else {
    lines.push("| Bucket | Confidence | Signals | Next Evidence |");
    lines.push("| --- | --- | ---: | --- |");
    for (const item of result.receipt.attribution) {
      lines.push([
        item.bucket,
        item.confidence,
        String(item.signals),
        escapeCell(item.nextEvidence)
      ].join(" | ").replace(/^/, "| ").replace(/$/, " |"));
      for (const evidence of item.evidence.slice(0, 2)) {
        lines.push(`  - Evidence: ${evidence.file}:${evidence.line} - ${evidence.excerpt}`);
      }
    }
    lines.push("");
  }

  lines.push("### Suspected Cause Buckets", "");
  if (result.receipt.suspectedCauses.length === 0) {
    lines.push("_No cause bucket inferred from the supplied evidence._", "");
  } else {
    for (const cause of result.receipt.suspectedCauses) {
      lines.push(`- ${cause}`);
    }
    lines.push("");
  }

  lines.push("## Usage Snapshots", "");
  if (result.snapshots.length === 0) {
    lines.push("_No usage percentage or reset snapshots found._", "");
  } else {
    lines.push("| Source | Line | Window | Percent | Reset At | Sample Time |");
    lines.push("| --- | ---: | --- | ---: | --- | --- |");
    for (const snapshot of result.snapshots.slice(0, 30)) {
      lines.push([
        escapeCell(snapshot.source),
        String(snapshot.line),
        escapeCell(snapshot.window),
        snapshot.percent === undefined ? "" : String(snapshot.percent),
        escapeCell(snapshot.resetAt ?? ""),
        escapeCell(snapshot.sampleTime ?? "")
      ].join(" | ").replace(/^/, "| ").replace(/$/, " |"));
    }
    lines.push("");
  }

  lines.push("## Prompt Cache Evidence", "");
  if (result.cacheRecords.length === 0) {
    lines.push("_No prompt-cache request records found._", "");
  } else {
    lines.push("| Source | Line | Input Tokens | Cached Input Tokens | Cache Hit | Prompt Cache Key | Response | Transport | Outcome |");
    lines.push("| --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- |");
    for (const record of result.cacheRecords.slice(0, 30)) {
      lines.push([
        escapeCell(record.source),
        String(record.line),
        formatNumber(record.inputTokens),
        formatNumber(record.cachedInputTokens),
        record.cacheHitPercent === undefined ? "" : `${record.cacheHitPercent}%`,
        escapeCell(record.promptCacheKey ?? ""),
        escapeCell(record.responseId ?? ""),
        escapeCell(record.transport ?? ""),
        escapeCell(record.outcome ?? "")
      ].join(" | ").replace(/^/, "| ").replace(/$/, " |"));
    }
    lines.push("");
  }

  lines.push("## Token Usage", "");
  if (result.tokenUsage.length === 0) {
    lines.push("_No token usage totals found._", "");
  } else {
    lines.push("| Source | Line | Total | Input | Cached Input | Output | Reasoning |");
    lines.push("| --- | ---: | ---: | ---: | ---: | ---: | ---: |");
    for (const record of result.tokenUsage.slice(0, 30)) {
      lines.push([
        escapeCell(record.source),
        String(record.line),
        formatNumber(record.total),
        formatNumber(record.input),
        formatNumber(record.cachedInput),
        formatNumber(record.output),
        formatNumber(record.reasoning)
      ].join(" | ").replace(/^/, "| ").replace(/$/, " |"));
    }
    lines.push("");
  }

  lines.push("## Rapid Drain Experiments", "");
  if (result.drainExperiments.length === 0) {
    lines.push("_No rapid quota-drain experiment rows found._", "");
  } else {
    for (const experiment of result.drainExperiments.slice(0, 20)) {
      const parts = [
        `${experiment.window} window`,
        experiment.percentDelta === undefined ? undefined : `${experiment.percentDelta}%`,
        experiment.credits === undefined ? undefined : `${experiment.credits} credits`,
        experiment.durationMinutes === undefined ? undefined : `${experiment.durationMinutes} min`,
        experiment.promptCount === undefined ? undefined : `${experiment.promptCount} prompts`,
        experiment.model,
        experiment.plan
      ].filter(Boolean);
      lines.push(`- ${experiment.source}:${experiment.line} - ${parts.join(", ")} - ${experiment.excerpt}`);
    }
    lines.push("");
  }

  lines.push("## OpenAI/Codex Issue Checklist", "");
  for (const item of result.checklist) {
    lines.push(`- ${item}`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function parseJsonUsage(source: string, line: number, excerpt: string): UsageSnapshot[] {
  if (!excerpt.startsWith("{")) {
    return [];
  }

  try {
    const value = JSON.parse(excerpt) as Record<string, unknown>;
    const direct = snapshotFromObject(source, line, excerpt, value);
    const limits = Array.isArray(value.limits) ? value.limits : Array.isArray(value.rate_limits) ? value.rate_limits : [];
    const nested = limits
      .map((item) => item && typeof item === "object" ? snapshotFromObject(source, line, excerpt, item as Record<string, unknown>) : undefined)
      .filter((item): item is UsageSnapshot => Boolean(item));
    return direct ? [direct, ...nested] : nested;
  } catch {
    return [];
  }
}

function snapshotFromObject(source: string, line: number, excerpt: string, value: Record<string, unknown>): UsageSnapshot | undefined {
  const window = stringValue(value.window ?? value.type ?? value.limit ?? value.bucket ?? value.name);
  const percent = numberValue(value.percent ?? value.pct ?? value.remainingPercent ?? value.remaining_percent ?? value.usedPercent ?? value.used_percent);
  const resetAt = stringValue(value.resetAt ?? value.reset_at ?? value.reset ?? value.resetsAt ?? value.resets_at);
  const sampleTime = stringValue(value.sampleTime ?? value.sample_time ?? value.timestamp ?? value.time ?? value.createdAt);

  if (percent === undefined && !resetAt) {
    return undefined;
  }

  return {
    source,
    line,
    window: normalizeWindow(window ?? "unknown", excerpt),
    percent,
    resetAt: cleanValue(resetAt),
    sampleTime: cleanValue(sampleTime),
    excerpt
  };
}

function parseMarkdownUsageRows(source: string, line: number, excerpt: string): UsageSnapshot[] {
  if (!excerpt.includes("|")) {
    return [];
  }

  const cells = excerpt.split("|").map((cell) => cleanValue(cell.trim())).filter((cell) => cell.length > 0);
  if (cells.length < 4 || cells.every((cell) => /^-+$/.test(cell)) || /sample time/i.test(cells[0])) {
    return [];
  }

  const sampleTime = /\d{4}-\d{2}-\d{2}/.test(cells[0]) ? cells[0] : undefined;
  const snapshots: UsageSnapshot[] = [];
  const start = sampleTime ? 1 : 0;
  for (let index = start; index + 2 < cells.length; index += 3) {
    const window = normalizeWindow(cells[index] ?? "unknown", excerpt);
    const percent = parsePercent(cells[index + 1] ?? "");
    const resetAt = cleanValue(cells[index + 2] ?? "");
    if (percent === undefined && !resetAt) {
      continue;
    }

    snapshots.push({
      source,
      line,
      window,
      percent,
      resetAt,
      sampleTime,
      excerpt
    });
  }

  return snapshots;
}

function parseNaturalUsageSnapshot(source: string, line: number, excerpt: string): UsageSnapshot | undefined {
  const percent = parseNaturalPercent(excerpt);
  const hasUsageLanguage = /\b(status|usage|quota|limit|remaining|left|available|weekly|5-hour|5 hour|7d|daily|reset_at|reset)\b/i.test(excerpt);
  const resetAt = parseResetAt(excerpt);
  if (percent === undefined && !resetAt) {
    return undefined;
  }

  if (!hasUsageLanguage) {
    return undefined;
  }

  return {
    source,
    line,
    window: normalizeWindow(undefined, excerpt),
    percent,
    resetAt,
    sampleTime: parseSampleTime(excerpt),
    excerpt
  };
}

function parseTokenUsage(source: string, line: number, excerpt: string): TokenUsageRecord | undefined {
  if (!/\bToken usage\b/i.test(excerpt) && !/\bcached input\b/i.test(excerpt)) {
    return undefined;
  }

  const total = numberAfter(excerpt, /\btotal\s*[=:]\s*([0-9][0-9,]*)/i);
  const input = numberAfter(excerpt, /\binput\s*[=:]\s*([0-9][0-9,]*)/i);
  const cachedInput = numberAfter(excerpt, /\+\s*([0-9][0-9,]*)\s*cached/i) ?? numberAfter(excerpt, /\bcached input\s*[=:]\s*([0-9][0-9,]*)/i);
  const output = numberAfter(excerpt, /\boutput\s*[=:]\s*([0-9][0-9,]*)/i);
  const reasoning = numberAfter(excerpt, /\breasoning\s*([0-9][0-9,]*)/i) ?? numberAfter(excerpt, /\breasoning\s*[=:]\s*([0-9][0-9,]*)/i);

  if ([total, input, cachedInput, output, reasoning].every((value) => value === undefined)) {
    return undefined;
  }

  return { source, line, total, input, cachedInput, output, reasoning, excerpt };
}

function parsePromptCacheRecord(source: string, line: number, excerpt: string): PromptCacheRecord | undefined {
  const json = parsePromptCacheJson(source, line, excerpt);
  if (json) {
    return json;
  }

  if (!/\b(input_tokens|cached_input_tokens|cached_tokens|prompt_cache_key|cache hit|cached token)/i.test(excerpt)) {
    return undefined;
  }

  const inputTokens = numberAfter(excerpt, /\binput_tokens\s*[:=]?\s*([0-9][0-9,]*)/i) ??
    numberAfter(excerpt, /\binput tokens\s*[:=]?\s*([0-9][0-9,]*)/i);
  const cachedInputTokens = numberAfter(excerpt, /\bcached_input_tokens\s*[:=]?\s*([0-9][0-9,]*)/i) ??
    numberAfter(excerpt, /\bcached_tokens\s*[:=]?\s*([0-9][0-9,]*)/i) ??
    numberAfter(excerpt, /\bcached input tokens\s*[:=]?\s*([0-9][0-9,]*)/i) ??
    numberAfter(excerpt, /\bcached tokens\s*[:=]?\s*([0-9][0-9,]*)/i);
  const promptCacheKey = stringAfter(excerpt, /\bprompt_cache_key\s*[:=]\s*"?([A-Za-z0-9._:-]+)"?/i);
  const responseId = stringAfter(excerpt, /\b(?:response_)?id\s*[:=]\s*"?([A-Za-z0-9._:-]+)"?/i);
  const outcome = stringAfter(excerpt, /\boutcome\s*[:=]\s*"?([A-Za-z0-9._:-]+)"?/i);
  const transport = /\bwebsocket\b/i.test(excerpt) ? "websocket" :
    /\bsse\b/i.test(excerpt) ? "sse" :
      /\bhttps?\b/i.test(excerpt) ? "http" :
        undefined;

  if (inputTokens === undefined && cachedInputTokens === undefined && !promptCacheKey) {
    return undefined;
  }

  return {
    source,
    line,
    inputTokens,
    cachedInputTokens,
    cacheHitPercent: computeCacheHitPercent(inputTokens, cachedInputTokens),
    promptCacheKey,
    responseId,
    transport,
    outcome,
    excerpt
  };
}

function parsePromptCacheJson(source: string, line: number, excerpt: string): PromptCacheRecord | undefined {
  if (!excerpt.startsWith("{")) {
    return undefined;
  }

  try {
    const value = JSON.parse(excerpt) as Record<string, unknown>;
    const usage = value.usage && typeof value.usage === "object" ? value.usage as Record<string, unknown> : {};
    const inputTokens = numberValue(value.input_tokens ?? value.inputTokens ?? usage.input_tokens ?? usage.inputTokens);
    const cachedInputTokens = numberValue(value.cached_input_tokens ?? value.cachedInputTokens ?? value.cached_tokens ?? value.cachedTokens ?? usage.cached_input_tokens ?? usage.cachedInputTokens ?? usage.cached_tokens ?? usage.cachedTokens);
    const promptCacheKey = stringValue(value.prompt_cache_key ?? value.promptCacheKey ?? usage.prompt_cache_key ?? usage.promptCacheKey);
    const responseId = stringValue(value.response_id ?? value.responseId ?? value.id);
    const transport = stringValue(value.transport ?? value.protocol);
    const outcome = stringValue(value.outcome ?? value.result);
    if (inputTokens === undefined && cachedInputTokens === undefined && !promptCacheKey) {
      return undefined;
    }

    return {
      source,
      line,
      inputTokens,
      cachedInputTokens,
      cacheHitPercent: computeCacheHitPercent(inputTokens, cachedInputTokens),
      promptCacheKey,
      responseId,
      transport,
      outcome,
      excerpt
    };
  } catch {
    return undefined;
  }
}

function parseOverheadSignal(source: string, line: number, excerpt: string): UsageOverheadSignal | undefined {
  const kind =
    /\bwrite_stdin\b|\b(empty|idle).{0,30}\bpoll/i.test(excerpt) ? "background_polling" :
      /\b(compaction|compact).{0,80}\b(loop|again|repeat|relaunch|75%|context window)\b/i.test(excerpt) ? "compaction_loop" :
        /\b(retry|retries|retrying|tool loop|failed operation|same tool).{0,80}\b(repeat|loop|again|no progress)\b/i.test(excerpt) ? "retry_or_tool_loop" :
          /\b(subagent|sub-agent|agents\.max_threads|agent thread limit|fan-out|spawned).{0,80}\b(agent|thread|session|quota|usage)\b/i.test(excerpt) ? "subagent_fanout" :
            /\b(idle|only open|background).{0,80}\b(usage|tokens|quota|burn|drain|consum)/i.test(excerpt) ? "idle_drain" :
              undefined;

  return kind ? { kind, source, line, excerpt } : undefined;
}

function parseDrainExperiment(source: string, line: number, excerpt: string): UsageDrainExperiment | undefined {
  const hasDrainLanguage = /\b(burn(?:ed|ing|t| through)?|drain(?:ed|ing)?|deplet(?:ed|ing|e)|consum(?:ed|ing|e)|lost|dropped|drop|used)\b.{0,120}\b(usage|quota|limit|weekly|5[- ]?hour|credits?|percent|%)\b/i.test(excerpt) ||
    /\b(usage|quota|limit|weekly|5[- ]?hour|credits?|percent|%)\b.{0,120}\b(burn(?:ed|ing|t| through)?|drain(?:ed|ing)?|deplet(?:ed|ing|e)|consum(?:ed|ing|e)|lost|dropped|drop|used)\b/i.test(excerpt);
  const hasExperimentShape = /\b(prompt|experiment|minute|second|hour|day|credits?|weekly|5[- ]?hour|normal workload|same workload)\b/i.test(excerpt);
  if (!hasDrainLanguage || !hasExperimentShape) {
    return undefined;
  }

  const percentDelta = parseDrainPercent(excerpt);
  const credits = numberAfter(excerpt, /\bconsumed\s+([0-9][0-9,]*)\s+credits?\b/i) ??
    numberAfter(excerpt, /\b([0-9][0-9,]*)\s+credits?\b/i);
  const promptCount = parsePromptCount(excerpt);
  const durationMinutes = parseDurationMinutes(excerpt);
  if (percentDelta === undefined && credits === undefined && promptCount === undefined && durationMinutes === undefined) {
    return undefined;
  }

  return {
    source,
    line,
    window: normalizeWindow(undefined, excerpt),
    percentDelta,
    credits,
    promptCount,
    durationMinutes,
    model: parseModel(excerpt),
    plan: parsePlan(excerpt),
    excerpt
  };
}

function buildFindings(
  snapshots: UsageSnapshot[],
  tokenUsage: TokenUsageRecord[],
  cacheCollapseEvents: PromptCacheCollapseEvent[],
  usageLimitSignals: UsageLimitSignal[],
  overheadSignals: UsageOverheadSignal[],
  drainExperiments: UsageDrainExperiment[]
): UsageEvidenceFinding[] {
  const findings: UsageEvidenceFinding[] = [];
  const byWindow = new Map<string, UsageSnapshot[]>();
  for (const snapshot of snapshots) {
    const window = snapshot.window || "unknown";
    byWindow.set(window, [...(byWindow.get(window) ?? []), snapshot]);
  }

  for (const [window, items] of byWindow) {
    const resetValues = new Set(items.map((item) => item.resetAt).filter((value): value is string => Boolean(value)));
    if (resetValues.size >= 2) {
      findings.push({
        kind: "reset_timestamp_drift",
        severity: "high",
        title: `Reset timestamp drift for ${window}`,
        why: `${window} has ${resetValues.size} different reset timestamps in the supplied evidence.`,
        evidence: items.filter((item) => item.resetAt).slice(0, 4).map(snapshotEvidence),
        nextStep: "Ask OpenAI to compare the displayed reset_at values with the backend enforcement window and account for timezone."
      });
    }

    const jumps = findPercentageJumps(items);
    if (jumps.length > 0) {
      findings.push({
        kind: "quota_percentage_jump",
        severity: "high",
        title: `Large percentage jump for ${window}`,
        why: `${window} percentage changed by ${jumps[0]?.delta ?? "many"} points between nearby samples.`,
        evidence: jumps.slice(0, 2).flatMap((jump) => [snapshotEvidence(jump.before), snapshotEvidence(jump.after)]),
        nextStep: "Include the neighboring samples so maintainers can tell whether this was a reset, refill, accounting jump, or display-only bug."
      });
    }
  }

  for (const record of tokenUsage) {
    if (record.cachedInput !== undefined && (record.cachedInput >= 1_000_000 || (record.input !== undefined && record.cachedInput > record.input * 3))) {
      findings.push({
        kind: "high_cached_input",
        severity: "medium",
        title: "High cached input token usage",
        why: "Cached input tokens dominate this usage record, which is useful evidence for compaction, replay, or context-cache investigations.",
        evidence: [tokenEvidence(record)],
        nextStep: "Attach the model, speed/reasoning mode, context size, compaction timing, and whether the same prompt repeats this cached-token pattern."
      });
    }

    if (record.total !== undefined && record.total >= 500_000) {
      findings.push({
        kind: "high_total_tokens",
        severity: "medium",
        title: "High total token usage",
        why: "A single reported turn or run has very high total token usage.",
        evidence: [tokenEvidence(record)],
        nextStep: "Compare with a small reproduction or previous client version so the report separates expected large-context work from a regression."
      });
    }
  }

  for (const event of cacheCollapseEvents) {
    findings.push({
      kind: "prompt_cache_collapse",
      severity: event.dropPercent >= 50 ? "high" : "medium",
      title: "Prompt cache collapse between adjacent requests",
      why: "The evidence shows cached input tokens dropping sharply while the same prompt cache key or request chain continues, which helps separate backend prompt-cache instability from ordinary high-token turns.",
      evidence: [{ file: event.source, line: event.line, excerpt: event.excerpt }],
      nextStep: "Attach the adjacent previous/current request rows with response ids, prompt_cache_key, transport, reconnect timing, and local token totals so maintainers can check routing or cache-retention behavior."
    });
  }

  for (const signal of usageLimitSignals) {
    const nearby = snapshots.find((snapshot) => snapshot.source === signal.source && Math.abs(snapshot.line - signal.line) <= 8 && (snapshot.percent ?? 0) > 0);
    if (nearby) {
      findings.push({
        kind: "usage_limit_with_remaining_quota",
        severity: "high",
        title: "Usage limit message with remaining quota evidence",
        why: "The evidence contains a usage-limit error near a positive remaining percentage.",
        evidence: [
          { file: signal.source, line: signal.line, excerpt: signal.excerpt },
          snapshotEvidence(nearby)
        ],
        nextStep: "Report both `/status` and dashboard state before and after the failed prompt, plus account/workspace and reset timestamps."
      });
    }
  }

  for (const signal of overheadSignals) {
    findings.push({
      kind: "orchestration_overhead_signal",
      severity: signal.kind === "compaction_loop" || signal.kind === "retry_or_tool_loop" ? "high" : "medium",
      title: `Potential ${signal.kind.replace(/_/g, " ")} overhead`,
      why: "The evidence mentions a local orchestration pattern that can burn tokens without a clean accepted-work result.",
      evidence: [{ file: signal.source, line: signal.line, excerpt: signal.excerpt }],
      nextStep: "Report this separately from quota percentages and token totals so maintainers can distinguish useful model work from local orchestration overhead."
    });
  }

  for (const experiment of drainExperiments) {
    const severePercent = (experiment.percentDelta ?? 0) >= 20;
    const severeCredits = (experiment.credits ?? 0) >= 10;
    const fastMeasuredDrain = experiment.durationMinutes !== undefined && experiment.durationMinutes <= 60 && ((experiment.percentDelta ?? 0) >= 1 || (experiment.credits ?? 0) >= 1);
    if (!severePercent && !severeCredits && !fastMeasuredDrain) {
      continue;
    }

    findings.push({
      kind: "rapid_quota_drain_experiment",
      severity: severePercent || severeCredits ? "high" : "medium",
      title: "Rapid quota drain experiment",
      why: "The evidence describes a bounded prompt/time experiment where Codex usage, quota percentage, or credits dropped quickly under a stated workload.",
      evidence: [{ file: experiment.source, line: experiment.line, excerpt: experiment.excerpt }],
      nextStep: "Include before/after quota screenshots or /status output plus model, plan, reasoning/speed mode, prompt count, elapsed time, and whether subagents or fast mode were enabled."
    });
  }

  return dedupeFindings(findings);
}

function buildReceipt(
  snapshots: UsageSnapshot[],
  tokenUsage: TokenUsageRecord[],
  cacheCollapseEvents: PromptCacheCollapseEvent[],
  overheadSignals: UsageOverheadSignal[],
  usageLimitSignals: UsageLimitSignal[],
  drainExperiments: UsageDrainExperiment[]
): UsageReceipt {
  const byWindow = new Map<string, UsageSnapshot[]>();
  for (const snapshot of snapshots) {
    const window = snapshot.window || "unknown";
    byWindow.set(window, [...(byWindow.get(window) ?? []), snapshot]);
  }

  const quotaWindows = [...byWindow.entries()].map(([window, items]) => {
    const percentSamples = items.filter((item) => item.percent !== undefined);
    return {
      window,
      samples: items.length,
      firstPercent: percentSamples[0]?.percent,
      lastPercent: percentSamples[percentSamples.length - 1]?.percent,
      resetValues: [...new Set(items.map((item) => item.resetAt).filter((value): value is string => Boolean(value)))]
    };
  }).sort((a, b) => a.window.localeCompare(b.window));

  const localTokenTotals = tokenUsage.reduce<UsageReceipt["localTokenTotals"]>((totals, record) => ({
    total: addOptional(totals.total, record.total),
    input: addOptional(totals.input, record.input),
    cachedInput: addOptional(totals.cachedInput, record.cachedInput),
    output: addOptional(totals.output, record.output),
    reasoning: addOptional(totals.reasoning, record.reasoning)
  }), {});

  const suspectedCauses = new Set<string>();
  if (usageLimitSignals.length > 0 || snapshots.length > 0) {
    suspectedCauses.add("quota-window or dashboard accounting");
  }
  if (drainExperiments.length > 0) {
    suspectedCauses.add("rapid quota-drain experiment");
  }
  if (tokenUsage.some((record) => record.cachedInput !== undefined && record.cachedInput >= 1_000_000)) {
    suspectedCauses.add("large cached-context replay");
  }
  if (cacheCollapseEvents.length > 0) {
    suspectedCauses.add("prompt-cache collapse");
  }
  for (const signal of overheadSignals) {
    if (signal.kind === "background_polling") {
      suspectedCauses.add("background polling");
    } else if (signal.kind === "compaction_loop") {
      suspectedCauses.add("compaction loop");
    } else if (signal.kind === "retry_or_tool_loop") {
      suspectedCauses.add("retry or tool loop");
    } else if (signal.kind === "subagent_fanout") {
      suspectedCauses.add("subagent fan-out");
    } else if (signal.kind === "idle_drain") {
      suspectedCauses.add("idle/background drain");
    }
  }

  return {
    quotaWindows,
    localTokenTotals,
    drainExperiments,
    overheadSignals,
    cacheCollapseEvents,
    suspectedCauses: [...suspectedCauses].sort((a, b) => a.localeCompare(b)),
    attribution: buildUsageAttribution(snapshots, tokenUsage, cacheCollapseEvents, overheadSignals, usageLimitSignals, drainExperiments)
  };
}

function buildUsageAttribution(
  snapshots: UsageSnapshot[],
  tokenUsage: TokenUsageRecord[],
  cacheCollapseEvents: PromptCacheCollapseEvent[],
  overheadSignals: UsageOverheadSignal[],
  usageLimitSignals: UsageLimitSignal[],
  drainExperiments: UsageDrainExperiment[]
): UsageAttribution[] {
  const attribution: UsageAttribution[] = [];

  if (usageLimitSignals.length > 0 || snapshots.length > 0) {
    const quotaEvidence = [
      ...usageLimitSignals.map((signal) => evidence(signal.source, signal.line, signal.excerpt)),
      ...snapshots.map((snapshot) => evidence(snapshot.source, snapshot.line, snapshot.excerpt))
    ];
    attribution.push({
      bucket: "quota_window_accounting",
      confidence: usageLimitSignals.length > 0 && snapshots.some((snapshot) => snapshot.percent !== undefined) ? "high" : "medium",
      signals: usageLimitSignals.length + snapshots.length,
      evidence: quotaEvidence.slice(0, 4),
      nextEvidence: "Attach before/after /status and dashboard screenshots with timezone, plan, workspace, and exact reset_at values."
    });
  }

  if (drainExperiments.length > 0) {
    attribution.push({
      bucket: "rapid_drain_repro",
      confidence: drainExperiments.some((experiment) => experiment.percentDelta !== undefined || experiment.credits !== undefined) ? "high" : "medium",
      signals: drainExperiments.length,
      evidence: drainExperiments.slice(0, 4).map((experiment) => evidence(experiment.source, experiment.line, experiment.excerpt)),
      nextEvidence: "Repeat the tiny experiment with model, reasoning effort, speed mode, prompt count, elapsed minutes, and before/after quota."
    });
  }

  if (cacheCollapseEvents.length > 0) {
    attribution.push({
      bucket: "prompt_cache_collapse",
      confidence: "high",
      signals: cacheCollapseEvents.length,
      evidence: cacheCollapseEvents.slice(0, 4).map((event) => evidence(event.source, event.line, event.excerpt)),
      nextEvidence: "Include adjacent request rows with input_tokens, cached_input_tokens/cached_tokens, prompt_cache_key, response id, transport, and reconnect notes."
    });
  }

  const largeCached = tokenUsage.filter((record) => record.cachedInput !== undefined && record.cachedInput >= 1_000_000);
  if (largeCached.length > 0) {
    attribution.push({
      bucket: "large_cached_context_replay",
      confidence: "high",
      signals: largeCached.length,
      evidence: largeCached.slice(0, 4).map((record) => evidence(record.source, record.line, record.excerpt)),
      nextEvidence: "Capture context size, compaction state, model, prompt cache key, and whether a fork/subagent/retry replayed the same context."
    });
  }

  for (const [kind, bucket, nextEvidence] of [
    ["background_polling", "background_polling", "Capture process ids, poll cadence, write_stdin/no-output rows, and whether quota moved while no user prompt was running."],
    ["compaction_loop", "compaction_loop", "Attach compaction start/end rows, context percentage before/after, compact errors, and whether usage moved during repeated compaction."],
    ["retry_or_tool_loop", "retry_or_tool_loop", "Attach repeated tool-call ids, retry counts, failing command excerpts, and whether no useful edit or response was produced."],
    ["subagent_fanout", "subagent_fanout", "Attach number of spawned subagents, roles, model/speed settings, and parent/child token or quota deltas."],
    ["idle_drain", "idle_background_drain", "Capture idle interval, app state, background tasks, process activity, and before/after usage state."]
  ] as const) {
    const matches = overheadSignals.filter((signal) => signal.kind === kind);
    if (matches.length > 0) {
      attribution.push({
        bucket,
        confidence: matches.length > 1 ? "high" : "medium",
        signals: matches.length,
        evidence: matches.slice(0, 4).map((signal) => evidence(signal.source, signal.line, signal.excerpt)),
        nextEvidence
      });
    }
  }

  if (attribution.length === 0) {
    attribution.push({
      bucket: "missing_evidence",
      confidence: "low",
      signals: 0,
      evidence: [],
      nextEvidence: "Add /status snapshots, usage dashboard percentages, token totals, prompt-cache rows, or a bounded rapid-drain experiment."
    });
  }

  return attribution.sort((a, b) => confidenceRank(b.confidence) - confidenceRank(a.confidence) || b.signals - a.signals || a.bucket.localeCompare(b.bucket));
}

function findPromptCacheCollapseEvents(records: PromptCacheRecord[]): PromptCacheCollapseEvent[] {
  const events: PromptCacheCollapseEvent[] = [];
  const previousByKey = new Map<string, PromptCacheRecord>();
  for (const record of records) {
    const key = record.promptCacheKey ?? `${record.source}:unknown-cache-key`;
    const previous = previousByKey.get(key);
    if (
      previous?.cachedInputTokens !== undefined &&
      record.cachedInputTokens !== undefined &&
      previous.cachedInputTokens >= 10_000 &&
      record.cachedInputTokens < previous.cachedInputTokens * 0.7 &&
      comparableInputSize(previous.inputTokens, record.inputTokens)
    ) {
      events.push({
        source: record.source,
        line: record.line,
        previousLine: previous.line,
        inputTokens: record.inputTokens,
        cachedInputTokens: record.cachedInputTokens,
        previousCachedInputTokens: previous.cachedInputTokens,
        dropPercent: round2(((previous.cachedInputTokens - record.cachedInputTokens) / previous.cachedInputTokens) * 100),
        promptCacheKey: record.promptCacheKey,
        responseId: record.responseId,
        previousResponseId: previous.responseId,
        excerpt: record.excerpt
      });
    }

    previousByKey.set(key, record);
  }

  return events;
}

function findPercentageJumps(items: UsageSnapshot[]): Array<{ before: UsageSnapshot; after: UsageSnapshot; delta: number }> {
  const ordered = items.filter((item) => item.percent !== undefined);
  const jumps: Array<{ before: UsageSnapshot; after: UsageSnapshot; delta: number }> = [];
  for (let index = 1; index < ordered.length; index += 1) {
    const before = ordered[index - 1];
    const after = ordered[index];
    const delta = Math.abs((after.percent ?? 0) - (before.percent ?? 0));
    if (delta >= 50) {
      jumps.push({ before, after, delta });
    }
  }

  return jumps;
}

function dedupeFindings(findings: UsageEvidenceFinding[]): UsageEvidenceFinding[] {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = `${finding.kind}:${finding.evidence.map((item) => `${item.file}:${item.line}`).join(",")}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function snapshotEvidence(snapshot: UsageSnapshot): Evidence {
  return { file: snapshot.source, line: snapshot.line, excerpt: snapshot.excerpt };
}

function tokenEvidence(record: TokenUsageRecord): Evidence {
  return { file: record.source, line: record.line, excerpt: record.excerpt };
}

function normalizeWindow(value: string | undefined, excerpt: string): string {
  const source = `${value ?? ""} ${excerpt}`;
  if (/\b(5h|5-hour|5 hour)\b/i.test(source)) {
    return "5h";
  }

  if (/\b(7d|7-day|7 day|weekly|week)\b/i.test(source)) {
    return "7d";
  }

  if (/\b(daily|24h|24-hour|24 hour)\b/i.test(source)) {
    return "daily";
  }

  return cleanValue(value ?? "unknown") || "unknown";
}

function parsePercent(value: string): number | undefined {
  const match = value.match(/\b([0-9]{1,3})(?:\.[0-9]+)?\s*%?\s*(?:left|remaining|available|used|depleted|usage)?\b/i);
  if (!match) {
    return undefined;
  }

  const percent = Number(match[1]);
  return Number.isFinite(percent) && percent >= 0 && percent <= 100 ? percent : undefined;
}

function parseNaturalPercent(value: string): number | undefined {
  const match = value.match(/\b([0-9]{1,3})(?:\.[0-9]+)?\s*(?:%|percent|pct)\s*(?:left|remaining|available|used|depleted|usage)?\b/i) ??
    value.match(/\b([0-9]{1,3})(?:\.[0-9]+)?\s*(?:left|remaining|available|used|depleted)\b/i);
  if (!match) {
    return undefined;
  }

  const percent = Number(match[1]);
  return Number.isFinite(percent) && percent >= 0 && percent <= 100 ? percent : undefined;
}

function parseDrainPercent(value: string): number | undefined {
  const matches = [...value.matchAll(/\b([0-9]{1,3})(?:\.[0-9]+)?\s*(?:%|percent|pct)/gi)]
    .map((match) => Number(match[1]))
    .filter((percent) => Number.isFinite(percent) && percent >= 0 && percent <= 100);
  if (matches.length === 0) {
    return undefined;
  }

  return Math.max(...matches);
}

function parsePromptCount(value: string): number | undefined {
  if (/\b(single|one)\s+prompt\b/i.test(value)) {
    return 1;
  }

  if (/\bfew\s+prompts?\b/i.test(value)) {
    return 3;
  }

  return numberAfter(value, /\b([0-9][0-9,]*)\s+(?:prompts?|requests?|messages?)\b/i);
}

function parseDurationMinutes(value: string): number | undefined {
  if (/\bsingle day\b/i.test(value)) {
    return 24 * 60;
  }

  const day = value.match(/\b(?:within|in|over|after)?\s*([0-9]+(?:\.[0-9]+)?)\s+days?\b/i);
  if (day) {
    return Math.round(Number(day[1]) * 24 * 60);
  }

  const hour = value.match(/\b(?:within|in|over|after)?\s*([0-9]+(?:\.[0-9]+)?)\s+hours?\b/i);
  const minute = value.match(/\b(?:within|in|over|after)?\s*([0-9]+(?:\.[0-9]+)?)\s+minutes?\b/i);
  const second = value.match(/\b([0-9]+(?:\.[0-9]+)?)\s+seconds?\b/i);
  if (!hour && !minute && !second) {
    return undefined;
  }

  const total = (hour ? Number(hour[1]) * 60 : 0) + (minute ? Number(minute[1]) : 0) + (second ? Number(second[1]) / 60 : 0);
  return Number.isFinite(total) ? Math.round(total * 100) / 100 : undefined;
}

function parseModel(value: string): string | undefined {
  const match = value.match(/\b(?:GPT[- ]?)?[0-9](?:\.[0-9])?(?:\s*codex)?\b/i);
  return cleanValue(match?.[0]);
}

function parsePlan(value: string): string | undefined {
  const match = value.match(/\b(Free|Plus|Pro|Business|Team|Enterprise)\b/i);
  return match ? match[1] : undefined;
}

function parseResetAt(value: string): string | undefined {
  const iso = value.match(/\b(?:reset_at|reset|resets|due|changed to|postponed to)\b.{0,40}?(\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?)?Z?)\b/i);
  if (iso) {
    return cleanValue(iso[1]);
  }

  const month = value.match(/\b(?:reset_at|reset|resets|due|changed to|postponed to)\b.{0,40}?((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:,\s*\d{4})?(?:\s+at\s+\d{1,2}:\d{2})?)\b/i);
  return month ? cleanValue(month[1]) : undefined;
}

function parseSampleTime(value: string): string | undefined {
  return cleanValue(value.match(/\b(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?)\b/)?.[1]);
}

function numberAfter(value: string, regex: RegExp): number | undefined {
  const match = value.match(regex);
  return match ? parseInteger(match[1]) : undefined;
}

function stringAfter(value: string, regex: RegExp): string | undefined {
  return cleanValue(value.match(regex)?.[1]);
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    return parsePercent(value) ?? parseInteger(value);
  }

  return undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function parseInteger(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function addOptional(a: number | undefined, b: number | undefined): number | undefined {
  if (a === undefined) {
    return b;
  }

  if (b === undefined) {
    return a;
  }

  return a + b;
}

function computeCacheHitPercent(inputTokens: number | undefined, cachedInputTokens: number | undefined): number | undefined {
  if (!inputTokens || cachedInputTokens === undefined || inputTokens <= 0) {
    return undefined;
  }

  return round2((cachedInputTokens / inputTokens) * 100);
}

function comparableInputSize(previous: number | undefined, current: number | undefined): boolean {
  if (previous === undefined || current === undefined || previous <= 0) {
    return true;
  }

  return current >= previous * 0.75;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function evidence(file: string, line: number, excerpt: string): Evidence {
  return { file, line, excerpt };
}

function confidenceRank(confidence: UsageAttribution["confidence"]): number {
  if (confidence === "high") {
    return 3;
  }

  if (confidence === "medium") {
    return 2;
  }

  return 1;
}

function cleanValue(value: string | undefined): string {
  return (value ?? "").replace(/\*\*/g, "").replace(/`/g, "").trim();
}

function compactExcerpt(value: string): string {
  return cleanValue(value.replace(/\s+/g, " ")).slice(0, 500);
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|");
}

function formatNumber(value: number | undefined): string {
  return value === undefined ? "" : value.toLocaleString("en-US");
}
