# trace-to-skill Demo

Scenario: **Codex sign-in and account verification failure**

Phone verification, ChatGPT sign-in account routing, or extension chat initialization blocks Codex before a usable session starts.

Fixture: `fixtures/codex-auth-verification.md`

This is a packaged public fixture, so you can try the project without collecting a private trace first.

## Generated Codex Issue Report

# OpenAI Codex Issue Triage Report

Score: **75/100**

Likely failure class: **Codex sign-in or account verification failure (codex_auth_verification, high)**

Agent workflow needs clearer verification, instruction, or security hardening before broad reuse.

## Copy-Paste Issue Body

```md
### What happened?

trace-to-skill detected Codex sign-in or account verification failure (codex_auth_verification). Codex first-party sign-in, phone verification, account-type routing, and extension chat initialization failures block users before they can produce useful debugging traces; reports need account surface and verification evidence without exposing tokens or phone numbers.

### Detected failure class

- codex_auth_verification: Codex sign-in or account verification failure (high)

### Evidence

#### Codex sign-in or account verification failure
- fixtures/codex-auth-verification.md:5 - - Phone number verification doesn't work after logging out on one device and signing in on another device with SSO.
- fixtures/codex-auth-verification.md:6 - - The Codex sign-in screen asks for phone verification even though the ChatGPT account normally uses Google or Apple SSO.
- fixtures/codex-auth-verification.md:7 - - The SMS verification code is not received, shows `invalid_phone_number`, or the user gets a phone call from random numbers instead of a predictable verification code.
- fixtures/codex-auth-verification.md:8 - - "Sign in With ChatGPT" needs to be robust across Plus, Pro, Teams, Enterprise, personal workspace, and organization-verified account types.
- fixtures/codex-auth-verification.md:10 - - In the VS Code extension, a new chat shows "Error starting conversation" while initializing a chat after sign-in.

### Diagnostics to attach

- When reporting Codex sign-in or account-verification failures, capture the Codex app/CLI/extension version, surface, OS, account type without secrets, workspace or organization context, SSO provider, whether the flow is ChatGPT sign-in, phone/SMS/OTP verification, or extension chat initialization, exact redacted error text, timestamps, whether another device/browser/account works, logout/login attempts, and screenshots with phone numbers, tokens, and email addresses redacted.

### Privacy

- I redacted tokens, API keys, private paths, customer data, and hidden Unicode controls before sharing this trace.
```

## Findings

### 1. Codex sign-in or account verification failure

Severity: **high**

Codex first-party sign-in, phone verification, account-type routing, and extension chat initialization failures block users before they can produce useful debugging traces; reports need account surface and verification evidence without exposing tokens or phone numbers.

Evidence:
- `fixtures/codex-auth-verification.md:5` - Phone number verification doesn't work after logging out on one device and signing in on another device with SSO.
- `fixtures/codex-auth-verification.md:6` - The Codex sign-in screen asks for phone verification even though the ChatGPT account normally uses Google or Apple SSO.
- `fixtures/codex-auth-verification.md:7` - The SMS verification code is not received, shows `invalid_phone_number`, or the user gets a phone call from random numbers instead of a predictable verification code.
- `fixtures/codex-auth-verification.md:8` - "Sign in With ChatGPT" needs to be robust across Plus, Pro, Teams, Enterprise, personal workspace, and organization-verified account types.
- `fixtures/codex-auth-verification.md:10` - In the VS Code extension, a new chat shows "Error starting conversation" while initializing a chat after sign-in.

Suggested rule:

> When reporting Codex sign-in or account-verification failures, capture the Codex app/CLI/extension version, surface, OS, account type without secrets, workspace or organization context, SSO provider, whether the flow is ChatGPT sign-in, phone/SMS/OTP verification, or extension chat initialization, exact redacted error text, timestamps, whether another device/browser/account works, logout/login attempts, and screenshots with phone numbers, tokens, and email addresses redacted.


## Reporter Notes

