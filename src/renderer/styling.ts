export interface StylingConfiguration {
  readonly track: {
    readonly strokeColor: string;
    readonly strokeWidth: number;
    readonly fillColor: string;
  };
  readonly station: {
    readonly radius: number;
    readonly fillColor: string;
    readonly strokeColor: string;
  };
  readonly signal: {
    readonly size: number;
    readonly fillColor: string;
  };
  readonly switch: {
    readonly scaleFactor: number;
  };
}

export const DEFAULT_STYLING: StylingConfiguration = {
  track: {
    strokeColor: '#1f2937',
    strokeWidth: 4,
    fillColor: '#cbd5e1',
  },
  station: {
    radius: 6,
    fillColor: '#ffffff',
    strokeColor: '#0f172a',
  },
  signal: {
    size: 8,
    fillColor: '#dc2626',
  },
  switch: {
    scaleFactor: 1,
  },
};
