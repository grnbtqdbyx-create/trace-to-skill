import type { Evidence, Finding, FindingKind, Severity, TraceInput } from "./types.js";

interface RuleDefinition {
  kind: FindingKind;
  severity: Severity;
  title: string;
  why: string;
  patterns: RegExp[];
  suggestedRule: string;
  suggestedSkill?: string;
}

const RULES: RuleDefinition[] = [
  {
    kind: "premature_completion",
    severity: "high",
    title: "Agent claimed completion without verifiable proof",
    why: "Maintainers need completion claims to include concrete command output, test names, or review evidence.",
    patterns: [
      /\b(done|complete|fixed|resolved|all set)\b/i,
      /\b(no tests? (were )?(run|executed)|did not run tests?|unable to run tests?)\b/i
    ],
    suggestedRule:
      "Before claiming completion, run the relevant validation command or clearly state the exact validation that could not be run and why.",
    suggestedSkill: "verification-before-completion"
  },
  {
    kind: "tests_not_run",
    severity: "high",
    title: "No validation command evidence found",
    why: "The trace does not show a test, build, typecheck, lint, or smoke command. Repeated unverified changes create maintainer review load.",
    patterns: [
      /\b(no tests? (were )?(run|executed)|not run tests?|skip(?:ped)? tests?|without running tests?)\b/i
    ],
    suggestedRule:
      "Every code-changing task must end with a named validation command and its result, even when the command fails."
  },
  {
    kind: "test_failure",
    severity: "critical",
    title: "Validation failed",
    why: "A failed test/build/lint command should block completion and create a follow-up fix loop.",
    patterns: [
      /\b(test|build|typecheck|lint).{0,80}\b(failed|failure|non-zero|exit code [1-9]|error)\b/i,
      /\bAssertionError|TypeError|ReferenceError|SyntaxError\b/
    ],
    suggestedRule:
      "When validation fails, keep working until the failure is fixed or leave a precise blocker with the failing command and first relevant error."
  },
  {
    kind: "hallucinated_file",
    severity: "medium",
    title: "Missing file or module reference",
    why: "Agents often lose time by inventing paths or assuming files exist. This should become a repository-specific navigation rule.",
    patterns: [
      /\b(no such file or directory|cannot find module|module not found|file not found|path does not exist)\b/i
    ],
    suggestedRule:
      "Before editing or referencing a path, verify it exists with a file search command such as rg --files or the repository's project browser."
  },
  {
    kind: "ignored_instruction",
    severity: "medium",
    title: "Instruction drift or contradiction detected",
    why: "Contradictory AGENTS.md, CLAUDE.md, Cursor, or Copilot instructions cause different agents to behave inconsistently.",
    patterns: [
      /\b(ignored|missed|violated|contradicted).{0,80}\b(instruction|AGENTS\.md|CLAUDE\.md|rule|policy)\b/i,
      /\bAGENTS\.md\b.{0,120}\bCLAUDE\.md\b/i
    ],
    suggestedRule:
      "Keep one source of truth for shared agent behavior, and make tool-specific files reference that source instead of duplicating conflicting rules."
  },
  {
    kind: "unsafe_command",
    severity: "critical",
    title: "Unsafe command pattern",
    why: "Agent traces containing destructive or remote-execution shell patterns need an explicit approval gate.",
    patterns: [
      /\brm\s+-rf\s+(\/|\$HOME|~|\.)/i,
      /\bcurl\b.{0,120}\|\s*(sh|bash|zsh)\b/i,
      /\bsudo\b.{0,80}\b(chmod|chown|rm|dd)\b/i,
      /\bchmod\s+777\b/i
    ],
    suggestedRule:
      "Ask for explicit maintainer approval before destructive commands, privilege escalation, or piping remote scripts into a shell."
  },
  {
    kind: "secret_exposure",
    severity: "critical",
    title: "Possible secret exposure",
    why: "Maintainer automation should redact credentials before traces, reports, or PR comments are shared.",
    patterns: [
      /\b(AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{20,})\b/,
      /\b(api[_-]?key|secret|token|password)\s*[:=]\s*['"]?[A-Za-z0-9_./+=-]{16,}/i
    ],
    suggestedRule:
      "Redact secrets in traces and never paste API keys, tokens, or credentials into agent-visible logs or PR comments."
  },
  {
    kind: "hidden_unicode",
    severity: "high",
    title: "Hidden Unicode control character",
    why: "Hidden Unicode can alter instructions, code review visibility, or security-sensitive text in ways humans miss.",
    patterns: [
      /[\u202A-\u202E\u2066-\u2069\u200B\u200C\u200D\uFEFF]/
    ],
    suggestedRule:
      "Reject hidden bidirectional or zero-width Unicode control characters in agent instructions, tool descriptions, and generated patches."
  },
  {
    kind: "mcp_risk",
    severity: "high",
    title: "MCP permission or tool-risk signal",
    why: "MCP servers can expose shell, filesystem, browser, or network capabilities to indirect prompt injection.",
    patterns: [
      /\b(mcp|model context protocol)\b.{0,160}\b(shell|filesystem|browser|network|token|secret|permission|write)\b/i,
      /\bmcp\.json\b/i
    ],
    suggestedRule:
      "Document every MCP server's capabilities, trust boundary, required secrets, and approval policy before enabling it for coding agents."
  }
];

export function collectFindings(inputs: TraceInput[], maxFilesChanged = 12): Finding[] {
  const findings: Finding[] = [];

  for (const rule of RULES) {
    const evidence = matchRule(inputs, rule);
    if (evidence.length > 0) {
      findings.push(toFinding(rule, evidence));
    }
  }

  const diffEvidence = detectOverEditing(inputs, maxFilesChanged);
  if (diffEvidence.length > 0) {
    findings.push({
      kind: "over_editing",
      severity: "medium",
      title: "Large edit surface without matching evidence",
      why: "Broad file changes are harder for maintainers to review and should trigger a plan, ownership, and validation requirement.",
      evidence: diffEvidence,
      suggestedRule:
        "When a change touches many files, summarize the ownership boundary, list affected surfaces, and run validation that covers each surface."
    });
  }

  const mcpConfigEvidence = detectMcpConfigRisk(inputs);
  if (mcpConfigEvidence.length > 0 && !findings.some((finding) => finding.kind === "mcp_risk")) {
    findings.push({
      kind: "mcp_risk",
      severity: "high",
      title: "MCP config exposes high-risk capabilities",
      why: "MCP servers can grant coding agents filesystem, shell, browser, network, or secret access. Maintainers need a capability inventory before enabling them.",
      evidence: mcpConfigEvidence,
      suggestedRule:
        "Document every MCP server's command, capabilities, required secrets, allowed paths, and approval policy before enabling it for coding agents."
    });
  }

  if (
    !isConfigOnlyScan(inputs) &&
    !hasPositiveValidationEvidence(inputs) &&
    !findings.some((finding) => finding.kind === "tests_not_run")
  ) {
    findings.push({
      kind: "weak_evidence",
      severity: "medium",
      title: "Weak completion evidence",
      why: "The trace lacks strong proof such as passing tests, build output, screenshots, or reviewer-ready artifacts.",
      evidence: firstLines(inputs),
      suggestedRule:
        "Final responses must include the exact validation evidence used to prove the change, not only a summary of intent."
    });
  }

  return findings.sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
}

function isConfigOnlyScan(inputs: TraceInput[]): boolean {
  return inputs.length > 0 && inputs.every((input) => {
    const extensionLooksLikeConfig = /\.(json|ya?ml|toml)$/i.test(input.path);
    return extensionLooksLikeConfig && /"mcpServers"\s*:|"servers"\s*:/.test(input.content);
  });
}

function detectMcpConfigRisk(inputs: TraceInput[]): Evidence[] {
  const evidence: Evidence[] = [];

  for (const input of inputs) {
    if (!/mcp|model-context|model_context/i.test(input.path) && !/"mcpServers"\s*:/.test(input.content)) {
      continue;
    }

    const parsed = parseJsonObject(input.content);
    if (!parsed) {
      continue;
    }

    const servers = asObject(parsed.mcpServers) ?? asObject(parsed.servers);
    if (!servers) {
      continue;
    }

    for (const [name, rawServer] of Object.entries(servers)) {
      const server = asObject(rawServer);
      if (!server) {
        continue;
      }

      const command = stringifyForScan(server.command);
      const args = stringifyForScan(server.args);
      const env = asObject(server.env);
      const joined = `${command} ${args}`.toLowerCase();
      const capabilities = inferMcpCapabilities(joined);
      const secretKeys = env ? Object.keys(env).filter((key) => /token|secret|key|password/i.test(key)) : [];

      if (capabilities.length > 0 || secretKeys.length > 0) {
        evidence.push({
          file: input.path,
          line: findLine(input.content, name),
          excerpt: `server "${name}" capabilities=[${capabilities.join(", ") || "unknown"}] secrets=[${secretKeys.join(", ") || "none"}] command="${command}"`
        });
      }
    }
  }

  return evidence.slice(0, 8);
}

function inferMcpCapabilities(value: string): string[] {
  const capabilities: string[] = [];
  const checks: Array<[string, RegExp]> = [
    ["filesystem", /filesystem|file-system|fs|read_file|write_file|\/users|\/home|\.\//],
    ["shell", /shell|terminal|exec|bash|zsh|powershell|cmd\b/],
    ["browser", /browser|chrome|playwright|puppeteer|selenium/],
    ["network", /fetch|http|web|curl|wget|api|slack|github|gitlab/],
    ["database", /postgres|mysql|sqlite|supabase|redis|mongo/],
    ["container", /docker|kubernetes|kubectl/]
  ];

  for (const [name, pattern] of checks) {
    if (pattern.test(value)) {
      capabilities.push(name);
    }
  }

  return capabilities;
}

function matchRule(inputs: TraceInput[], rule: RuleDefinition): Evidence[] {
  const evidence: Evidence[] = [];

  for (const input of inputs) {
    const lines = input.content.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (rule.patterns.some((pattern) => pattern.test(line))) {
        evidence.push({
          file: input.path,
          line: index + 1,
          excerpt: redact(line.trim()).slice(0, 240)
        });
      }
    });
  }

  return evidence.slice(0, 5);
}

