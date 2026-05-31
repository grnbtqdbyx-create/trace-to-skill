import { constants } from "node:fs";
import { access, readdir, stat } from "node:fs/promises";
import path from "node:path";

export type LspAuditStatus = "pass" | "warn" | "fail";

export interface LspAuditLanguage {
  id: string;
  name: string;
  detected: boolean;
  evidence: string[];
  server: {
    command: string;
    installed: boolean;
    install: string;
    purpose: string;
  };
}

export interface LspAuditResult {
  generatedAt: string;
  root: string;
  status: LspAuditStatus;
  summary: {
    detectedLanguages: number;
    installedServers: number;
    missingServers: number;
    scannedFiles: number;
  };
  languages: LspAuditLanguage[];
  recommendedInstalls: string[];
}

interface LanguageRule {
  id: string;
  name: string;
  manifestFiles: string[];
  extensions: string[];
  command: string;
  install: string;
  purpose: string;
}

const SKIPPED_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".turbo",
  ".cache",
  "coverage",
  "DerivedData"
]);

const LANGUAGE_RULES: LanguageRule[] = [
  {
    id: "typescript",
    name: "TypeScript / JavaScript",
    manifestFiles: ["package.json", "tsconfig.json", "jsconfig.json"],
    extensions: [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"],
    command: "typescript-language-server",
    install: "npm install --save-dev typescript typescript-language-server",
    purpose: "go-to-definition, diagnostics, references, and safe symbol-aware edits in TS/JS repos"
  },
  {
    id: "python",
    name: "Python",
    manifestFiles: ["pyproject.toml", "requirements.txt", "setup.py", "setup.cfg"],
    extensions: [".py", ".pyi"],
    command: "pyright-langserver",
    install: "npm install --global pyright",
    purpose: "static diagnostics, import resolution, and symbol navigation for Python projects"
  },
  {
    id: "go",
    name: "Go",
    manifestFiles: ["go.mod", "go.work"],
    extensions: [".go"],
    command: "gopls",
    install: "go install golang.org/x/tools/gopls@latest",
    purpose: "module-aware diagnostics, references, rename, and definition support for Go"
  },
  {
    id: "rust",
    name: "Rust",
    manifestFiles: ["Cargo.toml"],
    extensions: [".rs"],
    command: "rust-analyzer",
    install: "rustup component add rust-analyzer",
    purpose: "cargo-aware diagnostics, symbol navigation, and refactor support for Rust"
  },
  {
    id: "swift",
    name: "Swift",
    manifestFiles: ["Package.swift", "*.xcodeproj", "*.xcworkspace"],
    extensions: [".swift"],
    command: "sourcekit-lsp",
    install: "Install Xcode or the Swift toolchain, then ensure sourcekit-lsp is on PATH.",
    purpose: "SourceKit-backed diagnostics, references, and definitions for Swift and Xcode projects"
  },
  {
    id: "java",
    name: "Java",
    manifestFiles: ["pom.xml", "build.gradle", "build.gradle.kts", "settings.gradle", "settings.gradle.kts"],
    extensions: [".java"],
    command: "jdtls",
    install: "Install Eclipse JDT LS and expose the jdtls launcher on PATH.",
    purpose: "project-aware diagnostics, imports, references, and refactors for Java"
  },
  {
    id: "c-cpp",
    name: "C / C++",
    manifestFiles: ["compile_commands.json", "CMakeLists.txt", "Makefile"],
    extensions: [".c", ".cc", ".cpp", ".cxx", ".h", ".hh", ".hpp", ".hxx"],
    command: "clangd",
    install: "Install LLVM clangd and ensure clangd is on PATH.",
    purpose: "compile-database-aware diagnostics, completion, references, and symbol search for C/C++"
  },
  {
    id: "ruby",
    name: "Ruby",
    manifestFiles: ["Gemfile", ".ruby-version"],
    extensions: [".rb"],
    command: "ruby-lsp",
    install: "gem install ruby-lsp",
    purpose: "diagnostics, document symbols, and project navigation for Ruby"
  },
  {
    id: "php",
    name: "PHP",
    manifestFiles: ["composer.json"],
    extensions: [".php"],
    command: "intelephense",
    install: "npm install --global intelephense",
    purpose: "diagnostics, references, and symbol navigation for PHP"
  },
  {
    id: "csharp",
    name: "C#",
    manifestFiles: ["*.csproj", "*.sln"],
    extensions: [".cs"],
    command: "csharp-ls",
    install: "dotnet tool install --global csharp-ls",
    purpose: "Roslyn-backed diagnostics and symbol navigation for C#"
  }
];

export async function auditLspReadiness(root = process.cwd()): Promise<LspAuditResult> {
  const resolvedRoot = path.resolve(root);
  const stats = await stat(resolvedRoot);
  if (!stats.isDirectory()) {
    throw new Error("lsp-audit requires a repository directory");
  }

  const files = await listFiles(resolvedRoot);
  const fileSet = new Set(files);
  const languages = await Promise.all(LANGUAGE_RULES.map((rule) => detectLanguage(rule, files, fileSet)));
  const detected = languages.filter((language) => language.detected);
  const missing = detected.filter((language) => !language.server.installed);
  const recommendedInstalls = [...new Set(missing.map((language) => language.server.install))];

  return {
    generatedAt: new Date().toISOString(),
    root: resolvedRoot,
    status: detected.length === 0 || missing.length > 0 ? "warn" : "pass",
    summary: {
      detectedLanguages: detected.length,
      installedServers: detected.filter((language) => language.server.installed).length,
      missingServers: missing.length,
      scannedFiles: files.length
    },
    languages: detected.sort((a, b) => a.name.localeCompare(b.name)),
    recommendedInstalls
  };
}

export function renderLspAuditMarkdown(result: LspAuditResult): string {
  const lines = [
    "# trace-to-skill LSP Readiness Audit",
    "",
    `Status: **${result.status}**`,
    "",
    `Root: \`${result.root}\``,
    `Detected languages: ${result.summary.detectedLanguages}`,
    `Installed language servers: ${result.summary.installedServers}`,
    `Missing language servers: ${result.summary.missingServers}`,
    `Scanned files: ${result.summary.scannedFiles}`,
    "",
    "This audit is local and read-only. It detects repository language signals and whether matching language-server commands are available on PATH.",
    "",
    "## Languages",
    ""
  ];

  if (result.languages.length === 0) {
    lines.push("No supported language signals detected.", "");
  } else {
    for (const language of result.languages) {
      const state = language.server.installed ? "installed" : "missing";
      lines.push(
        `- **${language.name}**: ${language.server.command} is **${state}**`,
        `  - Evidence: ${language.evidence.map((item) => `\`${item}\``).join(", ")}`,
        `  - Why it matters: ${language.server.purpose}`,
        `  - Install: \`${language.server.install}\``
      );
    }
    lines.push("");
  }

  lines.push("## Recommended Installs", "");
  if (result.recommendedInstalls.length === 0) {
    lines.push("No missing language servers detected.", "");
  } else {
    lines.push("```bash", ...result.recommendedInstalls, "```", "");
  }

  lines.push(
    "Suggested next step:",
    "",
    "- Install only the servers your team wants agents to use, then document the expected LSP setup in AGENTS.md or CI.",
    "- Treat this report as readiness evidence; it does not auto-install packages or grant an agent additional permissions.",
    ""
  );

  return lines.join("\n");
}

