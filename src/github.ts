import { readFile } from "node:fs/promises";

interface GitHubCommentOptions {
  token?: string;
  repository?: string;
  eventPath?: string;
  body: string;
  dryRun?: boolean;
  marker?: string;
  reportName?: string;
}

interface GitHubIssueCommentOptions extends Omit<GitHubCommentOptions, "eventPath"> {
  issueNumber: number;
}

interface ExistingComment {
  id: number;
  body?: string;
  user?: {
    type?: string;
  };
}

const MARKER = "<!-- trace-to-skill-report -->";

export async function postPullRequestComment(options: GitHubCommentOptions): Promise<string> {
  const token = options.token ?? process.env.GITHUB_TOKEN;
  const repository = options.repository ?? process.env.GITHUB_REPOSITORY;
  const eventPath = options.eventPath ?? process.env.GITHUB_EVENT_PATH;
  const marker = options.marker ?? MARKER;
  const reportName = options.reportName ?? "trace-to-skill report";

  if (!repository) {
    throw new Error("GITHUB_REPOSITORY is required for PR comments.");
  }

  const pullNumber = await resolvePullRequestNumber(eventPath);
  if (!pullNumber) {
    throw new Error("No pull_request number found in GITHUB_EVENT_PATH.");
  }

  if (options.dryRun) {
    return `dry-run: would post ${reportName} to ${repository}#${pullNumber}`;
  }

  if (!token) {
    throw new Error("GITHUB_TOKEN is required for PR comments.");
  }

  const commentsUrl = `https://api.github.com/repos/${repository}/issues/${pullNumber}/comments`;
  const comments = (await githubRequest(commentsUrl, token)) as ExistingComment[];
  const existing = comments.find((comment) => comment.user?.type === "Bot" && comment.body?.includes(marker));

  if (existing) {
    await githubRequest(`https://api.github.com/repos/${repository}/issues/comments/${existing.id}`, token, {
      method: "PATCH",
      body: JSON.stringify({ body: options.body })
    });
    return `updated ${reportName} comment on ${repository}#${pullNumber}`;
  }

  await githubRequest(commentsUrl, token, {
    method: "POST",
    body: JSON.stringify({ body: options.body })
  });

  return `posted ${reportName} comment on ${repository}#${pullNumber}`;
}

export async function postIssueComment(options: GitHubIssueCommentOptions): Promise<string> {
  const token = options.token ?? process.env.GITHUB_TOKEN;
  const repository = options.repository ?? process.env.GITHUB_REPOSITORY;
  const marker = options.marker ?? MARKER;
  const reportName = options.reportName ?? "trace-to-skill report";

  if (!repository) {
    throw new Error("GITHUB_REPOSITORY is required for issue comments.");
  }

  if (!Number.isInteger(options.issueNumber) || options.issueNumber < 1) {
    throw new Error("--issue-number must be a positive integer.");
  }

  if (options.dryRun) {
    return `dry-run: would post ${reportName} to ${repository}#${options.issueNumber}`;
  }

  if (!token) {
    throw new Error("GITHUB_TOKEN is required for issue comments.");
  }

  const commentsUrl = `https://api.github.com/repos/${repository}/issues/${options.issueNumber}/comments`;
  const comments = (await githubRequest(commentsUrl, token)) as ExistingComment[];
  const existing = comments.find((comment) => comment.user?.type === "Bot" && comment.body?.includes(marker));

  if (existing) {
    await githubRequest(`https://api.github.com/repos/${repository}/issues/comments/${existing.id}`, token, {
      method: "PATCH",
      body: JSON.stringify({ body: options.body })
    });
    return `updated ${reportName} comment on ${repository}#${options.issueNumber}`;
  }

  await githubRequest(commentsUrl, token, {
    method: "POST",
    body: JSON.stringify({ body: options.body })
  });

  return `posted ${reportName} comment on ${repository}#${options.issueNumber}`;
}

async function resolvePullRequestNumber(eventPath: string | undefined): Promise<number | undefined> {
  if (!eventPath) {
    return undefined;
  }

  const event = JSON.parse(await readFile(eventPath, "utf8")) as {
    pull_request?: {
      number?: number;
    };
    number?: number;
  };

  return event.pull_request?.number ?? event.number;
}

async function githubRequest(url: string, token: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "trace-to-skill",
      "X-GitHub-Api-Version": "2022-11-28",
      ...init.headers
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API ${response.status}: ${text.slice(0, 500)}`);
  }

  if (response.status === 204) {
    return undefined;
  }

  return response.json();
}
