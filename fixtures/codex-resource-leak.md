# Codex Resource Leak Trace

User report:

Codex Desktop leaves orphaned shell-snapshot subprocesses burning CPU after the session exits.

```text
Codex Desktop 26.527.31326 on macOS 26.5 arm64.
Multiple orphaned /bin/zsh shell-snapshot processes have PPID 1 under launchd.
PID 77383 is running the print '# Snapshot file' command from ~/.codex/shell_snapshots and uses 97% CPU for 22 minutes.
~/.codex/process_manager/chat_processes.json still has stale entries.
After killing those exact PIDs, pgrep -lf "print '# Snapshot file'" returns nothing and load average begins dropping.
```

Second report:

```text
VS Code Codex extension 26.325.31654 on macOS shows Code Helper (Plugin) at 136% CPU.
Codex.log repeats thread-stream-state-changed with no handler thousands of times.
The high CPU loop stops when the Codex panel is closed.
```

Third report:

```text
Codex App thinking shimmer animation drives GPU utilization to 70%.
Hiding the sidebar or enabling reduce motion drops GPU usage back near zero.
```
