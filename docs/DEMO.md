# trace-to-skill Demo

Scenario: **Codex terminal output integrity**

Terminal scrollback, streamed output, or transcript rendering drops, overwrites, truncates, or makes lines inaccessible.

Fixture: `fixtures/codex-terminal-output-integrity.md`

This is a packaged public fixture, so you can try the project without collecting a private trace first.

## Generated Codex Issue Report

# OpenAI Codex Issue Triage Report

Score: **75/100**

Likely failure class: **Codex terminal output or scrollback integrity failure (codex_terminal_output_integrity, high)**

Agent workflow needs clearer verification, instruction, or security hardening before broad reuse.

## Copy-Paste Issue Body

```md
### What happened?

trace-to-skill detected Codex terminal output or scrollback integrity failure (codex_terminal_output_integrity). When Codex TUI or terminal rendering drops, overwrites, truncates, or makes transcript lines inaccessible, users lose the evidence needed to review work, copy results, and file reliable bug reports even if the underlying log still contains the data.

### Detected failure class

- codex_terminal_output_integrity: Codex terminal output or scrollback integrity failure (high)

### Evidence

#### Codex terminal output or scrollback integrity failure
- fixtures/codex-terminal-output-integrity.md:3 - This fixture uses public, token-free examples of Codex terminal output, scrollback, or transcript rendering losing evidence even when logs or transaction views still contain the missing lines.
- fixtures/codex-terminal-output-integrity.md:16 - Scrollback does not work correctly; older output disappears or cannot be accessed.
- fixtures/codex-terminal-output-integrity.md:17 - Output is sometimes overwritten or re-rendered incorrectly.
- fixtures/codex-terminal-output-integrity.md:19 - Scrolling during streaming output can cause content to be cut or misaligned.
- fixtures/codex-terminal-output-integrity.md:46 - ./repro/tmux_scrollback_repro.sh
- fixtures/codex-terminal-output-integrity.md:57 - ./repro/tmux_scrollback_repro.sh --plain

### Diagnostics to attach

- When reporting Codex terminal output or scrollback integrity failures, capture Codex CLI/app/extension version, OS, shell, terminal emulator and version, remote/WSL/SSH/tmux/Zellij state, model, whether streaming was active, exact scroll action, whether the viewport snapped to bottom, first missing or duplicated line id, raw log/transcript/transaction evidence showing the line still exists, terminal capture such as tmux capture-pane or Windows Terminal screenshot/video, reproduction script or numbered-line harness output, control run without Codex-specific escape/history insertion, terminal dimensions and scrollback settings, whether /resume or transcript mode recovers the content, and whether downgrade or another terminal changes behavior.

### Privacy

- I redacted tokens, API keys, private paths, customer data, and hidden Unicode controls before sharing this trace.
```

## Findings

### 1. Codex terminal output or scrollback integrity failure

Severity: **high**

When Codex TUI or terminal rendering drops, overwrites, truncates, or makes transcript lines inaccessible, users lose the evidence needed to review work, copy results, and file reliable bug reports even if the underlying log still contains the data.

Evidence:
- `fixtures/codex-terminal-output-integrity.md:3` This fixture uses public, token-free examples of Codex terminal output, scrollback, or transcript rendering losing evidence even when logs or transaction views still contain the missing lines.
- `fixtures/codex-terminal-output-integrity.md:16` Scrollback does not work correctly; older output disappears or cannot be accessed.
- `fixtures/codex-terminal-output-integrity.md:17` Output is sometimes overwritten or re-rendered incorrectly.
- `fixtures/codex-terminal-output-integrity.md:19` Scrolling during streaming output can cause content to be cut or misaligned.
- `fixtures/codex-terminal-output-integrity.md:46` ./repro/tmux_scrollback_repro.sh
- `fixtures/codex-terminal-output-integrity.md:57` ./repro/tmux_scrollback_repro.sh --plain
- `fixtures/codex-terminal-output-integrity.md:64` repro/tmux_scrollback_repro.sh
- `fixtures/codex-terminal-output-integrity.md:65` repro/line_truncation_repro.md

Suggested rule:

> When reporting Codex terminal output or scrollback integrity failures, capture Codex CLI/app/extension version, OS, shell, terminal emulator and version, remote/WSL/SSH/tmux/Zellij state, model, whether streaming was active, exact scroll action, whether the viewport snapped to bottom, first missing or duplicated line id, raw log/transcript/transaction evidence showing the line still exists, terminal capture such as tmux capture-pane or Windows Terminal screenshot/video, reproduction script or numbered-line harness output, control run without Codex-specific escape/history insertion, terminal dimensions and scrollback settings, whether /resume or transcript mode recovers the content, and whether downgrade or another terminal changes behavior.


## Reporter Notes

- Run `trace-to-skill redact <trace> --output redacted-runs` before attaching logs publicly.
- Prefer the shortest trace that reproduces the failure.
- Include exact Codex app/CLI version, OS, model, subscription/workspace, and the command or UI action that failed.
- Link related OpenAI/Codex issues when you know them, but keep the evidence self-contained.


## Other Demo Scenarios

- `remote-compact`: Long sessions break when `/compact` or auto-compaction times out, disconnects, or fails at `responses/compact`.
- `windows-helper-path`: Windows Desktop exposes bundled rg/node/plugin helpers from WindowsApps or missing LocalCache paths that cannot execute.
- `approval-friction`: Repeated approval prompts, Approve for this session misses, and noisy trusted MCP tool approvals.
- `latency-regression`: Fast mode feels like Standard, with long thinking, search, read, or compaction stalls.
- `thinking-hang`: A turn or tool call completes, but the session stays on Thinking or Working with no streamed follow-up.
- `clipboard-attachment`: Copy as Markdown, long-paste conversion, or generated Pasted text.txt attachments break prompt and report workflows.
- `deeplink-launch`: OAuth callbacks, notification clicks, mobile links, or `codex app <path>` external activation fail to route into Codex.
- `connector-auth-cache`: App connectors keep stale `link_*` auth or discovery metadata after reauth-required responses.
- `mcp-discovery-mismatch`: MCP servers work in CLI or one config scope but are absent in Desktop, VS Code, WSL, or project-local sessions.
- `token-burn`: Usage drains from background polling, idle activity, compaction loops, retries, or cached-heavy turns.
- `patch-overwrite`: `apply_patch` accepts `*** Add File` for an existing path, turning a create operation into a silent overwrite.
- `sensitive-files`: Secrets, local credentials, production env files, or private databases enter agent context.
- `github-prompt-injection`: Untrusted issue, PR, comment, or web text tells the agent to ignore policy or leak secrets.
- `file-tree-ui`: Desktop file tree, floating file panel, or file preview disappears, goes stale, or cannot be revealed.
- `usage-reset-drift`: Weekly or 5-hour reset dates move unexpectedly, making paid usage hard to plan or wasting saved capacity.

```bash
trace-to-skill demo --list
trace-to-skill demo remote-compact
trace-to-skill demo windows-helper-path
trace-to-skill demo patch-overwrite
trace-to-skill demo thinking-hang
trace-to-skill demo clipboard-attachment
trace-to-skill demo deeplink-launch
trace-to-skill demo connector-auth-cache
trace-to-skill demo mcp-discovery-mismatch
trace-to-skill demo terminal-output-integrity
trace-to-skill demo file-tree-ui
trace-to-skill demo usage-reset-drift
```
