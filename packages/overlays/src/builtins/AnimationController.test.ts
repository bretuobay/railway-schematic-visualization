import { describe, expect, it } from 'vitest';

import { AnimationController } from './AnimationController';

describe('AnimationController', () => {
  it('supports start, pause, resume, and stop', () => {
    const controller = new AnimationController();
    const frames: number[] = [];
    const id = controller.start({
      durationMs: 100,
      onFrame: (progress) => {
        frames.push(progress);
      },
    });

    controller.tick(0);
    controller.tick(50);
    controller.pause(id);
    controller.tick(75);
    controller.resume(id);
    controller.tick(100);

    expect(frames.at(-1)).toBe(0.75);

    controller.stop(id);

    expect(controller.getState(id)).toBeUndefined();
  });

  it('adjusts speed and supports multiple animations', () => {
    const controller = new AnimationController();
    let firstProgress = 0;
    let secondProgress = 0;
    const firstId = controller.start({
      durationMs: 100,
      onFrame: (progress) => {
        firstProgress = progress;
      },
    });
    const secondId = controller.start({
      durationMs: 200,
      onFrame: (progress) => {
        secondProgress = progress;
      },
    });

    controller.setSpeed(2, firstId);
    controller.tick(0);
    controller.tick(50);

    expect(firstProgress).toBe(1);
    expect(secondProgress).toBe(0.25);
    expect(controller.getActiveAnimationIds()).toContain(secondId);

    controller.stop();
    expect(controller.getActiveAnimationIds()).toHaveLength(0);
  });
});
