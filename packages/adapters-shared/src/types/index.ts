export type AdapterFramework = 'react' | 'vue' | 'web-component';

export interface AdapterPackageMetadata {
  readonly framework: AdapterFramework | 'shared';
  readonly packageName: string;
  readonly version: string;
}

export interface ExportCapabilitySet {
  readonly svg: boolean;
  readonly png: boolean;
  readonly print: boolean;
}

export interface SharedAdapterSurface {
  readonly framework: AdapterFramework;
  readonly capabilities: ExportCapabilitySet;
}

export type ExportEvent =
  | 'export-start'
  | 'export-progress'
  | 'export-complete'
  | 'export-error';

export interface SVGExportConfig {
  readonly width?: number | string;
  readonly height?: number | string;
  readonly preserveAspectRatio?: string;
  readonly includeOverlays?: ReadonlyArray<string> | 'all';
  readonly excludeOverlays?: ReadonlyArray<string>;
  readonly backgroundColor?: string;
  readonly embedFonts?: boolean;
  readonly prettyPrint?: boolean;
  readonly viewportMode?: 'current' | 'full' | 'selection';
  readonly selectedElements?: ReadonlyArray<string>;
}

export interface PNGExportConfig {
  readonly width?: number;
  readonly height?: number;
  readonly scale?: number;
  readonly format?: 'png' | 'jpeg' | 'webp';
  readonly quality?: number;
  readonly backgroundColor?: string;
  readonly includeOverlays?: ReadonlyArray<string> | 'all';
  readonly excludeOverlays?: ReadonlyArray<string>;
  readonly viewportMode?: 'current' | 'full' | 'selection';
  readonly selectedElements?: ReadonlyArray<string>;
}

export interface PrintConfig {
  readonly pageSize?: 'A4' | 'Letter' | 'Legal' | {
    readonly width: number;
    readonly height: number;
  };
  readonly orientation?: 'portrait' | 'landscape';
  readonly margins?: {
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly left: number;
  };
  readonly includeLegend?: boolean;
  readonly includeScaleBar?: boolean;
  readonly includeMetadata?: boolean;
  readonly multiPage?: boolean;
}

export interface ExportEventPayload {
  readonly event: ExportEvent;
  readonly format: 'svg' | 'png' | 'print';
  readonly stage?: string;
  readonly progress?: number;
  readonly output?: string;
  readonly config?: SVGExportConfig | PNGExportConfig | PrintConfig;
  readonly error?: Error;
}

export type ExportEventHandler = (payload: ExportEventPayload) => void;

export const DEFAULT_EXPORT_CAPABILITIES = {
  svg: true,
  png: true,
  print: true,
} as const satisfies ExportCapabilitySet;
