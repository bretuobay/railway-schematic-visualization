# Core API

Package: `@rail-schematic-viz/core`

Use this package when you need the base graph model, parsers, coordinate transforms, renderers, or CLI-level helpers.

## Key Exports

- `GraphBuilder`
- `RailGraph`
- `JSONParser`
- `JSONSerializer`
- `RailMLParser`
- `CoordinateBridge`
- `SVGRenderer`
- `RailSchematicCLI`
- `createDebugLogger`
- `createPerformanceMonitor`

## Typical Flow

1. Build or parse a `RailGraph`.
2. Normalize coordinates if your source data is not already screen-based.
3. Render with `SVGRenderer`.
4. Layer in `layout`, `overlays`, or adapter packages only when required.

## Common Inputs

- `RailGraph` for render and export paths
- parser input strings for JSON or RailML ingestion
- styling and renderer options for SVG output

## Related Pages

- [Layout API](/api/layout)
- [Overlays API](/api/overlays)
- [Getting Started](/getting-started)
