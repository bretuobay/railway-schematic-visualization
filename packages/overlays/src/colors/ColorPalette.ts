const BUILT_IN_PALETTES = {
  Blues: ['#eff6ff', '#93c5fd', '#2563eb'],
  Greens: ['#f0fdf4', '#86efac', '#15803d'],
  Reds: ['#fef2f2', '#fca5a5', '#dc2626'],
  Greys: ['#f8fafc', '#94a3b8', '#334155'],
  RdBu: ['#b91c1c', '#f8fafc', '#1d4ed8'],
  RdYlGn: ['#b91c1c', '#facc15', '#15803d'],
  Spectral: ['#9e0142', '#f7f7f7', '#5e4fa2'],
  Viridis: ['#440154', '#21908c', '#fde725'],
  Plasma: ['#0d0887', '#cc4778', '#f0f921'],
  Inferno: ['#000004', '#ba3655', '#fcffa4'],
  ColorBlindSafe: ['#0072b2', '#e69f00', '#009e73'],
  ColorBlindSafeDiverging: ['#0072b2', '#f8fafc', '#d55e00'],
  HighContrast: ['#000000', '#ffffff', '#000000'],
  Category10: [
    '#1f77b4',
    '#ff7f0e',
    '#2ca02c',
    '#d62728',
    '#9467bd',
    '#8c564b',
    '#e377c2',
    '#7f7f7f',
    '#bcbd22',
    '#17becf',
  ],
  Category20: [
    '#1f77b4',
    '#aec7e8',
    '#ff7f0e',
    '#ffbb78',
    '#2ca02c',
    '#98df8a',
    '#d62728',
    '#ff9896',
    '#9467bd',
    '#c5b0d5',
    '#8c564b',
    '#c49c94',
    '#e377c2',
    '#f7b6d2',
    '#7f7f7f',
    '#c7c7c7',
    '#bcbd22',
    '#dbdb8d',
    '#17becf',
    '#9edae5',
  ],
} as const satisfies Record<string, ReadonlyArray<string>>;

function hexToRgb(color: string): readonly [number, number, number] {
  const normalized = color.replace('#', '');
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((segment) => `${segment}${segment}`)
          .join('')
      : normalized;

  return [
    Number.parseInt(expanded.slice(0, 2), 16),
    Number.parseInt(expanded.slice(2, 4), 16),
    Number.parseInt(expanded.slice(4, 6), 16),
  ];
}

function luminance(color: string): number {
  const [rawRed, rawGreen, rawBlue] = hexToRgb(color);
  const redChannel = rawRed / 255;
  const greenChannel = rawGreen / 255;
  const blueChannel = rawBlue / 255;
  const red =
    redChannel <= 0.03928 ? redChannel / 12.92 : ((redChannel + 0.055) / 1.055) ** 2.4;
  const green =
    greenChannel <= 0.03928
      ? greenChannel / 12.92
      : ((greenChannel + 0.055) / 1.055) ** 2.4;
  const blue =
    blueChannel <= 0.03928 ? blueChannel / 12.92 : ((blueChannel + 0.055) / 1.055) ** 2.4;

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrastRatio(left: string, right: string): number {
  const leftLuminance = luminance(left);
  const rightLuminance = luminance(right);
  const lighter = Math.max(leftLuminance, rightLuminance);
  const darker = Math.min(leftLuminance, rightLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

export class ColorPalette {
  public static readonly Blues = BUILT_IN_PALETTES.Blues;
  public static readonly Greens = BUILT_IN_PALETTES.Greens;
  public static readonly Reds = BUILT_IN_PALETTES.Reds;
  public static readonly Greys = BUILT_IN_PALETTES.Greys;
  public static readonly RdBu = BUILT_IN_PALETTES.RdBu;
  public static readonly RdYlGn = BUILT_IN_PALETTES.RdYlGn;
  public static readonly Spectral = BUILT_IN_PALETTES.Spectral;
  public static readonly Viridis = BUILT_IN_PALETTES.Viridis;
  public static readonly Plasma = BUILT_IN_PALETTES.Plasma;
  public static readonly Inferno = BUILT_IN_PALETTES.Inferno;
  public static readonly ColorBlindSafe = BUILT_IN_PALETTES.ColorBlindSafe;
  public static readonly ColorBlindSafeDiverging = BUILT_IN_PALETTES.ColorBlindSafeDiverging;
  public static readonly HighContrast = BUILT_IN_PALETTES.HighContrast;
  public static readonly Category10 = BUILT_IN_PALETTES.Category10;
  public static readonly Category20 = BUILT_IN_PALETTES.Category20;

  private static readonly customPalettes = new Map<string, ReadonlyArray<string>>();

  public static getPalette(name: string): ReadonlyArray<string> {
    const normalizedName = name.trim();

    if (Object.prototype.hasOwnProperty.call(BUILT_IN_PALETTES, normalizedName)) {
      return BUILT_IN_PALETTES[normalizedName as keyof typeof BUILT_IN_PALETTES];
    }

    return this.customPalettes.get(normalizedName) ?? [];
  }

  public static register(name: string, palette: ReadonlyArray<string>): void {
    const normalizedName = name.trim();

    if (normalizedName.length === 0 || palette.length === 0) {
      throw new Error('Palette name and at least one color are required.');
    }

    this.customPalettes.set(normalizedName, [...palette]);
  }

  public static isColorBlindSafe(
    paletteOrName: string | ReadonlyArray<string>,
  ): boolean {
    const palette =
      typeof paletteOrName === 'string' ? this.getPalette(paletteOrName) : paletteOrName;

    if (palette.length === 0) {
      return false;
    }

    return (
      palette.join(',') === this.ColorBlindSafe.join(',')
      || palette.join(',') === this.ColorBlindSafeDiverging.join(',')
    );
  }

  public static isHighContrast(
    paletteOrName: string | ReadonlyArray<string>,
  ): boolean {
    const palette =
      typeof paletteOrName === 'string' ? this.getPalette(paletteOrName) : paletteOrName;

    if (palette.length < 2) {
      return false;
    }

    let minRatio = Number.POSITIVE_INFINITY;

    for (let index = 1; index < palette.length; index += 1) {
      minRatio = Math.min(minRatio, contrastRatio(palette[index - 1]!, palette[index]!));
    }

    return minRatio >= 7;
  }
}
