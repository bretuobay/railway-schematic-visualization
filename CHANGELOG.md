# Changelog

All notable changes to this project are documented here.

The format follows Keep a Changelog, and version numbers follow semantic versioning (`MAJOR.MINOR.PATCH`).

## 0.1.0 - 2026-03-03

### Added

- Core graph, parser, coordinate, and SVG rendering foundation in `@rail-schematic-viz/core`.
- Layout, interaction, accessibility, minimap, and performance tooling in `@rail-schematic-viz/layout`.
- Overlay rendering, built-ins, legends, and performance helpers in `@rail-schematic-viz/overlays`.
- Shared export, lifecycle, event mapping, and framework adapters in the Phase 4 adapter packages.
- Ecosystem production features including themes, i18n, plugins, context menus, regional adapters, brushing/linking, SSR, canvas rendering, security, bundle checks, and browser/testing infrastructure.
- Added a typed CLI plus developer-experience helpers for scaffolding, export, validation, debug logging, performance hooks, and compile-time API smoke tests.

### Packaging

- Added public npm publish metadata across all workspace packages.
- Added browser-oriented UMD bundles for the primary `index` entrypoint of every published package.
- Added enforceable distribution and versioning checks via `npm run check:distribution`.
- Added release note extraction via `npm run release:notes`.
