# @rail-schematic-viz/web-component

Web Component adapter for Rail Schematic Viz.

## Exports

- `RailSchematicElement`: custom element class with lifecycle, overlay, viewport, selection, and export methods.
- `registerRailSchematicElement`: registers the `rail-schematic` custom element if it is not already defined.
- `WEB_COMPONENT_ADAPTER_METADATA` and `WEB_COMPONENT_ADAPTER_SURFACE`: stable package metadata and capability flags.

## Custom Element API

`RailSchematicElement` supports:

- `connectedCallback()` / `disconnectedCallback()`
- `ready()`
- `updateConfig()`, `setData()`, `setOverlays()`, `setViewport()`
- `pan()`, `zoom()`, `fitToView()`
- `selectElements()`, `clearSelection()`
- `exportSVG()`, `exportPNG()`, `print()`

## Example

```ts
import {
  CoordinateSystemType,
  GraphBuilder,
} from '@rail-schematic-viz/core';
import {
  RailSchematicElement,
  registerRailSchematicElement,
} from '@rail-schematic-viz/web-component';

const graph = new GraphBuilder()
  .addNode({
    coordinate: { type: CoordinateSystemType.Screen, x: 40, y: 60 },
    id: 'main-line',
    name: 'Main Line',
    type: 'station',
  })
  .build();

registerRailSchematicElement();

const element = new RailSchematicElement();
await element.updateConfig({
  data: graph,
});

const svg = await element.exportSVG({ viewportMode: 'full' });
```

Mapped browser events are dispatched with the `rail-` prefix, for example `rail-selection-change` and `rail-viewport-change`.
