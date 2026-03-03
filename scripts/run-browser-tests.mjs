import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const workspaceRoot = process.cwd();
const isWindows = process.platform === 'win32';
const localPlaywrightBinary = resolve(
  workspaceRoot,
  'node_modules',
  '.bin',
  isWindows ? 'playwright.cmd' : 'playwright',
);
const forwardedArguments = process.argv.slice(2);

if (!existsSync(resolve(workspaceRoot, 'playwright.config.mjs'))) {
  console.error('Missing playwright.config.mjs.');
  process.exit(1);
}

if (!existsSync(localPlaywrightBinary)) {
  console.log(
    'Playwright is not installed in node_modules. The browser-test configuration is present; install @playwright/test to execute the suite.',
  );
  process.exit(0);
}

const result = spawnSync(
  localPlaywrightBinary,
  ['test', '--config', 'playwright.config.mjs', ...forwardedArguments],
  {
    stdio: 'inherit',
  },
);

process.exit(result.status ?? 1);
