import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";

export type SensitiveAuditStatus = "pass" | "warn" | "fail";
export type SensitiveAuditSeverity = "medium" | "high" | "critical";
export type SensitiveIgnoreTarget = "agentignore" | "codexignore" | "aiexclude" | "gitignore";

export type SensitiveAuditFindingKind =
  | "env_file"
  | "package_auth_config"
  | "cloud_credentials"
  | "ssh_credentials"
  | "kubernetes_credentials"
  | "docker_credentials"
  | "database_file"
  | "private_key_or_certificate"
  | "mobile_signing_secret"
  | "secret_manifest"
  | "sensitive_symlink";

export interface SensitiveAuditFinding {
  severity: SensitiveAuditSeverity;
  kind: SensitiveAuditFindingKind;
  path: string;
  reason: string;
  suggestedExclude: string;
}

export interface SensitiveIgnoreFile {
  target: SensitiveIgnoreTarget;
  filename: string;
  header: string[];
  patterns: string[];
}

export interface SensitivePolicyCoverageFile {
  target: SensitiveIgnoreTarget;
  filename: string;
  path: string;
  exists: boolean;
  coveredPatterns: string[];
  missingPatterns: string[];
  note: string;
}

export interface SensitivePolicyCoverage {
  summary: {
    checkedFiles: number;
    existingFiles: number;
    recommendedPatterns: number;
    coveredPatterns: number;
    missingPatterns: number;
  };
  files: SensitivePolicyCoverageFile[];
  notes: string[];
}

export interface SensitiveAuditResult {
  generatedAt: string;
  root: string;
  status: SensitiveAuditStatus;
  summary: {
    scannedEntries: number;
    sensitiveFindings: number;
    criticalFindings: number;
    recommendedExcludes: number;
  };
  findings: SensitiveAuditFinding[];
  recommendedExcludes: string[];
  ignoreFiles: SensitiveIgnoreFile[];
  policyCoverage: SensitivePolicyCoverage;
}

interface SensitivePattern {
  kind: SensitiveAuditFindingKind;
  severity: SensitiveAuditSeverity;
  reason: string;
  suggestedExclude: string;
  matches(relativePath: string, basename: string): boolean;
}

const SKIPPED_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".turbo",
  ".cache",
  "DerivedData"
]);

