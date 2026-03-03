import type {
  OverlayConfiguration,
  OverlayFactoryOptions,
  OverlayLegend,
  RenderContext,
} from '../types';
import type { PathGeometry, RenderElement, SvgRenderNode } from '../rendering';
import { SVGRenderer } from '../rendering';
import { CollisionDetection, Clustering } from '../annotations';
import { ColorPalette } from '../colors';

import { BaseBuiltInOverlay, mergeDefined } from './BaseBuiltInOverlay';
import {
  expandBounds,
  isPointInBounds,
  projectCoordinate,
  type OverlayCoordinate,
} from './helpers';

export type AnnotationPinType =
  | 'default'
  | 'circle'
  | 'square'
  | 'triangle'
  | 'custom';

export interface AnnotationDataPoint {
  readonly id: string;
  readonly position: OverlayCoordinate;
  readonly label: string;
  readonly priority?: number;
  readonly pinType?: AnnotationPinType;
  readonly color?: string;
  readonly customPath?: PathGeometry['commands'];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface AnnotationConfiguration extends OverlayConfiguration {
  readonly collisionStrategy?: 'adjust' | 'hide' | 'cluster';
  readonly clusterRadius?: number;
  readonly clusterZoomThreshold?: number;
  readonly labelFontSize?: number;
  readonly pinSize?: number;
  readonly cullingBuffer?: number;
}

const DEFAULT_ANNOTATION_CONFIGURATION: AnnotationConfiguration = {
  visible: true,
  zIndex: 10,
  opacity: 1,
  interactive: true,
  animationEnabled: false,
  collisionStrategy: 'adjust',
  clusterRadius: 24,
  clusterZoomThreshold: 1.5,
  labelFontSize: 12,
  pinSize: 6,
  cullingBuffer: 24,
};

interface RenderedAnnotation {
  readonly id: string;
  readonly label: string;
  readonly color: string;
}

export class AnnotationOverlay extends BaseBuiltInOverlay<
  ReadonlyArray<AnnotationDataPoint>,
  AnnotationConfiguration
> {
  private readonly renderer = new SVGRenderer();
  private readonly collisionDetection = new CollisionDetection();
  private readonly clustering = new Clustering();
  private renderedNodes: Array<SvgRenderNode> = [];
  private renderedAnnotations = new Map<string, RenderedAnnotation>();
  private culledElementCount = 0;
  private renderedClusters = new Map<
    string,
    {
      readonly count: number;
    }
  >();

  public constructor(
    options?: OverlayFactoryOptions<
      ReadonlyArray<AnnotationDataPoint>,
      AnnotationConfiguration
    >,
  ) {
    super(
      'annotation',
      DEFAULT_ANNOTATION_CONFIGURATION,
      options?.data ?? [],
      options?.configuration,
    );
  }

  public render(context: RenderContext) {
    const startedAt = Date.now();
    const zoomScale = context.transform?.scale ?? 1;
    const projected = this.data.map((annotation) => ({
      annotation,
      screen: projectCoordinate(annotation.position, this.context ?? {}),
    }));
    const viewportBounds = context.viewportBounds
      ? expandBounds(context.viewportBounds, this.configuration.cullingBuffer ?? 24)
      : undefined;
    const visibleProjected = viewportBounds
      ? projected.filter((entry) => isPointInBounds(entry.screen.x, entry.screen.y, viewportBounds))
      : projected;
    this.culledElementCount = projected.length - visibleProjected.length;
    const clusterResult = this.clustering.cluster(
      visibleProjected.map((entry) => ({
        id: entry.annotation.id,
        x: entry.screen.x,
        y: entry.screen.y,
        payload: entry.annotation,
      })),
      zoomScale,
      {
        ...(this.configuration.clusterRadius !== undefined
          ? { radius: this.configuration.clusterRadius }
          : {}),
        ...(this.configuration.clusterZoomThreshold !== undefined
          ? { zoomThreshold: this.configuration.clusterZoomThreshold }
          : {}),
      },
    );
    const clusteredIds = new Set(
      clusterResult.clusters.flatMap((cluster) => cluster.members.map((member) => member.id)),
    );
    const unclustered = visibleProjected.filter((entry) => !clusteredIds.has(entry.annotation.id));
    const collisions = this.collisionDetection.detect(
      unclustered.map((entry) => ({
        id: entry.annotation.id,
        text: entry.annotation.label,
        x: entry.screen.x + (this.configuration.pinSize ?? 6) + 4,
        y: entry.screen.y,
        ...(entry.annotation.priority !== undefined
          ? { priority: entry.annotation.priority }
          : {}),
        ...(this.configuration.labelFontSize !== undefined
          ? { fontSize: this.configuration.labelFontSize }
          : {}),
      })),
      {
        ...(this.configuration.collisionStrategy !== undefined
          ? { strategy: this.configuration.collisionStrategy }
          : {}),
      },
    );

    const elements: RenderElement[] = [];
    this.renderedAnnotations.clear();
    this.renderedClusters.clear();

    for (const cluster of clusterResult.clusters) {
      const clusterId = `cluster-${cluster.members.map((member) => member.id).sort().join('-')}`;

      this.renderedClusters.set(clusterId, { count: cluster.count });
      elements.push({
        id: clusterId,
        geometry: {
          type: 'point',
          x: cluster.x,
          y: cluster.y,
          radius: (this.configuration.pinSize ?? 6) * 1.5,
          label: `${cluster.count}`,
        },
        style: {
          fill: '#0f172a',
          stroke: '#ffffff',
          strokeWidth: 2,
          ...(this.configuration.labelFontSize !== undefined
            ? { fontSize: this.configuration.labelFontSize }
            : {}),
        },
        zIndex: this.configuration.zIndex ?? 0,
      });
    }

    for (const entry of unclustered) {
      const collision = collisions.find((candidate) => candidate.id === entry.annotation.id);

      if (collision?.position.hidden) {
        continue;
      }

      const color = entry.annotation.color ?? ColorPalette.Category10[0] ?? '#1f77b4';

      elements.push(...this.renderPin(entry.annotation, entry.screen.x, entry.screen.y, color));

      if (collision?.position.leaderLine) {
        elements.push({
          id: `${entry.annotation.id}-leader`,
          geometry: {
            type: 'line',
            points: [
              [collision.position.leaderLine.fromX, collision.position.leaderLine.fromY],
              [collision.position.leaderLine.toX, collision.position.leaderLine.toY],
            ],
          },
          style: {
            stroke: color,
            strokeWidth: 1,
            opacity: 0.7,
          },
          zIndex: (this.configuration.zIndex ?? 0) - 1,
        });
      }

      const labelPosition = collision?.position ?? {
        x: entry.screen.x + (this.configuration.pinSize ?? 6) + 4,
        y: entry.screen.y,
        hidden: false,
      };

      elements.push({
        id: `${entry.annotation.id}-label`,
        geometry: {
          type: 'point',
          x: labelPosition.x,
          y: labelPosition.y,
          radius: 0,
          label: entry.annotation.label,
        },
        style: {
          fill: color,
          ...(this.configuration.labelFontSize !== undefined
            ? { fontSize: this.configuration.labelFontSize }
            : {}),
        },
        zIndex: (this.configuration.zIndex ?? 0) + 1,
      });

      this.renderedAnnotations.set(entry.annotation.id, {
        id: entry.annotation.id,
        label: entry.annotation.label,
        color,
      });
    }

    this.renderedNodes = this.renderer.render(
      {
        setNodes: (nodes) => {
          this.renderedNodes = [...nodes];
        },
        clear: () => {
          this.renderedNodes = [];
        },
      },
      elements,
    ) as SvgRenderNode[];

    return this.completeRender(startedAt, this.renderedNodes.length);
  }

  public override configure(
    configuration: Partial<AnnotationConfiguration>,
  ): AnnotationConfiguration {
    this.configuration = mergeDefined(this.configuration, configuration);

    return this.configuration;
  }

  public getLegend(): OverlayLegend {
    return {
      title: 'Annotations',
      type: 'categorical',
      items: [
        { label: 'Annotation', color: '#0f172a', shape: 'marker' },
        { label: 'Cluster', color: '#334155', shape: 'marker' },
      ],
    };
  }

  public override getPerformanceMetrics() {
    return {
      ...super.getPerformanceMetrics(),
      culledElementCount: this.culledElementCount,
    };
  }

  public getRenderedNodes(): ReadonlyArray<SvgRenderNode> {
    return this.renderedNodes;
  }

  public handleAnnotationClick(id: string): void {
    const rendered = this.renderedAnnotations.get(id);

    if (!rendered || !this.context?.eventManager) {
      return;
    }

    this.context.eventManager.emit('element-click', {
      element: {
        id,
        type: 'annotation',
        properties: {
          label: rendered.label,
          color: rendered.color,
        },
        isOverlay: true,
      },
    });
  }

  public handleClusterClick(id: string): void {
    const rendered = this.renderedClusters.get(id);

    if (!rendered || !this.context?.eventManager) {
      return;
    }

    this.context.eventManager.emit('element-click', {
      element: {
        id,
        type: 'annotation-cluster',
        properties: {
          count: rendered.count,
        },
        isOverlay: true,
      },
    });
  }

  private renderPin(
    annotation: AnnotationDataPoint,
    x: number,
    y: number,
    color: string,
  ): Array<RenderElement> {
    const size = this.configuration.pinSize ?? 6;
    const pinType = annotation.pinType ?? 'default';

    switch (pinType) {
      case 'square':
        return [
          {
            id: `${annotation.id}-pin`,
            geometry: {
              type: 'polygon',
              points: [
                [x - size, y - size],
                [x + size, y - size],
                [x + size, y + size],
                [x - size, y + size],
              ],
            },
            style: {
              fill: color,
              stroke: '#ffffff',
              strokeWidth: 1,
            },
            zIndex: this.configuration.zIndex ?? 0,
          },
        ];
      case 'triangle':
        return [
          {
            id: `${annotation.id}-pin`,
            geometry: {
              type: 'polygon',
              points: [
                [x, y - size],
                [x + size, y + size],
                [x - size, y + size],
              ],
            },
            style: {
              fill: color,
              stroke: '#ffffff',
              strokeWidth: 1,
            },
            zIndex: this.configuration.zIndex ?? 0,
          },
        ];
      case 'custom':
        return [
          {
            id: `${annotation.id}-pin`,
            geometry: {
              type: 'path',
              commands:
                annotation.customPath
                ?? [
                  { command: 'M', values: [x, y - size] },
                  { command: 'L', values: [x + size, y + size] },
                  { command: 'L', values: [x - size, y + size] },
                  { command: 'Z', values: [] },
                ],
            },
            style: {
              fill: color,
              stroke: '#ffffff',
              strokeWidth: 1,
            },
            zIndex: this.configuration.zIndex ?? 0,
          },
        ];
      case 'circle':
      case 'default':
      default:
        return [
          {
            id: `${annotation.id}-pin`,
            geometry: {
              type: 'point',
              x,
              y,
              radius: size,
            },
            style: {
              fill: color,
              stroke: '#ffffff',
              strokeWidth: 1,
            },
            zIndex: this.configuration.zIndex ?? 0,
          },
        ];
    }
  }
}
