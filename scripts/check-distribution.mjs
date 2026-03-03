import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const workspaceRoot = process.cwd();
const packageJsonPaths = [
  resolve(workspaceRoot, 'package.json'),
  ...readdirSync(resolve(workspaceRoot, 'packages'))
    .map((directory) => resolve(workspaceRoot, 'packages', directory, 'package.json'))
    .filter((filePath) => existsSync(filePath)),
];
const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/u;
const expectedRegistryUrl = 'https://github.com/rail-schematic-viz/rail-schematic-viz.git';
const expectedHomepage = 'https://rail-schematic-viz.dev';
const expectedIssuesUrl = 'https://github.com/rail-schematic-viz/rail-schematic-viz/issues';
const scopedPackagePattern = /^@rail-schematic-viz\/[a-z0-9-]+$/u;
const currentVersion = readJson('package.json').version;

const requiredDocs = [
  'CHANGELOG.md',
  'docs/package-structure.md',
  'docs/versioning-policy.md',
  'docs/migrations/v1-migration-template.md',
];

const failures = [];

for (const requiredDoc of requiredDocs) {
  if (!existsSync(resolve(workspaceRoot, requiredDoc))) {
    failures.push(`Missing required distribution/versioning document: ${requiredDoc}`);
  }
}

const changelog = safeRead('CHANGELOG.md');
if (!changelog.includes(`## ${currentVersion}`)) {
  failures.push(`CHANGELOG.md must include a release section for ${currentVersion}.`);
}

const versioningPolicy = safeRead('docs/versioning-policy.md');
if (!versioningPolicy.includes('MAJOR.MINOR.PATCH')) {
  failures.push('docs/versioning-policy.md must document semantic versioning explicitly.');
}
if (!versioningPolicy.includes('current and previous major')) {
  failures.push('docs/versioning-policy.md must describe support for the current and previous major versions.');
}

for (const packageJsonPath of packageJsonPaths) {
  const packageJson = readJsonFromAbsolutePath(packageJsonPath);
  const packageDir = resolve(packageJsonPath, '..');
  const relativePackageDir = packageDir.startsWith(resolve(workspaceRoot, 'packages'))
    ? packageDir.slice(workspaceRoot.length + 1)
    : '.';

  validatePackageMetadata(packageJson, packageJsonPath, relativePackageDir);
  validateBuiltArtifacts(packageJson, packageDir, packageJsonPath);
  validatePeerDependencies(packageJson, packageJsonPath);
}

