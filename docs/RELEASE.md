# Release Process

This repository is configured for npm Trusted Publishing so releases do not need a long-lived npm token or repeated local web authentication.

## One-Time npm Setup

In the npm package settings for `trace-to-skill`, add a Trusted Publisher:

- Publisher: GitHub Actions
- Organization or user: `grnbtqdbyx-create`
- Repository: `trace-to-skill`
- Workflow filename: `npm-publish.yml`
- Allowed action: `npm publish`

After this one-time npm setting is saved, publishing should happen from GitHub Actions using OIDC.

## Release Checklist

1. Bump `package.json` and `package-lock.json`.
2. Run `npm run check`.
3. Regenerate `docs/BENCHMARK.md` and `docs/SCORECARD.md` if benchmark fixtures changed.
4. Commit and push to `main`.
5. Create a GitHub release whose tag matches the package version, such as `v0.1.39`.
6. Confirm the `Publish npm` workflow succeeds.
7. Confirm `npm view trace-to-skill version dist-tags.latest --json` shows the new version.

The workflow also supports manual dispatch with `publish=true` for a version that has already been committed but not published.

## Why This Exists

Local `npm publish` with account 2FA can ask for browser/passkey approval on every release. Trusted Publishing moves the repeated release authentication into GitHub Actions and uses short-lived OIDC credentials instead.
