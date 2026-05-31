# trace-to-skill Demo

Scenario: **Codex approval friction**

Repeated approval prompts, Approve for this session misses, and noisy trusted MCP tool approvals.

Fixture: `fixtures/codex-approval-friction.md`

This is a packaged public fixture, so you can try the project without collecting a private trace first.

## Generated Codex Issue Report

# OpenAI Codex Issue Triage Report

Score: **59/100**

Likely failure class: **Codex approval persistence or MCP approval friction (codex_approval_friction, high)**

Agent workflow needs clearer verification, instruction, or security hardening before broad reuse.

## Copy-Paste Issue Body

```md
### What happened?

trace-to-skill detected Codex approval persistence or MCP approval friction (codex_approval_friction). Repeated approval prompts can make Codex unusable, push users toward unsafe full-access modes, or hide whether the regression is command approval caching, file-change approval, raw MCP trust, or per-tool configuration scale.

### Detected failure class

- codex_approval_friction: Codex approval persistence or MCP approval friction (high)

### Evidence

#### Codex approval persistence or MCP approval friction
- fixtures/codex-approval-friction.md:14 - - Users report clicking approve this session again and again, then switching to Full Access because the safer scoped mode is too annoying.
- fixtures/codex-approval-friction.md:15 - - Some reports include `item/fileChange/requestApproval` and `apply_patch_approval_request`, which may be file-change approval rather than command approval.
- fixtures/codex-approval-friction.md:24 - - Browser tools such as `browser_click`, `browser_type`, and `browser_navigate` ask for confirmation dozens of times.
- fixtures/codex-approval-friction.md:25 - - Users want a per-MCP default such as `default_tools_approval_mode = "approve"` instead of hundreds of `mcp_servers.playwright.tools.browser_click.approval_mode = "approve"` entries.
- fixtures/codex-approval-friction.md:33 - - displayed command, executed command, and normalized command identity

#### Codex sandbox or permission failure
- fixtures/codex-approval-friction.md:23 - - `approval_policy = "never"` does not stop approval prompts for Playwright MCP tool calls.

### Diagnostics to attach

- When reporting Codex approval friction, capture client/app/extension version, OS and remote/WSL/SSH state, sandbox and approval_policy, exact approval scope selected, displayed command versus executed command, whether the repeat is command, file-change, patch, or MCP tool approval, MCP server name and tool names, visible tool args, persisted config snippets such as default_tools_approval_mode or per-tool approval_mode, repeated prompt count, timestamps, whether Full Access/WSL/downgrade changes behavior, and the smallest safe reproduction.
- When Codex sandbox or permission setup fails, capture the OS, Codex version, sandbox_mode, approval_policy, exact stderr, workspace ownership/ACL evidence, and whether a clean directory can run a simple command plus apply_patch.

### Privacy

- I redacted tokens, API keys, private paths, customer data, and hidden Unicode controls before sharing this trace.
```

## Findings

### 1. Codex approval persistence or MCP approval friction

Severity: **high**

Repeated approval prompts can make Codex unusable, push users toward unsafe full-access modes, or hide whether the regression is command approval caching, file-change approval, raw MCP trust, or per-tool configuration scale.

Evidence:
- `fixtures/codex-approval-friction.md:14` - Users report clicking approve this session again and again, then switching to Full Access because the safer scoped mode is too annoying.
- `fixtures/codex-approval-friction.md:15` - Some reports include `item/fileChange/requestApproval` and `apply_patch_approval_request`, which may be file-change approval rather than command approval.
- `fixtures/codex-approval-friction.md:24` - Browser tools such as `browser_click`, `browser_type`, and `browser_navigate` ask for confirmation dozens of times.
- `fixtures/codex-approval-friction.md:25` - Users want a per-MCP default such as `default_tools_approval_mode = "approve"` instead of hundreds of `mcp_servers.playwright.tools.browser_click.approval_mode = "approve"` entries.
- `fixtures/codex-approval-friction.md:33` - displayed command, executed command, and normalized command identity

Suggested rule:

> When reporting Codex approval friction, capture client/app/extension version, OS and remote/WSL/SSH state, sandbox and approval_policy, exact approval scope selected, displayed command versus executed command, whether the repeat is command, file-change, patch, or MCP tool approval, MCP server name and tool names, visible tool args, persisted config snippets such as default_tools_approval_mode or per-tool approval_mode, repeated prompt count, timestamps, whether Full Access/WSL/downgrade changes behavior, and the smallest safe reproduction.

### 2. Codex sandbox or permission failure

Severity: **high**

Sandbox setup, approval-mode, and workspace permission failures can block every tool call or leave the worktree in a broken ownership state.

Evidence:
- `fixtures/codex-approval-friction.md:23` - `approval_policy = "never"` does not stop approval prompts for Playwright MCP tool calls.

Suggested rule:

> When Codex sandbox or permission setup fails, capture the OS, Codex version, sandbox_mode, approval_policy, exact stderr, workspace ownership/ACL evidence, and whether a clean directory can run a simple command plus apply_patch.


## Reporter Notes

- Run `trace-to-skill redact <trace> --output redacted-runs` before attaching logs publicly.
- Prefer the shortest trace that reproduces the failure.
- Include exact Codex app/CLI version, OS, model, subscription/workspace, and the command or UI action that failed.
- Link related OpenAI/Codex issues when you know them, but keep the evidence self-contained.
