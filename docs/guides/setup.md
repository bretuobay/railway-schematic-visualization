# Setup Guide

Use this guide when you are deciding which packages to install and how to structure the first integration in a real project.

## Choose The Smallest Viable Package Set

- Basic SVG rendering only: `@rail-schematic-viz/core`
- Interactive zoom, pan, and selection: add `@rail-schematic-viz/layout`
- Overlay layers and legends: add `@rail-schematic-viz/overlays`
- Framework integration: add exactly one of `@rail-schematic-viz/react`, `@rail-schematic-viz/vue`, or `@rail-schematic-viz/web-component`
- Production feature packages: add only the ecosystem packages that solve a concrete requirement

## Installation Paths

```bash
npm install @rail-schematic-viz/core d3
```

```bash
yarn add @rail-schematic-viz/core d3
```

```bash
pnpm add @rail-schematic-viz/core d3
```

Add follow-on packages only after the base render path is stable.

## Workspace Setup

1. Keep the graph-building or parsing logic close to your domain data layer.
2. Keep rendering and framework wiring in the UI layer.
3. Keep custom overlays, context actions, and plugin hooks in explicit extension modules.
4. Prefer package public exports over deep imports.

## First Production-Safe Checks

- Run `npm run check:typecheck`
- Run `npm run check:test`
- Run `npm run check:build`
- If docs matter in the same change, run `npm run check:docs-site`

## Common Setup Mistakes

- Installing all packages up front before validating the core render path
- Passing ad hoc objects where adapters expect `RailGraph`
- Treating optional ecosystem packages as required runtime dependencies

## Next Step

Move to [Framework Integration](/guides/framework-integration) once the base graph and rendering path are working.
