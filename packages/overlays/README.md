# @rail-schematic-viz/overlays

Data visualization overlays for railway schematic diagrams.

## Installation

```bash
npm install @rail-schematic-viz/overlays @rail-schematic-viz/core @rail-schematic-viz/layout
```

## What It Provides

- `OverlayManager` and `OverlayRegistry` for lifecycle, registration, z-order, events, and configuration.
- Built-in overlays: `HeatMapOverlay`, `AnnotationOverlay`, `RangeBandOverlay`, `TrafficFlowOverlay`, `TimeSeriesOverlay`.
- Legend rendering through `LegendRenderer`.
- Color utilities through `ColorScale` and `ColorPalette`.
- Spatial utilities through `SpatialIndex`, `CollisionDetection`, and `Clustering`.
- Animation and performance helpers through `AnimationController`, `PerformanceMonitor`, and `Debounce`.
- Accessibility helpers through `OverlayAccessibilityManager`.

## Basic Usage

```ts
import { OverlayManager, HeatMapOverlay } from '@rail-schematic-viz/overlays';

const manager = new OverlayManager();

const heatMapId = await manager.addOverlay(
  new HeatMapOverlay({
    data: [
      {
        id: 'station-a',
        position: { type: 'screen', x: 120, y: 80 },
        value: 42,
      },
    ],
  }),
);

await manager.renderAll({
  dimensions: { width: 800, height: 600 },
});
```

## Overlay Examples

### Heat Map

```ts
import { HeatMapOverlay } from '@rail-schematic-viz/overlays';

const overlay = new HeatMapOverlay({
  configuration: {
    interpolationMode: 'smooth',
    performanceMode: 'balanced',
    cullingBuffer: 32,
  },
  data: [
    {
      id: 'throughput-1',
      position: { type: 'screen', x: 100, y: 60 },
      value: 12,
    },
  ],
});
```

### Annotation

```ts
import { AnnotationOverlay } from '@rail-schematic-viz/overlays';

const overlay = new AnnotationOverlay({
  configuration: {
    collisionStrategy: 'adjust',
    clusterRadius: 24,
  },
  data: [
    {
      id: 'incident-1',
      position: { type: 'screen', x: 220, y: 90 },
      label: 'Signal issue',
      pinType: 'triangle',
    },
  ],
});
```

### Range Bands

```ts
import { RangeBandOverlay } from '@rail-schematic-viz/overlays';

const overlay = new RangeBandOverlay({
  configuration: {
    stackingMode: 'stacked',
    labelPosition: 'above',
  },
  data: [
    {
      id: 'maintenance-window',
      start: { type: 'screen', x: 120, y: 100 },
      end: { type: 'screen', x: 320, y: 100 },
      label: 'Maintenance',
      blendMode: 'multiply',
    },
  ],
});
```

### Traffic Flow

```ts
import { TrafficFlowOverlay } from '@rail-schematic-viz/overlays';

const overlay = new TrafficFlowOverlay({
  configuration: {
    animationStyle: 'dashed',
    minWidth: 2,
    maxWidth: 12,
  },
  data: [
    {
      id: 'flow-1',
      start: { type: 'screen', x: 100, y: 140 },
      end: { type: 'screen', x: 360, y: 140 },
      frequency: 18,
      direction: 'bidirectional',
    },
  ],
});
```

### Time Series

```ts
import { TimeSeriesOverlay } from '@rail-schematic-viz/overlays';

const overlay = new TimeSeriesOverlay({
  configuration: {
    playbackSpeed: 1.5,
    preloadFrames: 2,
  },
  data: [
    {
      id: 'speed-1',
      timestamp: Date.now(),
      metric: 'speed',
      position: { type: 'screen', x: 180, y: 160 },
      value: 70,
    },
  ],
});

overlay.play();
```

## Working With Linear Coordinates

Use `CoordinateBridge` from `@rail-schematic-viz/core` when overlay data is expressed in linear track coordinates instead of screen coordinates.

```ts
import { CoordinateBridge } from '@rail-schematic-viz/core';
import { OverlayManager, AnnotationOverlay } from '@rail-schematic-viz/overlays';

const coordinateBridge = new CoordinateBridge(linearGraph, screenGraph);

const manager = new OverlayManager({ coordinateBridge });

await manager.addOverlay(
  new AnnotationOverlay({
    data: [
      {
        id: 'milepost-50',
        position: { type: 'linear', trackId: 'main', distance: 50_000 },
        label: 'MP 50',
      },
    ],
  }),
);
```

## Custom Overlay Development

Custom overlays implement the `RailOverlay` interface:

```ts
import type {
  OverlayConfiguration,
  OverlayContext,
  OverlayDimensions,
  OverlayRenderResult,
  RailOverlay,
  RenderContext,
} from '@rail-schematic-viz/overlays';

class CustomOverlay implements RailOverlay<readonly number[], OverlayConfiguration> {
  public readonly type = 'custom';

  public initialize(_context: OverlayContext): void {}
  public update(_data: readonly number[]): void {}
  public resize(_dimensions: OverlayDimensions): void {}
  public destroy(): void {}

  public render(_context: RenderContext): OverlayRenderResult {
    return { elementCount: 0, durationMs: 0 };
  }
}
```

Register custom overlays through `OverlayRegistry`:

```ts
import { OverlayRegistry } from '@rail-schematic-viz/overlays';

const registry = new OverlayRegistry();
registry.register('custom', () => new CustomOverlay());
```

## API Overview

### Main exports

- `OverlayManager`, `OverlayRegistry`, `RailOverlay`
- `HeatMapOverlay`, `AnnotationOverlay`, `RangeBandOverlay`, `TrafficFlowOverlay`, `TimeSeriesOverlay`
- `LegendRenderer`, `LegendDescriptor`
- `ColorScale`, `ColorPalette`
- `SpatialIndex`, `CollisionDetection`, `Clustering`
- `AnimationController`, `PerformanceMonitor`, `Debounce`
- `OverlayAccessibilityManager`

### Submodule exports

- `@rail-schematic-viz/overlays/overlays`
- `@rail-schematic-viz/overlays/colors`
- `@rail-schematic-viz/overlays/legend`
- `@rail-schematic-viz/overlays/performance`
- `@rail-schematic-viz/overlays/accessibility`

## Color Scale And Palette Options

- `ColorScale.linear`, `logarithmic`, `quantile`, `threshold`, `sequential`, `diverging`, `custom`
- Palettes include sequential (`Blues`, `Greens`, `Reds`), diverging (`RdBu`, `RdYlGn`, `Spectral`), perceptual (`Viridis`, `Plasma`, `Inferno`), accessibility-safe (`ColorBlindSafe`, `ColorBlindSafeDiverging`), and categorical (`Category10`, `Category20`)

## Accessibility Features

- ARIA labels and role assignment for overlay nodes
- Keyboard navigation support for interactive nodes
- Live region announcements for visibility and configuration changes
- `aria-expanded`, `aria-pressed`, and `aria-describedby` support for clusters, controls, and tooltips

## Performance Guidelines

- Use Canvas-backed overlays (`HeatMapOverlay`) for dense layers.
- Provide `viewportBounds` in render calls to enable culling.
- Tune `cullingBuffer` per overlay when aggressive clipping hurts perception.
- Use `PerformanceMonitor` to track render/update timings in host applications.
- Use `Debounce` or `throttle` for viewport-driven redraw loops.
