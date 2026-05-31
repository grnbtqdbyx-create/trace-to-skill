# Codex Latency Regression Trace

Issue cluster: GPT-5.5 Fast suddenly feels as slow as Standard, with long thinking, context, read, and search stalls.

Environment:
- Codex app 26.519.41501 (3044)
- macOS on a high-end laptop
- GPT-5.5 Fast, normal coding task
- API path works fine for similar prompts, but ChatGPT Codex is slow

Observed behavior:
- GPT-5.5 Fast feels significantly slower than before and closer to Standard.
- Simple tasks take 10-20+ minutes or longer before a usable change appears.
- The thinking phase gets stuck for 40+ seconds, sometimes around a minute, before any visible progress.
- The slowdown suddenly became about 8x slower than usual.
- Automatic context compression, reading, and searching are very slow.
- A small module update ran for more than an hour and changed only 200 lines after 1hr 58 minutes.
- Another run took two hours for 1325 lines of code.

What would make this report useful:
- exact app or CLI version
- model, speed, and reasoning settings
- timestamps for pre-first-token, thinking, search/read, tool execution, and compaction
- task size, files touched, and lines changed
- local CPU, memory, network, and VPN/proxy state
- feedback ids for slow conversations
- whether the same prompt is faster through the API