- Run `trace-to-skill redact <trace> --output redacted-runs` before attaching logs publicly.
- Prefer the shortest trace that reproduces the failure.
- Include exact Codex app/CLI version, OS, model, subscription/workspace, and the command or UI action that failed.
- Link related OpenAI/Codex issues when you know them, but keep the evidence self-contained.


## Other Demo Scenarios

- `remote-compact`: Long sessions break when `/compact` or auto-compaction times out, disconnects, or fails at `responses/compact`.
- `context-fork-bloat`: Conversation forks duplicate parent transcript blocks, inflate token usage, or break prompt-cache lineage before new work happens.
- `subagent-prompt-leakage`: MultiAgentV2 child agents receive assistant/commentary prompt envelopes or sibling prompts despite `fork_turns: "none"`.
- `windows-helper-path`: Windows Desktop exposes bundled rg/node/plugin helpers from WindowsApps or missing LocalCache paths that cannot execute.
- `approval-friction`: Repeated approval prompts, Approve for this session misses, and noisy trusted MCP tool approvals.
- `latency-regression`: Fast mode feels like Standard, with long thinking, search, read, or compaction stalls.
- `thinking-hang`: A turn or tool call completes, but the session stays on Thinking or Working with no streamed follow-up.
- `clipboard-attachment`: Copy as Markdown, long-paste conversion, or generated Pasted text.txt attachments break prompt and report workflows.
- `deeplink-launch`: OAuth callbacks, notification clicks, mobile links, or `codex app <path>` external activation fail to route into Codex.
- `connector-auth-cache`: App connectors keep stale `link_*` auth or discovery metadata after reauth-required responses.
- `mcp-discovery-mismatch`: MCP servers work in CLI or one config scope but are absent in Desktop, VS Code, WSL, or project-local sessions.
- `mcp-streamable-http`: Streamable HTTP or SSE MCP servers pass initialize or tools/list but fail parsing, handshakes, auth gating, stale sessions, or reconnects.
- `hooks-runtime`: Hooks duplicate, stop firing, warn about stale config, skip surfaces, or become hard to manage in Desktop settings.
- `terminal-output-integrity`: Terminal scrollback, streamed output, or transcript rendering drops, overwrites, truncates, or makes lines inaccessible.
- `subagent-lifecycle`: Completed, closed, stale, or interrupted subagents diverge between UI, live registry, persisted state, quota, and parent discoverability.
- `usage-bucket-confusion`: Usage popovers show 5h and weekly percentages without clear remaining/used, rolling/calendar, or account/workspace scope.
- `token-burn`: Usage drains from background polling, idle activity, compaction loops, retries, or cached-heavy turns.
- `patch-overwrite`: `apply_patch` accepts `*** Add File` for an existing path, turning a create operation into a silent overwrite.
- `sensitive-files`: Secrets, local credentials, production env files, or private databases enter agent context.
- `github-prompt-injection`: Untrusted issue, PR, comment, or web text tells the agent to ignore policy or leak secrets.
- `file-tree-ui`: Desktop file tree, floating file panel, or file preview disappears, goes stale, or cannot be revealed.
- `usage-reset-drift`: Weekly or 5-hour reset dates move unexpectedly, making paid usage hard to plan or wasting saved capacity.

```bash
trace-to-skill demo --list
trace-to-skill demo remote-compact
trace-to-skill demo context-fork-bloat
trace-to-skill demo subagent-prompt-leakage
trace-to-skill demo windows-helper-path
trace-to-skill demo patch-overwrite
trace-to-skill demo thinking-hang
trace-to-skill demo clipboard-attachment
trace-to-skill demo deeplink-launch
trace-to-skill demo connector-auth-cache
trace-to-skill demo mcp-discovery-mismatch
trace-to-skill demo mcp-streamable-http
trace-to-skill demo hooks-runtime
trace-to-skill demo terminal-output-integrity
trace-to-skill demo subagent-lifecycle
trace-to-skill demo usage-bucket-confusion
trace-to-skill demo file-tree-ui
trace-to-skill demo usage-reset-drift
```
