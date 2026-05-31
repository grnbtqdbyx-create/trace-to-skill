# trace-to-skill Demo

Scenario: **Codex Windows helper path failure**

Windows Desktop exposes bundled rg/node/plugin helpers from WindowsApps or missing LocalCache paths that cannot execute.

Fixture: `fixtures/codex-windows-helper-path.md`

This is a packaged public fixture, so you can try the project without collecting a private trace first.

## Generated Codex Issue Report

# OpenAI Codex Issue Triage Report

Score: **43/100**

Likely failure class: **Codex Windows helper or bundled tool path failure (codex_windows_helper_path, high)**

Agent workflow needs clearer verification, instruction, or security hardening before broad reuse.

## Copy-Paste Issue Body

```md
### What happened?

trace-to-skill detected Codex Windows helper or bundled tool path failure (codex_windows_helper_path). Windows Codex Desktop can expose bundled tools or plugin helpers from MSIX/WindowsApps paths that are discoverable but not executable, breaking search, node_repl, Browser, Chrome, Computer Use, and sandbox startup.

### Detected failure class

- codex_windows_helper_path: Codex Windows helper or bundled tool path failure (high)

### Evidence

#### Codex Windows helper or bundled tool path failure
- fixtures/codex-windows-helper-path.md:32 - Program 'rg.exe' failed to run: An error occurred trying to start process 'C:\Program Files\WindowsApps\OpenAI.Codex_26.527.3686.0_x64__2p2nqsd0c76g0\app\resources\rg.exe' with working directory 'D:\repo'. Access is denied.
- fixtures/codex-windows-helper-path.md:56 - The expected MSIX LocalCache helper bin was either missing or not used:
- fixtures/codex-windows-helper-path.md:73 - One workaround created a junction from `%LOCALAPPDATA%\OpenAI\Codex\bin` to the MSIX LocalCache bin directory. Another workaround installed external ripgrep earlier in PATH and restarted Codex.
- fixtures/codex-windows-helper-path.md:83 - showed that `CodexSandboxUsers` was missing read/execute permissions. Granting:
- fixtures/codex-windows-helper-path.md:86 - icacls "$env:LOCALAPPDATA\Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache\Local\OpenAI" /grant 'CodexSandboxUsers:(OI)(CI)(RX)' /T
- fixtures/codex-windows-helper-path.md:94 - node_repl kernel exited unexpectedly

#### Codex sandbox or permission failure
- fixtures/codex-windows-helper-path.md:75 - ## Symptom C: sandbox ACL and plugin helper startup failures
- fixtures/codex-windows-helper-path.md:95 - node_repl diagnostics: {"kernel_status":"running","kernel_stderr_tail":"windows sandbox failed: spawn setup refresh","reason":"stdout_eof","stream_error":null}

#### Codex plugin runtime or bundled capability failure
- fixtures/codex-windows-helper-path.md:108 - Windows Computer Use helper paths are unavailable

### Diagnostics to attach

- When reporting Codex Windows helper path failures, capture Codex Desktop version, Windows build, install source, terminal/tool-runner context, `Get-Command rg -All`, `where.exe rg`, exact failing helper path, `%LOCALAPPDATA%\OpenAI\Codex\bin` and MSIX LocalCache bin contents, ACL/`icacls` output for CodexSandboxUsers, file attributes such as EFS/Application Protected, node_repl/plugin diagnostics, sandbox mode, and whether installing an external rg, recreating the local bin junction, rerunning sandbox setup, changing elevated/unelevated mode, or restarting Codex changes behavior.
- When Codex sandbox or permission setup fails, capture the OS, Codex version, sandbox_mode, approval_policy, exact stderr, workspace ownership/ACL evidence, and whether a clean directory can run a simple command plus apply_patch.
- When reporting Codex plugin runtime failures, capture app version, OS, plugin name and version, plugin cache path, helper binary/client path, native pipe or helper env vars, plugin/list or settings error text, connector install return flow, cache reconciliation/file-lock logs, whether the UI still lists the plugin, whether restarting resets or downgrades it, and whether a clean profile reproduces the failure.

### Privacy

- I redacted tokens, API keys, private paths, customer data, and hidden Unicode controls before sharing this trace.
```

## Findings

### 1. Codex Windows helper or bundled tool path failure

Severity: **high**

Windows Codex Desktop can expose bundled tools or plugin helpers from MSIX/WindowsApps paths that are discoverable but not executable, breaking search, node_repl, Browser, Chrome, Computer Use, and sandbox startup.

