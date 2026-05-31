import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { copyFile, lstat, mkdir, readFile, readlink, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const SKIPPED_IGNORED_ROOTS = new Set([".git", "node_modules", "dist", "coverage", ".next", ".turbo", ".cache"]);

export interface WorkspaceCheckpointOptions {
  output?: string;
  includeUntracked?: boolean;
  includeIgnored?: boolean;
}

export interface WorkspaceCheckpointFile {
  path: string;
  status: string;
  copied: boolean;
  deleted: boolean;
  symlinkTarget?: string;
  blob?: string;
  sha256?: string;
}

export interface WorkspaceCheckpointResult {
  generatedAt: string;
  root: string;
  outputDir: string;
  gitHead?: string;
  includeUntracked: boolean;
  includeIgnored: boolean;
  summary: {
    statusEntries: number;
    copiedFiles: number;
    deletedFiles: number;
    symlinks: number;
  };
  files: WorkspaceCheckpointFile[];
  artifacts: {
    manifest: string;
    status: string;
    unstagedDiff: string;
    stagedDiff: string;
    notes: string;
  };
}

interface StatusEntry {
  status: string;
  path: string;
}

export async function createWorkspaceCheckpoint(
  root = process.cwd(),
  options: WorkspaceCheckpointOptions = {}
): Promise<WorkspaceCheckpointResult> {
  const resolvedRoot = await realpath(path.resolve(root));
  await assertGitRepo(resolvedRoot);

  const generatedAt = new Date().toISOString();
  const outputDir = path.resolve(options.output ?? path.join(
    resolvedRoot,
    ".trace-to-skill",
    "checkpoints",
    generatedAt.replace(/[:.]/g, "-")
  ));
  const includeUntracked = options.includeUntracked !== false;
  const includeIgnored = options.includeIgnored === true;

  const statusOutput = await git(resolvedRoot, [
    "status",
    "--porcelain=v1",
    includeUntracked ? "--untracked-files=all" : "--untracked-files=no"
  ]);
  const entries = parsePorcelainStatus(statusOutput.stdout);
  const ignoredEntries = includeIgnored ? await listIgnoredFiles(resolvedRoot) : [];
  const allEntries = dedupeStatusEntries([...entries, ...ignoredEntries]);
  const gitHead = (await git(resolvedRoot, ["rev-parse", "--verify", "HEAD"]).catch(() => ({ stdout: "" }))).stdout.trim() || undefined;
  const unstagedDiff = await git(resolvedRoot, ["diff", "--binary"]);
  const stagedDiff = await git(resolvedRoot, ["diff", "--cached", "--binary"]);

  await mkdir(path.join(outputDir, "files"), { recursive: true });
  const files = await copyCheckpointFiles(resolvedRoot, outputDir, allEntries);

  const result: WorkspaceCheckpointResult = {
    generatedAt,
    root: resolvedRoot,
    outputDir,
    gitHead,
    includeUntracked,
    includeIgnored,
    summary: {
      statusEntries: allEntries.length,
      copiedFiles: files.filter((file) => file.copied).length,
      deletedFiles: files.filter((file) => file.deleted).length,
      symlinks: files.filter((file) => file.symlinkTarget !== undefined).length
    },
    files,
    artifacts: {
      manifest: path.join(outputDir, "manifest.json"),
      status: path.join(outputDir, "status.txt"),
      unstagedDiff: path.join(outputDir, "unstaged.diff"),
      stagedDiff: path.join(outputDir, "staged.diff"),
      notes: path.join(outputDir, "RESTORE_NOTES.md")
    }
  };

  await writeFile(result.artifacts.status, statusOutput.stdout, "utf8");
  await writeFile(result.artifacts.unstagedDiff, unstagedDiff.stdout, "utf8");
  await writeFile(result.artifacts.stagedDiff, stagedDiff.stdout, "utf8");
  await writeFile(result.artifacts.notes, renderWorkspaceCheckpointMarkdown(result), "utf8");
  await writeFile(result.artifacts.manifest, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  return result;
}

export function renderWorkspaceCheckpointMarkdown(result: WorkspaceCheckpointResult): string {
  const lines = [
    "# trace-to-skill Workspace Checkpoint",
    "",
    `Created: ${result.generatedAt}`,
    `Root: \`${result.root}\``,
    `Git HEAD: \`${result.gitHead ?? "unborn or unavailable"}\``,
    "",
    "## Summary",
    "",
    `- Status entries: ${result.summary.statusEntries}`,
    `- Copied files: ${result.summary.copiedFiles}`,
    `- Deleted paths recorded: ${result.summary.deletedFiles}`,
    `- Symlinks recorded: ${result.summary.symlinks}`,
    `- Include untracked: ${result.includeUntracked}`,
    `- Include ignored: ${result.includeIgnored}`,
    "",
    "## What This Is",
    "",
    "This is a local pre-agent checkpoint bundle. It is meant to be created before handing a dirty workspace to Codex or another coding agent.",
    "",
    "It stores git diffs plus local copies of changed/untracked files that existed at checkpoint time. It does not automatically restore files or run destructive commands.",
    "",
    "## Restore Notes",
    "",
    "- Inspect `manifest.json`, `status.txt`, `unstaged.diff`, and `staged.diff` before restoring anything.",
    "- For tracked files, use the diffs as reviewable evidence of the checkpoint state.",
    "- For untracked files, compare the copied blobs under `files/` with the current workspace before writing anything back.",
    "- Gitignored files are excluded unless the checkpoint was created with `--include-ignored`; that option can capture secrets, so keep bundles local.",
    "- If Codex, another agent, or you changed the same file after this checkpoint, treat it as a conflict and restore manually.",
    "",
    "## Files",
    ""
  ];

  if (result.files.length === 0) {
    lines.push("No dirty, untracked, or requested ignored files were recorded.", "");
  } else {
    lines.push("| Status | Path | Copied | Deleted | Blob |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const file of result.files) {
      lines.push([
        file.status,
        file.path,
        String(file.copied),
        String(file.deleted),
        file.blob ?? file.symlinkTarget ?? ""
      ].map(escapeCell).join(" | ").replace(/^/, "| ").replace(/$/, " |"));
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

async function assertGitRepo(root: string): Promise<void> {
  const result = await git(root, ["rev-parse", "--show-toplevel"]);
  const topLevel = await realpath(result.stdout.trim());
  if (topLevel !== root) {
    throw new Error(`checkpoint root must be the git repository root: ${topLevel}`);
  }
}

async function listIgnoredFiles(root: string): Promise<StatusEntry[]> {
  const result = await git(root, ["ls-files", "--others", "--ignored", "--exclude-standard", "-z"]);
  return result.stdout
    .split("\0")
    .filter(Boolean)
    .map(normalizeRelative)
    .filter((file) => !SKIPPED_IGNORED_ROOTS.has(file.split("/")[0] ?? file))
    .map((file) => ({ status: "!!", path: normalizeRelative(file) }));
}

async function copyCheckpointFiles(root: string, outputDir: string, entries: StatusEntry[]): Promise<WorkspaceCheckpointFile[]> {
  const files: WorkspaceCheckpointFile[] = [];
  for (const entry of entries) {
    const absolutePath = path.join(root, entry.path);
    let stats;
    try {
      stats = await lstat(absolutePath);
    } catch {
      files.push({ path: entry.path, status: entry.status, copied: false, deleted: true });
      continue;
    }

    if (stats.isDirectory()) {
      continue;
    }

    if (stats.isSymbolicLink()) {
      files.push({
        path: entry.path,
        status: entry.status,
        copied: false,
        deleted: false,
        symlinkTarget: await readlink(absolutePath)
      });
      continue;
    }

    if (!stats.isFile()) {
      files.push({ path: entry.path, status: entry.status, copied: false, deleted: false });
      continue;
    }

    const blob = blobName(entry.path);
    const destination = path.join(outputDir, "files", blob);
    await copyFile(absolutePath, destination, constants.COPYFILE_FICLONE).catch(async () => {
      await copyFile(absolutePath, destination);
    });
    const copiedContent = await readFile(destination);

    files.push({
      path: entry.path,
      status: entry.status,
      copied: true,
      deleted: false,
      blob: path.join("files", blob),
      sha256: createHash("sha256").update(copiedContent).digest("hex")
    });
  }

  return files.sort((a, b) => a.path.localeCompare(b.path));
}

function parsePorcelainStatus(output: string): StatusEntry[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const status = line.slice(0, 2);
      const rawPath = line.slice(3);
      const renameParts = rawPath.split(" -> ");
      return {
        status,
        path: normalizeRelative(renameParts[renameParts.length - 1] ?? rawPath)
      };
    });
}

function dedupeStatusEntries(entries: StatusEntry[]): StatusEntry[] {
  const seen = new Set<string>();
  const deduped: StatusEntry[] = [];
  for (const entry of entries) {
    if (seen.has(entry.path)) {
      continue;
    }

    seen.add(entry.path);
    deduped.push(entry);
  }

  return deduped.sort((a, b) => a.path.localeCompare(b.path));
}

async function git(cwd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync("git", args, { cwd, maxBuffer: 20 * 1024 * 1024 });
}

function blobName(relativePath: string): string {
  const hash = createHash("sha256").update(relativePath).digest("hex").slice(0, 16);
  const basename = path.basename(relativePath).replace(/[^A-Za-z0-9._-]/g, "_") || "file";
  return `${hash}-${basename}`;
}

function normalizeRelative(value: string): string {
  return value.split(path.sep).join("/");
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|");
}
