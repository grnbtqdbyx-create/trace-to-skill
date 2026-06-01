# Codex Context Fork Bloat Fixture

## Conversation fork context bloat

Codex extension 0.136.0 created a conversation fork from an existing long thread.
The forked conversation carried the full parent transcript plus duplicate context blocks, causing the prompt size to grow from 118k tokens to 289k tokens after one follow-up.

The issue appears before any new files are read.
`input_tokens` and `cached_input_tokens` both jump, but useful user-visible context did not change.

## Duplicate inherited history

The exported session shows repeated parent conversation turns after the fork boundary.
The same tool transcript appears once before the fork marker and again inside the forked child context.

## Prompt cache lineage loss

After the fork, `prompt_cache_key` changes even though most inherited content is identical.
The cache hit rate drops from 83% to 19%, and the next assistant turn reports a large cached-token miss.

## Subagent fork interaction

A prior `fork_context` subagent inherited parent intent and then a conversation fork duplicated that inherited context again.
The child thread starts by summarizing old parent work instead of the delegated prompt.

## Minimal reproduction

1. Open a long Codex conversation with a prior compaction and one subagent.
2. Fork the conversation.
3. Send a short follow-up such as "continue".
4. Compare `input_tokens`, `cached_input_tokens`, `prompt_cache_key`, fork boundary markers, and repeated parent turns before and after the fork.
