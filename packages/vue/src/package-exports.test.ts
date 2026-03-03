import {
  RailSchematicVue,
  VUE_ADAPTER_METADATA,
  VUE_ADAPTER_SURFACE,
  createRailSchematicVue,
  useRailSchematic,
} from './index';

describe('@rail-schematic-viz/vue', () => {
  it('exposes stable adapter metadata and public factories', () => {
    expect(VUE_ADAPTER_METADATA.framework).toBe('vue');
    expect(VUE_ADAPTER_SURFACE.capabilities.print).toBe(true);
    expect(RailSchematicVue).toBe(createRailSchematicVue);
    expect(typeof useRailSchematic).toBe('function');
  });
});
