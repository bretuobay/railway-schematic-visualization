import { CoordinateBridge, CoordinateSystemType, GraphBuilder } from '../src';

const linearGraph = new GraphBuilder()
  .addNode({
    id: 'a',
    name: 'A',
    type: 'station',
    coordinate: { type: CoordinateSystemType.Linear, trackId: 'main', distance: 0 },
  })
  .addNode({
    id: 'b',
    name: 'B',
    type: 'endpoint',
    coordinate: { type: CoordinateSystemType.Linear, trackId: 'main', distance: 100 },
  })
  .addEdge({
    id: 'ab',
    source: 'a',
    target: 'b',
    length: 100,
    geometry: { type: 'straight' },
  })
  .build();

const screenGraph = new GraphBuilder()
  .addNode({
    id: 'a',
    name: 'A',
    type: 'station',
    coordinate: { type: CoordinateSystemType.Screen, x: 0, y: 0 },
  })
  .addNode({
    id: 'b',
    name: 'B',
    type: 'endpoint',
    coordinate: { type: CoordinateSystemType.Screen, x: 100, y: 0 },
  })
  .addEdge({
    id: 'ab',
    source: 'a',
    target: 'b',
    length: 100,
    geometry: { type: 'straight' },
  })
  .build();

const bridge = new CoordinateBridge(linearGraph, screenGraph);

console.log(
  bridge.projectToScreen({
    type: CoordinateSystemType.Linear,
    trackId: 'main',
    distance: 25,
  }),
);
