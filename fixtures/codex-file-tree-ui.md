# Codex Desktop File Tree UI Failure

Source cluster:
- https://github.com/openai/codex/issues/20552

Observed environments:
- macOS Codex Desktop 26.429.20946, 26.429.30905, and 26.506.31421
- Windows 11 Codex Desktop 26.429.3425.0, 26.429.61741, and 26.506.31421

Symptoms:
- View > Toggle File Tree is enabled and shows Shift+Cmd+E, but selecting it produces no visible change.
- Ctrl+Shift+E on Windows and Cmd+Shift+E on macOS do not reveal the file tree.
- The upper-right file tree icon or folder icon is gone entirely across projects.
- The file tree panel does not appear even after restarting the app and opening a workspace.
- The floating file panel can become stale after files are renamed, moved, deleted, or added outside the conversation.
- Stale floating panel entries can become unclickable or fail to refresh.
- Built-in file preview sometimes fails to open .doc, .pdf, or .ppt files until the app restarts.
- Local persisted keys such as app-shell:right-panel-width:v2:/local/:conversationId do not appear to fix the hidden file tree state.
- Local bundle inspection suggests toggleFileTreePanel or toggle-file-tree-panel exists in the native menu, but the frontend action handler may not reliably reveal the workspace file tree.

Why it matters:
- Without a reliable file tree, users cannot inspect project structure, open files predictably, or recover navigation state.
- File cards generated in assistant responses are not enough because they depend on the model already mentioning the relevant file.
- A deterministic reveal/reset path is needed for real project work.

Diagnostics to capture:
- Codex Desktop version, OS version, CPU architecture, and whether the workspace is local, SSH, WSL, or remote.
- Exact menu item state, keyboard shortcut, and whether invoking the menu through accessibility changes anything.
- Screenshot or screen recording showing the missing file tree, missing folder icon, or stale floating file panel.
- Whether a clean profile, new workspace, app restart, or deleting local UI state changes the behavior.
- Persisted state keys related to app-shell panel widths, sidebar state, and conversation id.
- File operations used to reproduce stale entries: add, rename, move, delete, or open preview.
