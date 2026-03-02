# @rail-schematic-viz/core

Core package for Rail Schematic Viz. It provides the railway graph model, typed coordinate systems, parser layer, builder API, SVG renderer, and linear/screen projection utilities.

## Installation

```bash
npm install @rail-schematic-viz/core
```

## Package Structure

- Main entry: graph model, coordinates, errors, parsers, renderer, and builder re-exports
- `@rail-schematic-viz/core/builder`: `GraphBuilder`
- `@rail-schematic-viz/core/parsers`: `JSONParser`, `JSONSerializer`, `RailMLParser`
- `@rail-schematic-viz/core/coordinates`: `CoordinateBridge`, `projectWebMercator`, `inverseWebMercator`
- `@rail-schematic-viz/core/renderer`: `SVGRenderer`, `DEFAULT_STYLING`
- `@rail-schematic-viz/core/types`: public TypeScript types

## Builder Example

```ts
import { CoordinateSystemType, GraphBuilder } from "@rail-schematic-viz/core";

const graph = new GraphBuilder()
  .addNode({
    id: "station-a",
    name: "Station A",
    type: "station",
    coordinate: { type: CoordinateSystemType.Screen, x: 0, y: 0 },
  })
  .addNode({
    id: "station-b",
    name: "Station B",
    type: "station",
    coordinate: { type: CoordinateSystemType.Screen, x: 120, y: 0 },
  })
  .addEdge({
    id: "edge-ab",
    source: "station-a",
    target: "station-b",
    length: 120,
    geometry: { type: "straight" },
  })
  .build();
```

## Parser Example

```ts
import { JSONParser } from "@rail-schematic-viz/core";

const parser = new JSONParser();
const result = parser.parse(
  JSON.stringify({
    nodes: [
      {
        id: "a",
        name: "A",
        type: "station",
        coordinate: { type: "screen", x: 0, y: 0 },
      },
      {
        id: "b",
        name: "B",
        type: "endpoint",
        coordinate: { type: "screen", x: 100, y: 0 },
      },
    ],
    edges: [
      {
        id: "ab",
        source: "a",
        target: "b",
        length: 100,
        geometry: { type: "straight" },
      },
    ],
    lines: [],
  }),
);
```

## Renderer Example

```ts
import { SVGRenderer } from "@rail-schematic-viz/core";

if (result.ok) {
  const svg = new SVGRenderer().render(result.value);
  console.log(svg);
}
```

## CoordinateBridge Example

```ts
import { CoordinateBridge, CoordinateSystemType, GraphBuilder } from "@rail-schematic-viz/core";

const linearGraph = new GraphBuilder()
  .addNode({
    id: "a",
    name: "A",
    type: "station",
    coordinate: { type: CoordinateSystemType.Linear, trackId: "main", distance: 0 },
  })
  .addNode({
    id: "b",
    name: "B",
    type: "endpoint",
    coordinate: { type: CoordinateSystemType.Linear, trackId: "main", distance: 100 },
  })
  .addEdge({
    id: "ab",
    source: "a",
    target: "b",
    length: 100,
    geometry: { type: "straight" },
  })
  .build();

const screenGraph = new GraphBuilder()
  .addNode({
    id: "a",
    name: "A",
    type: "station",
    coordinate: { type: CoordinateSystemType.Screen, x: 0, y: 0 },
  })
  .addNode({
    id: "b",
    name: "B",
    type: "endpoint",
    coordinate: { type: CoordinateSystemType.Screen, x: 100, y: 0 },
  })
  .addEdge({
    id: "ab",
    source: "a",
    target: "b",
    length: 100,
    geometry: { type: "straight" },
  })
  .build();

const bridge = new CoordinateBridge(linearGraph, screenGraph);
console.log(
  bridge.projectToScreen({
    type: CoordinateSystemType.Linear,
    trackId: "main",
    distance: 25,
  }),
);
```

## Development

```bash
npm run typecheck
npm run test:run
npm run build
```
