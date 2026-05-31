# Codex sandbox permission failure fixture

## Failed shell command

The session could not start a simple command:

```text
execution error: Io(Custom { kind: Other, error: "windows sandbox: setup refresh failed with status exit code: 1" })
```

Another run failed earlier in the tool startup path:

```text
node_repl kernel exited unexpectedly
kernel_stderr_tail: "windows sandbox failed: spawn setup refresh"
os error 740
```

## Workspace ownership drift

After switching from Full Access to workspace-write, the project directory owner changed to `CodexSandboxOffline`.
Subsequent patch attempts failed with access denied and ACL errors, even after returning approval_policy to never.

Maintainer note:

```text
sandbox_mode = "workspace-write"
approval_policy = "on-request"
Full Access thread downgraded to workspace-write and write failures persisted.
CreateProcessWithLogonW failed while setup refresh tried to launch the helper.
```
