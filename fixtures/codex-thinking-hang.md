# Codex Thinking Hang Fixture

Issue cluster: Codex Desktop or CLI accepts a turn, local tools finish, or the backend request stays open, but the visible session remains stuck on Thinking or Working.

Environment:
- Codex Desktop 26.527.31326
- macOS and Windows reports
- GPT-5.5 and GPT-5.4 reports
- Transport seen in logs: `responses_http` and `responses_websocket`

Observed behavior:
- Codex Desktop can remain in Thinking after successful tool calls with no streamed follow-up or a hung /responses request.
- The tools returned instantly (`pwd` and `rg --files`), then the app sat for minutes with no next assistant action until interrupt.
- A turn was submitted immediately: `response_routed method=turn/start durationMs=4` and `IAB_LIFECYCLE captured turn route`.
- The persisted JSONL showed `task_started`, then `turn_context model=gpt-5.5 effort=xhigh`, then the user message.
- The first response_item type=reasoning appeared only after a 1,838.5 second gap.
- Another report showed `model_client.stream_responses_api{transport="responses_http" api.path="responses"}: close time.busy=51.5ms time.idle=380s`.
- Several turns had `time.busy=6.83ms time.idle=984s`, `time.busy=12.1ms time.idle=671s`, and `time.busy=8.78ms time.idle=390s`.
- Stop does not work: the stop button does not respond and Ctrl+C cannot exit the CLI; the user has to force quit.
- In subagent runs, the parent main thread stays stuck thinking while a child thread remains active, so the UI needs `waiting_on_child`, `child_requires_input`, or `child_cleanup_pending`.
- One workaround was a minimal `config.toml` without MCPs because a broken MCP that was not responding kept the session stuck on Thinking.

What would make this report useful:
- exact app, CLI, or extension version
- OS, IDE, model, reasoning effort, speed mode, and subscription/workspace
- turn id, thread id, prompt timestamp, `turn/start` or `task_started` timestamp
- last successful tool call output and first `response_item` timestamp
- transport path such as `responses_http` or websocket
- `time.busy` and `time.idle` close metrics
- reconnect or stream-disconnect lines
- whether stop, interrupt, or a new thread recovers
- MCP and subagent state, especially whether a minimal config without MCPs fixes the hang
