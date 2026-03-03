import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const workspaceRoot = process.cwd();
const releaseDirectory = resolve(workspaceRoot, '.release');
const rootPackage = readJson(resolve(workspaceRoot, 'package.json'));
const manifestPath = resolve(releaseDirectory, 'release-manifest.json');
const releaseNotesPath = resolve(releaseDirectory, 'release-notes.md');
const docsArtifactDirectory = resolve(releaseDirectory, 'pages');
const validationPath = resolve(releaseDirectory, 'release-validation.json');

mkdirSync(releaseDirectory, { recursive: true });

runStep('check:build', ['npm', 'run', 'check:build']);
runStep('check:distribution', ['npm', 'run', 'check:distribution']);
runStep('release:notes', ['npm', 'run', 'release:notes', '--', '.release/release-notes.md']);
runStep('release:manifest', ['npm', 'run', 'release:manifest', '--', '.release/release-manifest.json']);
runStep('docs:build', ['npm', 'run', 'docs:build']);
runStep('docs:artifact', ['node', 'scripts/prepare-docs-artifact.mjs', '.release/pages']);

const manifest = readJson(manifestPath);
const releaseNotes = readText(releaseNotesPath).trim();
const docsSiteManifest = existsSync(resolve(docsArtifactDirectory, 'site.json'))
  ? readJson(resolve(docsArtifactDirectory, 'site.json'))
  : null;

assert(releaseNotes.startsWith(`## ${rootPackage.version}`), 'Release notes must start with the current version heading.');
assert(manifest.releaseVersion === rootPackage.version, 'Release manifest version must match package.json.');
assert(manifest.rootPackage?.name === rootPackage.name, 'Release manifest root package name must match package.json.');
assert(Array.isArray(manifest.packages) && manifest.packages.length > 0, 'Release manifest must list workspace packages.');
assert(existsSync(resolve(docsArtifactDirectory, 'index.html')), 'Docs artifact must contain index.html.');

if (docsSiteManifest !== null) {
  assert(typeof docsSiteManifest.mode === 'string', 'Docs artifact site manifest must declare a mode.');
}

const publishedArtifacts = collectArtifactStats(manifest);
const validation = {
  validatedAt: new Date().toISOString(),
  releaseVersion: rootPackage.version,
  releaseNotesPath: '.release/release-notes.md',
  manifestPath: '.release/release-manifest.json',
  docsArtifactPath: '.release/pages',
  docsMode: docsSiteManifest?.mode ?? (existsSync(resolve(workspaceRoot, 'docs/.vitepress/dist/index.html')) ? 'vitepress' : 'fallback'),
  packageCount: manifest.packages.length + 1,
  publishedArtifacts,
  publishReadiness: {
    requiresTagPattern: 'v*',
    distributionVerified: true,
    npmTokenConfigured: Boolean(process.env.NPM_TOKEN),
    githubTokenConfigured: Boolean(process.env.GITHUB_TOKEN),
  },
};

writeFileSync(validationPath, `${JSON.stringify(validation, null, 2)}\n`, 'utf8');
console.log(`Release dry-run validation written to ${relativeFromRoot(validationPath)}`);

function collectArtifactStats(manifestData) {
  const allPackages = [manifestData.rootPackage, ...manifestData.packages];

  return allPackages.map((pkg) => {
    const packageDirectory = pkg.directory ? resolve(workspaceRoot, pkg.directory) : workspaceRoot;
    const artifacts = [
      pkg.main,
      pkg.module,
      pkg.types,
      pkg.browser,
    ].filter((value) => typeof value === 'string');
    const uniqueArtifacts = [...new Set(artifacts)];
    let totalBytes = 0;

    for (const artifact of uniqueArtifacts) {
      const stats = statSync(resolve(packageDirectory, artifact));
      totalBytes += stats.size;
    }

    return {
      name: pkg.name,
      directory: pkg.directory ?? '.',
      artifactCount: uniqueArtifacts.length,
      totalBytes,
    };
  });
}

function runStep(label, command) {
  const [file, ...args] = command;
  const result = spawnSync(file, args, {
    cwd: workspaceRoot,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  console.log(`Release dry-run step completed: ${label}`);
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function readText(filePath) {
  return readFileSync(filePath, 'utf8');
}

function relativeFromRoot(filePath) {
  return filePath.slice(workspaceRoot.length + 1);
}

function assert(condition, message) {
  if (!condition) {
    console.error(`Release dry-run failed: ${message}`);
    process.exit(1);
  }
}
