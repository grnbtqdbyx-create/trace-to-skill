# Failed Codex Run

User asked the agent to update a parser and preserve existing behavior.

The agent edited several files and replied:

> Done. The parser is fixed and all set.

However, no tests were run because the agent said:

> I did not run tests because the change looked small.

Later CI failed:

```text
npm test
AssertionError: expected "jsonl" to equal "json"
test failed with exit code 1
```

The run also included a missing path:

```text
Error: Cannot find module './src/parser-utils'
```

And the agent tried to use an MCP filesystem tool with write access without documenting the trust boundary.

