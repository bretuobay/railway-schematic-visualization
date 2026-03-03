# Layout API

Package: `@rail-schematic-viz/layout`

Use this package when the schematic needs viewport control, interaction state, selection flow, or fit-to-view behavior.

## Key Exports

- `ViewportController`
- `FitToView`
- `EventManager`

## Responsibilities

- zoom and pan state
- viewport clamping
- fit-to-view calculations
- interaction event routing

## Typical Flow

1. Create a viewport controller around the rendered schematic.
2. Attach interaction handlers through the event manager.
3. Use `FitToView` for initial framing and reset actions.

## Related Pages

- [Core API](/api/core)
- [Adapters Shared API](/api/adapters-shared)
- [Brushing And Linking API](/api/brushing-linking)
