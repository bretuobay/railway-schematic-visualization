import { describe, expect, it } from 'vitest';

import { CanvasRenderer } from './CanvasRenderer';
import type { CanvasLike } from './types';

function createCanvasRecorder(): { readonly canvas: CanvasLike; readonly calls: string[] } {
  const calls: string[] = [];
  const offscreenCanvas: CanvasLike = {};
  const canvas: CanvasLike = {
    clearRect: () => {
      calls.push('clearRect');
    },
    beginPath: () => {
      calls.push('beginPath');
    },
    closePath: () => {
      calls.push('closePath');
    },
    moveTo: () => {
      calls.push('moveTo');
    },
    lineTo: () => {
      calls.push('lineTo');
    },
    quadraticCurveTo: () => {
      calls.push('quadraticCurveTo');
    },
    bezierCurveTo: () => {
      calls.push('bezierCurveTo');
    },
    arc: () => {
      calls.push('arc');
    },
    fill: () => {
      calls.push('fill');
    },
    stroke: () => {
      calls.push('stroke');
    },
    fillText: () => {
      calls.push('fillText');
    },
    setLineDash: () => {
      calls.push('setLineDash');
    },
    transferToOffscreen: () => {
      calls.push('transferToOffscreen');

      return offscreenCanvas;
    },
  };

  return { canvas, calls };
}

describe('CanvasRenderer', () => {
  it('renders each supported geometry type', () => {
    const { canvas, calls } = createCanvasRecorder();
    const renderer = new CanvasRenderer();

    renderer.render(canvas, [
      {
        id: 'point',
        geometry: { type: 'point', x: 10, y: 10, label: 'A' },
      },
      {
        id: 'line',
        geometry: { type: 'line', points: [[0, 0], [10, 10]] },
      },
      {
        id: 'polygon',
        geometry: { type: 'polygon', points: [[0, 0], [10, 0], [10, 10]] },
      },
      {
        id: 'path',
        geometry: {
          type: 'path',
          commands: [
            { command: 'M', values: [0, 0] },
            { command: 'Q', values: [5, 5, 10, 10] },
            { command: 'C', values: [1, 1, 2, 2, 3, 3] },
            { command: 'Z', values: [] },
          ],
        },
      },
    ]);

    expect(calls).toContain('arc');
    expect(calls).toContain('fillText');
    expect(calls).toContain('lineTo');
    expect(calls).toContain('quadraticCurveTo');
    expect(calls).toContain('bezierCurveTo');
  });

  it('uses an offscreen canvas when enabled and available', () => {
    const { canvas } = createCanvasRecorder();
    const renderer = new CanvasRenderer({ useOffscreenCanvas: true });
    const result = renderer.render(canvas, []);

    expect(result.usedOffscreenCanvas).toBe(true);
  });

  it('clears the target surface', () => {
    const { canvas, calls } = createCanvasRecorder();
    const renderer = new CanvasRenderer({ width: 100, height: 80 });

    renderer.clear(canvas);

    expect(calls).toEqual(['clearRect']);
  });
});
