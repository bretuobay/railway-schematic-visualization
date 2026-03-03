# @rail-schematic-viz/react

React adapter for Rail Schematic Viz.

## Exports

- `RailSchematic`: memoized component with an imperative ref surface for viewport, overlay, selection, and export actions.
- `useRailSchematic`: hook that provides delegated viewport, overlay, selection, and export helpers from a component ref.
- `REACT_ADAPTER_METADATA` and `REACT_ADAPTER_SURFACE`: stable package metadata and capability flags.

## Imperative Ref

`RailSchematic` exposes a ref with:

- `pan(x, y)`
- `zoom(scale)`
- `fitToView()`
- `addOverlay()`, `removeOverlay()`, `toggleOverlay()`
- `selectElements()`, `clearSelection()`
- `exportSVG()`, `exportPNG()`, `print()`

## Example

```ts
import { GraphBuilder, CoordinateSystemType } from '@rail-schematic-viz/core';
import { RailSchematic, useRailSchematic } from '@rail-schematic-viz/react';

const graph = new GraphBuilder()
  .addNode({
    coordinate: { type: CoordinateSystemType.Screen, x: 40, y: 60 },
    id: 'main-line',
    name: 'Main Line',
    type: 'station',
  })
  .build();

const ref = { current: null };

RailSchematic({
  data: graph,
  ref,
});

const api = useRailSchematic(ref);
await api.viewport.pan(24, 12);
const svg = await api.export.toSVG({ viewportMode: 'full' });
```
