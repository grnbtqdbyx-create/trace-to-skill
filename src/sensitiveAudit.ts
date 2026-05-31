import { lstat, readdir } from "node:fs/promises";
import path from "node:path";

export type SensitiveAuditStatus = "pass" | "warn" | "fail";
export type SensitiveAuditSeverity = "medium" | "high" | "critical";

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

export async function auditSensitivePaths(root = process.cwd()): Promise<SensitiveAuditResult> {
  const resolvedRoot = path.resolve(root);
  const findings: SensitiveAuditFinding[] = [];
  const stats = { scannedEntries: 0 };

  await scanDirectory(resolvedRoot, resolvedRoot, findings, stats);

  const recommendedExcludes = uniqueSorted(findings.map((finding) => finding.suggestedExclude));
  const criticalFindings = findings.filter((finding) => finding.severity === "critical").length;

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
    recommendedExcludes
  };
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

  lines.push(
    "Suggested next step:",
    "",
    "- Add these patterns to the exclusion mechanism your agent surface supports, and keep OS sandbox or permission profiles enabled for hard enforcement.",
    "- Treat this report as a preflight checklist; it is not a replacement for a sandbox boundary.",
    ""
  );

  return lines.join("\n");
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
