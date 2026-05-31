# trace-to-skill Demo

Scenario: **Codex deeplink and OAuth callback launch regression**

OAuth callbacks, notification clicks, mobile links, or `codex app <path>` external activation fail to route into Codex.

Fixture: `fixtures/codex-deeplink-launch.md`

This is a packaged public fixture, so you can try the project without collecting a private trace first.

## Generated Codex Issue Report

# OpenAI Codex Issue Triage Report

Score: **50/100**

Likely failure class: **Codex deeplink, OAuth callback, or external launch regression (codex_deeplink_launch, high)**

Agent workflow needs clearer verification, instruction, or security hardening before broad reuse.

## Copy-Paste Issue Body

```md
### What happened?

trace-to-skill detected Codex deeplink, OAuth callback, or external launch regression (codex_deeplink_launch). Codex OAuth, notification, browser-extension, mobile pairing, and CLI app-open flows depend on external activation routing; when callback payloads are treated as Electron app paths, users cannot connect services, open workspaces, or route notifications back to the right thread.

### Detected failure class

- codex_deeplink_launch: Codex deeplink, OAuth callback, or external launch regression (high)

### Evidence

#### Codex deeplink, OAuth callback, or external launch regression
- fixtures/codex-deeplink-launch.md:3 - Issue cluster: Codex external activation fails when OAuth callbacks, notification clicks, browser extension invocations, mobile links, or CLI app-open commands try to route back into Codex.
- fixtures/codex-deeplink-launch.md:12 - - GitHub authentication succeeds in the browser, but `codex://oauth_callback?code=...` fails with `Error launching app`.
- fixtures/codex-deeplink-launch.md:13 - - The error says `Unable to find Electron app at C:\Program Files\WindowsApps\OpenAI.Codex_26.527.3686.0_x64__2p2nqsd0c76g0\app\oauth_callback?code=...`.
- fixtures/codex-deeplink-launch.md:14 - - The same dialog says `Cannot find module C:\Program Files\WindowsApps\OpenAI.Codex_26.527.3686.0_x64__2p2nqsd0c76g0\app\oauth_callback?code=...`.
- fixtures/codex-deeplink-launch.md:15 - - `Start-Process "codex://test"` reproduces the protocol route problem, and `Start-Process "codex://?type=click&tag=after-successful-reregister-test"` opens the same launch dialog.
- fixtures/codex-deeplink-launch.md:16 - - Clicking a Windows toast notification opens an Electron error where `type=click&tag=<notification-tag>` is interpreted as an app path.

#### Codex remote-control route health failure
- fixtures/codex-deeplink-launch.md:21 - - Related mobile reports show QR/deeplink setup resolving to an unhandled link or leaving the client on `Waiting for desktop`.
- fixtures/codex-deeplink-launch.md:27 - - affected surface: OAuth callback, notification click, Chrome extension, mobile pairing, or `codex app <path>`

### Diagnostics to attach

- When reporting Codex deeplink or external-launch regressions, capture Codex app/CLI/extension version, OS/build, install source, package id/path, affected surface (OAuth callback, notification click, browser extension, mobile pairing, `codex app <path>`), exact URI or redacted callback shape, browser used, connector/plugin name, error dialog text, whether the app was already running, AppX/MSIX/protocol registration evidence such as AppUserModelID, DelegateExecute, HKCU/HKCR `codex` keys, command-line arguments seen by Codex, re-registration/repair/reinstall attempts, and whether a manual `codex://test` or `Start-Process` repro behaves the same.
- When Codex remote-control or mobile routing fails, capture desktop/app/CLI versions, mobile OS/app version, host id, remote-control status, listener pid/executable path, bound port, cache directory id, helper bundle completeness, active server_name/enrollment, workspace root, last mobile command id, and whether re-pairing or restarting the listener changes the route.

### Privacy

