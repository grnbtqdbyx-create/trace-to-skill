# Codex Surface Support Matrix

Generated: 2026-06-01T05:01:50.226Z
Issues analyzed: **23**

This matrix turns live Codex issue demand into surface-specific support questions, evidence checklists, and first commands.

| Surface | Status | Issues | Comments | Reactions | Example | First command |
| --- | --- | ---: | ---: | ---: | --- | --- |
| Desktop app, packaged builds, and IDE ecosystems | blocked | 3 | 328 | 1368 | [#10410 Codex Desktop App: macOS Intel (x86_64) support](https://github.com/openai/codex/issues/10410) | `trace-to-skill demo platform-availability` |
| Remote SSH, cloud, WSL, container, and GPU workspaces | blocked | 1 | 176 | 851 | [#10450 Remote Development in Codex Desktop App](https://github.com/openai/codex/issues/10450) | `trace-to-skill demo remote-connection` |
| Desktop context and token-pressure visibility | degraded | 3 | 168 | 26 | [#23794 Codex Desktop no longer shows visible context/token usage indicator](https://github.com/openai/codex/issues/23794) | `trace-to-skill demo context-visibility` |

## Evidence Checklists

### Desktop app, packaged builds, and IDE ecosystems

Support-policy question: Which OS, CPU architecture, package format, or IDE ecosystem is officially supported, planned, or out of scope?

Examples:
- [#10410 Codex Desktop App: macOS Intel (x86_64) support](https://github.com/openai/codex/issues/10410) (190 comments; labels: enhancement, app)
- [#11023 Codex desktop app for Linux](https://github.com/openai/codex/issues/11023) (68 comments; labels: enhancement, app)
- [#4313 Extension for JetBrains IDEs (PyCharm, IntelliJ, etc.)](https://github.com/openai/codex/issues/4313) (70 comments; labels: enhancement)

Attach:
- requested surface such as Desktop, Linux package, macOS Intel/Universal build, or JetBrains extension
- platform, architecture, distro/window system, package format, or IDE name/version
- exact install or launch error plus screenshot text when available
- same-machine Codex CLI version and whether CLI works
- comments/reactions/signup demand and any release-note or docs support-policy statement

### Remote SSH, cloud, WSL, container, and GPU workspaces

Support-policy question: Can Codex attach to remote filesystems and run against the remote machine as the source of truth?

Examples:
- [#10450 Remote Development in Codex Desktop App](https://github.com/openai/codex/issues/10450) (176 comments; labels: enhancement, app)

Attach:
- Codex Desktop/app version, local OS, remote OS/architecture, and remote Codex CLI/app-server version
- SSH alias, selected host/path, remote workspace path, and whether the remote filesystem is source of truth
- `[features].remote_connections = true` and Settings > Connections visibility
- local tunnel, codex-server/app-server, fs/getMetadata, model-list, auth, proxy, PATH, or ForwardAgent evidence
- reconnect/resume behavior and whether a clean host works

### Desktop context and token-pressure visibility

Support-policy question: Where should users see passive context-window pressure before compaction becomes risky?

Examples:
- [#23794 Codex Desktop no longer shows visible context/token usage indicator](https://github.com/openai/codex/issues/23794) (160 comments; labels: bug, context, app)
- [#23591 Reimplement visible context/token usage indicator in Codex Desktop App](https://github.com/openai/codex/issues/23591) (7 comments; labels: enhancement, rate-limits, context, app)
- [#24710 Codex Desktop: hidden context indicator still blocks long-session context management](https://github.com/openai/codex/issues/24710) (1 comments; labels: enhancement, context, app)

Attach:
- Codex Desktop version, OS, surface, and screenshot or recording of the chat input area
- prior context/token indicator or tooltip behavior before the update
- long-session context pressure, compaction timing, and whether /status is enough
- CLI/TUI comparison if another surface still shows context pressure

## Next Actions

- Publish this matrix with the issue radar so users can see which Codex surfaces are blocked versus degraded.
- For blocked rows, collect support-policy evidence from release notes or docs before filing a new issue.
- For degraded rows, attach the row checklist and a trace-to-skill demo/codex-report output instead of screenshots alone.
