import { CoordinateSystemType } from '@rail-schematic-viz/core';
import type { EventManager } from '@rail-schematic-viz/layout';
import { describe, expect, it } from 'vitest';

import { AnnotationOverlay } from './AnnotationOverlay';

describe('AnnotationOverlay', () => {
  it('renders multiple pin icon types', () => {
    const overlay = new AnnotationOverlay({
      data: [
        {
          id: 'circle',
          position: { type: CoordinateSystemType.Screen, x: 10, y: 10 },
          label: 'Circle',
          pinType: 'circle',
        },
        {
          id: 'square',
          position: { type: CoordinateSystemType.Screen, x: 40, y: 10 },
          label: 'Square',
          pinType: 'square',
        },
        {
          id: 'triangle',
          position: { type: CoordinateSystemType.Screen, x: 70, y: 10 },
          label: 'Triangle',
          pinType: 'triangle',
        },
      ],
    });

    overlay.initialize({});
    overlay.render({ dimensions: { width: 100, height: 100 }, transform: { x: 0, y: 0, scale: 2 } });

    expect(overlay.getRenderedNodes().some((node) => node.tag === 'circle')).toBe(true);
    expect(overlay.getRenderedNodes().some((node) => node.tag === 'polygon')).toBe(true);
  });

  it('integrates collision detection and leader lines', () => {
    const overlay = new AnnotationOverlay({
      data: [
        {
          id: 'a',
          position: { type: CoordinateSystemType.Screen, x: 10, y: 10 },
          label: 'Alpha',
          priority: 2,
        },
        {
          id: 'b',
          position: { type: CoordinateSystemType.Screen, x: 10, y: 10 },
          label: 'Beta',
          priority: 1,
        },
      ],
    });

    overlay.initialize({});
    overlay.render({ dimensions: { width: 100, height: 100 }, transform: { x: 0, y: 0, scale: 2 } });

    expect(overlay.getRenderedNodes().some((node) => node.id.includes('leader'))).toBe(true);
  });

  it('clusters dense annotations at low zoom', () => {
    const overlay = new AnnotationOverlay({
      data: [
        {
          id: 'a',
          position: { type: CoordinateSystemType.Screen, x: 10, y: 10 },
          label: 'Alpha',
        },
        {
          id: 'b',
          position: { type: CoordinateSystemType.Screen, x: 12, y: 12 },
          label: 'Beta',
        },
      ],
    });

    overlay.initialize({});
    overlay.render({ dimensions: { width: 100, height: 100 }, transform: { x: 0, y: 0, scale: 1 } });

    expect(overlay.getRenderedNodes().some((node) => node.id === 'cluster-a-b')).toBe(true);
  });

  it('emits click payload data', () => {
    const events: Array<unknown> = [];
    const eventManager = {
      emit: (_event: string, payload: unknown) => {
        events.push(payload);
      },
    } as unknown as EventManager;
    const overlay = new AnnotationOverlay({
      data: [
        {
          id: 'a',
          position: { type: CoordinateSystemType.Screen, x: 10, y: 10 },
          label: 'Alpha',
        },
      ],
    });

    overlay.initialize({ eventManager });
    overlay.render({ dimensions: { width: 100, height: 100 }, transform: { x: 0, y: 0, scale: 3 } });
    overlay.handleAnnotationClick('a');

    expect(events[0]).toMatchObject({
      element: {
        id: 'a',
        type: 'annotation',
      },
    });
  });
});
