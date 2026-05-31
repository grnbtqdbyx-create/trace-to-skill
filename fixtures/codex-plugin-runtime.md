# Codex Plugin Runtime Trace

User report:

Codex Windows app advertises Computer Use as an available bundled plugin, but the official bootstrap fails:

```text
OpenAI.Codex Windows app 26.527.3686.0; Computer Use plugin 26.527.30818.
The bundled client exists at <CODEX_HOME>\plugins\cache\openai-bundled\computer-use\26.527.30818\scripts\computer-use-client.mjs.
setupComputerUseRuntime fails with Computer Use native pipe path is unavailable.
Request metadata contains threadId and turn metadata, but no native pipe/helper pipe path is present.
```

Second report:

```text
Computer Use worked earlier and created a pipe such as \\.\pipe\codex-computer-use-...
Later logs show computer-use native pipe helper paths changed, reason=missing-helper-path, and Windows Computer Use helper paths are unavailable.
After that, SKY_CUA_NATIVE_PIPE_DIRECTORY is not present and Computer Use native pipe path is unavailable.
The helper binary still exists in ~/.codex/plugins/cache, but the Plugins UI no longer showed Computer Use and Chrome.
```

Third report:

```text
The Browser, Computer use, and Plugins pages show Plugin loading failed.
The shared plugin/list path returns Invalid request: unknown variant 'vertical', expected one of 'local', 'workspace-directory', 'shared-with-me'.
The same vertical enum error appears after a GitHub connector authorization flow returns to Codex.
```

Fourth report:

```text
codex plugin add compound-engineering@compound-engineering-plugin installs version 3.9.3.
After Codex Desktop keeps running or restarts, ~/.codex/plugins/cache/compound-engineering-plugin/compound-engineering changes back to 3.8.0.
The installed plugin is reset to a stale version with no visible error.
```
