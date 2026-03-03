import { CoordinateSystemType, GraphBuilder } from '@rail-schematic-viz/core';
import { LayoutEngine, MetroMapLayout } from '@rail-schematic-viz/layout';

const builder = new GraphBuilder();

builder.addNode({
  id: 'north',
  name: 'North',
  type: 'station',
  coordinate: { type: CoordinateSystemType.Screen, x: 0, y: 0 },
});
builder.addNode({
  id: 'central',
  name: 'Central',
  type: 'junction',
  coordinate: { type: CoordinateSystemType.Screen, x: 60, y: 40 },
});
builder.addNode({
  id: 'south',
  name: 'South',
  type: 'station',
  coordinate: { type: CoordinateSystemType.Screen, x: 120, y: 80 },
});
builder.addEdge({
  id: 'north-central',
  source: 'north',
  target: 'central',
  length: 70,
  geometry: { type: 'straight' },
});
builder.addEdge({
  id: 'central-south',
  source: 'central',
  target: 'south',
  length: 70,
  geometry: { type: 'straight' },
});

const engine = new LayoutEngine(new MetroMapLayout({ gridSpacing: 20 }));
void engine.layout(builder.build());
