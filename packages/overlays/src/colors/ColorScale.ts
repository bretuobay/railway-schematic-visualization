export type ColorScaleFunction = (value: number) => string;

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(Math.max(value, min), max);
}

function hexToRgb(color: string): readonly [number, number, number] {
  const normalized = color.replace('#', '');
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((segment) => `${segment}${segment}`)
          .join('')
      : normalized;

  const red = Number.parseInt(expanded.slice(0, 2), 16);
  const green = Number.parseInt(expanded.slice(2, 4), 16);
  const blue = Number.parseInt(expanded.slice(4, 6), 16);

  return [red, green, blue];
}

function rgbToHex([red, green, blue]: readonly [number, number, number]): string {
  return `#${[red, green, blue]
    .map((value) => Math.round(clamp(value, 0, 255)).toString(16).padStart(2, '0'))
    .join('')}`;
}

function interpolateColor(start: string, end: string, factor: number): string {
  const startRgb = hexToRgb(start);
  const endRgb = hexToRgb(end);
  const ratio = clamp(factor);

  return rgbToHex([
    startRgb[0] + (endRgb[0] - startRgb[0]) * ratio,
    startRgb[1] + (endRgb[1] - startRgb[1]) * ratio,
    startRgb[2] + (endRgb[2] - startRgb[2]) * ratio,
  ]);
}

function normalizeDomain(value: number, min: number, max: number): number {
  if (min === max) {
    return 0;
  }

  return clamp((value - min) / (max - min));
}

export class ColorScale {
  private static readonly customScales = new Map<string, ColorScaleFunction>();

  public static linear(
    domain: readonly [number, number],
    range: readonly [string, string],
  ): ColorScaleFunction {
    return (value) => interpolateColor(range[0], range[1], normalizeDomain(value, domain[0], domain[1]));
  }

  public static logarithmic(
    domain: readonly [number, number],
    range: readonly [string, string],
  ): ColorScaleFunction {
    const safeMin = Math.max(domain[0], Number.MIN_VALUE);
    const logMin = Math.log10(safeMin);
    const logMax = Math.log10(Math.max(domain[1], safeMin));

    return (value) => {
      const normalizedValue = Math.log10(Math.max(value, safeMin));

      return interpolateColor(range[0], range[1], normalizeDomain(normalizedValue, logMin, logMax));
    };
  }

  public static quantile(
    values: ReadonlyArray<number>,
    palette: ReadonlyArray<string>,
  ): ColorScaleFunction {
    if (palette.length === 0) {
      return () => '#000000';
    }

    const sortedValues = [...values].sort((left, right) => left - right);

    return (value) => {
      const index = sortedValues.findIndex((entry) => value <= entry);
      const normalizedIndex = index < 0 ? sortedValues.length - 1 : index;
      const paletteIndex = Math.min(
        palette.length - 1,
        Math.floor((normalizedIndex / Math.max(sortedValues.length, 1)) * palette.length),
      );

      return palette[paletteIndex] ?? palette[palette.length - 1] ?? '#000000';
    };
  }

  public static threshold(
    thresholds: ReadonlyArray<number>,
    palette: ReadonlyArray<string>,
  ): ColorScaleFunction {
    return (value) => {
      const index = thresholds.findIndex((threshold) => value < threshold);

      if (index < 0) {
        return palette[palette.length - 1] ?? '#000000';
      }

      return palette[index] ?? palette[palette.length - 1] ?? '#000000';
    };
  }

  public static sequential(
    interpolator: ColorScaleFunction,
    domain: readonly [number, number] = [0, 1],
  ): ColorScaleFunction {
    return (value) => interpolator(normalizeDomain(value, domain[0], domain[1]));
  }

  public static diverging(
    domain: readonly [number, number, number],
    range: readonly [string, string, string],
  ): ColorScaleFunction {
    return (value) => {
      if (value <= domain[1]) {
        return interpolateColor(
          range[0],
          range[1],
          normalizeDomain(value, domain[0], domain[1]),
        );
      }

      return interpolateColor(
        range[1],
        range[2],
        normalizeDomain(value, domain[1], domain[2]),
      );
    };
  }

  public static custom(scale: ColorScaleFunction): ColorScaleFunction {
    return scale;
  }

  public static register(name: string, scale: ColorScaleFunction): void {
    const normalizedName = name.trim();

    if (normalizedName.length === 0) {
      throw new Error('Custom color scale name is required.');
    }

    this.customScales.set(normalizedName, scale);
  }

  public static get(name: string): ColorScaleFunction | undefined {
    return this.customScales.get(name.trim());
  }
}
