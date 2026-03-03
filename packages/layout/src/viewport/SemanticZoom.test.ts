import { performance } from 'node:perf_hooks';

import { describe, expect, it, vi } from 'vitest';

import { ViewportController } from './ViewportController';
import { MockViewportHost } from './ViewportController.test-helpers';
import { SemanticZoom } from './SemanticZoom';

describe('SemanticZoom', () => {
  it('transitions between low, mid, and high detail levels', () => {
    const semanticZoom = new SemanticZoom({
      midDetailThreshold: 1.5,
      highDetailThreshold: 3,
    });

    expect(semanticZoom.getLOD()).toBe('low-detail');
    expect(semanticZoom.updateLOD(1.5)).toBe('mid-detail');
    expect(semanticZoom.getLOD()).toBe('mid-detail');
    expect(semanticZoom.updateLOD(3)).toBe('high-detail');
    expect(semanticZoom.getLOD()).toBe('high-detail');
    expect(semanticZoom.updateLOD(0.5)).toBe('low-detail');
  });

  it('applies the default visibility rules for each LOD', () => {
    const semanticZoom = new SemanticZoom({
      midDetailThreshold: 1.5,
      highDetailThreshold: 3,
    });

    expect(semanticZoom.getVisibilityMap(1)).toMatchObject({
      tracks: true,
      stations: true,
      'station-labels': false,
      signals: false,
      mileposts: false,
    });
    expect(semanticZoom.getVisibilityMap(2)).toMatchObject({
      tracks: true,
      stations: true,
      'station-labels': true,
      signals: true,
      mileposts: false,
    });
    expect(semanticZoom.getVisibilityMap(4)).toMatchObject({
      tracks: true,
      stations: true,
      'station-labels': true,
      signals: true,
      mileposts: true,
      annotations: true,
    });
  });

  it('supports custom per-element visibility rules', () => {
    const semanticZoom = new SemanticZoom({
      midDetailThreshold: 2,
      highDetailThreshold: 4,
      visibilityRules: {
        overlays: 'high-detail',
        labels: 'mid-detail',
        tracks: 'low-detail',
      },
    });

    expect(semanticZoom.isVisible('labels', 1)).toBe(false);
    expect(semanticZoom.isVisible('labels', 3)).toBe(true);
    expect(semanticZoom.isVisible('overlays', 3)).toBe(false);
    expect(semanticZoom.isVisible('overlays', 5)).toBe(true);
    expect(semanticZoom.isVisible('tracks', 1)).toBe(true);
  });

  it('emits lod-change events when the level changes', () => {
    const semanticZoom = new SemanticZoom({
      midDetailThreshold: 1.25,
      highDetailThreshold: 2.5,
    });
    const onLODChange = vi.fn();

    semanticZoom.on('lod-change', onLODChange);
    semanticZoom.updateLOD(1.5);
    semanticZoom.updateLOD(1.75);
    semanticZoom.updateLOD(3);

    expect(onLODChange).toHaveBeenCalledTimes(2);
    expect(onLODChange).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        previousLOD: 'low-detail',
        lod: 'mid-detail',
      }),
    );
    expect(onLODChange).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        previousLOD: 'mid-detail',
        lod: 'high-detail',
      }),
    );
  });

  it('can follow viewport controller zoom changes', async () => {
    const controller = new ViewportController(new MockViewportHost(800, 600));
    const semanticZoom = new SemanticZoom({
      midDetailThreshold: 1.5,
      highDetailThreshold: 3,
      controller,
    });

    await controller.zoomTo(2);
    expect(semanticZoom.getLOD()).toBe('mid-detail');

    await controller.zoomTo(4);
    expect(semanticZoom.getLOD()).toBe('high-detail');

    semanticZoom.destroy();
  });

  it('updates within the expected performance budget', () => {
    const semanticZoom = new SemanticZoom({
      midDetailThreshold: 1.5,
      highDetailThreshold: 3,
    });
    const startedAt = performance.now();

    for (let index = 0; index < 10000; index += 1) {
      semanticZoom.updateLOD((index % 500) / 100);
      semanticZoom.getVisibilityMap((index % 500) / 100);
    }

    expect(performance.now() - startedAt).toBeLessThan(200);
  });
});
