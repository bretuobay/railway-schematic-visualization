import { CoordinateSystemType } from '@rail-schematic-viz/core';
import type { EventManager } from '@rail-schematic-viz/layout';
import { describe, expect, it } from 'vitest';

import { AnnotationOverlay } from './AnnotationOverlay';

describe('AnnotationOverlay properties', () => {
  it('emits structured events for annotation and cluster interactions', () => {
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
        {
          id: 'b',
          position: { type: CoordinateSystemType.Screen, x: 12, y: 12 },
          label: 'Beta',
        },
      ],
    });

    overlay.initialize({ eventManager });
    overlay.render({
      dimensions: { width: 100, height: 100 },
      transform: { x: 0, y: 0, scale: 3 },
    });
    overlay.handleAnnotationClick('a');
    overlay.render({
      dimensions: { width: 100, height: 100 },
      transform: { x: 0, y: 0, scale: 1 },
    });
    overlay.handleClusterClick('cluster-a-b');

    expect(events).toHaveLength(2);
  });
});