const SENSITIVE_PATTERNS: SensitivePattern[] = [
  {
    kind: "env_file",
    severity: "critical",
    reason: "environment files commonly contain API keys, database URLs, tokens, or local secrets.",
    suggestedExclude: "**/.env*",
    matches: (_relativePath, basename) => basename === ".env" || basename.startsWith(".env.")
  },
  {
    kind: "package_auth_config",
    severity: "critical",
    reason: "package manager auth config can contain registry tokens or publish credentials.",
    suggestedExclude: "**/.npmrc",
    matches: (_relativePath, basename) => basename === ".npmrc" || basename === ".pypirc"
  },
  {
    kind: "cloud_credentials",
    severity: "critical",
    reason: "cloud credential files can grant access to infrastructure, storage, or production services.",
    suggestedExclude: "**/.aws/**",
    matches: (relativePath) => pathSegments(relativePath).includes(".aws")
  },
  {
    kind: "ssh_credentials",
    severity: "critical",
    reason: "SSH private keys and SSH config should not enter agent context.",
    suggestedExclude: "**/.ssh/**",
    matches: (relativePath, basename) =>
      pathSegments(relativePath).includes(".ssh") ||
      /^(id_rsa|id_dsa|id_ecdsa|id_ed25519)(\..*)?$/.test(basename)
  },
  {
    kind: "kubernetes_credentials",
    severity: "critical",
    reason: "Kubernetes config can contain cluster credentials and access tokens.",
    suggestedExclude: "**/.kube/**",
    matches: (relativePath) => pathSegments(relativePath).includes(".kube")
  },
  {
    kind: "docker_credentials",
    severity: "critical",
    reason: "Docker config can contain registry credentials or auth helpers.",
    suggestedExclude: "**/.docker/**",
    matches: (relativePath) => pathSegments(relativePath).includes(".docker")
  },
  {
    kind: "private_key_or_certificate",
    severity: "critical",
    reason: "private key and certificate bundles are high-risk credential material.",
    suggestedExclude: "**/*.{pem,key,p12}",
    matches: (_relativePath, basename) => /\.(pem|key|p12)$/i.test(basename)
  },
  {
    kind: "mobile_signing_secret",
    severity: "high",
    reason: "mobile signing profiles and certificates can expose release or device signing material.",
    suggestedExclude: "**/*.{mobileprovision,provisionprofile}",
    matches: (_relativePath, basename) => /\.(mobileprovision|provisionprofile)$/i.test(basename)
  },
  {
    kind: "database_file",
    severity: "high",
    reason: "local databases can contain customer data, user data, cached tokens, or private app state.",
    suggestedExclude: "**/*.{sqlite,sqlite3,db}",
    matches: (_relativePath, basename) => /\.(sqlite|sqlite3|db)$/i.test(basename)
  },
  {
    kind: "secret_manifest",
    severity: "high",
    reason: "secret manifests and production config files often carry deploy credentials or private endpoints.",
    suggestedExclude: "**/*secret*",
    matches: (_relativePath, basename) =>
      /(^|[-_.])(secret|secrets|credential|credentials)([-_.]|$)/i.test(basename) ||
      /^production\.(json|ya?ml|toml|env)$/i.test(basename)
  }
];

const SENSITIVE_IGNORE_FILES: Array<{ target: SensitiveIgnoreTarget; filename: string }> = [
  { target: "agentignore", filename: ".agentignore" },
  { target: "codexignore", filename: ".codexignore" },
  { target: "aiexclude", filename: ".aiexclude" },
  { target: "gitignore", filename: ".gitignore" }
];

export async function auditSensitivePaths(root = process.cwd()): Promise<SensitiveAuditResult> {
  const resolvedRoot = path.resolve(root);
  const findings: SensitiveAuditFinding[] = [];
  const stats = { scannedEntries: 0 };

  await scanDirectory(resolvedRoot, resolvedRoot, findings, stats);

  const recommendedExcludes = uniqueSorted(findings.map((finding) => finding.suggestedExclude));
  const criticalFindings = findings.filter((finding) => finding.severity === "critical").length;

  const policyCoverage = await buildSensitivePolicyCoverage(resolvedRoot, recommendedExcludes);

  return {
    generatedAt: new Date().toISOString(),
    root: resolvedRoot,
    status: criticalFindings > 0 ? "fail" : findings.length > 0 ? "warn" : "pass",
    summary: {
      scannedEntries: stats.scannedEntries,
      sensitiveFindings: findings.length,
      criticalFindings,
      recommendedExcludes: recommendedExcludes.length
    },
    findings: findings.sort((a, b) => a.path.localeCompare(b.path)),
    recommendedExcludes,
    ignoreFiles: buildSensitiveIgnoreFiles(recommendedExcludes),
    policyCoverage
  };
}

export function buildSensitiveIgnoreFiles(patterns: string[]): SensitiveIgnoreFile[] {
  const uniquePatterns = uniqueSorted(patterns);
  return SENSITIVE_IGNORE_FILES.map(({ target, filename }) => ({
    target,
    filename,
    header: [
      "Generated by trace-to-skill sensitive-audit.",
      "Review before committing or using this file.",
      "The audit is filename/path based and did not read file contents or follow symlink targets.",
      `Target: ${filename}`
    ],
    patterns: uniquePatterns
  }));
}

