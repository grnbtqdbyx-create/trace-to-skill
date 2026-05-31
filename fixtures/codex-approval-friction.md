# Codex Approval Friction Trace

Issue cluster: approval for this session is not remembered, and trusted MCP tools still ask for repeated approvals.

Environment A:
- codex-cli 0.41.0
- Native Windows 11
- Approval modal shows `Approve for this session`

Observed command approval behavior:
- User chooses `Approve for this session`, then runs the same command again.
- Codex asks for approval every time.
- The stored approval appears to match the translated PowerShell command vector instead of the displayed command the model repeats.
- Users report clicking approve this session again and again, then switching to Full Access because the safer scoped mode is too annoying.
- Some reports include `item/fileChange/requestApproval` and `apply_patch_approval_request`, which may be file-change approval rather than command approval.

Environment B:
- codex-cli 0.107.0
- Linux
- Playwright MCP configured with `approval_policy = "never"`

Observed MCP approval behavior:
- `approval_policy = "never"` does not stop approval prompts for Playwright MCP tool calls.
- Browser tools such as `browser_click`, `browser_type`, and `browser_navigate` ask for confirmation dozens of times.
- Users want a per-MCP default such as `default_tools_approval_mode = "approve"` instead of hundreds of `mcp_servers.playwright.tools.browser_click.approval_mode = "approve"` entries.
- Similar complaints mention Chrome DevTools and Obsidian MCP servers.
- Some approval prompts show too little tool argument detail to make an informed decision.

Useful diagnostics:
- client, extension, app, and CLI versions
- OS, WSL, remote SSH, and sandbox state
- selected approval scope: one-shot, session, or always
- displayed command, executed command, and normalized command identity
- MCP server name, tool name, tool args, and server trust config
- repeated approval count in one task
- whether WSL, Full Access, per-tool config, or a downgrade changes the behavior
