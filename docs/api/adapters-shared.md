# Adapters Shared API

Package: `@rail-schematic-viz/adapters-shared`

Use this package when building framework integrations or platform-specific wrappers around the core renderer.

## Key Exports

- `ExportSystem`
- `SVGExporter`
- `PNGExporter`
- `PrintExporter`
- `LifecycleManager`
- `EventMapper`

## Responsibilities

- SVG, PNG, and print export orchestration
- lifecycle setup and teardown across renderer, viewport, and overlays
- event normalization across React, Vue, and Web Components

## Related Pages

- [React API](/api/react)
- [Vue API](/api/vue)
- [Web Component API](/api/web-component)
