import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const workspaceRoot = process.cwd();
const outputPath = process.argv[2] ?? '.release/release-manifest.json';
const rootPackage = readJson(resolve(workspaceRoot, 'package.json'));
const packageDirectories = readdirSync(resolve(workspaceRoot, 'packages'));
const packages = [];

for (const directory of packageDirectories) {
  const packageJsonPath = resolve(workspaceRoot, 'packages', directory, 'package.json');

  if (!existsSync(packageJsonPath)) {
    continue;
  }

  const packageJson = readJson(packageJsonPath);

  packages.push({
    name: packageJson.name,
    version: packageJson.version,
    directory: `packages/${directory}`,
    main: packageJson.main,
    module: packageJson.module,
    types: packageJson.types,
    browser: packageJson.browser,
  });
}

const manifest = {
  releaseVersion: rootPackage.version,
  generatedAt: new Date().toISOString(),
  rootPackage: {
    name: rootPackage.name,
    version: rootPackage.version,
    main: rootPackage.main,
    module: rootPackage.module,
    types: rootPackage.types,
    browser: rootPackage.browser,
    bin: rootPackage.bin?.['rail-schematic-viz'] ?? null,
  },
  packages,
  documentation: {
    source: 'docs',
    artifactDefaultPath: '.release/pages',
  },
};

mkdirSync(dirname(resolve(workspaceRoot, outputPath)), { recursive: true });
writeFileSync(resolve(workspaceRoot, outputPath), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Release manifest written to ${outputPath}`);

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}
