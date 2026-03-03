export interface ExportRenderer {
  readonly svgElement?: SVGSVGElement | null;
  readonly svgMarkup?: string | null;
  getSVGElement?(): SVGSVGElement | null;
  getSVGString?(): string | null;
}

export interface ExportViewport {
  getVisibleBounds(): {
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
  };
}

export interface ExportOverlayManager {
  getAllOverlays(): ReadonlyArray<{
    readonly id: string;
    readonly visible: boolean;
  }>;
}
