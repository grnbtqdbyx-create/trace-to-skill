import { readFile } from "node:fs/promises";
import { analyzeInputs } from "./analyze.js";
import type { AnalysisResult, TraceInput } from "./types.js";

export interface GithubContextResult extends AnalysisResult {
  eventPath: string;
}

export async function analyzeGithubEventContext(eventPath: string): Promise<GithubContextResult> {
  const raw = await readFile(eventPath, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  const inputs = extractGithubContextInputs(parsed);
  const result = analyzeInputs(inputs);

  return {
    ...result,
    eventPath
  };
}

export function extractGithubContextInputs(event: unknown): TraceInput[] {
  const root = asObject(event);
  if (!root) {
    return [];
  }

  const inputs: TraceInput[] = [];
  addObjectText(inputs, "github-event/action", root, ["action"]);
  addObjectText(inputs, "github-event/pull_request", root.pull_request, ["title", "body"]);
  addObjectText(inputs, "github-event/issue", root.issue, ["title", "body"]);
  addObjectText(inputs, "github-event/comment", root.comment, ["body"]);
  addObjectText(inputs, "github-event/discussion", root.discussion, ["title", "body"]);
  addObjectText(inputs, "github-event/review", root.review, ["body"]);
  addObjectText(inputs, "github-event/check_run", asObject(root.check_run)?.output, ["title", "summary", "text"]);

  const commits = Array.isArray(root.commits) ? root.commits : [];
  commits.slice(0, 20).forEach((commit, index) => {
    addObjectText(inputs, `github-event/commit-${index + 1}`, commit, ["message"]);
  });

  return inputs.length > 0 ? inputs : [{
    path: "github-event/empty",
    content: "No supported GitHub event text fields found."
  }];
}

function addObjectText(inputs: TraceInput[], label: string, value: unknown, keys: string[]): void {
  const object = asObject(value);
  if (!object) {
    return;
  }

  const lines: string[] = [];
  for (const key of keys) {
    const text = stringValue(object[key]);
    if (text) {
      lines.push(`${key}: ${text}`);
    }
  }

  if (lines.length > 0) {
    inputs.push({
      path: label,
      content: lines.join("\n")
    });
  }
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function asObject(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}
