# Getting Started

You can render a basic schematic in under 10 lines of code and then scale up into layouts, overlays, adapters, and ecosystem packages as needed.

## Installation

Choose the package manager you already use:

```bash
npm install @rail-schematic-viz/core d3
```

```bash
yarn add @rail-schematic-viz/core d3
```

```bash
pnpm add @rail-schematic-viz/core d3
```

For interactive panning, zooming, and selection add `@rail-schematic-viz/layout`. For rich overlay layers add `@rail-schematic-viz/overlays`.

## Hello World In Under 10 Lines

This is the smallest useful render path:

```ts
import { CoordinateSystemType, GraphBuilder, SVGRenderer } from '@rail-schematic-viz/core';
const graph = new GraphBuilder()
  .addNode({ id: 'a', name: 'Origin', type: 'station', coordinate: { type: CoordinateSystemType.Screen, x: 0, y: 0 } })
  .addNode({ id: 'b', name: 'Destination', type: 'station', coordinate: { type: CoordinateSystemType.Screen, x: 120, y: 0 } })
  .addEdge({ id: 'edge-a-b', source: 'a', target: 'b', length: 120, geometry: { type: 'straight' } })
  .build();
const svg = new SVGRenderer().render(graph);
```

## Step By Step

1. Install `@rail-schematic-viz/core` plus `d3`.
2. Build a `RailGraph` with `GraphBuilder`, a parser, or the CLI scaffold.
3. Render the graph with `SVGRenderer`.
4. Mount the resulting SVG in your application shell.
5. Add layout, overlays, adapters, or ecosystem packages only when you need them.

## Vanilla JavaScript

```js
import { CoordinateSystemType, GraphBuilder, SVGRenderer } from '@rail-schematic-viz/core';

const graph = new GraphBuilder()
  .addNode({ id: 'a', name: 'A', type: 'station', coordinate: { type: CoordinateSystemType.Screen, x: 0, y: 0 } })
  .addNode({ id: 'b', name: 'B', type: 'station', coordinate: { type: CoordinateSystemType.Screen, x: 96, y: 0 } })
  .addEdge({ id: 'edge-a-b', source: 'a', target: 'b', length: 96, geometry: { type: 'straight' } })
  .build();

document.querySelector('#app').innerHTML = new SVGRenderer().render(graph);
```

## React

```tsx
import { CoordinateSystemType, GraphBuilder } from '@rail-schematic-viz/core';
import { RailSchematic } from '@rail-schematic-viz/react';

const graph = new GraphBuilder()
  .addNode({ id: 'a', name: 'A', type: 'station', coordinate: { type: CoordinateSystemType.Screen, x: 0, y: 0 } })
  .addNode({ id: 'b', name: 'B', type: 'station', coordinate: { type: CoordinateSystemType.Screen, x: 120, y: 0 } })
  .addEdge({ id: 'edge-a-b', source: 'a', target: 'b', length: 120, geometry: { type: 'straight' } })
  .build();

export function App() {
  return <RailSchematic data={graph} />;
}
```

## Vue

```ts
import { defineComponent } from 'vue';
import { CoordinateSystemType, GraphBuilder } from '@rail-schematic-viz/core';
import { RailSchematicVue } from '@rail-schematic-viz/vue';

const graph = new GraphBuilder()
  .addNode({ id: 'a', name: 'A', type: 'station', coordinate: { type: CoordinateSystemType.Screen, x: 0, y: 0 } })
  .addNode({ id: 'b', name: 'B', type: 'station', coordinate: { type: CoordinateSystemType.Screen, x: 120, y: 0 } })
  .addEdge({ id: 'edge-a-b', source: 'a', target: 'b', length: 120, geometry: { type: 'straight' } })
  .build();

export default defineComponent({
  components: { RailSchematicVue },
  setup: () => ({ graph }),
  template: '<RailSchematicVue :data="graph" />',
});
```

## Recommended Install Paths

- Core-only rendering: `@rail-schematic-viz/core`
- Interactive views: add `@rail-schematic-viz/layout`
- Rich overlays: add `@rail-schematic-viz/overlays`
- React apps: `@rail-schematic-viz/react`
- Vue apps: `@rail-schematic-viz/vue`
- Web Component integration: `@rail-schematic-viz/web-component`

## Troubleshooting

- If the render is blank, confirm your graph has at least two nodes and one edge.
- If TypeScript cannot resolve imports, run the workspace build and re-check your `node_modules` links.
- If framework adapters fail at runtime, make sure you pass a real `RailGraph` instance, not an ad hoc object.
- If you plan to ship to production, review the [Browser Compatibility](/browser-compatibility) guide before rollout.

## Next Steps

1. Review the [API Reference](/api-reference) for the full public surface.
2. Use the [Package Structure](/package-structure) guide to choose the right packages for your stack.
3. Browse [Storybook](/storybook) when you want richer visual scenarios than the inline examples on this page.
4. Read the [Testing Guidelines](/testing-guidelines) before adding CI checks.
5. Follow the [Versioning Policy](/versioning-policy) when you prepare upgrades.
