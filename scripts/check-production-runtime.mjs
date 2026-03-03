import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const workspaceRoot = process.cwd();
const outputDirectory = resolve(workspaceRoot, '.artifacts', 'runtime');
const scenarioReports = [
  {
    name: 'baseline',
    outputPath: '.artifacts/runtime/baseline.json',
  },
  {
    name: 'large',
    outputPath: '.artifacts/runtime/large.json',
  },
  {
    name: 'stress',
    outputPath: '.artifacts/runtime/stress.json',
  },
];

mkdirSync(outputDirectory, { recursive: true });

runStep('test:browser', ['npm', 'run', 'test:browser']);
runStep('test:visual', ['npm', 'run', 'test:visual']);

for (const scenario of scenarioReports) {
  runStep(`bench:${scenario.name}`, [
    'npm',
    'run',
    'bench:render',
    '--',
    '--scenario',
    scenario.name,
    '--output',
    scenario.outputPath,
    '--enforce-budget',
  ]);
}

const report = {
  generatedAt: new Date().toISOString(),
  browserSuite: {
    executed: true,
    command: 'npm run test:browser',
  },
  visualSuite: {
    executed: true,
    command: 'npm run test:visual',
  },
  benchmarks: scenarioReports.map((scenario) => readJson(resolve(workspaceRoot, scenario.outputPath))),
};

report.benchmarkSummary = {
  slowestAverageMilliseconds: Math.max(...report.benchmarks.map((benchmark) => benchmark.averageRenderMilliseconds)),
  allWithinBudget: report.benchmarks.every((benchmark) => benchmark.withinBudget),
};

const summaryPath = resolve(outputDirectory, 'summary.json');
mkdirSync(dirname(summaryPath), { recursive: true });
writeFileSync(summaryPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(`Production runtime summary written to ${relativeFromRoot(summaryPath)}`);

function runStep(label, command) {
  const [file, ...argumentsList] = command;
  const result = spawnSync(file, argumentsList, {
    cwd: workspaceRoot,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  console.log(`Production runtime step completed: ${label}`);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function relativeFromRoot(filePath) {
  return filePath.slice(workspaceRoot.length + 1);
}
