# Codex Latest-Turn Drift Trace

User report:

Codex 0.77.0 with GPT-5.2 xhigh sometimes responds to an earlier message instead of the latest request.

```text
The conversation had six messages. The third message asked question A.
By the sixth message, the user had moved on and asked question B.
Codex's final summary answered question A instead of the most recent question B.
This happens more often after context compaction.
```

Second report:

```text
User: Fix issue A
Codex: Fixed issue A
User: Fix issue B
Codex: Fixed issue A. Fixed issue B.

After summarization, the chat is unusable and the model keeps fixing previously fixed bugs.
It keeps answering previous messages and ignoring my actual latest message.
```

Third report:

```text
After context compact, Codex jumps to previous tasks and starts redoing things it has already completed.
It switched context from a day ago and started editing something unrelated to the current task.
If the user resends the same message, it works correctly.
```

Fourth report:

```text
/review pr1 -> here is my pr1 review
/review pr2 -> here is my pr2 review
/review pr3 -> here is my pr1 review
```

Fifth report:

```text
Codex worked for over an hour, made 23 file edits, then auto compaction caused it to forget it was mid-task.
After compaction it denied making edits, claimed the edits were already present, and stopped instead of continuing.
```

Sixth report:

```text
The chat UI sometimes renders raw internal tool-call payloads instead of normal assistant output:
write_stdin session_id chars yield_time_ms max_output_tokens
```
