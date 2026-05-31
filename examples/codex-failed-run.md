# Example: Failed Codex Run

This is a small example you can use in demos and PR comments.

```text
Codex: I fixed the issue and all tests pass.
Maintainer: Which command did you run?
Codex: I did not run tests because this was docs-only.
CI: npm test failed with exit code 1.
```

Run:

```bash
npx trace-to-skill analyze examples/codex-failed-run.md
npx trace-to-skill suggest examples/codex-failed-run.md --target agents-md
```
