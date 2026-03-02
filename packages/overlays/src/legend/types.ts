import type { OverlayLegendItem } from '../types';

export type LegendPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

interface BaseLegendDescriptor {
  readonly id: string;
  readonly title: string;
  readonly type: 'continuous' | 'discrete' | 'categorical';
  readonly visible?: boolean;
}

export interface ContinuousLegendDescriptor extends BaseLegendDescriptor {
  readonly type: 'continuous';
  readonly min: number;
  readonly max: number;
  readonly startColor: string;
  readonly endColor: string;
  readonly ticks?: ReadonlyArray<number>;
}

export interface DiscreteLegendDescriptor extends BaseLegendDescriptor {
  readonly type: 'discrete';
  readonly items: ReadonlyArray<OverlayLegendItem>;
}

export interface CategoricalLegendDescriptor extends BaseLegendDescriptor {
  readonly type: 'categorical';
  readonly items: ReadonlyArray<OverlayLegendItem>;
}

export type LegendDescriptor =
  | ContinuousLegendDescriptor
  | DiscreteLegendDescriptor
  | CategoricalLegendDescriptor;

export interface LegendConfiguration {
  readonly position?: LegendPosition;
  readonly collapsible?: boolean;
  readonly collapsed?: boolean;
  readonly width?: number;
  readonly itemHeight?: number;
  readonly padding?: number;
  readonly surfaceWidth?: number;
  readonly surfaceHeight?: number;
}
