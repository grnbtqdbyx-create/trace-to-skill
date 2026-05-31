import { promises as fs } from "node:fs";
import path from "node:path";
import type { TraceInput } from "./types.js";

const SUPPORTED_EXTENSIONS = new Set([".txt", ".log", ".md", ".json", ".jsonl"]);

export async function loadTraceInputs(targets: string[]): Promise<TraceInput[]> {
  const expanded: TraceInput[] = [];

  for (const target of targets.length > 0 ? targets : [process.cwd()]) {
    const absolute = path.resolve(target);
    const stats = await fs.stat(absolute);

    if (stats.isDirectory()) {
      expanded.push(...(await loadDirectory(absolute)));
    } else {
      expanded.push(await loadFile(absolute));
    }
  }

  return expanded.sort((a, b) => a.path.localeCompare(b.path));
}

async function loadDirectory(dir: string): Promise<TraceInput[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const inputs: TraceInput[] = [];

  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      inputs.push(...(await loadDirectory(fullPath)));
      continue;
    }

    if (entry.isFile() && SUPPORTED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      inputs.push(await loadFile(fullPath));
    }
  }

  return inputs;
}

async function loadFile(filePath: string): Promise<TraceInput> {
  const raw = await fs.readFile(filePath, "utf8");
  return {
    path: path.relative(process.cwd(), filePath),
    content: normalizeJsonl(raw)
  };
}

function normalizeJsonl(raw: string): string {
  const lines = raw.split(/\r?\n/);
  const normalized = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) {
      return line;
    }

    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      return extractJsonMessage(parsed) ?? line;
    } catch {
      return line;
    }
  });

  return normalized.join("\n");
}

function extractJsonMessage(value: Record<string, unknown>): string | undefined {
  for (const key of ["message", "content", "text", "output", "error"]) {
    const candidate = value[key];
    if (typeof candidate === "string") {
      return candidate;
    }
  }

  const nested = value.item ?? value.event ?? value.payload;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return extractJsonMessage(nested as Record<string, unknown>);
  }

  return undefined;
}
