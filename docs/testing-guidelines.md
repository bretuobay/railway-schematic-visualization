# Testing Guidelines

Use the workspace gates first. They are the baseline contract for every change:

- `npm run check:typecheck`: strict TypeScript validation across root and workspace packages.
- `npm run test:types`: compile-time public API smoke tests for TypeScript consumers.
- `npm run check:test`: unit and package-level coverage gates (80% minimum lines/statements).
- `npm run check:build`: verifies all distributable artifacts still build.
- `npm run check:bundles`: validates tree-shaking and bundle-size budgets.
- `npm run check:ci`: validates the CI/CD workflow contract and release/deploy pipeline files.
- `npm run check:runtime`: runs the real browser suite, visual regression suite, and multi-scenario rendering benchmarks.
- `npm run check:signoff`: runs the full pre-release gate, including conformance, release dry run, and runtime validation.
- `npm run check:storybook`: verifies the Storybook scaffold and example inventory.

## Browser And Visual Testing

- `npm run test:browser`: runs the non-visual Playwright browser suite across the supported browser matrix.
- `npm run test:visual`: runs the `@visual` screenshot suite against the canonical Chrome baseline through the same Playwright wrapper.
- `npm run storybook`: starts Storybook when installed locally, otherwise validates the scaffold and exits cleanly.
- `npm run storybook:build`: builds Storybook when installed locally, otherwise validates the scaffold and exits cleanly.
- WebKit execution note:
  - Safari coverage remains part of the supported browser matrix.
  - The Playwright `safari` project runs by default on macOS.
  - On non-macOS CI hosts, set `PLAYWRIGHT_ENABLE_WEBKIT=true` only if the runner is known to support stable WebKit launches.
- Browser coverage targets:
  - Chrome 115+
  - Firefox 119+
  - Safari 17+ (via WebKit in Playwright)
  - Edge 115+

## Benchmarks

- `npm run bench:render`: runs the rendering benchmark against the built core package.
- Supported benchmark scenarios:
  - `baseline`
  - `large`
  - `stress`
- Example: `npm run bench:render -- --scenario large --output .artifacts/runtime/large.json --enforce-budget`
- Run `npm run check:build` first if `dist/` is stale or missing.

## Integration Coverage

Keep major feature integration checks in source control:

- Framework adapter integration smoke tests
- Overlay integration tests
- Root cross-feature integration suite in `src/ecosystem.integration.test.ts`
- Browser smoke tests under `tests/browser`
- Visual regression specs under `tests/visual`

Add new infrastructure files to the verification tests so CI fails if the harness drifts.
