# Codex terminal output integrity fixture

This fixture uses public, token-free examples of Codex terminal output, scrollback, or transcript rendering losing evidence even when logs or transaction views still contain the missing lines.

## Windows Terminal scrollback loss

Environment:

- Codex CLI 0.116.0 through 0.135.0 reports
- Windows Terminal with PowerShell or WSL
- Some reports also mention Ghostty, Zellij, tmux, and Linux terminals

Observed behavior:

```text
Scrollback does not work correctly; older output disappears or cannot be accessed.
Output is sometimes overwritten or re-rendered incorrectly.
Text may appear duplicated or partially missing.
Scrolling during streaming output can cause content to be cut or misaligned.
The content only disappears from the UI; it is still present in Codex context and transaction/log view.
```

## Streaming output overwrites older visible transcript

Reproduction pattern:

```text
Start Codex in PowerShell.
Ask for a response that streams for a while.
While the assistant is streaming a reply, use the mouse wheel to scroll upward.
Older visible lines start disappearing, being swallowed, shifted, or overwritten.
As more tokens arrive, a larger portion of the older visible transcript is affected.
```

Expected:

```text
Once I scroll up to inspect previous history, new streaming output should not progressively overwrite the older visible lines I am currently looking at.
```

## Deterministic missing-line harness

A repro harness emitted numbered stream lines with a Codex-like history insertion escape pattern:

```text
./repro/tmux_scrollback_repro.sh
capture_file=/tmp/codex-scroll-repro/capture.txt
missing_file=/tmp/codex-scroll-repro/missing.txt
missing_count=1
missing_examples:
S-0391
```

The control run did not lose lines:

```text
./repro/tmux_scrollback_repro.sh --plain
missing_count=0
```

Related artifacts included:

```text
repro/tmux_scrollback_repro.sh
repro/line_truncation_repro.md
codex-rs/tui/tests/suite/vt100_history.rs
incremental_stream_history_keeps_all_numbered_lines
```

## Planner and approval scroll snap

```text
In planner mode, after Codex prints a long plan and shows approval choices, scrolling up does not stay up.
The viewport snaps back to the bottom.
Earlier output becomes inaccessible in scrollback.
Ctrl+T transcript mode stopped working while waiting for approval.
I can no longer scroll up or copy the full response.
```

The report should include Codex CLI/app/extension version, OS, shell, terminal emulator and version, remote/WSL/SSH/tmux/Zellij state, model, whether streaming was active, exact scroll action, whether the viewport snapped to bottom, first missing or duplicated line id, raw log/transcript/transaction evidence showing the line still exists, terminal capture such as `tmux capture-pane` or Windows Terminal screenshot/video, reproduction script or numbered-line harness output, control run without Codex-specific escape/history insertion, terminal dimensions and scrollback settings, whether `/resume` or transcript mode recovers the content, and whether downgrade or another terminal changes behavior.
