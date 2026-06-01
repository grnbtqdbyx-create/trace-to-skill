# trace-to-skill Demo

Scenario: **Codex platform availability gap**

Codex Desktop, Linux app, or JetBrains extension demand is blocked by unsupported architecture, OS, package, or IDE surface.

Fixture: `fixtures/codex-platform-availability.md`

This is a packaged public fixture, so you can try the project without collecting a private trace first.

## Generated Codex Issue Report

# OpenAI Codex Issue Triage Report

Score: **75/100**

Likely failure class: **Codex platform availability or unsupported surface (codex_platform_availability, high)**

Agent workflow needs clearer verification, instruction, or security hardening before broad reuse.

## Copy-Paste Issue Body

```md
### What happened?

trace-to-skill detected Codex platform availability or unsupported surface (codex_platform_availability). Codex adoption is blocked when the CLI works but the official Desktop app, IDE extension, or packaged build is unavailable for a user's platform, architecture, distro, or IDE ecosystem.

### Detected failure class

- codex_platform_availability: Codex platform availability or unsupported surface (high)

### Evidence

#### Codex platform availability or unsupported surface
- fixtures/codex-platform-availability.md:3 - Public issue cluster: Codex Desktop App macOS Intel support, Codex desktop app for Linux, and JetBrains IDE extension demand.
- fixtures/codex-platform-availability.md:7 - - A user requests macOS Intel x86_64 support for the Codex Desktop App or a Universal build with arm64 + x86_64.
- fixtures/codex-platform-availability.md:8 - - Environment evidence: Intel Mac, `uname -m => x86_64`, macOS 13/14/15, Codex `.dmg`, and `Codex.app`.
- fixtures/codex-platform-availability.md:9 - - When the `.dmg` is mounted, `Codex.app` shows the prohibited symbol and macOS says the app can't run on this Mac because of incompatible architecture.
- fixtures/codex-platform-availability.md:10 - - Codex CLI works fine on the same machine, but the desktop app cannot launch: `which codex => /usr/local/bin/codex` and `codex --version => codex-cli 0.58.0`.
- fixtures/codex-platform-availability.md:16 - - Users ask for an official Codex desktop app on Linux because they want the app experience on Ubuntu, Arch, NixOS, Fedora, Debian, Wayland, and X11 desktops.

### Diagnostics to attach

- When reporting Codex platform availability gaps, capture requested surface (Desktop app, IDE extension, or packaged build), platform and architecture such as macOS Intel x86_64 or Linux distro/window system, install artifact and version, exact launch/install error, screenshot text such as prohibited icon or incompatible architecture, CLI version and whether CLI works on the same machine, alternative surfaces tried, package format requested, ecosystem workflow such as JetBrains/PyCharm/IntelliJ, demand evidence from comments/reactions or signup forms, and whether docs/release notes state the support policy.

### Privacy

- I redacted tokens, API keys, private paths, customer data, and hidden Unicode controls before sharing this trace.
```

## Findings

### 1. Codex platform availability or unsupported surface

Severity: **high**

Codex adoption is blocked when the CLI works but the official Desktop app, IDE extension, or packaged build is unavailable for a user's platform, architecture, distro, or IDE ecosystem.

Evidence:
- `fixtures/codex-platform-availability.md:3` Public issue cluster: Codex Desktop App macOS Intel support, Codex desktop app for Linux, and JetBrains IDE extension demand.
- `fixtures/codex-platform-availability.md:7` - A user requests macOS Intel x86_64 support for the Codex Desktop App or a Universal build with arm64 + x86_64.
- `fixtures/codex-platform-availability.md:8` - Environment evidence: Intel Mac, `uname -m => x86_64`, macOS 13/14/15, Codex `.dmg`, and `Codex.app`.
- `fixtures/codex-platform-availability.md:9` - When the `.dmg` is mounted, `Codex.app` shows the prohibited symbol and macOS says the app can't run on this Mac because of incompatible architecture.
- `fixtures/codex-platform-availability.md:10` - Codex CLI works fine on the same machine, but the desktop app cannot launch: `which codex => /usr/local/bin/codex` and `codex --version => codex-cli 0.58.0`.
- `fixtures/codex-platform-availability.md:16` - Users ask for an official Codex desktop app on Linux because they want the app experience on Ubuntu, Arch, NixOS, Fedora, Debian, Wayland, and X11 desktops.
- `fixtures/codex-platform-availability.md:21` ## JetBrains IDE Extension
- `fixtures/codex-platform-availability.md:23` - Users request an official Codex extension or plugin for JetBrains IDEs such as PyCharm, IntelliJ, WebStorm, CLion, and Rider.