async function detectLanguage(rule: LanguageRule, files: string[], fileSet: Set<string>): Promise<LspAuditLanguage> {
  const evidence = languageEvidence(rule, files, fileSet);
  const installed = await commandExists(rule.command);

  return {
    id: rule.id,
    name: rule.name,
    detected: evidence.length > 0,
    evidence,
    server: {
      command: rule.command,
      installed,
      install: rule.install,
      purpose: rule.purpose
    }
  };
}

function languageEvidence(rule: LanguageRule, files: string[], fileSet: Set<string>): string[] {
  const evidence: string[] = [];
  for (const manifest of rule.manifestFiles) {
    if (manifest.includes("*")) {
      const regex = globBasenameRegex(manifest);
      const match = files.find((file) => regex.test(path.basename(file)));
      if (match) {
        evidence.push(match);
      }
      continue;
    }

    if (fileSet.has(manifest)) {
      evidence.push(manifest);
    }
  }

  for (const extension of rule.extensions) {
    const match = files.find((file) => path.extname(file).toLowerCase() === extension);
    if (match) {
      evidence.push(match);
    }
  }

  return [...new Set(evidence)].slice(0, 8);
}

async function listFiles(root: string): Promise<string[]> {
  const results: string[] = [];
  await walk(root, root, results);
  return results.sort((a, b) => a.localeCompare(b));
}

async function walk(root: string, dir: string, results: string[]): Promise<void> {
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
    const relativePath = path.relative(root, absolutePath).split(path.sep).join("/");

    if (entry.isDirectory()) {
      await walk(root, absolutePath, results);
      continue;
    }

    if (entry.isFile()) {
      results.push(relativePath);
    }
  }
}

async function commandExists(command: string): Promise<boolean> {
  for (const directory of pathDirectories()) {
    for (const candidate of executableCandidates(command)) {
      try {
        await access(path.join(directory, candidate), constants.X_OK);
        return true;
      } catch {
        // Keep scanning PATH.
      }
    }
  }

  return false;
}

function pathDirectories(): string[] {
  return (process.env.PATH ?? "")
    .split(path.delimiter)
    .map((item) => item.trim())
    .filter(Boolean);
}

function executableCandidates(command: string): string[] {
  if (process.platform !== "win32") {
    return [command];
  }

  const extensions = (process.env.PATHEXT ?? ".EXE;.CMD;.BAT")
    .split(";")
    .map((item) => item.toLowerCase());
  return [command, ...extensions.map((extension) => `${command}${extension}`)];
}

function globBasenameRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`, "i");
}
