import { spawnSync } from 'node:child_process';

const rawArguments = process.argv.slice(2);
const allPackages = [
  '.',
  '@rail-schematic-viz/layout',
  '@rail-schematic-viz/overlays',
  '@rail-schematic-viz/adapters-shared',
  '@rail-schematic-viz/react',
  '@rail-schematic-viz/vue',
  '@rail-schematic-viz/web-component',
  '@rail-schematic-viz/themes',
  '@rail-schematic-viz/i18n',
  '@rail-schematic-viz/plugins',
  '@rail-schematic-viz/context-menu',
  '@rail-schematic-viz/adapters-regional',
  '@rail-schematic-viz/brushing-linking',
  '@rail-schematic-viz/ssr',
  '@rail-schematic-viz/canvas',
  '@rail-schematic-viz/security',
];
const phase4Packages = [
  '@rail-schematic-viz/adapters-shared',
  '@rail-schematic-viz/react',
  '@rail-schematic-viz/vue',
  '@rail-schematic-viz/web-component',
];
const phase5Packages = [
  '@rail-schematic-viz/themes',
  '@rail-schematic-viz/i18n',
  '@rail-schematic-viz/plugins',
  '@rail-schematic-viz/context-menu',
  '@rail-schematic-viz/adapters-regional',
  '@rail-schematic-viz/brushing-linking',
  '@rail-schematic-viz/ssr',
  '@rail-schematic-viz/canvas',
  '@rail-schematic-viz/security',
];
const presets = {
  all: allPackages,
  phase4: phase4Packages,
  phase5: phase5Packages,
};

let requestedStep;
let requestedPreset;
let argumentIndex = 0;

while (argumentIndex < rawArguments.length) {
  const currentArgument = rawArguments[argumentIndex];

  if (currentArgument === '--step') {
    requestedStep = rawArguments[argumentIndex + 1];
    argumentIndex += 2;
    continue;
  }

  if (currentArgument === '--preset') {
    requestedPreset = rawArguments[argumentIndex + 1];
    argumentIndex += 2;
    continue;
  }

  break;
}

const trailingArguments = rawArguments.slice(argumentIndex);
const workspacePackages = requestedPreset
  ? presets[requestedPreset] ?? []
  : trailingArguments;

if (workspacePackages.length === 0) {
  console.error(
    requestedPreset
      ? `Unknown preset "${requestedPreset}". Expected one of: ${Object.keys(presets).join(', ')}`
      : 'At least one workspace package must be provided.',
  );
  process.exit(1);
}

const steps = [
  {
    label: 'Typecheck',
    script: 'typecheck',
  },
  {
    label: 'Coverage',
    script: 'test:coverage',
  },
  {
    label: 'Build',
    script: 'build',
  },
];
const selectedSteps = requestedStep
  ? steps.filter((step) => step.script === requestedStep)
  : steps;

if (requestedStep && selectedSteps.length === 0) {
  console.error(`Unknown step "${requestedStep}". Expected one of: ${steps.map((step) => step.script).join(', ')}`);
  process.exit(1);
}

for (const step of selectedSteps) {
  console.log(`\n== ${step.label} ==`);

  for (const workspacePackage of workspacePackages) {
    const isRootPackage = workspacePackage === '.';
    const command = isRootPackage
      ? ['run', step.script]
      : ['run', step.script, '--workspace', workspacePackage];
    const label = isRootPackage ? '@rail-schematic-viz/core (root)' : workspacePackage;

    console.log(`\n[${label}] npm ${command.join(' ')}`);

    const result = spawnSync(
      'npm',
      command,
      {
        stdio: 'inherit',
      },
    );

    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
  }
}

console.log('\nWorkspace package check passed.');
