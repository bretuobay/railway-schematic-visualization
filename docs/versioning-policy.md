# Versioning Policy

`rail-schematic-viz` uses semantic versioning in the form `MAJOR.MINOR.PATCH`.

## Semver Rules

- Increment `MAJOR` for breaking API or behavior changes.
- Increment `MINOR` for backward-compatible features.
- Increment `PATCH` for backward-compatible fixes and documentation-only maintenance that changes published artifacts.

## Support Window

The project supports the current and previous major version at the same time. New fixes target the current major first, and only security or migration-critical fixes are backported to the previous major.

## Deprecation Rules

- Public APIs are deprecated before removal in a later major release.
- Deprecations must be called out in the changelog and release notes.
- Migration guidance must exist before a deprecated API is removed.

## Release Notes

- Every published version must have a matching section in [CHANGELOG.md](https://github.com/rail-schematic-viz/rail-schematic-viz/blob/main/CHANGELOG.md).
- `npm run release:notes` extracts the current version section for publishing in GitHub Releases or npm release notes.
- `npm run release:manifest` writes the package and artifact manifest used by the release pipeline.
- `npm run check:release-dry-run` runs the local release pipeline without publishing and writes `.release/release-validation.json`.

## Release Dry Run

Run this before tagging a release:

1. `npm run check`
2. `npm run check:release-dry-run`

The dry run generates:

- `.release/release-notes.md`
- `.release/release-manifest.json`
- `.release/release-validation.json`
- `.release/pages/`

For actual tagged releases, the CI workflow also expects:

- `NPM_TOKEN` for npm publication
- `GITHUB_TOKEN` for GitHub release creation
- Git tags that match `v*`

## Migration Guides

Major releases must ship with a migration guide under `docs/migrations/`. The current template is [v1-migration-template.md](/migrations/v1-migration-template).
