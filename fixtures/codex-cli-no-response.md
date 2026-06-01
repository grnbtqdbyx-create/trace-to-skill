# Codex CLI No-Response Hang

Public issue cluster: All models - Codex CLI hangs indefinitely on all prompts, no response generated.

## Symptoms

- Codex CLI accepts prompts and displays them, but no streaming output begins.
- All models tested, including `gpt-5.4 high`, `gpt-5.3-codex`, and `gpt-5.1-codex-max`, show no response, no error, and no timeout.
- The status bar remains `gpt-5.4 high - 100% left`; no tokens are being consumed while the prompt is stuck.
- A `status.openai.com/incidents` status incident note says Codex CLI hanging or no response may come from unhealthy clusters and rerouted traffic.
- Simple greetings, questions, codebase analysis, and every message hang the same way.
- In another report, Codex hangs during terminal command execution; basic shell commands get stuck, it does half the job then stuck, and the VS Code client remains on Thinking or Working.
- `/exit`, Stop, or Ctrl+C does not respond for minutes, so the user has to kill the Codex process.

## Minimal Reproduction

The `codex exec --sandbox read-only --model gpt-5.3-codex 'ping'` run has no output and hangs after MCP startup with `unhandled responses event` SSE lines:

```bash
RUST_LOG='codex_api::sse::responses=trace' codex exec --sandbox read-only --model gpt-5.3-codex 'ping'
```

Observed output stops after:

```text
mcp startup: no servers
unhandled responses event: response.in_progress
unhandled responses event: response.content_part.added
unhandled responses event: response.output_text.done
unhandled responses event: response.content_part.done
```

## Status and Recovery Notes

- A collaborator note linked a status incident and said unhealthy clusters were rerouted.
- Users still reported Codex is down, Reconnecting, stream disconnected before completion, and no response in both CLI and VS Code after the incident note.
- Downgrading, starting a new thread, logout/login, API billing path, or a minimal config without MCPs should be recorded as separate recovery attempts.

## Evidence Checklist

- CLI/app/extension version and whether it is Terminal, WSL, VS Code, or Desktop.
- OS, shell, subscription/workspace, selected model, reasoning effort, and speed/service tier.
- Prompt timestamp, exact prompt, and whether the prompt is accepted but no streaming output, error, or timeout appears.
- Status bar or usage percent such as `100% left`, first assistant timestamp if it eventually appears, and whether tokens were consumed.
- `RUST_LOG` SSE snippets, transport (`responses_http` or websocket), first `response_item`, unhandled responses events, reconnect or stream-disconnect lines, and status incident link.
- Stop, Ctrl+C, `/exit`, forced kill, new thread, downgrade, logout/login, API billing path, and minimal-config recovery results.
