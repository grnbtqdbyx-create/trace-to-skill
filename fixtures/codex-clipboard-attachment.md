# Codex Clipboard And Pasted-Text Attachment Fixture

Issue cluster: Codex Desktop and extension workflows around copy/export, long pasted prompts, and generated `Pasted text.txt` attachments changed in ways that make session handoff and bug reporting harder.

Environment:
- Codex Desktop 26.527.31326 on macOS
- Codex Desktop 26.527.3686.0 on Windows 11
- ChatGPT Pro and local Desktop workflows
- Surfaces: Copy menu, prompt composer, generated text attachments, and `/goal`

Observed behavior:
- After updating to Codex Desktop 26.527, `Copy as Markdown` disappeared from the Copy submenu.
- The Copy submenu only shows `Copy working directory`, `Copy session ID`, and `Copy deeplink`, which copies metadata instead of the actual Codex session or chat transcript in Markdown.
- Long pasted structured implementation prompts are automatically converted into `.txt` attachments named `Pasted text.txt`.
- Users need options such as `Paste as text`, `Paste as attachment`, `Convert back to prompt text`, or `Auto-convert long pasted text to attachments: Off`.
- The pasted text is the actual instruction, not background context, so hiding it in an attachment changes the agent workflow and makes session titles/history less useful.
- A `/goal` submit path ignored a non-empty `Pasted text.txt` attachment and treated the goal objective as empty because the visible editor text / `promptRaw` / `composer.getText()` did not include `fileAttachments`.
- The generated pasted-text attachment existed on disk under `%USERPROFILE%\.codex\attachments\pasted-text-attachments.json`, with non-empty `pasted-text.txt` files such as 14963 bytes and 28029 bytes.
- Clicking or right-clicking `Pasted text.txt` opens Finder or an external IDE, or only generic context menu items such as `Look Up`, `Search with Google`, and `Copy`.
- The attachment cannot be previewed, edited, expanded, reverted to inline prompt text, or replaced inside Codex before sending.

What would make this report useful:
- exact app, CLI, or extension version
- OS and surface: Desktop, VS Code, TUI, or mobile
- exact Copy menu items shown and whether `Copy as Markdown` or transcript export is present
- source text size, paste source, and whether it crossed an auto-attachment threshold
- visible editor text before submit and generated attachment name/path/size
- `pasted-text-attachments.json`, `fileAttachments`, or attachment registry metadata when available
- command path such as `/goal`, normal submit, or goal mode
- whether `promptRaw`, `composer.getText()`, or the final input differs from attached file content
- preview, edit, expand, revert, remove, and context-menu actions tried
- clipboard payload format and whether Markdown code blocks are preserved
- whether paste-as-text, opt-out, explicit file reference, new thread, or downgrade changes behavior
