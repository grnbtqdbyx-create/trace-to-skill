# Codex subagent lifecycle fixture

This fixture uses public, token-free examples of Codex subagent lifecycle state diverging between the UI, live close/readback routes, persisted SQLite spawn edges, recent conversations, and quota accounting.

## Stale subagents in Desktop UI

Environment:

- Codex Desktop 26.527.31326 and related app builds
- Long-running macOS or Linux sessions with many helper subagents
- Subagent roles such as researcher, planner, reviewer, coder, and verifier

Observed behavior:

```text
Completed or closed subagents remain visible in the Subagents panel.
The app shows stale subagent cards after close/readback reports no live agent handle.
The visible subagent count grows very large; the panel can show Show 67 more or 100+ stale entries.
Some close attempts return shutdown, completed, not_found, or pending_init, but the UI still lists the agent.
It is unclear which subagents are active versus stale UI/cache entries.
```

Local state evidence:

```text
SQLite integrity check: ok
thread_spawn_edges status count: closed=549, open=0
After restarting Codex Desktop multiple times, the Subagents panel still visually shows stale subagent cards.
```

## Stale workers poison goal mode

Runtime report:

```text
Codex subagents have been going stale and refusing to close for the past week.
One stale agent can halt the entire /goal mode.
Attempting to close it again can make the whole session stuck again.
Typically, if 1 agent goes stale and is unable to get closed, more will follow over upcoming hours.
The issue is reset by quitting and starting Codex again, where the 5 agents quota is back.
```

Related MCP state:

```text
MCP startup interrupted. The following servers were not initialized: codex_apps
Long sessions with stale subagents may hold MCP connections or leave connection lifecycle state unclear.
```

## Completed agents still consume spawn quota

Reproduction pattern:

```text
Set a low agents.max_threads value.
Spawn a subagent and drive it to TurnComplete.
Attempt to spawn another agent.
The next spawn fails with collab spawn failed: agent thread limit reached.
Completed subagents continue to count against the per-session agent thread limit until explicitly closed.
```

Expected:

```text
Completed subagents should remain addressable for history/listing, but they should not consume active spawn quota unless restarted and reacquiring a slot.
```

## close_agent and durable state can diverge

Failure shape:

```text
multi_agent_v1.close_agent can remain unresolved after marking a subagent closed.
The persistent thread_spawn_edges row already shows status=closed.
The child rollout ends with turn_aborted reason="interrupted".
The in-memory registry slot remains counted, so later spawn_agent calls fail with agent thread limit reached.
```

Relevant code path names from the report:

```text
codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs
codex-rs/core/src/agent/control.rs
thread.wait_until_terminated().await
AgentRegistry.release_spawned_thread
```

## Child threads appear as top-level recent conversations

Local state summary:

```text
Total threads: 553
Unarchived threads: 114
Subagent child threads linked by thread_spawn_edges: 61
Unarchived subagent child threads: 51
Unarchived non-child threads: 63
thread_spawn_edges.status: 56 closed, 5 open
jobs, agent_jobs, and agent_job_items were empty
```

Observed behavior:

```text
Subagent child threads are returned by ordinary recent conversation listing.
Child threads consume global recent-list slots and make older parent/user conversations look missing from the sidebar.
Some spawn edges remain open even when there is no obvious active agent job or worker process.
```

## Compaction loses subagent discoverability

User flow:

```text
A subagent completed an unbiased review.
The main thread compacted automatically.
The user asked the main agent to get back with that subagent for another review round.
The main agent created a new subagent instead and forked the main session with full conversation history.
It later explained: the original subagent id was not available in the compacted context.
It also said it cannot retrieve a list of prior spawned sessions and can only act on an agent id it already knows.
With the subagent id copied from /agents by the user, it can resume the subagent correctly.
```

Why this matters:

```text
Forking the main session defeats an unbiased review request because the reviewer inherits the parent agent's assumptions and the user's prior conversation.
Prior resumable subagents should be discoverable to the model or clearly unavailable with a structured reason.
```

## Evidence a good report should include

The report should include Codex app/CLI/extension version, OS, surface, model, subscription/workspace, root thread id, subagent ids/nicknames/roles, spawn/close/list commands or UI actions, `close_agent` results, `list_agents` or `/agents` output, `thread_spawn_edges` status counts, agent registry or `agents.max_threads` evidence, recent-list/sidebar behavior, whether child threads are archived or shown as top-level conversations, last-progress/heartbeat or halt reason, MCP server state for helper agents, resume timing, screenshot or redacted UI state, whether restart/reload/new thread clears it, and whether stale agents are UI-only or still block new spawns.