Evidence:
- `fixtures/codex-windows-helper-path.md:32` Program 'rg.exe' failed to run: An error occurred trying to start process 'C:\Program Files\WindowsApps\OpenAI.Codex_26.527.3686.0_x64__2p2nqsd0c76g0\app\resources\rg.exe' with working directory 'D:\repo'. Access is denied.
- `fixtures/codex-windows-helper-path.md:56` The expected MSIX LocalCache helper bin was either missing or not used:
- `fixtures/codex-windows-helper-path.md:73` One workaround created a junction from `%LOCALAPPDATA%\OpenAI\Codex\bin` to the MSIX LocalCache bin directory. Another workaround installed external ripgrep earlier in PATH and restarted Codex.
- `fixtures/codex-windows-helper-path.md:83` showed that `CodexSandboxUsers` was missing read/execute permissions. Granting:
- `fixtures/codex-windows-helper-path.md:86` icacls "$env:LOCALAPPDATA\Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache\Local\OpenAI" /grant 'CodexSandboxUsers:(OI)(CI)(RX)' /T
- `fixtures/codex-windows-helper-path.md:94` node_repl kernel exited unexpectedly
- `fixtures/codex-windows-helper-path.md:95` node_repl diagnostics: {"kernel_status":"running","kernel_stderr_tail":"windows sandbox failed: spawn setup refresh","reason":"stdout_eof","stream_error":null}
- `fixtures/codex-windows-helper-path.md:102` errorMessage="UNKNOWN: unknown error, copyfile 'C:\Program Files\WindowsApps\OpenAI.Codex_26.527.3686.0_x64__2p2nqsd0c76g0\app\resources\plugins\openai-bundled\plugins\computer-use.codex-plugin\plugin.json' -> 'C:\Users\user\.codex\.tmp\bun

Suggested rule:

> When reporting Codex Windows helper path failures, capture Codex Desktop version, Windows build, install source, terminal/tool-runner context, `Get-Command rg -All`, `where.exe rg`, exact failing helper path, `%LOCALAPPDATA%\OpenAI\Codex\bin` and MSIX LocalCache bin contents, ACL/`icacls` output for CodexSandboxUsers, file attributes such as EFS/Application Protected, node_repl/plugin diagnostics, sandbox mode, and whether installing an external rg, recreating the local bin junction, rerunning sandbox setup, changing elevated/unelevated mode, or restarting Codex changes behavior.

### 2. Codex sandbox or permission failure

Severity: **high**

Sandbox setup, approval-mode, and workspace permission failures can block every tool call or leave the worktree in a broken ownership state.

Evidence:
- `fixtures/codex-windows-helper-path.md:75` ## Symptom C: sandbox ACL and plugin helper startup failures
- `fixtures/codex-windows-helper-path.md:95` node_repl diagnostics: {"kernel_status":"running","kernel_stderr_tail":"windows sandbox failed: spawn setup refresh","reason":"stdout_eof","stream_error":null}

Suggested rule:

> When Codex sandbox or permission setup fails, capture the OS, Codex version, sandbox_mode, approval_policy, exact stderr, workspace ownership/ACL evidence, and whether a clean directory can run a simple command plus apply_patch.

### 3. Codex plugin runtime or bundled capability failure

Severity: **high**

Codex Desktop can advertise Browser, Computer Use, skills, or connectors while the shared plugin runtime is missing helper paths, stale cache state, or marketplace variants, leaving users without the capability they were told is available.

Evidence:
- `fixtures/codex-windows-helper-path.md:108` Windows Computer Use helper paths are unavailable

Suggested rule:

> When reporting Codex plugin runtime failures, capture app version, OS, plugin name and version, plugin cache path, helper binary/client path, native pipe or helper env vars, plugin/list or settings error text, connector install return flow, cache reconciliation/file-lock logs, whether the UI still lists the plugin, whether restarting resets or downgrades it, and whether a clean profile reproduces the failure.


## Reporter Notes

- Run `trace-to-skill redact <trace> --output redacted-runs` before attaching logs publicly.
- Prefer the shortest trace that reproduces the failure.
- Include exact Codex app/CLI version, OS, model, subscription/workspace, and the command or UI action that failed.
- Link related OpenAI/Codex issues when you know them, but keep the evidence self-contained.


## Other Demo Scenarios

- `remote-compact`: Long sessions break when `/compact` or auto-compaction times out, disconnects, or fails at `responses/compact`.
- `approval-friction`: Repeated approval prompts, Approve for this session misses, and noisy trusted MCP tool approvals.
- `latency-regression`: Fast mode feels like Standard, with long thinking, search, read, or compaction stalls.
- `token-burn`: Usage drains from background polling, idle activity, compaction loops, retries, or cached-heavy turns.
- `sensitive-files`: Secrets, local credentials, production env files, or private databases enter agent context.
- `github-prompt-injection`: Untrusted issue, PR, comment, or web text tells the agent to ignore policy or leak secrets.
- `file-tree-ui`: Desktop file tree, floating file panel, or file preview disappears, goes stale, or cannot be revealed.
- `usage-reset-drift`: Weekly or 5-hour reset dates move unexpectedly, making paid usage hard to plan or wasting saved capacity.

```bash
trace-to-skill demo --list
trace-to-skill demo remote-compact
trace-to-skill demo windows-helper-path
trace-to-skill demo file-tree-ui
trace-to-skill demo usage-reset-drift
```
