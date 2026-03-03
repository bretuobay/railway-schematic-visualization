import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const workspaceRoot = process.cwd();
const isWindows = process.platform === 'win32';
const localVitepressBinary = resolve(
  workspaceRoot,
  'node_modules',
  '.bin',
  isWindows ? 'vitepress.cmd' : 'vitepress',
);
const command = process.argv[2] ?? 'dev';
const supportedCommands = new Set(['dev', 'build', 'preview']);

if (!supportedCommands.has(command)) {
  console.error(`Unsupported docs command "${command}". Expected one of: dev, build, preview.`);
  process.exit(1);
}

if (!existsSync(resolve(workspaceRoot, 'docs', '.vitepress', 'config.mjs'))) {
  console.error('Missing docs/.vitepress/config.mjs.');
  process.exit(1);
}

if (!existsSync(localVitepressBinary)) {
  console.log(
    'VitePress is not installed in node_modules. The docs site configuration is present; install vitepress to run the docs site locally.',
  );
  process.exit(0);
}

const result = spawnSync(
  localVitepressBinary,
  [command, 'docs'],
  {
    stdio: 'inherit',
  },
);

process.exit(result.status ?? 1);
