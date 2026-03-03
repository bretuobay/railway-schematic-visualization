import { CoordinateSystemType } from '@rail-schematic-viz/core';
import { describe, expect, it } from 'vitest';

import { TimeSeriesOverlay } from './TimeSeriesOverlay';

const data = [
  {
    id: 'a',
    timestamp: 0,
    metric: 'speed',
    position: { type: CoordinateSystemType.Screen as const, x: 10, y: 10 },
    value: 1,
  },
  {
    id: 'b',
    timestamp: 1000,
    metric: 'speed',
    position: { type: CoordinateSystemType.Screen as const, x: 20, y: 20 },
    value: 2,
  },
  {
    id: 'c',
    timestamp: 1000,
    metric: 'delay',
    position: { type: CoordinateSystemType.Screen as const, x: 30, y: 30 },
    value: 3,
  },
];

describe('TimeSeriesOverlay', () => {
  it('builds a temporal index and renders a selected frame', () => {
    const overlay = new TimeSeriesOverlay({ data });

    overlay.initialize({});
    overlay.seekTo(1000);
    overlay.render({ dimensions: { width: 100, height: 100 } });

    expect(overlay.getTemporalIndexSize()).toBe(2);
    expect(overlay.getRenderedNodes()).toHaveLength(4);
  });

  it('supports playback controls and slider updates', () => {
    const overlay = new TimeSeriesOverlay({ data });

    overlay.initialize({});
    overlay.play();
    overlay.tick(0);
    overlay.tick(400);
    overlay.pause();
    overlay.setPlaybackSpeed(2);
    overlay.stop();

    expect(overlay.getCurrentTimestamp()).toBe(0);
    expect(overlay.getSliderPosition()).toBe(0);
  });

  it('toggles metric visibility and caches frames', () => {
    const overlay = new TimeSeriesOverlay({ data });

    overlay.initialize({});
    overlay.setMetricVisibility('delay', false);
    overlay.seekTo(1000);
    overlay.render({ dimensions: { width: 100, height: 100 } });

    expect(overlay.getRenderedNodes().some((node) => node.id.startsWith('c-'))).toBe(false);
    expect(overlay.getCacheSize()).toBeGreaterThan(0);
  });

  it('formats the current time for display', () => {
    const overlay = new TimeSeriesOverlay({ data });

    expect(overlay.getFormattedCurrentTime()).toContain('1970-01-01');
  });
});
