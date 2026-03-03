import {
  REACT_ADAPTER_METADATA,
  REACT_ADAPTER_SURFACE,
  RailSchematic,
  useRailSchematic,
} from './index';

describe('@rail-schematic-viz/react', () => {
  it('exposes stable adapter metadata', () => {
    expect(REACT_ADAPTER_METADATA.framework).toBe('react');
    expect(REACT_ADAPTER_SURFACE.capabilities.png).toBe(true);
    expect(RailSchematic).toBeTypeOf('function');
    expect(useRailSchematic).toBeTypeOf('function');
  });
});
