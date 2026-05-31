# Codex remote-control route health fixture

A Windows Desktop remote-control route reported connected, but mobile commands did not execute reliably.

The local diagnostic showed the listener was stale:

```text
remote-control: listening on 127.0.0.1:14567, pid=18452, exe=C:\Users\user\.codex\cache\7dea4a003bc76627\codex.exe, bundle_complete=false, sandbox_helper=missing
candidate cache directory has codex.exe but is missing codex-windows-sandbox-setup.exe and codex-command-runner.exe
```

Mobile still displayed a weak connected state:

```text
ChatGPT mobile pairing stuck on Waiting for desktop
remote-control stays connecting
backend environments returns empty
Android Codex Mobile shows "Directory: Unavailable" after Desktop conversation updates
Revoking the Android device and re-pairing restores access temporarily.
```

Another trace showed stale enrollment state:

```text
codex remote-control reuses persisted enrollment with stale server_name, causing silent WebSocket disconnect
remoteControl/status/read succeeded, but the next mobile command never reached the active app-server.
```

The report should include desktop/app/CLI versions, mobile OS/app version, host id, listener pid/executable path, bound port, cache directory id, helper-file completeness, active server_name/enrollment, workspace root, last mobile command id, and whether restarting the listener or re-pairing changes the route.
