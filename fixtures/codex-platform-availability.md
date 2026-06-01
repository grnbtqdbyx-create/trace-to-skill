# Codex Platform Availability Gap

Public issue cluster: Codex Desktop App macOS Intel support, Codex desktop app for Linux, and JetBrains IDE extension demand.

## macOS Intel / Universal Build

- A user requests macOS Intel x86_64 support for the Codex Desktop App or a Universal build with arm64 + x86_64.
- Environment evidence: Intel Mac, `uname -m => x86_64`, macOS 13/14/15, Codex `.dmg`, and `Codex.app`.
- When the `.dmg` is mounted, `Codex.app` shows the prohibited symbol and macOS says the app can't run on this Mac because of incompatible architecture.
- Codex CLI works fine on the same machine, but the desktop app cannot launch: `which codex => /usr/local/bin/codex` and `codex --version => codex-cli 0.58.0`.
- The request is specifically for the desktop GUI app, not the CLI.
- If Intel support is not planned, users ask for an explicit statement in docs or release notes so they do not keep troubleshooting.

## Linux Desktop App

- Users ask for an official Codex desktop app on Linux because they want the app experience on Ubuntu, Arch, NixOS, Fedora, Debian, Wayland, and X11 desktops.
- Comments mention package expectations such as AppImage, Flatpak, Snap, `.deb`, `.rpm`, and distro packages.
- Some users point to an AUR package or a signup form, but still want an official release and support policy.
- Evidence should separate tested community packages from official OpenAI releases.

## JetBrains IDE Extension

- Users request an official Codex extension or plugin for JetBrains IDEs such as PyCharm, IntelliJ, WebStorm, CLion, and Rider.
- Requested capabilities include terminal integration, version control integration, PR title and summary generation, commit message generation, code review, inline suggestions, refactoring, docs, and multi-language project context.
- The gap is broader than VS Code: teams using JetBrains want Codex in their normal IDE workflow without switching tools or losing context.

## Evidence Checklist

- Requested surface: Desktop app, IDE extension, packaged build, or official plugin.
- Platform and architecture: macOS Intel x86_64, Apple Silicon arm64, Linux distro, Wayland/X11, or JetBrains IDE name/version.
- Install artifact: `.dmg`, `Codex.app`, AppImage, Flatpak, Snap, `.deb`, `.rpm`, AUR, marketplace plugin, or extension id.
- Exact launch/install error and screenshot text: prohibited icon, incompatible architecture, can't run on this Mac, missing package, or marketplace absence.
- CLI comparison: `which codex`, `codex --version`, whether Codex CLI works on the same machine, and whether only the GUI/IDE surface is blocked.
- Demand evidence: linked issue, comments, reactions, signup form, repeated `+1` comments, or enterprise/school hardware constraints.
- Support-policy evidence: docs, release notes, roadmap, or explicit statement that support is planned, not planned, or unknown.
