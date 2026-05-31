# Contributing

Thanks for helping improve `trace-to-skill`.

The most valuable contributions are small, evidence-backed improvements:

- anonymized failed agent traces
- new failure detectors with fixtures
- Codex / Claude Code / Cursor / Copilot adapters
- better generated rules
- eval cases that prove a rule helps
- docs for maintainer workflows

## Development

```bash
npm install
npm test
npm run check
```

## Pull Requests

Please include:

- the failure class you are improving
- a fixture that reproduces it
- a test that proves the detector or renderer works
- any security or privacy considerations

Generated rules should remain suggestions. The tool should not rewrite maintainer policy without review.