function detectOverEditing(inputs: TraceInput[], maxFilesChanged: number): Evidence[] {
  const changedFiles = new Set<string>();

  for (const input of inputs) {
    for (const line of input.content.split(/\r?\n/)) {
      const match = /^diff --git a\/(.+?) b\/(.+)$/.exec(line);
      if (match) {
        changedFiles.add(match[2]);
      }
    }
  }

  if (changedFiles.size <= maxFilesChanged) {
    return [];
  }

  return [
    {
      file: "git-diff",
      line: 1,
      excerpt: `${changedFiles.size} files changed: ${Array.from(changedFiles).slice(0, 8).join(", ")}`
    }
  ];
}

function hasPositiveValidationEvidence(inputs: TraceInput[]): boolean {
  const text = inputs.map((input) => input.content).join("\n");
  return /\b(npm test|pnpm test|yarn test|pytest|go test|cargo test|xcodebuild|swift test|typecheck|lint|build)\b[\s\S]{0,200}\b(pass|passed|ok|success|0 failed|exit code 0)\b/i.test(text);
}

function firstLines(inputs: TraceInput[]): Evidence[] {
  return inputs.slice(0, 3).map((input) => ({
    file: input.path,
    line: 1,
    excerpt: redact(input.content.split(/\r?\n/).find((line) => line.trim().length > 0) ?? "No non-empty content").slice(0, 160)
  }));
}