- I redacted tokens, API keys, private paths, customer data, and hidden Unicode controls before sharing this trace.
```

## Findings

### 1. Codex deeplink, OAuth callback, or external launch regression

Severity: **high**

Codex OAuth, notification, browser-extension, mobile pairing, and CLI app-open flows depend on external activation routing; when callback payloads are treated as Electron app paths, users cannot connect services, open workspaces, or route notifications back to the right thread.

Evidence:
- `fixtures/codex-deeplink-launch.md:3` Issue cluster: Codex external activation fails when OAuth callbacks, notification clicks, browser extension invocations, mobile links, or CLI app-open commands try to route back into Codex.
- `fixtures/codex-deeplink-launch.md:12` - GitHub authentication succeeds in the browser, but `codex://oauth_callback?code=...` fails with `Error launching app`.
- `fixtures/codex-deeplink-launch.md:13` - The error says `Unable to find Electron app at C:\Program Files\WindowsApps\OpenAI.Codex_26.527.3686.0_x64__2p2nqsd0c76g0\app\oauth_callback?code=...`.
- `fixtures/codex-deeplink-launch.md:14` - The same dialog says `Cannot find module C:\Program Files\WindowsApps\OpenAI.Codex_26.527.3686.0_x64__2p2nqsd0c76g0\app\oauth_callback?code=...`.
- `fixtures/codex-deeplink-launch.md:15` - `Start-Process "codex://test"` reproduces the protocol route problem, and `Start-Process "codex://?type=click&tag=after-successful-reregister-test"` opens the same launch dialog.
- `fixtures/codex-deeplink-launch.md:16` - Clicking a Windows toast notification opens an Electron error where `type=click&tag=<notification-tag>` is interpreted as an app path.
- `fixtures/codex-deeplink-launch.md:17` - On macOS, `codex app .` only focuses Codex Desktop and does not switch to the requested workspace or open a new thread.
- `fixtures/codex-deeplink-launch.md:19` - AppX protocol registration appears present: `windows.protocol`, `AppUserModelID OpenAI.Codex_2p2nqsd0c76g0!App`, `PackageRelativeExecutable app\Codex.exe`, and `DelegateExecute {A56A841F-E974-45C1-8001-7E3F8A085917}`.

Suggested rule:

> When reporting Codex deeplink or external-launch regressions, capture Codex app/CLI/extension version, OS/build, install source, package id/path, affected surface (OAuth callback, notification click, browser extension, mobile pairing, `codex app <path>`), exact URI or redacted callback shape, browser used, connector/plugin name, error dialog text, whether the app was already running, AppX/MSIX/protocol registration evidence such as AppUserModelID, DelegateExecute, HKCU/HKCR `codex` keys, command-line arguments seen by Codex, re-registration/repair/reinstall attempts, and whether a manual `codex://test` or `Start-Process` repro behaves the same.

### 2. Codex remote-control route health failure

Severity: **high**

Codex mobile, SSH remote, and desktop remote-control failures can look connected while commands route through stale listeners, stale enrollments, missing helper bundles, or mismatched workspace/session state.

Evidence:
- `fixtures/codex-deeplink-launch.md:21` - Related mobile reports show QR/deeplink setup resolving to an unhandled link or leaving the client on `Waiting for desktop`.
- `fixtures/codex-deeplink-launch.md:27` - affected surface: OAuth callback, notification click, Chrome extension, mobile pairing, or `codex app <path>`

Suggested rule:

> When Codex remote-control or mobile routing fails, capture desktop/app/CLI versions, mobile OS/app version, host id, remote-control status, listener pid/executable path, bound port, cache directory id, helper bundle completeness, active server_name/enrollment, workspace root, last mobile command id, and whether re-pairing or restarting the listener changes the route.


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
- `clipboard-attachment`: Copy as Markdown, long-paste conversion, or generated Pasted text.txt attachments break prompt and report workflows.
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
trace-to-skill demo deeplink-launch
trace-to-skill demo file-tree-ui
trace-to-skill demo usage-reset-drift
```
