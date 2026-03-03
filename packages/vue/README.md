# @rail-schematic-viz/vue

Vue adapter for Rail Schematic Viz.

## Exports

- `createRailSchematicVue` / `RailSchematicVue`: creates a stateful adapter instance with mount/update/destroy semantics.
- `useRailSchematic`: composable-style helper for viewport, overlay, selection, and export controls.
- `VUE_ADAPTER_METADATA` and `VUE_ADAPTER_SURFACE`: stable package metadata and capability flags.

## Adapter Instance

The Vue adapter instance exposes:

- `ready()`
- `update(props)`
- `destroy()`
- `pan()`, `zoom()`, `fitToView()`
- `addOverlay()`, `removeOverlay()`, `toggleOverlay()`
- `selectElements()`, `clearSelection()`
- `exportSVG()`, `exportPNG()`, `print()`

## Example

```ts
import { CoordinateSystemType, GraphBuilder } from '@rail-schematic-viz/core';
import { createRailSchematicVue, useRailSchematic } from '@rail-schematic-viz/vue';

const graph = new GraphBuilder()
  .addNode({
    coordinate: { type: CoordinateSystemType.Screen, x: 40, y: 60 },
    id: 'main-line',
    name: 'Main Line',
    type: 'station',
  })
  .build();

const instance = createRailSchematicVue({
  data: graph,
});

await instance.ready();

const ref = { current: instance };
const api = useRailSchematic(ref);
const png = await api.export.toPNG({ viewportMode: 'full' });
```

Event callbacks can be handled either through specific props such as `onSelectionChange` or the generic `onEvent(name, payload)` bridge, which emits Vue-mapped event names.
