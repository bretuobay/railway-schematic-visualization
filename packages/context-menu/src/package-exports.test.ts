import {
  ContextMenuController,
  PACKAGE_METADATA,
  getPackageMetadata,
} from './index';

describe('@rail-schematic-viz/context-menu', () => {
  it('exposes stable package metadata and the public controller', () => {
    expect(PACKAGE_METADATA.packageName).toBe('@rail-schematic-viz/context-menu');
    expect(PACKAGE_METADATA.supportsKeyboardNavigation).toBe(true);
    expect(getPackageMetadata()).toEqual(PACKAGE_METADATA);
    expect(ContextMenuController).toBeTypeOf('function');
  });
});
