export interface BoundingBox {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export interface BoundingBoxPoint {
  readonly x: number;
  readonly y: number;
}

export function createBoundingBox(bounds: BoundingBox): BoundingBox {
  return {
    minX: Math.min(bounds.minX, bounds.maxX),
    minY: Math.min(bounds.minY, bounds.maxY),
    maxX: Math.max(bounds.minX, bounds.maxX),
    maxY: Math.max(bounds.minY, bounds.maxY),
  };
}

export function intersectsBoundingBox(
  left: BoundingBox,
  right: BoundingBox,
): boolean {
  return !(
    left.maxX < right.minX ||
    left.minX > right.maxX ||
    left.maxY < right.minY ||
    left.minY > right.maxY
  );
}

export function containsPoint(
  bounds: BoundingBox,
  point: BoundingBoxPoint,
): boolean {
  return (
    point.x >= bounds.minX &&
    point.x <= bounds.maxX &&
    point.y >= bounds.minY &&
    point.y <= bounds.maxY
  );
}

export function containsBoundingBox(
  outer: BoundingBox,
  inner: BoundingBox,
): boolean {
  return (
    inner.minX >= outer.minX &&
    inner.maxX <= outer.maxX &&
    inner.minY >= outer.minY &&
    inner.maxY <= outer.maxY
  );
}

export function expandBoundingBox(
  bounds: BoundingBox,
  padding: number,
): BoundingBox {
  return {
    minX: bounds.minX - padding,
    minY: bounds.minY - padding,
    maxX: bounds.maxX + padding,
    maxY: bounds.maxY + padding,
  };
}

export function mergeBoundingBoxes(
  bounds: ReadonlyArray<BoundingBox>,
): BoundingBox {
  if (bounds.length === 0) {
    return {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
    };
  }

  return bounds.reduce<BoundingBox>(
    (merged, current) => ({
      minX: Math.min(merged.minX, current.minX),
      minY: Math.min(merged.minY, current.minY),
      maxX: Math.max(merged.maxX, current.maxX),
      maxY: Math.max(merged.maxY, current.maxY),
    }),
    createBoundingBox(bounds[0]!),
  );
}

export function boundingBoxArea(bounds: BoundingBox): number {
  const width = Math.max(0, bounds.maxX - bounds.minX);
  const height = Math.max(0, bounds.maxY - bounds.minY);

  return width * height;
}

export function boundingBoxCenter(bounds: BoundingBox): BoundingBoxPoint {
  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  };
}

export function boundingBoxesEqual(
  left: BoundingBox,
  right: BoundingBox,
): boolean {
  return (
    left.minX === right.minX &&
    left.minY === right.minY &&
    left.maxX === right.maxX &&
    left.maxY === right.maxY
  );
}
