# Codex session resume and local state failure fixture

This fixture captures a long-running Codex Desktop and CLI session that became hard to resume after local history grew large.

## Resume picker hangs on large JSONL history

The user reported:

```text
codex resume interactive picker hangs/freezes when session files are large.
The UI renders the list, but Enter has no effect.
codex resume <id> works fine as a workaround.
```

The session inventory showed large rollout files:

```text
rollout-2026-05-11T23-56-03-019e17c0.jsonl  17.7 MB
session files include large jsonl rollout history and the picker freezes when that session is visible.
```

## State migration mismatch

After a Codex update, goal state reads failed:

```text
state_5.sqlite migration version 34: drop thread goals
goals_1.sqlite was created, but goals_1.sqlite.thread_goals was empty.
Runtime still queried the old thread_goals table.
error returned from database: no such table: thread_goals
codex_core::goals failed to read thread goal for continuation
```

## Desktop thread open is sluggish

A Windows Codex Desktop trace showed the same session-state path causing slow UI:

```text
Thread id: 019e5fe0-5e81-7a02-abef-f2bde9c26a4a
Rollout/history size: 242.5 MB
50,589 JSONL lines
29,169 response_item records
21,178 event_msg records
10,538 function_call records
112 input_image records
Max JSONL line: 3,631,856 characters
thread/resume took 7,760 ms
thread/goal/get took 8,606 ms
Codex Desktop becomes extremely sluggish with high app-server/renderer CPU when opening a large local thread.
```

## Resume compression drops recent context

Another trace showed the resumed agent could not continue:

```text
codex resume context compression drops recent conversation context.
The last 3-5 turns are discarded, including the user's latest instruction, recent errors, and file paths.
The resumed session is effectively amnesic and cannot continue the previous task.
```

The report should include the Codex app and CLI versions, OS, thread id, rollout size, JSONL line count, response/event/function/image counts, largest line size, thread/resume and thread/goal/get timings, renderer/app-server CPU and memory, state database paths and migration versions, whether `codex resume <id>` works, whether a new thread works, and backup steps before any manual state edit.
