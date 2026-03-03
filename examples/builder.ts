import { CoordinateSystemType, GraphBuilder } from '../src';

const graph = new GraphBuilder()
  .addNode({
    id: 'station-a',
    name: 'Station A',
    type: 'station',
    coordinate: { type: CoordinateSystemType.Screen, x: 0, y: 0 },
  })
  .addNode({
    id: 'station-b',
    name: 'Station B',
    type: 'station',
    coordinate: { type: CoordinateSystemType.Screen, x: 120, y: 0 },
  })
  .addEdge({
    id: 'edge-ab',
    source: 'station-a',
    target: 'station-b',
    length: 120,
    geometry: { type: 'straight' },
  })
  .build();

console.log(graph.nodes.size, graph.edges.size);
