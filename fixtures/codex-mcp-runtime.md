# Codex MCP runtime failure fixture

A minimal MCP server was configured correctly and `tools/list` returned the expected tool, but Codex failed at runtime.

## Non-interactive approval cancellation

```json
{"type":"item.started","item":{"type":"mcp_tool_call","server":"minimal","tool":"ping","status":"in_progress"}}
{"type":"item.completed","item":{"type":"mcp_tool_call","server":"minimal","tool":"ping","status":"failed","error":{"message":"user cancelled MCP tool call"}}}
```

Logs showed:

```text
request_user_input is not supported in exec mode
Approve app tool call?
tool_call_mcp_elicitation = true
maybe_request_mcp_tool_approval called for a custom MCP tool
```

## Unsupported routed callable

The server could execute the tool manually, but Codex routed the exposed name incorrectly:

```text
tools/list returned js for node_repl
manual tools/call succeeded
runtime routes mcp__node_repl__js as unsupported call
unsupported call: mcp__node_repl__js
```

Another trace showed deferred tool discovery replay losing namespace metadata:

```text
Namespaced MCP tool calls fail after deferred tool discovery because replayed function_call drops namespace.
function_call omitted namespace and serverName, so the runtime received an un-namespaced tool name.
```

## Stdio transport lifecycle

A healthy stdio MCP server returned one result, exited, and Codex reused a closed client:

```text
tool call failed for `minimal_stdio/echo`
Caused by:
    Transport closed for MCP stdio client
StdioServerTransport shutdown: stdin_end
StdioServerTransport shutdown: transport_close
```

The report should include the Codex version, MCP server name and transport, callable name, whether `tools/list` and manual `tools/call` succeed, approval policy, sandbox mode, exec/non-interactive mode, elicitation setting, namespace/serverName metadata, item JSONL, stderr/backpressure evidence, and whether a transport restart changes the result.
