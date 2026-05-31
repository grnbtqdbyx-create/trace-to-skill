import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const SUPPORTED_EXTENSIONS = new Set([".txt", ".log", ".md", ".json", ".jsonl"]);

interface RedactionRule {
  id: string;
  pattern: RegExp;
  replacement: string | ((...args: string[]) => string);
}

export interface RedactedFile {
  inputPath: string;
  outputPath?: string;
  bytesBefore: number;
  bytesAfter: number;
  replacements: Record<string, number>;
}

export interface RedactResult {
  generatedAt: string;
  files: RedactedFile[];
  totals: Record<string, number>;
}

interface RawInput {
  absolutePath: string;
  relativePath: string;
  content: string;
}

const REDACTION_RULES: RedactionRule[] = [
  {
    id: "aws_access_key",
    pattern: /\bAKIA[0-9A-Z]{16}\b/g,
    replacement: "[REDACTED_AWS_KEY]"
  },
  {
    id: "github_token",
    pattern: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g,
    replacement: "[REDACTED_GITHUB_TOKEN]"
  },
  {
    id: "openai_key",
    pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g,
    replacement: "[REDACTED_OPENAI_KEY]"
  },
  {
    id: "anthropic_key",
    pattern: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g,
    replacement: "[REDACTED_ANTHROPIC_KEY]"
  },
  {
    id: "npm_token",
    pattern: /\bnpm_[A-Za-z0-9]{32,}\b/g,
    replacement: "[REDACTED_NPM_TOKEN]"
  },
  {
    id: "slack_token",
    pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
    replacement: "[REDACTED_SLACK_TOKEN]"
  },
  {
    id: "bearer_token",
    pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]{20,}/gi,
    replacement: "Bearer [REDACTED_BEARER_TOKEN]"
  },
  {
    id: "secret_assignment",
    pattern: /\b(api[_-]?key|secret|token|password|authorization)(\s*[:=]\s*)['"]?[A-Za-z0-9_./+=:-]{12,}['"]?/gi,
    replacement: (_match: string, key: string, separator: string) => `${key}${separator}[REDACTED]`
  },
  {
    id: "email",
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    replacement: "[REDACTED_EMAIL]"
  },
  {
    id: "mac_home_path",
    pattern: /\/Users\/[A-Za-z0-9._-]+/g,
    replacement: "/Users/[REDACTED_USER]"
  },
  {
    id: "windows_home_path",
    pattern: /C:\\Users\\[A-Za-z0-9._-]+/gi,
    replacement: "C:\\Users\\[REDACTED_USER]"
  },
  {
    id: "hidden_unicode",
    pattern: /[\u202A-\u202E\u2066-\u2069\u200B\u200C\u200D\uFEFF]/g,
    replacement: "[REDACTED_HIDDEN_UNICODE]"
  }
];

export function redactText(content: string): { content: string; replacements: Record<string, number> } {
  const replacements: Record<string, number> = {};
  let redacted = content;

  for (const rule of REDACTION_RULES) {
    redacted = redacted.replace(rule.pattern, (...args: string[]) => {
      replacements[rule.id] = (replacements[rule.id] ?? 0) + 1;
      return typeof rule.replacement === "function" ? rule.replacement(...args) : rule.replacement;
    });
  }

  return { content: redacted, replacements };
}

export async function redactTargets(targets: string[], outputPath?: string): Promise<{ result: RedactResult; content?: string }> {
  const inputs = await loadRawInputs(targets.length > 0 ? targets : [process.cwd()]);
  if (!outputPath && inputs.length !== 1) {
    throw new Error("redact requires --output when redacting a directory or multiple files.");
  }

  const files: RedactedFile[] = [];
  let stdoutContent: string | undefined;

  for (const input of inputs) {
    const redacted = redactText(input.content);
    const targetPath = outputPath ? resolveOutputPath(outputPath, input, inputs.length) : undefined;
    if (targetPath) {
      await mkdir(path.dirname(targetPath), { recursive: true });
      await writeFile(targetPath, redacted.content, "utf8");
    } else {
      stdoutContent = redacted.content;
    }

    files.push({
      inputPath: input.relativePath,
      outputPath: targetPath ? path.relative(process.cwd(), targetPath) : undefined,
      bytesBefore: Buffer.byteLength(input.content, "utf8"),
      bytesAfter: Buffer.byteLength(redacted.content, "utf8"),
      replacements: redacted.replacements
    });
  }

  return {
    result: {
      generatedAt: new Date().toISOString(),
      files,
      totals: totalReplacements(files)
    },
    content: stdoutContent
  };
}

async function loadRawInputs(targets: string[]): Promise<RawInput[]> {
  const inputs: RawInput[] = [];

  for (const target of targets) {
    const absolute = path.resolve(target);
    const stats = await stat(absolute);
    if (stats.isDirectory()) {
      inputs.push(...(await loadRawDirectory(absolute)));
      continue;
    }

    inputs.push(await loadRawFile(absolute));
  }

  return inputs.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

async function loadRawDirectory(dir: string): Promise<RawInput[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const inputs: RawInput[] = [];

  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      inputs.push(...(await loadRawDirectory(fullPath)));
      continue;
    }

    if (entry.isFile() && SUPPORTED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      inputs.push(await loadRawFile(fullPath));
    }
  }

  return inputs;
}

async function loadRawFile(filePath: string): Promise<RawInput> {
  return {
    absolutePath: filePath,
    relativePath: path.relative(process.cwd(), filePath),
    content: await readFile(filePath, "utf8")
  };
}

function resolveOutputPath(outputPath: string, input: RawInput, inputCount: number): string {
  const absoluteOutput = path.resolve(outputPath);
  const outputLooksLikeFile = inputCount === 1 && path.extname(outputPath).length > 0;
  if (outputLooksLikeFile) {
    return absoluteOutput;
  }

  return path.join(absoluteOutput, input.relativePath);
}

function totalReplacements(files: RedactedFile[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const file of files) {
    for (const [kind, count] of Object.entries(file.replacements)) {
      totals[kind] = (totals[kind] ?? 0) + count;
    }
  }
  return totals;
}
