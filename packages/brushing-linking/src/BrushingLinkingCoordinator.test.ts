import { CoordinateSystemType } from '@rail-schematic-viz/core';
import { describe, expect, it, vi } from 'vitest';

import {
  BrushingLinkingCoordinatorImpl,
  type LinkedView,
} from './index';

function createView(
  id: string,
  coordinateSystem: CoordinateSystemType,
): LinkedView<{ centerX: number; centerY: number }> {
  return {
    getCoordinateSystem: () => coordinateSystem,
    id,
    onSelectionChange: vi.fn(),
    onViewportChange: vi.fn(),
  };
}

describe('BrushingLinkingCoordinatorImpl', () => {
  it('registers views, rejects duplicates, and unregisters cleanly', () => {
    const coordinator = new BrushingLinkingCoordinatorImpl();
    const view = createView('schematic', CoordinateSystemType.Screen);

    expect(coordinator.registerView(view)).toBe(view);
    expect(() => coordinator.registerView(view)).toThrow(
      'View "schematic" is already registered.',
    );
    expect(coordinator.unregisterView('schematic')).toBe(true);
    expect(coordinator.unregisterView('schematic')).toBe(false);
  });

  it('maintains shared selection state and skips echoing to the source view', async () => {
    const schematicView = createView('schematic', CoordinateSystemType.Screen);
    const mapView = createView('map', CoordinateSystemType.Geographic);
    const coordinator = new BrushingLinkingCoordinatorImpl({
      transforms: {
        geographicToLinear: (coordinate) => ({
          distance: coordinate.longitude * 10,
          trackId: 'track-1',
          type: CoordinateSystemType.Linear,
        }),
      },
    });

    coordinator.registerView(schematicView);
    coordinator.registerView(mapView);

    const state = await coordinator.selectElements(
      {
        elements: [
          {
            id: 'node-1',
          },
        ],
        focalCoordinate: {
          latitude: 51.5,
          longitude: -0.12,
          type: CoordinateSystemType.Geographic,
        },
      },
      'schematic',
    );

    expect(state.elementIds).toEqual(['node-1']);
    expect(state.coordinates[0]).toEqual(
      expect.objectContaining({
        geographic: expect.objectContaining({
          latitude: 51.5,
          longitude: -0.12,
        }),
        linear: expect.objectContaining({
          trackId: 'track-1',
        }),
        screen: expect.objectContaining({
          type: CoordinateSystemType.Screen,
        }),
      }),
    );
    expect((schematicView.onSelectionChange as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
    expect((mapView.onSelectionChange as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);
  });

  it('clears selection and broadcasts the empty state', async () => {
    const schematicView = createView('schematic', CoordinateSystemType.Screen);
    const mapView = createView('map', CoordinateSystemType.Geographic);
    const coordinator = new BrushingLinkingCoordinatorImpl({
      transforms: {
        screenToLinear: (coordinate) => ({
          distance: coordinate.x,
          trackId: 'track-clear',
          type: CoordinateSystemType.Linear,
        }),
      },
    });

    coordinator.registerView(schematicView);
    coordinator.registerView(mapView);

    await coordinator.selectElements(
      {
        elements: [
          {
            id: 'edge-1',
            coordinate: {
              type: CoordinateSystemType.Screen,
              x: 20,
              y: 30,
            },
          },
        ],
      },
      'map',
    );
    const state = await coordinator.clearSelection('schematic');

    expect(state.elementIds).toEqual([]);
    expect(state.coordinates).toEqual([]);
    expect((mapView.onSelectionChange as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);
    expect((schematicView.onSelectionChange as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);
  });

  it('syncs viewport changes with resolved cross-system center coordinates', async () => {
    const schematicView = createView('schematic', CoordinateSystemType.Screen);
    const mapView = createView('map', CoordinateSystemType.Geographic);
    const coordinator = new BrushingLinkingCoordinatorImpl({
      transforms: {
        screenToLinear: (coordinate) => ({
          distance: coordinate.x,
          trackId: 'track-viewport',
          type: CoordinateSystemType.Linear,
        }),
      },
    });

    coordinator.registerView(schematicView);
    coordinator.registerView(mapView);

    const state = await coordinator.syncViewport(
      {
        center: {
          type: CoordinateSystemType.Screen,
          x: 100,
          y: 250,
        },
        coordinateSystem: CoordinateSystemType.Screen,
        viewport: {
          centerX: 100,
          centerY: 250,
        },
      },
      'map',
    );

    expect(state.center).toEqual(
      expect.objectContaining({
        linear: expect.objectContaining({
          trackId: 'track-viewport',
        }),
        geographic: expect.objectContaining({
          type: CoordinateSystemType.Geographic,
        }),
        screen: expect.objectContaining({
          x: 100,
          y: 250,
        }),
      }),
    );
    expect((mapView.onViewportChange as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
    expect((schematicView.onViewportChange as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);
  });

  it('supports highlight helpers and tolerates transform failures without throwing', async () => {
    const logger = {
      error: vi.fn(),
    };
    const view = createView('schematic', CoordinateSystemType.Screen);
    const coordinator = new BrushingLinkingCoordinatorImpl({
      logger,
      transforms: {
        linearToScreen: () => {
          throw new Error('screen-failed');
        },
      },
    });

    coordinator.registerView(view);

    const state = await coordinator.highlightByLinearCoordinate(
      {
        distance: 42,
        trackId: 'track-1',
        type: CoordinateSystemType.Linear,
      },
      ['node-42'],
    );
    const geoState = await coordinator.highlightByGeographicCoordinate(
      {
        latitude: 48.8,
        longitude: 2.3,
        type: CoordinateSystemType.Geographic,
      },
      ['node-geo'],
    );

    expect(state.elementIds).toEqual(['node-42']);
    expect(state.coordinates[0]).toEqual(
      expect.objectContaining({
        linear: expect.objectContaining({
          distance: 42,
        }),
      }),
    );
    expect(geoState.elementIds).toEqual(['node-geo']);
    expect(logger.error).toHaveBeenCalled();
  });

  it('isolates view notification failures and continues notifying other views', async () => {
    const logger = {
      error: vi.fn(),
    };
    const failingView: LinkedView = {
      getCoordinateSystem: () => CoordinateSystemType.Screen,
      id: 'failing',
      onSelectionChange: vi.fn(async () => {
        throw new Error('view failed');
      }),
      onViewportChange: vi.fn(),
    };
    const healthyView = createView('healthy', CoordinateSystemType.Screen);
    const coordinator = new BrushingLinkingCoordinatorImpl({
      logger,
    });

    coordinator.registerView(failingView);
    coordinator.registerView(healthyView);

    await coordinator.selectElements({
      elements: [
        {
          id: 'node-1',
          coordinate: {
            type: CoordinateSystemType.Screen,
            x: 1,
            y: 2,
          },
        },
      ],
    });

    expect((healthyView.onSelectionChange as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      'Linked view notification failed.',
      expect.objectContaining({
        viewId: 'failing',
      }),
    );
  });
});