export function normalizeSensitiveIgnoreTarget(target: string): SensitiveIgnoreTarget {
  if (target === "agentignore" || target === "codexignore" || target === "aiexclude" || target === "gitignore") {
    return target;
  }

  throw new Error("--ignore-target must be one of: agentignore, codexignore, aiexclude, gitignore");
}

export function renderSensitiveIgnoreFile(
  result: SensitiveAuditResult,
  target: SensitiveIgnoreTarget = "agentignore"
): string {
  const candidate = result.ignoreFiles.find((item) => item.target === target);
  if (!candidate) {
    throw new Error(`unknown sensitive ignore target: ${target}`);
  }

  const lines = candidate.header.map((line) => `# ${line}`);
  lines.push("");

  if (candidate.patterns.length === 0) {
    lines.push("# No sensitive path exclude patterns were suggested.", "");
  } else {
    lines.push(...candidate.patterns, "");
  }

  return lines.join("\n");
}

export function renderSensitiveAuditMarkdown(result: SensitiveAuditResult): string {
  const lines = [
    "# trace-to-skill Sensitive Path Audit",
    "",
    `Status: **${result.status}**`,
    "",
    `Root: \`${result.root}\``,
    `Scanned entries: ${result.summary.scannedEntries}`,
    `Sensitive findings: ${result.summary.sensitiveFindings}`,
    `Critical findings: ${result.summary.criticalFindings}`,
    "",
    "This audit is filename/path based and does not read file contents or follow symlink targets.",
    "",
    "## Findings",
    ""
  ];

  if (result.findings.length === 0) {
    lines.push("No sensitive path findings detected.", "");
  } else {
    for (const finding of result.findings) {
      lines.push(
        `- **${finding.severity}** ${finding.kind}: \`${finding.path}\``,
        `  - ${finding.reason}`,
        `  - Suggested exclude: \`${finding.suggestedExclude}\``
      );
    }
    lines.push("");
  }

  lines.push("## Recommended Excludes", "");
  if (result.recommendedExcludes.length === 0) {
    lines.push("No exclude patterns suggested.", "");
  } else {
    lines.push("```gitignore", ...result.recommendedExcludes, "```", "");
  }

  lines.push("## Ignore File Candidates", "");
  for (const candidate of result.ignoreFiles) {
    lines.push(`- \`${candidate.filename}\` via \`--format ignore --ignore-target ${candidate.target}\``);
  }
  lines.push("");

  lines.push("## Project Policy Coverage", "");
  lines.push(
    `Checked files: ${result.policyCoverage.summary.checkedFiles}`,
    `Existing files: ${result.policyCoverage.summary.existingFiles}`,
    `Covered recommended patterns: ${result.policyCoverage.summary.coveredPatterns}`,
    `Missing recommended patterns: ${result.policyCoverage.summary.missingPatterns}`,
    ""
  );

  for (const file of result.policyCoverage.files) {
    lines.push(
      `- \`${file.filename}\`: ${file.exists ? "present" : "missing"}; covers ${file.coveredPatterns.length}/${result.policyCoverage.summary.recommendedPatterns} recommended pattern(s).`,
      `  - ${file.note}`
    );
    if (file.missingPatterns.length > 0) {
      lines.push(`  - Missing: \`${file.missingPatterns.join("`, `")}\``);
    }
  }
  lines.push("");

  if (result.policyCoverage.notes.length > 0) {
    lines.push("Policy notes:", "");
    for (const note of result.policyCoverage.notes) {
      lines.push(`- ${note}`);
    }
    lines.push("");
  }

  lines.push(
    "Suggested next step:",
    "",
    "- Add these patterns to the exclusion mechanism your agent surface supports, and keep OS sandbox or permission profiles enabled for hard enforcement.",
    "- Treat this report as a preflight checklist; it is not a replacement for a sandbox boundary.",
    ""
  );

  return lines.join("\n");
}

