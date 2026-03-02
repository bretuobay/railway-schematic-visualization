# @rail-schematic-viz/layout

Layout, viewport, interaction, minimap, performance, animation, accessibility, and validation utilities for rail schematic rendering.

## Installation

```bash
npm install @rail-schematic-viz/layout @rail-schematic-viz/core
```

## Package Structure

- `@rail-schematic-viz/layout`: Main entry point with the common UX-layer surface.
- `@rail-schematic-viz/layout/layout`: Layout strategies and `LayoutEngine`.
- `@rail-schematic-viz/layout/viewport`: Viewport control, fit-to-view, semantic zoom, culling.
- `@rail-schematic-viz/layout/interactions`: Event, hover, selection, brush, keyboard, touch.
- `@rail-schematic-viz/layout/minimap`: `Minimap` component.
- `@rail-schematic-viz/layout/performance`: Monitoring and render optimization helpers.
- `@rail-schematic-viz/layout/animation`: Animation system and easing helpers.
- `@rail-schematic-viz/layout/accessibility`: ARIA and focus helpers.
- `@rail-schematic-viz/layout/validation`: Configuration validation utilities.
- `@rail-schematic-viz/layout/errors`: Error hierarchy and error codes.
- `@rail-schematic-viz/layout/types`: Type-only public surface.

## Basic Layout Example

```ts
import { GraphBuilder, CoordinateSystemType } from '@rail-schematic-viz/core';
import { LayoutEngine, ProportionalLayout } from '@rail-schematic-viz/layout';

const builder = new GraphBuilder();

builder.addNode({
  id: 'a',
  name: 'Alpha',
  type: 'station',
  coordinate: { type: CoordinateSystemType.Screen, x: 0, y: 0 },
});
builder.addNode({
  id: 'b',
  name: 'Beta',
  type: 'station',
  coordinate: { type: CoordinateSystemType.Screen, x: 100, y: 0 },
});
builder.addEdge({
  id: 'a-b',
  source: 'a',
  target: 'b',
  length: 100,
  geometry: { type: 'straight' },
});

const engine = new LayoutEngine(new ProportionalLayout({ scaleFactor: 1.5 }));
const positioned = await engine.layout(builder.build());
```

## Viewport and Minimap Example

```ts
import { Minimap, ViewportController } from '@rail-schematic-viz/layout';

const viewport = new ViewportController(svgElement, {
  minScale: 0.5,
  maxScale: 4,
});

const minimap = new Minimap(container, positionedGraph, viewport, {
  width: 180,
  height: 120,
  corner: 'bottom-right',
});
```

## Interaction Example

```ts
import {
  EventManager,
  KeyboardNavigation,
  SelectionEngine,
  TouchGestures,
} from '@rail-schematic-viz/layout';

const events = new EventManager(rootElement);
const selection = new SelectionEngine({ eventManager: events });
const keyboard = new KeyboardNavigation({ root: rootElement });
const touch = new TouchGestures({
  root: rootElement,
  eventManager: events,
  viewportController: viewport,
});
```

## Keyboard Shortcuts

- `+` / `=`: Zoom in
- `-`: Zoom out
- `0`: Reset zoom / fit if bound
- `Arrow` keys: Navigate focus or move minimap viewport indicator
- `Escape`: Clear focus / selection
- `Shift+Click`: Toggle selection when wired through `SelectionEngine`

## Accessibility

- Use `ARIAManager` for roles, labels, descriptions, and live announcements.
- Use `FocusManager` for focus rings and skip-to-content support.
- Focus indicators are designed to meet WCAG 2.1 AA contrast requirements.

## Examples

Example source files live in [`examples`](./examples).
