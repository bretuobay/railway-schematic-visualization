import { EventMapper } from './EventMapper';

describe('EventMapper', () => {
  it('maps library events to framework-specific event names', () => {
    const mapper = new EventMapper();

    expect(mapper.mapName('element-click', { target: 'react' })).toBe('onClick');
    expect(mapper.mapName('selection-change', { target: 'vue' })).toBe('selection-change');
    expect(mapper.mapName('overlay-click', { target: 'web-component' })).toBe('rail-overlay-click');
  });

  it('transforms payloads into normalized framework event payloads', () => {
    const mapper = new EventMapper();
    const payload = mapper.mapPayload('element-click', {
      element: {
        id: 'station-a',
        type: 'station',
        isOverlay: false,
      },
      coordinates: {
        x: 12,
        y: 24,
      },
      selection: ['station-a'],
      detail: {
        source: 'test',
      },
      originalEvent: { type: 'click' },
    });

    expect(payload).toEqual({
      type: 'click',
      sourceEvent: 'element-click',
      element: {
        id: 'station-a',
        type: 'station',
        isOverlay: false,
      },
      coordinates: {
        x: 12,
        y: 24,
      },
      selection: ['station-a'],
      detail: {
        source: 'test',
      },
      originalEvent: { type: 'click' },
    });
  });

  it('normalizes viewport payload data and supports custom payload transforms', () => {
    const mapper = new EventMapper();
    const payload = mapper.mapPayload(
      'viewport-change',
      {
        transform: {
          x: 10,
          y: 20,
          scale: 1.5,
        },
        previousTransform: {
          x: 0,
          y: 0,
          scale: 1,
        },
        visibleBounds: {
          minX: 0,
          minY: 0,
          maxX: 100,
          maxY: 80,
        },
      },
      {
        transform: (normalizedPayload) => ({
          ...normalizedPayload,
          viewportScale: (
            normalizedPayload.viewport?.transform as { scale?: number } | undefined
          )?.scale,
        }),
      },
    );

    expect(payload).toEqual({
      type: 'viewport-change',
      sourceEvent: 'viewport-change',
      viewport: {
        transform: {
          x: 10,
          y: 20,
          scale: 1.5,
        },
        previousTransform: {
          x: 0,
          y: 0,
          scale: 1,
        },
        visibleBounds: {
          minX: 0,
          minY: 0,
          maxX: 100,
          maxY: 80,
        },
      },
      viewportScale: 1.5,
    });
  });

  it('supports camelCase and kebab-case generic name normalization', () => {
    const mapper = new EventMapper();

    expect(
      mapper.mapName('selection-change', { convention: 'camelCase' }),
    ).toBe('selectionChange');
    expect(
      mapper.mapName('railViewportChange', { convention: 'kebab-case' }),
    ).toBe('rail-viewport-change');
    expect(
      mapper.mapName('focus-change', { convention: 'camelCase', prefix: 'rail' }),
    ).toBe('railFocusChange');
  });

  it('maps combined event descriptors with custom prefixes', () => {
    const mapper = new EventMapper();
    const mapped = mapper.mapEvent(
      'brush-start',
      {
        detail: {
          mode: 'selection',
        },
      },
      {
        convention: 'kebab-case',
        prefix: 'rail',
      },
    );

    expect(mapped).toEqual({
      name: 'rail-brush-start',
      payload: {
        type: 'brush-start',
        sourceEvent: 'brush-start',
        detail: {
          mode: 'selection',
        },
      },
    });
  });
});
