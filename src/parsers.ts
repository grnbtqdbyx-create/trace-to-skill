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
      return extractTraceLine(parsed) ?? line;
    } catch {
      return line;
    }
  });

  return normalized.join("\n");
}

function extractTraceLine(value: Record<string, unknown>): string | undefined {
  const timestamp = typeof value.timestamp === "string" ? value.timestamp : undefined;
  const type = typeof value.type === "string" ? value.type : undefined;
  const payload = asObject(value.payload);

  if (type === "response_item" && payload) {
    const payloadType = typeof payload.type === "string" ? payload.type : "response_item";
    const role = typeof payload.role === "string" ? payload.role : undefined;

    if (payloadType === "function_call") {
      const name = typeof payload.name === "string" ? payload.name : "function_call";
      const args = stringifyUnknown(payload.arguments);
      return joinParts(timestamp, "tool_call", name, args);
    }

    if (payloadType === "function_call_output") {
      return joinParts(timestamp, "tool_output", extractText(payload.output) ?? stringifyUnknown(payload.output));
    }

    const text = extractText(payload.content) ?? extractText(payload.summary);
    if (text) {
      return joinParts(timestamp, payloadType, role, text);
    }
  }

  if (type === "event_msg" && payload) {
    const payloadType = typeof payload.type === "string" ? payload.type : "event_msg";
    const text = extractText(payload.message) ?? extractText(payload.content) ?? extractText(payload.text);
    if (text) {
      return joinParts(timestamp, payloadType, text);
    }

    if (payloadType === "token_count") {
      return joinParts(timestamp, payloadType, stringifyUnknown(payload));
    }
  }

  return extractText(value);
}

function extractText(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    const parts = value.map((item) => extractText(item)).filter((item): item is string => Boolean(item));
    return parts.length > 0 ? parts.join("\n") : undefined;
  }

  const object = asObject(value);
  if (!object) {
    return undefined;
  }

  for (const key of ["message", "content", "text", "output", "error", "summary"]) {
    const candidate = object[key];
    const text = extractText(candidate);
    if (text) {
      return text;
    }
  }

  const nested = object.item ?? object.event ?? object.payload ?? object.delta;
  const nestedObject = asObject(nested);
  if (nestedObject) {
    return extractText(nestedObject);
  }

  return undefined;
}

function joinParts(...parts: Array<string | undefined>): string {
  return parts.filter((part): part is string => Boolean(part && part.trim().length > 0)).join(" ");
}

function stringifyUnknown(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function asObject(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}
