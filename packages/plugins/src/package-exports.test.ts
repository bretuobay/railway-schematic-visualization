import { PACKAGE_METADATA, PluginManager, getPackageMetadata } from './index';

describe('@rail-schematic-viz/plugins', () => {
  it('exposes stable package metadata and the public plugin manager', () => {
    expect(PACKAGE_METADATA.packageName).toBe('@rail-schematic-viz/plugins');
    expect(PACKAGE_METADATA.supportsLifecycleHooks).toBe(true);
    expect(getPackageMetadata()).toEqual(PACKAGE_METADATA);
    expect(PluginManager).toBeTypeOf('function');
  });
});
