import { describe, expect, it } from 'vitest';

import { ColorScale } from './ColorScale';

describe('ColorScale methods', () => {
  it('creates a linear scale', () => {
    const scale = ColorScale.linear([0, 10], ['#000000', '#ffffff']);

    expect(scale(0)).toBe('#000000');
    expect(scale(10)).toBe('#ffffff');
  });

  it('creates a logarithmic scale', () => {
    const scale = ColorScale.logarithmic([1, 100], ['#000000', '#ffffff']);

    expect(scale(1)).toBe('#000000');
    expect(scale(100)).toBe('#ffffff');
  });

  it('creates a quantile scale', () => {
    const scale = ColorScale.quantile([1, 2, 3, 4], ['#111111', '#222222']);

    expect(['#111111', '#222222']).toContain(scale(2));
  });

  it('creates a threshold scale', () => {
    const scale = ColorScale.threshold([10, 20], ['#111111', '#222222', '#333333']);

    expect(scale(5)).toBe('#111111');
    expect(scale(25)).toBe('#333333');
  });

  it('creates a sequential scale', () => {
    const scale = ColorScale.sequential((value) => (value > 0.5 ? '#ffffff' : '#000000'));

    expect(scale(0)).toBe('#000000');
    expect(scale(1)).toBe('#ffffff');
  });

  it('creates a diverging scale', () => {
    const scale = ColorScale.diverging([0, 5, 10], ['#000000', '#888888', '#ffffff']);

    expect(scale(0)).toBe('#000000');
    expect(scale(10)).toBe('#ffffff');
  });

  it('returns custom scales unchanged', () => {
    const scale = ColorScale.custom(() => '#123456');

    expect(scale(42)).toBe('#123456');
  });
});
