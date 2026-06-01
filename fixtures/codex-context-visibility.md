# Codex context visibility fixture

## Public-style issue signals

- Codex Desktop no longer shows a visible context/token usage indicator in the chat UI after an update.
- Previously the app exposed context usage information, context-window pressure, or a tooltip near the input area.
- The current desktop app experience makes it difficult to understand how much context is being used, when compaction is likely, or whether a long-running session is approaching a practical context limit.
- `/status` is useful as an explicit command, but it is not a replacement for passive context awareness during long-running desktop threads.
- The missing indicator affects professional coding workflows because users cannot tell when to compact, start a new thread, reduce pasted context, or split work before context loss.
- A related report says the data exists in local session logs, but the app no longer exposes it passively.

## Evidence checklist

- Codex Desktop version, OS, subscription, and surface.
- Screenshot or short recording of the chat input area where the context indicator or tooltip used to appear.
- Prior version where the context/token indicator was visible, current version where it is hidden or missing, and whether CLI/TUI still exposes a statusline.
- Local session metadata or `/status` output if available, with private paths and account details redacted.
- How the missing indicator affects long-session compaction, context-loss, or thread-splitting decisions.
