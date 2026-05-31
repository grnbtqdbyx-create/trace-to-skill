# Codex auth and connectivity failure fixture

A Dev Container using Ubuntu 24.04 failed after the browser login step:

```text
2026-05-26T19:42:22.056568Z ERROR codex_login::server: oauth token exchange transport failure is_timeout=false is_connect=true is_request=true error=error sending request for url (https://auth.openai.com/oauth/token)
Token exchange error: error sending request for url (https://auth.openai.com/oauth/token)
codex_login::server: login callback token exchange failed
```

The environment later showed missing ca-certificates setup before the OpenAI extension was installed:

```Dockerfile
RUN apt-get update && apt-get install -y ca-certificates && update-ca-certificates
```

The API key path also looked connected in the UI but produced the same transport failure when Codex tried to reach ChatGPT:

```text
stream disconnected before completion: Transport error: network error: error decoding response body
Reconnecting... 1/5 (stream disconnected before completion: error sending request for url (https://chatgpt.com/backend-api/codex/responses))
```

Another trace from the same issue class showed IPv6 and proxy-specific evidence:

```text
auth.openai.com resolves to IPv6 first; curl -4 works, curl -6 hangs.
Cloudflare returned cf-mitigated: challenge when the corporate MITM proxy intercepted auth.openai.com.
CODEX_CA_CERTIFICATE was set but did not help this WAF challenge.
```

The final report must include the Codex version, container image, proxy/VPN state, DNS IPv4/IPv6 checks, CA variables, and whether browser login, device auth, and API-key auth fail differently.
