import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const workspaceRoot = process.cwd();
const packageJson = JSON.parse(readFileSync(resolve(workspaceRoot, 'package.json'), 'utf8'));
const changelog = readFileSync(resolve(workspaceRoot, 'CHANGELOG.md'), 'utf8');
const versionHeader = `## ${packageJson.version}`;
const startIndex = changelog.indexOf(versionHeader);

if (startIndex < 0) {
  console.error(`Could not find ${versionHeader} in CHANGELOG.md.`);
  process.exit(1);
}

const nextHeaderIndex = changelog.indexOf('\n## ', startIndex + versionHeader.length);
const releaseNotes = changelog
  .slice(startIndex, nextHeaderIndex === -1 ? undefined : nextHeaderIndex)
  .trim();
const outputPath = process.argv[2];

if (outputPath) {
  writeFileSync(resolve(workspaceRoot, outputPath), `${releaseNotes}\n`, 'utf8');
  console.log(`Release notes written to ${outputPath}`);
  process.exit(0);
}

console.log(releaseNotes);
