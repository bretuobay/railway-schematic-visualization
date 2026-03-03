import { accessSync, constants, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

function assertFileExists(relativePath: string): void {
  accessSync(resolve(process.cwd(), relativePath), constants.F_OK);
}

function readWorkspaceFile(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('ci/cd pipeline', () => {
  it('keeps the release and deploy workflow wired for docs and package publishing', () => {
    const workflow = readWorkspaceFile('.github/workflows/release-and-deploy.yml');

    expect(workflow).toContain('name: Release And Deploy');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('verify-release:');
    expect(workflow).toContain('package-release:');
    expect(workflow).toContain('publish-packages:');
    expect(workflow).toContain('deploy-docs:');
    expect(workflow).toContain('publish-release-notes:');
    expect(workflow).toContain('actions/deploy-pages@v4');
    expect(workflow).toContain('softprops/action-gh-release@v2');
    expect(workflow).toContain('NPM_TOKEN');
  });

  it('ships release-manifest and docs-artifact helper scripts', () => {
    assertFileExists('scripts/create-release-manifest.mjs');
    assertFileExists('scripts/prepare-docs-artifact.mjs');

    const packageJson = readWorkspaceFile('package.json');

    expect(packageJson).toContain('"check:ci": "node scripts/check-ci-pipeline.mjs && vitest run src/ci-pipeline.test.ts"');
    expect(packageJson).toContain('"release:manifest": "node scripts/create-release-manifest.mjs"');
    expect(packageJson).toContain('"docs:artifact": "node scripts/prepare-docs-artifact.mjs .artifacts/pages"');
  });

  it('documents release automation commands in the repo docs', () => {
    const versioningPolicy = readWorkspaceFile('docs/versioning-policy.md');
    const productionGuide = readWorkspaceFile('docs/guides/production-rollout.md');

    expect(versioningPolicy).toContain('npm run release:manifest');
    expect(versioningPolicy).toContain('[CHANGELOG.md](https://github.com/rail-schematic-viz/rail-schematic-viz/blob/main/CHANGELOG.md)');
    expect(productionGuide).toContain('npm run check:ci');
  });
});
