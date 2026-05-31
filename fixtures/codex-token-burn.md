# Codex unexpected usage fixture

These notes preserve reports where the user cannot tell whether the cause is model choice, background polling, compaction, retries, or idle app activity.

## General token burn regression

```text
Am I the only one still seeing my tokens burning very fast after today's extension update?
Just by writing 1 or 2 prompts, usage drops by 1%.
Within 2 hours of working I managed to burn through ~20% of my tokens.
Token usage: total=742,555 input=697,188 (+ 9,077,504 cached) output=45,367 (reasoning 11,450)
```

## Idle app usage

```text
Codex is using daily usage even when it is not doing anything.
I opened the app, went to eat, and came back to all 5-hour usage consumed plus 15% of weekly usage.
Just by being open it used it all.
```

## Background polling loop

```text
Background process polling wastes tokens.
Each write_stdin empty poll triggers a full API turn with entire conversation history.
The model keeps polling while no new output is available and the process is still running.
During background waits, the cadence is about one poll every 5-10 seconds.
Cached tokens are still charged by some API/proxy billing paths.
```

## Compaction and replay cost

Another report said:

```text
My Pro weekly allowance was almost fully depleted in about two days under normal usage.
The weekly usage limit depletes unusually fast on 5.5, worsened by unstable context compaction.
Failed context compaction forces users to restart tasks and re-explain project state, creating compaction tax.
```

The report should include the plan/workspace, app or CLI version, model, reasoning effort, speed mode, large context setting, subagent and /review usage, recent `/status` and dashboard deltas, token totals including cached input/output/reasoning, background process ids, write_stdin poll cadence, compaction attempts, retry/tool-loop counts, whether the app was idle, and before/after usage percentages.