if (failures.length > 0) {
  console.error('Distribution check failed.');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Distribution and versioning checks passed for ${packageJsonPaths.length} packages.`);

function validatePackageMetadata(packageJson, packageJsonPath, relativePackageDir) {
  const label = packageJson.name ?? packageJsonPath;

  if (typeof packageJson.name !== 'string' || !scopedPackagePattern.test(packageJson.name)) {
    failures.push(`${label}: package name must use the @rail-schematic-viz scope.`);
  }

  if (typeof packageJson.version !== 'string' || !semverPattern.test(packageJson.version)) {
    failures.push(`${label}: version must follow semantic versioning.`);
  }

  if (packageJson.version !== currentVersion) {
    failures.push(`${label}: version must stay aligned with the root release version ${currentVersion}.`);
  }

  if (packageJson.type !== 'module') {
    failures.push(`${label}: package type must be "module".`);
  }

  if (!Array.isArray(packageJson.files) || !packageJson.files.includes('dist')) {
    failures.push(`${label}: files must include the dist directory.`);
  }

  if (packageJson.sideEffects !== false) {
    failures.push(`${label}: sideEffects must be false for tree-shaking.`);
  }

  if (typeof packageJson.main !== 'string' || typeof packageJson.module !== 'string' || typeof packageJson.types !== 'string') {
    failures.push(`${label}: main, module, and types entries are required.`);
  }

  if (typeof packageJson.browser !== 'string' || typeof packageJson.unpkg !== 'string' || typeof packageJson.jsdelivr !== 'string') {
    failures.push(`${label}: browser, unpkg, and jsdelivr entries are required for the browser bundle.`);
  }

  if (packageJson.browser !== './dist/index.umd.js' || packageJson.unpkg !== './dist/index.umd.js' || packageJson.jsdelivr !== './dist/index.umd.js') {
    failures.push(`${label}: browser, unpkg, and jsdelivr must point at ./dist/index.umd.js.`);
  }

  if (!packageJson.exports || typeof packageJson.exports !== 'object') {
    failures.push(`${label}: exports must be configured.`);
  }

  if (packageJson.license !== 'MIT') {
    failures.push(`${label}: license must be MIT.`);
  }

  if (packageJson.homepage !== expectedHomepage) {
    failures.push(`${label}: homepage must be ${expectedHomepage}.`);
  }

  if (packageJson.repository?.type !== 'git' || packageJson.repository?.url !== expectedRegistryUrl) {
    failures.push(`${label}: repository must point at the public git repository.`);
  }

  if (relativePackageDir !== '.' && packageJson.repository?.directory !== relativePackageDir) {
    failures.push(`${label}: repository.directory must be ${relativePackageDir}.`);
  }

  if (packageJson.bugs?.url !== expectedIssuesUrl) {
    failures.push(`${label}: bugs.url must point at the public issue tracker.`);
  }

  if (packageJson.publishConfig?.access !== 'public') {
    failures.push(`${label}: publishConfig.access must be "public".`);
  }

  if (packageJson.engines?.node !== '>=18') {
    failures.push(`${label}: engines.node must be ">=18".`);
  }

  if (relativePackageDir === '.' && packageJson.bin?.['rail-schematic-viz'] !== './bin/rail-schematic-viz.mjs') {
    failures.push(`${label}: root bin entry must expose ./bin/rail-schematic-viz.mjs.`);
  }
}

function validateBuiltArtifacts(packageJson, packageDir, packageJsonPath) {
  const label = packageJson.name ?? packageJsonPath;
  const requiredEntries = [];

  if (typeof packageJson.main === 'string') {
    requiredEntries.push(packageJson.main);
    requiredEntries.push(`${packageJson.main}.map`);
  }

  if (typeof packageJson.module === 'string') {
    requiredEntries.push(packageJson.module);
    requiredEntries.push(`${packageJson.module}.map`);
  }

  if (typeof packageJson.types === 'string') {
    requiredEntries.push(packageJson.types);
  }

  if (typeof packageJson.browser === 'string') {
    requiredEntries.push(packageJson.browser);
    requiredEntries.push(`${packageJson.browser}.map`);
  }

  for (const value of Object.values(packageJson.exports ?? {})) {
    if (!value || typeof value !== 'object') {
      continue;
    }

    if (typeof value.import === 'string') {
      requiredEntries.push(value.import);
    }

    if (typeof value.require === 'string') {
      requiredEntries.push(value.require);
    }

    if (typeof value.types === 'string') {
      requiredEntries.push(value.types);
    }
  }

  if (packageJson.bin?.['rail-schematic-viz']) {
    requiredEntries.push(packageJson.bin['rail-schematic-viz']);
  }

  for (const entry of new Set(requiredEntries)) {
    if (!existsSync(resolve(packageDir, entry))) {
      failures.push(`${label}: missing published artifact ${entry}. Run the build before publishing.`);
    }
  }
}

function validatePeerDependencies(packageJson, packageJsonPath) {
  const label = packageJson.name ?? packageJsonPath;
  const peerDependencies = packageJson.peerDependencies ?? {};

  if (
    packageJson.name === '@rail-schematic-viz/core'
    || packageJson.name === '@rail-schematic-viz/overlays'
    || packageJson.name === '@rail-schematic-viz/canvas'
  ) {
    if (peerDependencies.d3 !== '^7.9.0') {
      failures.push(`${label}: must declare d3 ^7.9.0 as a peer dependency.`);
    }
  }

  if (packageJson.name === '@rail-schematic-viz/react') {
    if (typeof peerDependencies.react !== 'string' || typeof peerDependencies['react-dom'] !== 'string') {
      failures.push(`${label}: must declare react and react-dom as peer dependencies.`);
    }
  }

  if (packageJson.name === '@rail-schematic-viz/vue') {
    if (typeof peerDependencies.vue !== 'string') {
      failures.push(`${label}: must declare vue as a peer dependency.`);
    }
  }
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(resolve(workspaceRoot, relativePath), 'utf8'));
}

function readJsonFromAbsolutePath(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function safeRead(relativePath) {
  const absolutePath = resolve(workspaceRoot, relativePath);
  return existsSync(absolutePath) ? readFileSync(absolutePath, 'utf8') : '';
}
