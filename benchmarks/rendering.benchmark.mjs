import { existsSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const distEntry = resolve(process.cwd(), 'dist', 'index.js');

if (!existsSync(distEntry)) {
  console.error('Missing dist/index.js. Run `npm run check:build` or `npm run build` before running benchmarks.');
  process.exit(1);
}

const coreModule = await import(pathToFileURL(distEntry).href);
const { CoordinateSystemType, GraphBuilder, SVGRenderer } = coreModule;

function buildBenchmarkGraph() {
  const builder = new GraphBuilder();

  for (let index = 0; index < 24; index += 1) {
    builder.addNode({
      id: `node-${index}`,
      name: `Node ${index}`,
      type: index === 0 || index === 23 ? 'endpoint' : 'station',
      coordinate: {
        type: CoordinateSystemType.Screen,
        x: index * 48,
        y: index % 2 === 0 ? 0 : 18,
      },
    });

    if (index > 0) {
      builder.addEdge({
        id: `edge-${index - 1}-${index}`,
        source: `node-${index - 1}`,
        target: `node-${index}`,
        length: 48,
        geometry: { type: 'straight' },
      });
    }
  }

  return builder.build();
}

const graph = buildBenchmarkGraph();
const renderer = new SVGRenderer();
const iterations = 200;
const startedAt = performance.now();

for (let index = 0; index < iterations; index += 1) {
  renderer.render(graph);
}

const completedAt = performance.now();
const totalMilliseconds = completedAt - startedAt;
const averageMilliseconds = totalMilliseconds / iterations;

console.log('Rendering benchmark complete.');
console.log(`Iterations: ${iterations}`);
console.log(`Total time: ${totalMilliseconds.toFixed(2)}ms`);
console.log(`Average per render: ${averageMilliseconds.toFixed(2)}ms`);
