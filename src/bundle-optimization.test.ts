import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface PackageJsonLike {
  readonly sideEffects?: boolean;
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly peerDependencies?: Readonly<Record<string, string>>;
  readonly exports?: Readonly<Record<string, unknown>>;
}

function readPackageJson(path: string): PackageJsonLike {
  return JSON.parse(readFileSync(resolve(path), 'utf8')) as PackageJsonLike;
}

describe('bundle optimization contracts', () => {
  it('keeps core tree-shakeable and declares d3 as a peer dependency', () => {
    const packageJson = readPackageJson('package.json');

    expect(packageJson.sideEffects).toBe(false);
    expect(packageJson.peerDependencies?.d3).toBe('^7.9.0');
    expect(packageJson.dependencies?.d3).toBeUndefined();
    expect(packageJson.exports).toEqual(
      expect.objectContaining({
        '.': expect.any(Object),
        './builder': expect.any(Object),
        './coordinates': expect.any(Object),
        './errors': expect.any(Object),
        './parsers': expect.any(Object),
        './renderer': expect.any(Object),
        './types': expect.any(Object),
      }),
    );
  });

  it('exposes lazy subpath exports for optional packages', () => {
    const canvasPackage = readPackageJson('packages/canvas/package.json');
    const regionalPackage = readPackageJson('packages/adapters-regional/package.json');

    expect(canvasPackage.sideEffects).toBe(false);
    expect(canvasPackage.exports).toEqual(
      expect.objectContaining({
        '.': expect.any(Object),
        './lazy': expect.any(Object),
      }),
    );
    expect(regionalPackage.sideEffects).toBe(false);
    expect(regionalPackage.exports).toEqual(
      expect.objectContaining({
        '.': expect.any(Object),
        './lazy': expect.any(Object),
      }),
    );
  });
});
