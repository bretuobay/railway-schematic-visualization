# Migration Playbook

Use this guide when upgrading versions, adopting new packages in phases, or replacing a prototype integration with the production package set.

## Typical Migration Paths

- Core-only prototype to interactive app: add `layout`, then `overlays`, then a framework adapter
- Adapter-based app to production feature set: add `themes`, `i18n`, `security`, then optional SSR or canvas support
- Static docs integration to live product: move from Markdown examples to Storybook-backed and test-gated integration

## Upgrade Sequence

1. Read the [Versioning Policy](/versioning-policy).
2. Check the current release notes in [CHANGELOG.md](https://github.com/rail-schematic-viz/rail-schematic-viz/blob/main/CHANGELOG.md).
3. Use the [Migration Template](/migrations/v1-migration-template) for planned breaking changes.
4. Run `npm run check:typecheck` and `npm run check:test` before and after the change.

## Safe Rollout Pattern

- Upgrade one package group at a time
- Keep adapter and ecosystem upgrades behind feature flags when possible
- Validate exports, browser support, and docs together
- Prefer canary rollout or staged environment rollout before broad release

## Breaking-Change Checklist

- Rebuild `RailGraph` creation paths if parser or type contracts changed
- Reconfirm adapter `data` inputs are still canonical `RailGraph`
- Re-run bundle, distribution, and browser gates
- Update internal usage docs and Storybook examples

## Related References

- [Versioning Policy](/versioning-policy)
- [Migration Template](/migrations/v1-migration-template)
- [Testing Guidelines](/testing-guidelines)
