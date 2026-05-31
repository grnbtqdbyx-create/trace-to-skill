# trace-to-skill Demo

Scenario: **Codex clipboard and pasted-text attachment regression**

Copy as Markdown, long-paste conversion, or generated Pasted text.txt attachments break prompt and report workflows.

Fixture: `fixtures/codex-clipboard-attachment.md`

This is a packaged public fixture, so you can try the project without collecting a private trace first.

## Generated Codex Issue Report

# OpenAI Codex Issue Triage Report

Score: **75/100**

Likely failure class: **Codex clipboard, paste, or attachment workflow regression (codex_clipboard_attachment, high)**

Agent workflow needs clearer verification, instruction, or security hardening before broad reuse.

## Copy-Paste Issue Body

```md
### What happened?

trace-to-skill detected Codex clipboard, paste, or attachment workflow regression (codex_clipboard_attachment). Copy/export, long-paste conversion, and generated `Pasted text.txt` attachment regressions break the handoff loop maintainers use to preserve Codex context, file high-signal issues, and turn large prompts into direct instructions.

### Detected failure class

- codex_clipboard_attachment: Codex clipboard, paste, or attachment workflow regression (high)

### Evidence

#### Codex clipboard, paste, or attachment workflow regression
- fixtures/codex-clipboard-attachment.md:12 - - After updating to Codex Desktop 26.527, `Copy as Markdown` disappeared from the Copy submenu.
- fixtures/codex-clipboard-attachment.md:13 - - The Copy submenu only shows `Copy working directory`, `Copy session ID`, and `Copy deeplink`, which copies metadata instead of the actual Codex session or chat transcript in Markdown.
- fixtures/codex-clipboard-attachment.md:14 - - Long pasted structured implementation prompts are automatically converted into `.txt` attachments named `Pasted text.txt`.
- fixtures/codex-clipboard-attachment.md:15 - - Users need options such as `Paste as text`, `Paste as attachment`, `Convert back to prompt text`, or `Auto-convert long pasted text to attachments: Off`.
- fixtures/codex-clipboard-attachment.md:17 - - A `/goal` submit path ignored a non-empty `Pasted text.txt` attachment and treated the goal objective as empty because the visible editor text / `promptRaw` / `composer.getText()` did not include `fileAttachments`.
- fixtures/codex-clipboard-attachment.md:18 - - The generated pasted-text attachment existed on disk under `%USERPROFILE%\.codex\attachments\pasted-text-attachments.json`, with non-empty `pasted-text.txt` files such as 14963 bytes and 28029 bytes.

### Diagnostics to attach

- When reporting Codex clipboard, paste, or attachment regressions, capture app/CLI/extension version, OS, surface (Desktop, VS Code, TUI, mobile), exact copy menu items or paste action, source text size and whether it crossed an auto-attachment threshold, visible editor text before submit, generated attachment name/path/size, `pasted-text-attachments.json` or fileAttachments metadata if available, command path such as `/goal`, whether promptRaw/composer text differs from attachments, preview/edit/revert actions tried, clipboard payload format, screenshots or short screen recording, and whether paste-as-text, opt-out, new thread, downgrade, or explicit file reference changes behavior.

### Privacy

- I redacted tokens, API keys, private paths, customer data, and hidden Unicode controls before sharing this trace.
```

## Findings

### 1. Codex clipboard, paste, or attachment workflow regression

Severity: **high**

Copy/export, long-paste conversion, and generated `Pasted text.txt` attachment regressions break the handoff loop maintainers use to preserve Codex context, file high-signal issues, and turn large prompts into direct instructions.

Evidence:
- `fixtures/codex-clipboard-attachment.md:12` - After updating to Codex Desktop 26.527, `Copy as Markdown` disappeared from the Copy submenu.
- `fixtures/codex-clipboard-attachment.md:13` - The Copy submenu only shows `Copy working directory`, `Copy session ID`, and `Copy deeplink`, which copies metadata instead of the actual Codex session or chat transcript in Markdown.
- `fixtures/codex-clipboard-attachment.md:14` - Long pasted structured implementation prompts are automatically converted into `.txt` attachments named `Pasted text.txt`.
- `fixtures/codex-clipboard-attachment.md:15` - Users need options such as `Paste as text`, `Paste as attachment`, `Convert back to prompt text`, or `Auto-convert long pasted text to attachments: Off`.
- `fixtures/codex-clipboard-attachment.md:17` - A `/goal` submit path ignored a non-empty `Pasted text.txt` attachment and treated the goal objective as empty because the visible editor text / `promptRaw` / `composer.getText()` did not include `fileAttachments`.
- `fixtures/codex-clipboard-attachment.md:18` - The generated pasted-text attachment existed on disk under `%USERPROFILE%\.codex\attachments\pasted-text-attachments.json`, with non-empty `pasted-text.txt` files such as 14963 bytes and 28029 bytes.
- `fixtures/codex-clipboard-attachment.md:19` - Clicking or right-clicking `Pasted text.txt` opens Finder or an external IDE, or only generic context menu items such as `Look Up`, `Search with Google`, and `Copy`.
- `fixtures/codex-clipboard-attachment.md:20` - The attachment cannot be previewed, edited, expanded, reverted to inline prompt text, or replaced inside Codex before sending.

Suggested rule:

> When reporting Codex clipboard, paste, or attachment regressions, capture app/CLI/extension version, OS, surface (Desktop, VS Code, TUI, mobile), exact copy menu items or paste action, source text size and whether it crossed an auto-attachment threshold, visible editor text before submit, generated attachment name/path/size, `pasted-text-attachments.json` or fileAttachments metadata if available, command path such as `/goal`, whether promptRaw/composer text differs from attachments, preview/edit/revert actions tried, clipboard payload format, screenshots or short screen recording, and whether paste-as-text, opt-out, new thread, downgrade, or explicit file reference changes behavior.


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
trace-to-skill demo file-tree-ui
trace-to-skill demo usage-reset-drift
```