function toFinding(rule: RuleDefinition, evidence: Evidence[]): Finding {
  return {
    kind: rule.kind,
    severity: rule.severity,
    title: rule.title,
    why: rule.why,
    evidence,
    suggestedRule: rule.suggestedRule,
    suggestedSkill: rule.suggestedSkill
  };
}

function severityRank(severity: Severity): number {
  return {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4
  }[severity];
}

function parseJsonObject(value: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(value) as unknown;
    return asObject(parsed);
  } catch {
    return undefined;
  }
}

function stringifyForScan(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => stringifyForScan(item)).join(" ");
  }

  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }

  return typeof value === "string" ? value : "";
}

function findLine(content: string, needle: string): number {
  const index = content.split(/\r?\n/).findIndex((line) => line.includes(needle));
  return index >= 0 ? index + 1 : 1;
}

function asObject(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function redact(value: string): string {
  return value
    .replace(/\bAKIA[0-9A-Z]{16}\b/g, "[REDACTED_AWS_KEY]")
    .replace(/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g, "[REDACTED_GITHUB_TOKEN]")
    .replace(/\bsk-[A-Za-z0-9]{20,}\b/g, "[REDACTED_OPENAI_KEY]")
    .replace(/\b(api[_-]?key|secret|token|password)(\s*[:=]\s*)['"]?[A-Za-z0-9_./+=-]{16,}/gi, "$1$2[REDACTED]");
}
