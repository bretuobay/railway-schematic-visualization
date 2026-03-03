import { SpatialIndex, type IndexEntry } from '../spatial';

export interface ClusterableAnnotation {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly payload?: unknown;
}

export interface Cluster {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly count: number;
  readonly members: ReadonlyArray<ClusterableAnnotation>;
}

export interface ClusteringConfig {
  readonly radius?: number;
  readonly zoomThreshold?: number;
  readonly minClusterSize?: number;
}

export interface ClusterResult {
  readonly clusters: ReadonlyArray<Cluster>;
  readonly unclustered: ReadonlyArray<ClusterableAnnotation>;
}

const DEFAULT_CONFIG: Required<ClusteringConfig> = {
  radius: 24,
  zoomThreshold: 1.5,
  minClusterSize: 2,
};

export class Clustering {
  public cluster(
    annotations: ReadonlyArray<ClusterableAnnotation>,
    zoomScale: number,
    config: ClusteringConfig = {},
  ): ClusterResult {
    const resolvedConfig = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    if (!this.shouldCluster(annotations, zoomScale, resolvedConfig)) {
      return {
        clusters: [],
        unclustered: [...annotations],
      };
    }

    const groups = this.groupNearby(annotations, resolvedConfig.radius);
    const clusters: Cluster[] = [];
    const unclustered: ClusterableAnnotation[] = [];

    groups.forEach((group, index) => {
      if (group.length < resolvedConfig.minClusterSize) {
        unclustered.push(...group);
        return;
      }

      const centroid = group.reduce(
        (accumulator, annotation) => ({
          x: accumulator.x + annotation.x,
          y: accumulator.y + annotation.y,
        }),
        { x: 0, y: 0 },
      );

      clusters.push({
        id: `cluster-${index + 1}`,
        x: centroid.x / group.length,
        y: centroid.y / group.length,
        count: group.length,
        members: group,
      });
    });

    return {
      clusters,
      unclustered,
    };
  }

  public shouldCluster(
    annotations: ReadonlyArray<ClusterableAnnotation>,
    zoomScale: number,
    config: ClusteringConfig = {},
  ): boolean {
    const resolvedConfig = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    return annotations.length >= resolvedConfig.minClusterSize && zoomScale < resolvedConfig.zoomThreshold;
  }

  public groupNearby(
    annotations: ReadonlyArray<ClusterableAnnotation>,
    radius: number,
  ): ReadonlyArray<ReadonlyArray<ClusterableAnnotation>> {
    const index = new SpatialIndex<ClusterableAnnotation>();

    annotations.forEach((annotation) => {
      const entry: IndexEntry<ClusterableAnnotation> = {
        minX: annotation.x - radius,
        minY: annotation.y - radius,
        maxX: annotation.x + radius,
        maxY: annotation.y + radius,
        value: annotation,
      };

      index.insert(entry);
    });

    const visited = new Set<string>();
    const groups: Array<Array<ClusterableAnnotation>> = [];

    for (const annotation of annotations) {
      if (visited.has(annotation.id)) {
        continue;
      }

      const queue = [annotation];
      const group: ClusterableAnnotation[] = [];

      while (queue.length > 0) {
        const current = queue.shift()!;

        if (visited.has(current.id)) {
          continue;
        }

        visited.add(current.id);
        group.push(current);

        const neighbors = index
          .search({
            minX: current.x - radius,
            minY: current.y - radius,
            maxX: current.x + radius,
            maxY: current.y + radius,
          })
          .map((entry) => entry.value)
          .filter((neighbor) => !visited.has(neighbor.id));

        queue.push(...neighbors);
      }

      groups.push(group);
    }

    return groups;
  }
}