Suggested rule:

> When reporting Codex platform availability gaps, capture requested surface (Desktop app, IDE extension, or packaged build), platform and architecture such as macOS Intel x86_64 or Linux distro/window system, install artifact and version, exact launch/install error, screenshot text such as prohibited icon or incompatible architecture, CLI version and whether CLI works on the same machine, alternative surfaces tried, package format requested, ecosystem workflow such as JetBrains/PyCharm/IntelliJ, demand evidence from comments/reactions or signup forms, and whether docs/release notes state the support policy.


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
- `model-routing-mismatch`: Codex shows one selected model while SSE response evidence shows a different server-side model was used.
- `thinking-hang`: A turn or tool call completes, but the session stays on Thinking or Working with no streamed follow-up.
- `cli-no-response`: Codex CLI accepts prompts but produces no streaming output, no error, no timeout, or hangs during command execution.
- `clipboard-attachment`: Copy as Markdown, long-paste conversion, or generated Pasted text.txt attachments break prompt and report workflows.
- `deeplink-launch`: OAuth callbacks, notification clicks, mobile links, or `codex app <path>` external activation fail to route into Codex.
- `connector-auth-cache`: App connectors keep stale `link_*` auth or discovery metadata after reauth-required responses.
- `auth-verification`: Phone verification, ChatGPT sign-in account routing, or extension chat initialization blocks Codex before a usable session starts.
- `mcp-discovery-mismatch`: MCP servers work in CLI or one config scope but are absent in Desktop, VS Code, WSL, or project-local sessions.
- `mcp-streamable-http`: Streamable HTTP or SSE MCP servers pass initialize or tools/list but fail parsing, handshakes, auth gating, stale sessions, or reconnects.
- `hooks-runtime`: Hooks duplicate, stop firing, warn about stale config, skip surfaces, or become hard to manage in Desktop settings.
- `terminal-output-integrity`: Terminal scrollback, streamed output, or transcript rendering drops, overwrites, truncates, or makes lines inaccessible.
- `subagent-lifecycle`: Completed, closed, stale, or interrupted subagents diverge between UI, live registry, persisted state, quota, and parent discoverability.
- `usage-bucket-confusion`: Usage popovers show 5h and weekly percentages without clear remaining/used, rolling/calendar, or account/workspace scope.
- `context-visibility`: Desktop context or token usage indicators disappear, leaving long-session compaction pressure invisible.
- `remote-connection`: Desktop remote SSH workspaces, Settings > Connections, remote app-server, tunnel, or remote filesystem evidence breaks.
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
trace-to-skill demo cli-no-response
trace-to-skill demo clipboard-attachment
trace-to-skill demo deeplink-launch
trace-to-skill demo connector-auth-cache
trace-to-skill demo mcp-discovery-mismatch
trace-to-skill demo mcp-streamable-http
trace-to-skill demo hooks-runtime
trace-to-skill demo terminal-output-integrity
trace-to-skill demo subagent-lifecycle
trace-to-skill demo usage-bucket-confusion
trace-to-skill demo context-visibility
trace-to-skill demo remote-connection
trace-to-skill demo platform-availability
trace-to-skill demo file-tree-ui
trace-to-skill demo usage-reset-drift
```
