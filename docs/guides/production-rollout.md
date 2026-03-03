# Production Rollout

Use this guide before you ship the library to end users. It pulls the operational requirements into one checklist.

## Rendering Strategy

- Use SVG as the default interactive render path
- Add `@rail-schematic-viz/canvas` only when data density justifies it
- Use `@rail-schematic-viz/ssr` for server-rendered markup and headless export flows

## Feature Hardening

- Use `@rail-schematic-viz/themes` and `@rail-schematic-viz/i18n` for consistent visual and locale behavior
- Use `@rail-schematic-viz/security` before accepting untrusted SVG, URLs, theme-like inputs, or translation payloads
- Use `@rail-schematic-viz/plugins` only for bounded, typed extension points

## Browser And Build Gates

Run these before release:

1. `npm run check:typecheck`
2. `npm run check:test`
3. `npm run check:build`
4. `npm run check:bundles`
5. `npm run check:distribution`
6. `npm run check:browser-infra`
7. `npm run check:ci`

## Release Readiness

- Confirm bundle budgets in [Bundle Size](/bundle-size)
- Confirm supported browser matrix in [Browser Compatibility](/browser-compatibility)
- Confirm package metadata and artifacts through the distribution gate
- Confirm docs and Storybook changes ship with user-facing feature additions

## Rollout Advice

- Start with SVG-only rendering
- Add ecosystem packages incrementally
- Enable plugin or regional-adapter paths only where the use case is proven
- Keep browser-specific polyfills explicit and documented

## Next Step

Use the [Migration Playbook](/guides/migration-playbook) for upgrades, phased adoption, or package-surface changes.
