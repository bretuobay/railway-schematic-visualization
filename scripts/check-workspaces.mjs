import { spawnSync } from 'node:child_process';

const rawArguments = process.argv.slice(2);
const requestedStep = rawArguments[0] === '--step'
  ? rawArguments[1]
  : undefined;
const workspacePackages = requestedStep
  ? rawArguments.slice(2)
  : rawArguments;

if (workspacePackages.length === 0) {
  console.error('At least one workspace package must be provided.');
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
