import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const workspaceRoot = process.cwd();
const isWindows = process.platform === 'win32';
const localStorybookBinary = resolve(
  workspaceRoot,
  'node_modules',
  '.bin',
  isWindows ? 'storybook.cmd' : 'storybook',
);
const command = process.argv[2] ?? 'dev';
const supportedCommands = new Set(['dev', 'build']);

if (!supportedCommands.has(command)) {
  console.error(`Unsupported Storybook command "${command}". Expected one of: dev, build.`);
  process.exit(1);
}

if (!existsSync(resolve(workspaceRoot, '.storybook', 'main.mjs'))) {
  console.error('Missing .storybook/main.mjs.');
  process.exit(1);
}

if (!existsSync(resolve(workspaceRoot, '.storybook', 'preview.mjs'))) {
  console.error('Missing .storybook/preview.mjs.');
  process.exit(1);
}

if (!existsSync(resolve(workspaceRoot, 'stories'))) {
  console.error('Missing stories directory.');
  process.exit(1);
}

if (!existsSync(localStorybookBinary)) {
  console.log(
    'Storybook is not installed in node_modules. The Storybook configuration is present; install Storybook to run it locally.',
  );
  process.exit(0);
}

const args = command === 'dev'
  ? ['dev', '-p', '6006']
  : ['build', '--output-dir', 'storybook-static'];

const result = spawnSync(
  localStorybookBinary,
  args,
  {
    stdio: 'inherit',
  },
);

process.exit(result.status ?? 1);
