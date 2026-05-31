# Release Process

This repository is configured for npm Trusted Publishing so releases do not need a long-lived npm token or repeated local web authentication.

## One-Time npm Setup

Preferred CLI setup:

```bash
npx npm@11.16.0 trust github trace-to-skill \
  --file npm-publish.yml \
  --repo grnbtqdbyx-create/trace-to-skill \
  --allow-publish
```

`npm@11.16.0` or newer is recommended because older npm 11 builds may start the web-auth flow but fail to create the trust record without the publish permission flag.

Or, in the npm package settings for `trace-to-skill`, add a Trusted Publisher:

- Publisher: GitHub Actions
- Organization or user: `grnbtqdbyx-create`
- Repository: `trace-to-skill`
- Workflow filename: `npm-publish.yml`
- Allowed action: `npm publish`

After this one-time npm trust setting is saved, publishing should happen from GitHub Actions using OIDC.

You can preview the CLI trust command without changing npm state:

```bash
npx npm@11.16.0 trust github trace-to-skill \
  --file npm-publish.yml \
  --repo grnbtqdbyx-create/trace-to-skill \
  --allow-publish \
  --dry-run --json
```

## Release Checklist

1. Bump `package.json` and `package-lock.json`.
2. Run `npm run check`.
3. Regenerate `docs/BENCHMARK.md` and `docs/SCORECARD.md` if benchmark fixtures changed.
4. Commit and push to `main`.
5. Create a GitHub release whose tag matches the package version, such as `v0.1.43`.
6. Confirm the `Publish npm` workflow succeeds.
7. Confirm `npm view trace-to-skill version dist-tags.latest --json` shows the new version.

The workflow also supports manual dispatch with `publish=true` for a version that has already been committed but not published.

`trace-to-skill doctor .` checks for this release surface. Public npm packages without an OIDC-backed `npm publish` workflow receive a `release-automation` warning.

## Why This Exists

Local `npm publish` with account 2FA can ask for browser/passkey approval on every release. Trusted Publishing moves the repeated release authentication into GitHub Actions and uses short-lived OIDC credentials instead.
