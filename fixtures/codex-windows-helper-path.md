# Codex Windows helper path failure fixture

Source cluster: https://github.com/openai/codex/issues/13542, https://github.com/openai/codex/issues/25357, and https://github.com/openai/codex/issues/25220.

## Environment

- Codex Desktop: 26.527.3686.0
- OS: Windows 11 x64
- Install source: Microsoft Store / MSIX package
- Terminal: Codex Desktop integrated PowerShell 7
- Sandbox: Windows elevated sandbox enabled

## Symptom A: bundled ripgrep resolves but cannot execute

Inside the Codex Desktop terminal:

```powershell
Get-Command rg -All
rg --version
where.exe rg
```

The terminal resolves `rg` to the bundled package path:

```text
C:\Program Files\WindowsApps\OpenAI.Codex_26.527.3686.0_x64__2p2nqsd0c76g0\app\resources\rg.exe
```

Running `rg --version` fails:

```text
Program 'rg.exe' failed to run: An error occurred trying to start process 'C:\Program Files\WindowsApps\OpenAI.Codex_26.527.3686.0_x64__2p2nqsd0c76g0\app\resources\rg.exe' with working directory 'D:\repo'. Access is denied.
```

Other bundled executables in the same `app\resources` directory also fail from the spawned shell:

```text
codex-command-runner.exe Access is denied
codex-windows-sandbox-setup.exe Access is denied
node.exe Access is denied
node_repl.exe Access is denied
```

Copying the same `rg.exe` out of `WindowsApps` into `%TEMP%` makes it runnable, so the binary is valid and the failure is tied to package path execution.

## Symptom B: local helper bin is missing or incomplete

Codex injects this path into PATH:

```text
%LOCALAPPDATA%\OpenAI\Codex\bin
```

But on the broken machine, `%LOCALAPPDATA%\OpenAI\Codex\bin` did not exist or contained only `.staging-*`.

The expected MSIX LocalCache helper bin was either missing or not used:

```text
%LOCALAPPDATA%\Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache\Local\OpenAI\Codex\bin
```

When present, that directory should contain:

```text
codex.exe
codex-command-runner.exe
codex-windows-sandbox-setup.exe
node.exe
node_repl.exe
rg.exe
```

One workaround created a junction from `%LOCALAPPDATA%\OpenAI\Codex\bin` to the MSIX LocalCache bin directory. Another workaround installed external ripgrep earlier in PATH and restarted Codex.

## Symptom C: sandbox ACL and plugin helper startup failures

On some machines:

```powershell
icacls "$env:LOCALAPPDATA\Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache\Local\OpenAI"
```

showed that `CodexSandboxUsers` was missing read/execute permissions. Granting:

```powershell
icacls "$env:LOCALAPPDATA\Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache\Local\OpenAI" /grant 'CodexSandboxUsers:(OI)(CI)(RX)' /T
```

made `rg --version` work after restart.

On related Browser/Chrome/Computer Use reports, a minimal node_repl call failed before JavaScript executed:

```text
node_repl kernel exited unexpectedly
node_repl diagnostics: {"kernel_status":"running","kernel_stderr_tail":"windows sandbox failed: spawn setup refresh","reason":"stdout_eof","stream_error":null}
```

Bundled plugin reconciliation also failed on some Windows Store builds:

```text
[BundledPluginsMarketplace] bundled_plugins_marketplace_resolve_failed errorCode=UNKNOWN
errorMessage="UNKNOWN: unknown error, copyfile 'C:\Program Files\WindowsApps\OpenAI.Codex_26.527.3686.0_x64__2p2nqsd0c76g0\app\resources\plugins\openai-bundled\plugins\computer-use.codex-plugin\plugin.json' -> 'C:\Users\user\.codex\.tmp\bundled-marketplaces\openai-bundled.staging\plugins\computer-use.codex-plugin\plugin.json'"
```

The same logs mention:

```text
Windows Computer Use helper paths are unavailable
reason=missing-helper-path
The specified file could not be encrypted
Application Protected / EFS attributes on WindowsApps files
```

## Evidence to preserve

- Codex Desktop version and Windows build
- Store/MSIX package name and install path
- `Get-Command rg -All` and `where.exe rg` output from the integrated terminal and from the agent/tool runner
- exact `Access is denied` helper path
- `%LOCALAPPDATA%\OpenAI\Codex\bin` listing
- `%LOCALAPPDATA%\Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache\Local\OpenAI\Codex\bin` listing
- `icacls` output showing whether `CodexSandboxUsers` has RX permissions
- file attributes for WindowsApps and LocalCache helper binaries
- node_repl, Chrome plugin, Browser plugin, and Computer Use diagnostics
- sandbox mode, especially elevated vs unelevated behavior
