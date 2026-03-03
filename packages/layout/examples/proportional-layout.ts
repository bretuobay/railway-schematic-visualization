import { CoordinateSystemType, GraphBuilder } from '@rail-schematic-viz/core';
import { LayoutEngine, ProportionalLayout } from '@rail-schematic-viz/layout';

const builder = new GraphBuilder();

builder.addNode({
  id: 'alpha',
  name: 'Alpha',
  type: 'station',
  coordinate: { type: CoordinateSystemType.Screen, x: 0, y: 0 },
});
builder.addNode({
  id: 'beta',
  name: 'Beta',
  type: 'station',
  coordinate: { type: CoordinateSystemType.Screen, x: 100, y: 0 },
});
builder.addEdge({
  id: 'alpha-beta',
  source: 'alpha',
  target: 'beta',
  length: 100,
  geometry: { type: 'straight' },
});

const engine = new LayoutEngine(new ProportionalLayout({ scaleFactor: 2 }));
void engine.layout(builder.build());
