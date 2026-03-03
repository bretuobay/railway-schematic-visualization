import {
  RAIL_SCHEMATIC_ELEMENT_TAG,
  RailSchematicElement,
  WEB_COMPONENT_ADAPTER_METADATA,
  WEB_COMPONENT_ADAPTER_SURFACE,
  registerRailSchematicElement,
} from './index';

describe('@rail-schematic-viz/web-component', () => {
  it('exposes stable adapter metadata and registration surface', () => {
    expect(RAIL_SCHEMATIC_ELEMENT_TAG).toBe('rail-schematic');
    expect(WEB_COMPONENT_ADAPTER_METADATA.framework).toBe('web-component');
    expect(WEB_COMPONENT_ADAPTER_SURFACE.capabilities.svg).toBe(true);
    expect(typeof registerRailSchematicElement).toBe('function');
    expect(typeof RailSchematicElement).toBe('function');
  });
});
