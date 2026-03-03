import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const workspaceRoot = process.cwd();
const failures = [];

assertWorkflow(
  '.github/workflows/phase4-check.yml',
  [
    'name: Workspace Gates',
    'typecheck:',
    'coverage:',
    'build:',
    'bundles:',
    'distribution:',
    'docs-site:',
    'storybook:',
    'browser-infrastructure:',
    'benchmarks:',
    'npm run docs:build',
    'npm run storybook:build',
    'npx playwright install chromium firefox webkit',
    'npm run test:browser',
    'npm run test:visual',
  ],
);

assertWorkflow(
  '.github/workflows/release-and-deploy.yml',
  [
    'name: Release And Deploy',
    'workflow_dispatch:',
    'tags:',
    '- \'v*\'',
    'verify-release:',
    'package-release:',
    'publish-packages:',
    'deploy-docs:',
    'publish-release-notes:',
    'npx playwright install chromium firefox webkit',
    'npm run check:runtime',
    'npm run check:release-dry-run',
    '.release/release-validation.json',
    'actions/upload-artifact@v4',
    'actions/upload-pages-artifact@v3',
    'actions/deploy-pages@v4',
    'softprops/action-gh-release@v2',
    'NPM_TOKEN',
  ],
);

assertFile('.github/workflows/release-and-deploy.yml');
assertFile('scripts/create-release-manifest.mjs');
assertFile('scripts/prepare-docs-artifact.mjs');

if (failures.length > 0) {
  console.error('CI/CD pipeline check failed.');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('CI/CD pipeline checks passed.');

function assertFile(relativePath) {
  if (!existsSync(resolve(workspaceRoot, relativePath))) {
    failures.push(`Missing required pipeline file: ${relativePath}`);
  }
}

function assertWorkflow(relativePath, requiredMarkers) {
  const absolutePath = resolve(workspaceRoot, relativePath);

  if (!existsSync(absolutePath)) {
    failures.push(`Missing workflow: ${relativePath}`);
    return;
  }

  const contents = readFileSync(absolutePath, 'utf8');

  for (const marker of requiredMarkers) {
    if (!contents.includes(marker)) {
      failures.push(`${relativePath} must include "${marker}".`);
    }
  }
}
