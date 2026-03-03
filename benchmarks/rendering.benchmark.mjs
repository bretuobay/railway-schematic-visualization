import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const distEntry = resolve(process.cwd(), 'dist', 'index.js');
const argumentMap = parseArguments(process.argv.slice(2));
const scenarioName = argumentMap.get('scenario') ?? 'baseline';
const outputPath = argumentMap.get('output') ?? null;
const shouldEnforceBudget = argumentMap.has('enforce-budget');

if (!existsSync(distEntry)) {
  console.error('Missing dist/index.js. Run `npm run check:build` or `npm run build` before running benchmarks.');
  process.exit(1);
}

const scenario = getScenario(scenarioName);
const coreModule = await import(pathToFileURL(distEntry).href);
const { CoordinateSystemType, GraphBuilder, SVGRenderer } = coreModule;

const graphBuildStartedAt = performance.now();
const graph = buildBenchmarkGraph(GraphBuilder, CoordinateSystemType, scenario);
const graphBuildCompletedAt = performance.now();
const renderer = new SVGRenderer();
const renderStartedAt = performance.now();

for (let index = 0; index < scenario.iterations; index += 1) {
  renderer.render(graph);
}

const renderCompletedAt = performance.now();
const buildMilliseconds = graphBuildCompletedAt - graphBuildStartedAt;
const totalRenderMilliseconds = renderCompletedAt - renderStartedAt;
const averageRenderMilliseconds = totalRenderMilliseconds / scenario.iterations;
const report = {
  generatedAt: new Date().toISOString(),
  scenario: scenario.name,
  nodeCount: scenario.nodeCount,
  edgeCount: Math.max(scenario.nodeCount - 1, 0),
  iterations: scenario.iterations,
  buildMilliseconds: round(buildMilliseconds),
  totalRenderMilliseconds: round(totalRenderMilliseconds),
  averageRenderMilliseconds: round(averageRenderMilliseconds),
  budgetMilliseconds: scenario.budgetMilliseconds,
  withinBudget: averageRenderMilliseconds <= scenario.budgetMilliseconds,
};

if (outputPath) {
  const absoluteOutputPath = resolve(process.cwd(), outputPath);
  mkdirSync(dirname(absoluteOutputPath), { recursive: true });
  writeFileSync(absoluteOutputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`Benchmark report written to ${outputPath}`);
}

console.log('Rendering benchmark complete.');
console.log(`Scenario: ${report.scenario}`);
console.log(`Nodes: ${report.nodeCount}`);
console.log(`Iterations: ${report.iterations}`);
console.log(`Build time: ${report.buildMilliseconds.toFixed(2)}ms`);
console.log(`Total render time: ${report.totalRenderMilliseconds.toFixed(2)}ms`);
console.log(`Average per render: ${report.averageRenderMilliseconds.toFixed(2)}ms`);
console.log(`Budget: ${report.budgetMilliseconds.toFixed(2)}ms`);
console.log(`Within budget: ${report.withinBudget ? 'yes' : 'no'}`);

if (shouldEnforceBudget && !report.withinBudget) {
  console.error(
    `Rendering benchmark exceeded the ${report.budgetMilliseconds.toFixed(2)}ms budget for scenario "${report.scenario}".`,
  );
  process.exit(1);
}

function buildBenchmarkGraph(GraphBuilderClass, coordinateSystemType, scenarioConfig) {
  const builder = new GraphBuilderClass();

  for (let index = 0; index < scenarioConfig.nodeCount; index += 1) {
    builder.addNode({
      id: `node-${index}`,
      name: `Node ${index}`,
      type: index === 0 || index === scenarioConfig.nodeCount - 1 ? 'endpoint' : index % 7 === 0 ? 'junction' : 'station',
      coordinate: {
        type: coordinateSystemType.Screen,
        x: index * scenarioConfig.horizontalSpacing,
        y: (index % scenarioConfig.verticalCycle) * scenarioConfig.verticalStep,
      },
    });

    if (index > 0) {
      builder.addEdge({
        id: `edge-${index - 1}-${index}`,
        source: `node-${index - 1}`,
        target: `node-${index}`,
        length: scenarioConfig.horizontalSpacing,
        geometry: { type: 'straight' },
      });
    }
  }

  return builder.build();
}

function getScenario(name) {
  const scenarios = {
    baseline: {
      name: 'baseline',
      nodeCount: 24,
      iterations: 200,
      horizontalSpacing: 48,
      verticalCycle: 2,
      verticalStep: 18,
      budgetMilliseconds: 5,
    },
    large: {
      name: 'large',
      nodeCount: 500,
      iterations: 50,
      horizontalSpacing: 18,
      verticalCycle: 5,
      verticalStep: 14,
      budgetMilliseconds: 12,
    },
    stress: {
      name: 'stress',
      nodeCount: 1200,
      iterations: 15,
      horizontalSpacing: 8,
      verticalCycle: 8,
      verticalStep: 10,
      budgetMilliseconds: 30,
    },
  };

  const scenario = scenarios[name];

  if (!scenario) {
    console.error(`Unknown benchmark scenario "${name}". Use baseline, large, or stress.`);
    process.exit(1);
  }

  return scenario;
}

function parseArguments(argumentsList) {
  const parsed = new Map();

  for (let index = 0; index < argumentsList.length; index += 1) {
    const current = argumentsList[index];

    if (!current.startsWith('--')) {
      continue;
    }

    const key = current.slice(2);
    const next = argumentsList[index + 1];

    if (!next || next.startsWith('--')) {
      parsed.set(key, 'true');
      continue;
    }

    parsed.set(key, next);
    index += 1;
  }

  return parsed;
}

function round(value) {
  return Number(value.toFixed(2));
}
