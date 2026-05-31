# Failure Taxonomy

These are the first failure classes `trace-to-skill` detects.

## Premature Completion

The agent claims a task is done without verifiable command output, test names, screenshots, or reviewer-ready evidence.

## Tests Not Run

The agent changes code but skips validation, usually with language like "change looked small" or "not run".

## Test Failure

A test, build, typecheck, lint, or smoke command failed. The agent should continue the fix loop or report a precise blocker.

## Hallucinated File

The trace references a missing path, missing module, or nonexistent file. The fix is usually a repository navigation rule.

## Instruction Drift

Agent instruction files disagree or the agent ignores an existing repository rule.

## Over-Editing

The diff touches too many files for the requested task without matching plan and validation evidence.

## Unsafe Command

Destructive shell commands, privilege escalation, or remote script execution patterns appear in the trace.

## Secret Exposure

Credentials, API keys, or tokens appear in traces or reports.

## Hidden Unicode

Bidirectional or zero-width Unicode control characters appear in agent-visible instructions or patches.

## MCP Risk

MCP server configuration or tool usage appears without an explicit trust boundary, capability inventory, or approval policy.

`trace-to-skill` also parses common `mcpServers` JSON shapes and reports capability hints such as filesystem, shell, browser, network, database, container, and secret-bearing environment variables.
