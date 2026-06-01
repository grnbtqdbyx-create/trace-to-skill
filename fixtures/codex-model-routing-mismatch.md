# Codex model routing mismatch fixture

## Public-style issue signals

- GPT-5.3-Codex is being routed to GPT-5.2.
- Both `config.toml` and the TUI are set to `gpt-5.3-codex`, but SSE captures show the actual `response.model` is `gpt-5.2-2025-12-11`.
- Running `RUST_LOG='codex_tui::chatwidget=info,codex_api::sse::responses=trace' codex` and sending a prompt shows `response.created` with `response.model=gpt-5.2-2025-12-11`.
- `codex exec --sandbox read-only --model gpt-5.3-codex 'ping'` logs the actual model as `gpt-5.2-2025-12-11`.
- The user sees no warning or fallback notice that a different model version is being used internally.
- Some reports mention ChatGPT Pro, WSL, macOS, recent CLI versions, and verification briefly restoring GPT-5.3-Codex before silently rerouting back to GPT-5.2.

## Evidence checklist

- Codex app, CLI, or extension version and OS.
- Subscription/workspace and selected model from `config.toml`, TUI, command flag, or UI.
- Actual server-side model from SSE `response.created` / `response.model`.
- Exact redacted `RUST_LOG` or reproduction command, timestamp, and whether API and Codex routes differ.
- Whether a warning, fallback notice, account-verification message, or model-unavailable error appeared.
