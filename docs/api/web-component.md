# Web Component API

Package: `@rail-schematic-viz/web-component`

Use this package when the schematic must work without a framework-specific runtime.

## Key Exports

- `RailSchematicElement`
- custom element registration helpers

## Responsibilities

- custom element lifecycle management
- attribute/property-based updates
- DOM event dispatch for framework-agnostic embedding

## Input Contract

- `data` property expects a `RailGraph` instance or `null`
- `data` attribute accepts JSON that can be parsed by `JSONParser`

## Related Pages

- [Adapters Shared API](/api/adapters-shared)
- [SSR API](/api/ssr)
