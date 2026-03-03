# React API

Package: `@rail-schematic-viz/react`

Use this package when integrating the schematic into a React application.

## Key Exports

- `RailSchematic`
- `useRailSchematic`

## Responsibilities

- mount and update the schematic in a React tree
- expose imperative actions for export, overlays, viewport, and selection
- translate shared events into React-friendly callbacks

## Input Contract

- `data` expects a `RailGraph` instance or `null`

## Related Pages

- [Adapters Shared API](/api/adapters-shared)
- [Getting Started](/getting-started)
