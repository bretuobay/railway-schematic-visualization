import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

const packageRoot = process.cwd();
const packageJsonPath = resolve(packageRoot, 'package.json');

if (!existsSync(packageJsonPath)) {
  console.error('No package.json found in the current working directory.');
  process.exit(1);
}

const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const cjsEntry = resolve(packageRoot, 'dist', 'index.cjs');
const cjsMap = resolve(packageRoot, 'dist', 'index.cjs.map');
const umdEntry = resolve(packageRoot, 'dist', 'index.umd.js');
const umdMap = resolve(packageRoot, 'dist', 'index.umd.js.map');

if (!existsSync(cjsEntry)) {
  console.error(`Missing CommonJS entry for ${packageJson.name}. Run the package build first.`);
  process.exit(1);
}

const cjsSource = readFileSync(cjsEntry, 'utf8').replace(/\/\/# sourceMappingURL=.*$/u, '').trimEnd();
const cjsMapSource = existsSync(cjsMap) ? readFileSync(cjsMap, 'utf8') : undefined;
const globalName = toGlobalName(packageJson.name);
const peerDependencies = Object.keys(packageJson.peerDependencies ?? {});
const requireCases = peerDependencies
  .map((dependencyName) => {
    const mappedGlobal = dependencyToGlobal(dependencyName);

    return `      case ${JSON.stringify(dependencyName)}:\n        return ${mappedGlobal};`;
  })
  .join('\n');
const requireBody = requireCases.length > 0
  ? [
      '    switch (name) {',
      requireCases,
      '      default:',
      '        throw new Error(\'External dependency "\' + name + \'" is not available in the browser bundle.\');',
      '    }',
    ].join('\n')
  : '    throw new Error(\'This browser bundle does not expose runtime require().\');';
const umdSource = [
  '(function (root, factory) {',
  '  if (typeof module === "object" && module.exports) {',
  '    module.exports = factory(root);',
  '  } else if (typeof define === "function" && define.amd) {',
  '    define([], function () { return factory(root); });',
  '  } else {',
  `    root.${globalName} = factory(root);`,
  '  }',
  '})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {',
  '  var module = { exports: {} };',
  '  var exports = module.exports;',
  '  function require(name) {',
  requireBody,
  '  }',
  cjsSource,
  '  return module.exports;',
  '});',
  `//# sourceMappingURL=${basename(umdMap)}`,
  '',
].join('\n');
const sourceMap = JSON.stringify({
  version: 3,
  file: basename(umdEntry),
  sources: [basename(cjsEntry)],
  sourcesContent: [cjsSource],
  names: [],
  mappings: '',
  ...(cjsMapSource ? { x_sourceMapReference: cjsMapSource } : {}),
}, null, 2);

writeFileSync(umdEntry, umdSource, 'utf8');
writeFileSync(umdMap, sourceMap, 'utf8');

console.log(`Generated browser UMD bundle for ${packageJson.name} at ${relativeFromPackageRoot(umdEntry)}.`);

function dependencyToGlobal(dependencyName) {
  switch (dependencyName) {
    case 'd3':
      return 'root.d3';
    case 'react':
      return 'root.React';
    case 'react-dom':
      return 'root.ReactDOM';
    case 'vue':
      return 'root.Vue';
    default:
      return `root.${toGlobalName(dependencyName)}`;
  }
}

function toGlobalName(packageName) {
  const normalized = packageName
    .replace(/^@/, '')
    .replace(/\//g, '-')
    .split(/[^A-Za-z0-9]+/u)
    .filter(Boolean)
    .map((segment) => `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`)
    .join('');

  return normalized || 'RailSchematicVizBundle';
}

function relativeFromPackageRoot(filePath) {
  const packageDirectory = dirname(packageJsonPath);

  return filePath.startsWith(packageDirectory)
    ? filePath.slice(packageDirectory.length + 1)
    : filePath;
}
