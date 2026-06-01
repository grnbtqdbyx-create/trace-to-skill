# Codex MultiAgentV2 Subagent Prompt Leakage

## Summary

Codex Desktop MultiAgentV2 spawned child agents with `fork_turns: "none"`, but the child rollout did not treat the `spawn_agent` message as an isolated user task.

## Evidence

- `spawn_agent` was called with `fork_turns: "none"` for `task_name: exp1_seq_b`.
- The initial task appeared in the child rollout as `role=assistant`, `phase=commentary`, not as a user/task message.
- The assistant/commentary JSON envelope contained `recipient: /root/exp1_seq_b`, `trigger_turn: true`, and `content: BLACKBOX_PROBE_B`.
- In a same-turn parallel spawn through `multi_tool_use.parallel`, child A received sibling child B's prompt envelope before child A produced a final answer.
- The leaked sibling prompt included `recipient: /root/exp2_parallel_b` and `content: BLACKBOX_PARALLEL_B`, even though child A had `fork_turns: "none"`.
- The child replied with a generic workspace or AGENTS acknowledgement instead of the exact assigned task output.
- In a worker-role run, a child saw the sibling prompt and called `spawn_agent` itself despite instructions not to use tools.
- `wait_agent` and `close_agent` reported completion, but the child did not perform the assigned independent review task.

## Expected

For `spawn_agent` with `fork_turns: "none"`, the child should receive only the delegated task as its initial user-equivalent instruction. Parallel children should not see sibling prompt envelopes unless shared context is explicitly requested.

## Diagnostics To Attach

Include Codex Desktop version, CLI version, MultiAgentV2 state, model, OS, parent thread id, child thread ids, `spawn_agent` arguments, `fork_turns`, role/profile, whether `multi_tool_use.parallel` was used, redacted child rollout line order, first child user/task message, assistant/commentary envelope lines, sibling prompt excerpts, `wait_agent` and `close_agent` results, and whether sequential single-child spawns reproduce.
