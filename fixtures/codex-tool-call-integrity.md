# Codex Tool-Call Integrity Trace

User report:

Codex CLI 0.135.0 on Linux reproduced a tool-level patch safety bug:

```text
apply_patch accepted *** Add File for an existing file and silently overwrote the original contents.
The target path already existed, but the result said "Success. Updated the following files: A existing.txt".
This is worse when the existing file is a symlink, because Add File can replace the linked target contents.
Expected behavior: Add File should fail when the target already exists.
```

Second report:

```text
Codex App returned invalid_request_error:
An assistant message with 'tool_calls' must be followed by tool messages responding to each 'tool_call_id'.
The task stopped after generating a presentation and did not produce a matching tool message for every tool_call_id.
```

Third report:

```text
multi_agent_v1.close_agent can hang forever after durable thread_spawn_edges status is already closed.
The child thread was interrupted, close_agent never returns, and later spawn_agent fails with agent thread limit reached because the registry slot is still counted.
```

Fourth report:

```text
VS Code Codex extension deleted uncommitted code and the revert changes button showed "Failed to revert changes".
The undo button stopped working, so the user had to manually restore code from the conversation history.
```
