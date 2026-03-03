import { loadCanvasRenderer, loadHybridRenderer } from './lazy';

describe('@rail-schematic-viz/canvas/lazy', () => {
  it('lazy-loads the canvas renderers', async () => {
    await expect(loadCanvasRenderer()).resolves.toBeTypeOf('function');
    await expect(loadHybridRenderer()).resolves.toBeTypeOf('function');
  });
});
