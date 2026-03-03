import {
  PACKAGE_METADATA,
  SSRRenderer,
  getPackageMetadata,
  headlessExport,
} from './index';

describe('@rail-schematic-viz/ssr', () => {
  it('exposes stable package metadata and public SSR APIs', () => {
    expect(PACKAGE_METADATA.packageName).toBe('@rail-schematic-viz/ssr');
    expect(PACKAGE_METADATA.supportsHeadlessExport).toBe(true);
    expect(getPackageMetadata()).toEqual(PACKAGE_METADATA);
    expect(SSRRenderer).toBeTypeOf('function');
    expect(headlessExport).toBeTypeOf('function');
  });
});
