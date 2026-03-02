import { CoordinateSystemType } from '@rail-schematic-viz/core';
import type { EventManager } from '@rail-schematic-viz/layout';
import { describe, expect, it } from 'vitest';

import { RangeBandOverlay } from './RangeBandOverlay';

describe('RangeBandOverlay', () => {
  it('renders multi-segment bands', () => {
    const overlay = new RangeBandOverlay({
      data: [
        {
          id: 'band',
          start: { type: CoordinateSystemType.Screen, x: 10, y: 20 },
          end: { type: CoordinateSystemType.Screen, x: 90, y: 20 },
          segments: [
            {
              start: { type: CoordinateSystemType.Screen, x: 10, y: 20 },
              end: { type: CoordinateSystemType.Screen, x: 50, y: 20 },
            },
            {
              start: { type: CoordinateSystemType.Screen, x: 50, y: 20 },
              end: { type: CoordinateSystemType.Screen, x: 90, y: 30 },
            },
          ],
          label: 'Main',
        },
      ],
    });

    overlay.initialize({});
    overlay.render({ dimensions: { width: 100, height: 100 } });

    expect(overlay.getRenderedNodes().filter((node) => node.id.includes('segment'))).toHaveLength(2);
  });

  it('supports blend modes and stacking offsets', () => {
    const overlay = new RangeBandOverlay({
      configuration: { stackingMode: 'stacked' },
      data: [
        {
          id: 'one',
          start: { type: CoordinateSystemType.Screen, x: 10, y: 20 },
          end: { type: CoordinateSystemType.Screen, x: 90, y: 20 },
          label: 'One',
          blendMode: 'multiply',
        },
        {
          id: 'two',
          start: { type: CoordinateSystemType.Screen, x: 10, y: 20 },
          end: { type: CoordinateSystemType.Screen, x: 90, y: 20 },
          label: 'Two',
          blendMode: 'screen',
        },
      ],
    });

    overlay.initialize({});
    overlay.render({ dimensions: { width: 100, height: 100 } });

    expect(overlay.getRenderedNodes().some((node) => node.attributes.opacity === '0.55')).toBe(true);
    expect(overlay.getRenderedNodes().some((node) => node.attributes.opacity === '0.4')).toBe(true);
  });

  it('positions labels according to the selected mode', () => {
    const overlay = new RangeBandOverlay({
      configuration: { labelPosition: 'below' },
      data: [
        {
          id: 'band',
          start: { type: CoordinateSystemType.Screen, x: 10, y: 20 },
          end: { type: CoordinateSystemType.Screen, x: 90, y: 20 },
          label: 'Band',
        },
      ],
    });

    overlay.initialize({});
    overlay.render({ dimensions: { width: 100, height: 100 } });

    const labelNode = overlay.getRenderedNodes().find((node) => node.id === 'band-label-label');

    expect(Number(labelNode?.attributes.y)).toBeGreaterThan(20);
  });

  it('emits hover events for a band', () => {
    const events: Array<unknown> = [];
    const eventManager = {
      emit: (_event: string, payload: unknown) => {
        events.push(payload);
      },
    } as unknown as EventManager;
    const overlay = new RangeBandOverlay({
      data: [
        {
          id: 'band',
          start: { type: CoordinateSystemType.Screen, x: 10, y: 20 },
          end: { type: CoordinateSystemType.Screen, x: 90, y: 20 },
          label: 'Band',
        },
      ],
    });

    overlay.initialize({ eventManager });
    overlay.render({ dimensions: { width: 100, height: 100 } });
    overlay.handleBandHover('band');

    expect(events[0]).toMatchObject({
      element: {
        id: 'band',
        type: 'range-band',
      },
    });
  });
});
