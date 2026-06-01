# Codex Streamable HTTP MCP Fixture

## Penpot parse failure

Codex CLI 0.136.0 is configured with the Streamable HTTP MCP server `penpot`.
The server is reachable and `tools/list` succeeds, but the streamable HTTP client fails to parse Penpot MCP responses before `tools/call`.

stderr:

```text
JsonRpcMessage deserialize error while reading streamable-http response
response parse failed after Content-Type: text/event-stream
```

The server sends SSE event frames with JSON-RPC payloads, and another MCP client can read the same endpoint successfully.

## n8n initialize handshake

MCP Streamable HTTP handshake fails with `n8n` after initialize.
`initialize` returns 200, then the next `tools/list` reports Transport closed and the session id is not accepted.

## DingTalk auth gate

The DingTalk Streamable HTTP MCP server is incorrectly gated behind OAuth/login even though the server is configured as unauthenticated in the local server config.

## Stale session after restart

After a remote MCP server restart, Codex reuses a stale streamable-http session id.
Subsequent tool calls fail until restarting Codex instead of reconnecting or reinitializing the transport.
