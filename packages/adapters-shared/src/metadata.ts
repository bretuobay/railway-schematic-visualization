import type { AdapterPackageMetadata } from './types';

export const ADAPTERS_SHARED_METADATA = {
  framework: 'shared',
  packageName: '@rail-schematic-viz/adapters-shared',
  version: '0.1.0',
} as const satisfies AdapterPackageMetadata;
