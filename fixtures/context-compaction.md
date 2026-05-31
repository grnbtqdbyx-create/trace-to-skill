# Codex Context Compaction Failure

Codex Desktop displayed this while working in a long repository session:

```text
Context compacted

Error running remote compact task: stream disconnected before completion; error sending request for url (https://chatgpt.com/backend-api/codex/responses/compact)
```

Another automatic compact attempt failed with:

```text
Error running remote compact task: { "error": { "message": "Your input exceeds the context window of this model. Please adjust your input and try again.", "code": "context_length_exceeded" } }
```

A Windows session also logged:

```text
Error running remote compact task: stream disconnected before completion: unknown variant auto, expected high or original
```

The thread could not continue reliably after automatic context compaction.
