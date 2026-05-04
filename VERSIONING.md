# Versioning Policy

Keck follows [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`).

## Rules

| Bump | When |
|------|------|
| **Patch** | Bug fixes with no API changes |
| **Minor** | New exports or backwards-compatible additions |
| **Major** | Any breaking API change, removal, or rename |

## What counts as a breaking change

- Removing or renaming an exported function, type, or constant
- Changing the signature of an existing export in a way that breaks call sites
- Changing observable behavior that callers depend on (e.g. subscription timing, callback arguments)

Purely additive changes — new exports, new optional parameters, new utility functions — are always minor bumps.

## Release process

1. Move all entries from `[Unreleased]` in `CHANGELOG.md` to a new versioned section with today's date.
2. Bump `version` in `package.json` to match.
3. Commit: `chore: release vX.Y.Z`.
4. Tag: `git tag vX.Y.Z`.
5. Push tag and publish to npm.
