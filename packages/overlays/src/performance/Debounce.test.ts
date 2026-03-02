import { afterEach, describe, expect, it, vi } from 'vitest';

import { Debounce } from './Debounce';

describe('Debounce utilities', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces repeated calls', () => {
    vi.useFakeTimers();
    const calls: number[] = [];
    const fn = Debounce.debounce((value: number) => {
      calls.push(value);
    }, 50);

    fn(1);
    fn(2);
    vi.advanceTimersByTime(49);
    expect(calls).toEqual([]);
    vi.advanceTimersByTime(1);

    expect(calls).toEqual([2]);
  });

  it('throttles invocation frequency', () => {
    vi.useFakeTimers();
    const calls: number[] = [];
    const fn = Debounce.throttle((value: number) => {
      calls.push(value);
    }, 50);

    fn(1);
    fn(2);
    vi.advanceTimersByTime(50);
    fn(3);
    vi.advanceTimersByTime(50);

    expect(calls).toEqual([1, 2, 3]);
  });
});
