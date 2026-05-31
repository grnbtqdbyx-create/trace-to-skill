# Codex Deeplink And External Launch Fixture

Issue cluster: Codex external activation fails when OAuth callbacks, notification clicks, browser extension invocations, mobile links, or CLI app-open commands try to route back into Codex.

Environment:
- Codex Desktop 26.527.3686.0 on Windows 10 and Windows 11
- Codex Desktop 26.527.31326 on macOS
- Microsoft Store / MSIX package `OpenAI.Codex_26.527.3686.0_x64__2p2nqsd0c76g0`
- Surfaces: GitHub/Gmail/Slack/Supabase OAuth, Windows toast notification, Chrome extension, `codex://` protocol, and `codex app <path>`

Observed behavior:
- GitHub authentication succeeds in the browser, but `codex://oauth_callback?code=...` fails with `Error launching app`.
- The error says `Unable to find Electron app at C:\Program Files\WindowsApps\OpenAI.Codex_26.527.3686.0_x64__2p2nqsd0c76g0\app\oauth_callback?code=...`.
- The same dialog says `Cannot find module C:\Program Files\WindowsApps\OpenAI.Codex_26.527.3686.0_x64__2p2nqsd0c76g0\app\oauth_callback?code=...`.
- `Start-Process "codex://test"` reproduces the protocol route problem, and `Start-Process "codex://?type=click&tag=after-successful-reregister-test"` opens the same launch dialog.
- Clicking a Windows toast notification opens an Electron error where `type=click&tag=<notification-tag>` is interpreted as an app path.
- On macOS, `codex app .` only focuses Codex Desktop and does not switch to the requested workspace or open a new thread.
- Invoking Codex from the Chrome extension can fail similarly with an activation argument such as `google-chrome` interpreted as an Electron app path.
- AppX protocol registration appears present: `windows.protocol`, `AppUserModelID OpenAI.Codex_2p2nqsd0c76g0!App`, `PackageRelativeExecutable app\Codex.exe`, and `DelegateExecute {A56A841F-E974-45C1-8001-7E3F8A085917}`.
- Repair, reset, reinstall, reboot, AppX re-registration, and removing `HKCU\Software\Classes\codex` did not fix the callback.
- Related mobile reports show QR/deeplink setup resolving to an unhandled link or leaving the client on `Waiting for desktop`.

What would make this report useful:
- exact Codex app, CLI, and extension versions
- OS version/build and install source
- package id, package path, executable path, and whether the app was already running
- affected surface: OAuth callback, notification click, Chrome extension, mobile pairing, or `codex app <path>`
- connector or plugin name, such as GitHub, Gmail, Slack, Supabase, or Netlify
- exact redacted URI shape, such as `codex://oauth_callback?code=...`, `codex://?type=click&tag=...`, or `codex://test`
- full error dialog text and whether Electron treats the URI or query string as an app/module path
- browser used for OAuth and whether multiple browsers reproduce
- AppX/MSIX/protocol registration evidence: AppUserModelID, DelegateExecute, HKCU/HKCR `codex` keys, package URL association, and AppxManifest protocol entry
- repair, reset, reinstall, re-registration, and registry override attempts
- whether manual `Start-Process` or `codex://test` reproduces without the original OAuth/notification flow
