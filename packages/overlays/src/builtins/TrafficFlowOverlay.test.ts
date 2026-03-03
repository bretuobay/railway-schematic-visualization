import { CoordinateSystemType } from '@rail-schematic-viz/core';
import { describe, expect, it } from 'vitest';

import { TrafficFlowOverlay } from './TrafficFlowOverlay';

describe('TrafficFlowOverlay', () => {
  it('renders arrows for each direction type', () => {
    const overlay = new TrafficFlowOverlay({
      data: [
        {
          id: 'up',
          start: { type: CoordinateSystemType.Screen, x: 10, y: 10 },
          end: { type: CoordinateSystemType.Screen, x: 90, y: 10 },
          frequency: 1,
          direction: 'up',
        },
        {
          id: 'down',
          start: { type: CoordinateSystemType.Screen, x: 10, y: 20 },
          end: { type: CoordinateSystemType.Screen, x: 90, y: 20 },
          frequency: 1,
          direction: 'down',
        },
        {
          id: 'both',
          start: { type: CoordinateSystemType.Screen, x: 10, y: 30 },
          end: { type: CoordinateSystemType.Screen, x: 90, y: 30 },
          frequency: 1,
          direction: 'bidirectional',
        },
      ],
    });

    overlay.initialize({});
    overlay.render({ dimensions: { width: 100, height: 100 } });

    expect(overlay.getRenderedNodes().filter((node) => node.tag === 'polyline').length).toBe(4);
  });

  it('scales stroke width by frequency and supports dashed animation', () => {
    const overlay = new TrafficFlowOverlay({
      configuration: { animationStyle: 'dashed' },
      data: [
        {
          id: 'a',
          start: { type: CoordinateSystemType.Screen, x: 10, y: 10 },
          end: { type: CoordinateSystemType.Screen, x: 90, y: 10 },
          frequency: 10,
          direction: 'up',
        },
      ],
    });

    overlay.initialize({});
    overlay.render({ dimensions: { width: 100, height: 100 } });

    const lineNode = overlay.getRenderedNodes().find((node) => node.id === 'a-forward');

    expect(Number(lineNode?.attributes['stroke-width'])).toBeGreaterThan(2);
    expect(lineNode?.attributes['stroke-dasharray']).toBeDefined();
  });

  it('supports pulsing animation opacity and bidirectional separation', () => {
    const overlay = new TrafficFlowOverlay({
      configuration: { animationStyle: 'pulsing' },
      data: [
        {
          id: 'a',
          start: { type: CoordinateSystemType.Screen, x: 10, y: 10 },
          end: { type: CoordinateSystemType.Screen, x: 90, y: 10 },
          frequency: 5,
          direction: 'bidirectional',
        },
      ],
    });

    overlay.initialize({});
    overlay.render({ dimensions: { width: 100, height: 100 }, timestamp: 500 });

    const lines = overlay.getRenderedNodes().filter((node) => node.tag === 'polyline');

    expect(lines).toHaveLength(2);
    expect(lines[0]?.attributes.opacity).not.toBe('1');
    expect(lines[0]?.attributes.points).not.toBe(lines[1]?.attributes.points);
  });

  it('returns a frequency legend', () => {
    const overlay = new TrafficFlowOverlay({
      data: [
        {
          id: 'a',
          start: { type: CoordinateSystemType.Screen, x: 10, y: 10 },
          end: { type: CoordinateSystemType.Screen, x: 90, y: 10 },
          frequency: 5,
          direction: 'up',
        },
      ],
    });

    expect(overlay.getLegend().type).toBe('continuous');
    expect(overlay.getLegend().max).toBe(5);
  });
});
