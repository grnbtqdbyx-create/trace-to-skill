import { lstat, readFile } from "node:fs/promises";
import path from "node:path";

export type PatchGuardOperation = "add" | "update" | "delete" | "move-to";
export type PatchGuardSeverity = "warning" | "error";

export interface PatchGuardFinding {
  operation: PatchGuardOperation;
  severity: PatchGuardSeverity;
  line: number;
  target: string;
  message: string;
}

export interface PatchGuardResult {
  generatedAt: string;
  patch: string;
  root: string;
  status: "pass" | "fail";
  findings: PatchGuardFinding[];
}

interface PatchOperation {
  operation: PatchGuardOperation;
  line: number;
  target: string;
}

export async function guardPatchFile(patchPath: string, root = process.cwd()): Promise<PatchGuardResult> {
  const absolutePatch = path.resolve(patchPath);
  const content = await readFile(absolutePatch, "utf8");
  return guardPatchContent(content, {
    patch: path.relative(process.cwd(), absolutePatch) || absolutePatch,
    root
  });
}

export async function guardPatchContent(
  content: string,
  options: { patch?: string; root?: string } = {}
): Promise<PatchGuardResult> {
  const root = path.resolve(options.root ?? process.cwd());
  const operations = parsePatchOperations(content);
  const findings: PatchGuardFinding[] = [];

  for (const operation of operations) {
    const absoluteTarget = resolveTarget(root, operation.target);
    const state = await pathState(absoluteTarget);

    if (operation.operation === "add" && state.exists) {
      findings.push({
        operation: operation.operation,
        severity: "error",
        line: operation.line,
        target: operation.target,
        message: state.isSymlink ?
          "Add File target already exists and is a symlink; creating it would overwrite the linked target." :
          "Add File target already exists; use Update File or remove the file first."
      });
      continue;
    }

    if ((operation.operation === "update" || operation.operation === "delete") && !state.exists) {
      findings.push({
        operation: operation.operation,
        severity: "error",
        line: operation.line,
        target: operation.target,
        message: `${operation.operation === "update" ? "Update" : "Delete"} File target does not exist.`
      });
      continue;
    }

    if (operation.operation === "move-to" && state.exists) {
      findings.push({
        operation: operation.operation,
        severity: "error",
        line: operation.line,
        target: operation.target,
        message: "Move target already exists; require an explicit overwrite step."
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    patch: options.patch ?? "<inline>",
    root,
    status: findings.some((finding) => finding.severity === "error") ? "fail" : "pass",
    findings
  };
}

export function renderPatchGuardMarkdown(result: PatchGuardResult): string {
  const lines = [
    "# trace-to-skill Patch Guard",
    "",
    `Status: **${result.status}**`,
    "",
    `Patch: \`${result.patch}\``,
    `Root: \`${result.root}\``,
    ""
  ];

  if (result.findings.length === 0) {
    lines.push("No unsafe patch file operations detected.", "");
  } else {
    lines.push("## Findings", "");
    for (const finding of result.findings) {
      lines.push(`- Line ${finding.line}: \`${finding.operation}\` \`${finding.target}\` - ${finding.message}`);
    }
    lines.push("");
  }

  lines.push(
    "Guarded invariants:",
    "",
    "- `*** Add File` fails when the target already exists.",
    "- `*** Update File` and `*** Delete File` fail when the target is missing.",
    "- `*** Move to` fails when the destination already exists.",
    ""
  );

  return lines.join("\n");
}

function parsePatchOperations(content: string): PatchOperation[] {
  const operations: PatchOperation[] = [];
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    const fileMatch = line.match(/^\*\*\* (Add|Update|Delete) File: (.+)$/);
    if (fileMatch) {
      operations.push({
        operation: fileMatch[1].toLowerCase() as PatchGuardOperation,
        line: index + 1,
        target: fileMatch[2].trim()
      });
      return;
    }

    const moveMatch = line.match(/^\*\*\* Move to: (.+)$/);
    if (moveMatch) {
      operations.push({
        operation: "move-to",
        line: index + 1,
        target: moveMatch[1].trim()
      });
    }
  });

  return operations;
}

function resolveTarget(root: string, target: string): string {
  return path.isAbsolute(target) ? path.normalize(target) : path.resolve(root, target);
}

async function pathState(target: string): Promise<{ exists: boolean; isSymlink: boolean }> {
  try {
    const stat = await lstat(target);
    return { exists: true, isSymlink: stat.isSymbolicLink() };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return { exists: false, isSymlink: false };
    }

    throw error;
  }
}
