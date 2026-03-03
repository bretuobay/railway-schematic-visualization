import {
  CoordinateSystemType,
  createDebugLogger,
  createPerformanceMonitor,
  GraphBuilder,
  RailSchematicCLI,
} from '../../src/index';

const cli = new RailSchematicCLI();
const initResult = cli.init();

if (!initResult.output) {
  throw new Error('Expected starter output.');
}

const exportResult = cli.exportSVG({
  input: initResult.output,
});

if (!exportResult.ok) {
  throw new Error(exportResult.error ?? 'Expected export to succeed.');
}

const graph = new GraphBuilder()
  .addNode({
    id: 'node-a',
    name: 'Node A',
    type: 'station',
    coordinate: {
      type: CoordinateSystemType.Screen,
      x: 0,
      y: 0,
    },
  })
  .build();

createDebugLogger().info('Type test graph', {
  nodes: graph.nodes.size,
});

const performanceMonitor = createPerformanceMonitor();
performanceMonitor.start('type-test');
performanceMonitor.end('type-test');