async function buildSensitivePolicyCoverage(root: string, recommendedExcludes: string[]): Promise<SensitivePolicyCoverage> {
  const recommendedPatterns = uniqueSorted(recommendedExcludes);
  const files = await Promise.all(
    SENSITIVE_IGNORE_FILES.map(async ({ target, filename }) => {
      const absolutePath = path.join(root, filename);
      let contents: string | undefined;
      try {
        contents = await readFile(absolutePath, "utf8");
      } catch {
        contents = undefined;
      }

      const existingPatterns = contents === undefined ? [] : parseIgnorePatterns(contents);
      const coveredPatterns = recommendedPatterns.filter((pattern) => existingPatterns.includes(pattern));
      const missingPatterns = recommendedPatterns.filter((pattern) => !existingPatterns.includes(pattern));

      return {
        target,
        filename,
        path: filename,
        exists: contents !== undefined,
        coveredPatterns,
        missingPatterns,
        note: policyCoverageNote(target, contents !== undefined)
      };
    })
  );

  const coveredPatterns = new Set(files.flatMap((file) => file.coveredPatterns));
  const missingPatterns = recommendedPatterns.filter((pattern) => !coveredPatterns.has(pattern));

  return {
    summary: {
      checkedFiles: files.length,
      existingFiles: files.filter((file) => file.exists).length,
      recommendedPatterns: recommendedPatterns.length,
      coveredPatterns: coveredPatterns.size,
      missingPatterns: missingPatterns.length
    },
    files,
    notes: [
      "Coverage is based on exact pattern lines in project-level ignore files; it does not read sensitive file contents.",
      "A .gitignore match is useful for repository hygiene but is not proof that an AI agent or Codex runtime enforces a read boundary.",
      "Use OS sandboxing or agent-native deny rules for hard enforcement when available."
    ]
  };
}

function parseIgnorePatterns(contents: string): string[] {
  return uniqueSorted(
    contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"))
  );
}

function policyCoverageNote(target: SensitiveIgnoreTarget, exists: boolean): string {
  const prefix = exists ? "Project file exists." : "Project file is missing.";
  if (target === "gitignore") {
    return `${prefix} Git ignore coverage is not a deterministic Codex read-deny boundary.`;
  }

  return `${prefix} Use this as a reviewable project policy candidate for agent-sensitive path exclusion.`;
}

async function scanDirectory(
  root: string,
  dir: string,
  findings: SensitiveAuditFinding[],
  stats: { scannedEntries: number }
): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.isDirectory() && SKIPPED_DIRS.has(entry.name)) {
      continue;
    }

    const absolutePath = path.join(dir, entry.name);
    const relativePath = normalizeRelative(path.relative(root, absolutePath));
    stats.scannedEntries += 1;

    let entryStats;
    try {
      entryStats = await lstat(absolutePath);
    } catch {
      continue;
    }

    const matched = firstSensitiveMatch(relativePath, entry.name);
    if (matched) {
      findings.push({
        severity: entryStats.isSymbolicLink() ? "critical" : matched.severity,
        kind: entryStats.isSymbolicLink() ? "sensitive_symlink" : matched.kind,
        path: relativePath,
        reason: entryStats.isSymbolicLink()
          ? `sensitive-looking symlink path matched ${matched.kind}; symlink targets are not followed by this audit.`
          : matched.reason,
        suggestedExclude: matched.suggestedExclude
      });
    }

    if (matched && entryStats.isDirectory()) {
      continue;
    }

    if (entryStats.isDirectory()) {
      await scanDirectory(root, absolutePath, findings, stats);
    }
  }
}

function firstSensitiveMatch(relativePath: string, basename: string): SensitivePattern | undefined {
  return SENSITIVE_PATTERNS.find((pattern) => pattern.matches(relativePath, basename));
}

function pathSegments(relativePath: string): string[] {
  return relativePath.split("/");
}

function normalizeRelative(relativePath: string): string {
  return relativePath.split(path.sep).join("/");
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}
