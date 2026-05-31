# Security Policy

`trace-to-skill` processes agent traces, logs, diffs, and reports. Those files can contain secrets, private code, or sensitive operational context.

## Reporting Vulnerabilities

Please open a private security advisory on GitHub when available, or file an issue with a minimal reproduction that does not include secrets.

## Data Handling

- The CLI runs locally.
- The CLI has no runtime network dependency.
- Evidence excerpts redact common token patterns.
- Do not submit traces containing real secrets, private customer data, or proprietary code unless they are safely anonymized.

## Security Goals

- Detect secret exposure in agent traces.
- Detect hidden Unicode control characters.
- Detect unsafe shell-command patterns.
- Detect MCP trust-boundary risks.

