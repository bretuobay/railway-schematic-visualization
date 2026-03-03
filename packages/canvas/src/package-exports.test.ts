import {
  CanvasRenderer,
  HybridRenderer,
  PACKAGE_METADATA,
  getPackageMetadata,
} from './index';

describe('@rail-schematic-viz/canvas', () => {
  it('exposes stable package metadata and public canvas renderers', () => {
    expect(PACKAGE_METADATA.packageName).toBe('@rail-schematic-viz/canvas');
    expect(PACKAGE_METADATA.supportsHybridRendering).toBe(true);
    expect(getPackageMetadata()).toEqual(PACKAGE_METADATA);
    expect(CanvasRenderer).toBeTypeOf('function');
    expect(HybridRenderer).toBeTypeOf('function');
  });
});
