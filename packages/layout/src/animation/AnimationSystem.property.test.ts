import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';

import { AnimationSystem } from './AnimationSystem';
import { MockAnimationScheduler } from './AnimationSystem.test-helpers';

describe('AnimationSystem properties', () => {
  it('invokes animation callbacks in the expected lifecycle order', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 200 }),
        async (duration) => {
          const scheduler = new MockAnimationScheduler();
          const system = new AnimationSystem({ scheduler });
          const onStart = vi.fn();
          const onProgress = vi.fn();
          const onComplete = vi.fn();
          const applied: number[] = [];

          const handle = system.animate<number>({
            from: 0,
            to: 100,
            duration,
            apply: (value) => {
              applied.push(value);
            },
            onStart,
            onProgress,
            onComplete,
          });

          scheduler.flush(Math.max(1, Math.ceil(duration / 4)));
          const result = await handle.promise;

          expect(onStart).toHaveBeenCalledTimes(1);
          expect(onProgress.mock.calls.length).toBeGreaterThanOrEqual(1);
          expect(onComplete).toHaveBeenCalledTimes(1);
          expect(applied.at(-1)).toBe(100);
          expect(result).toBe(100);
          expect(onStart.mock.invocationCallOrder[0]).toBeLessThan(
            onComplete.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER,
          );
        },
      ),
    );
  });
});
