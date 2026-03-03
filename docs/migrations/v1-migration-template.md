# v1 Migration Guide Template

Use this template when the first major release introduces breaking changes.

## Breaking Changes

- List removed or renamed packages.
- List changed APIs and configuration keys.
- Call out any runtime behavior changes that affect rendering, exports, or accessibility.

## Before / After

Provide at least one before/after code example for each breaking API surface.

## Upgrade Path

1. Update package versions together so all `@rail-schematic-viz/*` packages stay on the same major.
2. Replace deprecated APIs with their documented replacements.
3. Run `npm run check` and any app-specific browser tests after migration.

## Rollback Plan

- Keep the previous major installed until validation is complete.
- Revert to the previous major if regressions appear in rendering, exports, or framework adapters.
