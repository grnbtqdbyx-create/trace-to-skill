# Codex remote compact task failure fixture

Source cluster: https://github.com/openai/codex/issues/14860 and related compact reports.

## Environment

- Codex CLI: 0.133.0
- Codex Desktop: 26.519.22136
- Platform: Linux VM and macOS Desktop reports
- Model: gpt-5.5, high reasoning, Standard speed
- Subscription: Pro or Plus
- Provider: built-in OpenAI provider, with some Azure Foundry reports on a separate provider config

## Timeline

12:08:11 The thread reached about 231k / 258k tokens during a large refactor.

12:08:14 Auto-compaction started after several successful compacts earlier in the same session.

12:10:45 Codex reported:

```text
Error running remote compact task: timeout waiting for child process to exit
```

12:12:20 Manual `/compact` failed again:

```text
Error running remote compact task: stream disconnected before completion: error sending request for url (https://chatgpt.com/backend-api/codex/responses/compact)
```

12:13:02 The user tried a fresh prompt in the same thread. The agent had to start new sessions and piece together context from old notes because the compaction failure broke the active refactor.

## Provider and timeout notes

- The failure looks specific to the remote compaction endpoint rather than ordinary chat turns.
- Several reports mention reqwest `tcp_user_timeout`, a 30s timeout repeated into an apparent 150s timeout, and experiments with 120s socket timeout patches.
- Some users tried `stream_idle_timeout_ms = 900000` as a provider-level compact workaround.
- A Codex.app compact timeout workaround that changes `model_provider` to `openai-long-timeout` can hide existing threads because old threads are stored under the original provider id.
- Azure Foundry reports mention `responses/compact`, `base_url`, and removing `api-version`, but the issue still needs provider config captured without secrets.

## Impact

- `/compact` fails for long contexts and prevents continuation.
- Auto-compact can fail at the first compression point of a complex task.
- Users report that this breaks all long running tasks and makes Codex unusable for complex work.
- Lowering reasoning or switching speed sometimes lets `/compact` succeed, but that is not a stable fix.

## Evidence to preserve

- exact Codex CLI/app/extension version
- OS, terminal, VM, WSL, VPN, and proxy state
- model, reasoning effort, and speed mode before compact
- token/context level before the failed compact
- exact `/compact` or auto-compact error text
- whether `responses/compact` failed with timeout, high demand, or stream disconnect
- provider config shape without API keys
- whether a new thread, local fallback, lower reasoning, Fast mode, or longer timeout changes behavior
