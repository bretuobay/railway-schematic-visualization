export interface PointGeometry {
  readonly type: 'point';
  readonly x: number;
  readonly y: number;
  readonly radius?: number;
  readonly label?: string;
}

export interface LineGeometry {
  readonly type: 'line';
  readonly points: ReadonlyArray<readonly [number, number]>;
}

export interface PolygonGeometry {
  readonly type: 'polygon';
  readonly points: ReadonlyArray<readonly [number, number]>;
}

export interface PathGeometry {
  readonly type: 'path';
  readonly commands: ReadonlyArray<{
    readonly command: 'M' | 'L' | 'Q' | 'C' | 'Z';
    readonly values: ReadonlyArray<number>;
  }>;
}

export type RenderGeometry =
  | PointGeometry
  | LineGeometry
  | PolygonGeometry
  | PathGeometry;

export interface RenderStyle {
  readonly fill?: string;
  readonly stroke?: string;
  readonly strokeWidth?: number;
  readonly opacity?: number;
  readonly dashArray?: ReadonlyArray<number>;
  readonly fontSize?: number;
}

export interface RenderElement {
  readonly id: string;
  readonly geometry: RenderGeometry;
  readonly style?: RenderStyle;
  readonly zIndex?: number;
}

export interface SvgRenderNode {
  readonly id: string;
  readonly tag: 'circle' | 'polyline' | 'polygon' | 'path' | 'text';
  readonly attributes: Readonly<Record<string, string>>;
}

export interface SvgTargetLike {
  setNodes?(nodes: ReadonlyArray<SvgRenderNode>): void;
  clear?(): void;
}

export interface CanvasLike {
  clearRect?(x: number, y: number, width: number, height: number): void;
  beginPath?(): void;
  closePath?(): void;
  moveTo?(x: number, y: number): void;
  lineTo?(x: number, y: number): void;
  quadraticCurveTo?(cpx: number, cpy: number, x: number, y: number): void;
  bezierCurveTo?(
    cp1x: number,
    cp1y: number,
    cp2x: number,
    cp2y: number,
    x: number,
    y: number,
  ): void;
  arc?(x: number, y: number, radius: number, startAngle: number, endAngle: number): void;
  fill?(): void;
  stroke?(): void;
  fillText?(text: string, x: number, y: number): void;
  setLineDash?(segments: ReadonlyArray<number>): void;
  strokeStyle?: string;
  fillStyle?: string;
  lineWidth?: number;
  globalAlpha?: number;
  transferToOffscreen?(): CanvasLike;
}

export interface RenderStrategy<TTarget, TResult = unknown> {
  render(target: TTarget, elements: ReadonlyArray<RenderElement>): TResult;
  update(target: TTarget, elements: ReadonlyArray<RenderElement>): TResult;
  clear(target: TTarget): void;
}
