import {
  ADAPTERS_SHARED_METADATA,
  ERROR_CODES,
  EventMapper,
  ExportSystem,
  ExportError,
  LifecycleError,
  LifecycleManager,
  PNGExporter,
  PrintExporter,
  SVGExporter,
} from './index';

describe('@rail-schematic-viz/adapters-shared', () => {
  it('exposes shared metadata and core error types', () => {
    expect(ADAPTERS_SHARED_METADATA.framework).toBe('shared');
    expect(ERROR_CODES.ADAPTER_UNIMPLEMENTED).toBe('ADAPTER_UNIMPLEMENTED');
    expect(EventMapper).toBeTypeOf('function');
    expect(ExportSystem).toBeTypeOf('function');
    expect(LifecycleManager).toBeTypeOf('function');
    expect(PNGExporter).toBeTypeOf('function');
    expect(PrintExporter).toBeTypeOf('function');
    expect(SVGExporter).toBeTypeOf('function');
    expect(new ExportError('export failed')).toBeInstanceOf(Error);
    expect(new LifecycleError('init failed')).toBeInstanceOf(Error);
  });
});
