import {
  type BoundingBox,
  boundingBoxArea,
  boundingBoxCenter,
  boundingBoxesEqual,
  intersectsBoundingBox,
  mergeBoundingBoxes,
} from './BoundingBox';

export interface SpatialEntry<T> {
  readonly bounds: BoundingBox;
  readonly value: T;
}

export interface RTreeOptions {
  readonly maxEntries?: number;
}

interface RTreeNode<T> {
  readonly leaf: boolean;
  bounds: BoundingBox;
  entries: Array<SpatialEntry<T>>;
  children: Array<RTreeNode<T>>;
}

const EMPTY_BOUNDS: BoundingBox = {
  minX: 0,
  minY: 0,
  maxX: 0,
  maxY: 0,
};

function createNode<T>(leaf: boolean): RTreeNode<T> {
  return {
    leaf,
    bounds: EMPTY_BOUNDS,
    entries: [],
    children: [],
  };
}

export class RTree<T> {
  private readonly maxEntries: number;
  private root: RTreeNode<T>;
  private entryCount: number;

  public constructor(options: RTreeOptions = {}) {
    this.maxEntries = Math.max(2, options.maxEntries ?? 8);
    this.root = createNode<T>(true);
    this.entryCount = 0;
  }

  public get size(): number {
    return this.entryCount;
  }

  public clear(): void {
    this.root = createNode<T>(true);
    this.entryCount = 0;
  }

  public insert(bounds: BoundingBox, value: T): void {
    const entry: SpatialEntry<T> = { bounds, value };
    const path = this.chooseLeafPath(bounds);
    const leaf = path[path.length - 1]!;

    leaf.entries.push(entry);
    this.recalculateBounds(leaf);
    this.handleOverflow(path);
    this.recalculatePath(path);
    this.entryCount += 1;
  }

  public remove(
    bounds: BoundingBox,
    value: T,
    equals: (left: T, right: T) => boolean = Object.is,
  ): boolean {
    const path = this.findEntryPath(this.root, bounds, value, equals);

    if (!path) {
      return false;
    }

    const leaf = path[path.length - 1]!;
    const entryIndex = leaf.entries.findIndex(
      (entry) =>
        equals(entry.value, value) &&
        boundingBoxesEqual(entry.bounds, bounds),
    );

    if (entryIndex < 0) {
      return false;
    }

    leaf.entries.splice(entryIndex, 1);
    this.entryCount -= 1;
    this.recalculatePath(path);
    this.condenseRoot();

    return true;
  }

  public search(bounds: BoundingBox): Array<T> {
    const results: Array<T> = [];

    this.searchNode(this.root, bounds, results);

    return results;
  }

  public bulkLoad(entries: ReadonlyArray<SpatialEntry<T>>): void {
    this.clear();

    if (entries.length === 0) {
      return;
    }

    let level = this.createLeafLevel(entries);

    while (level.length > 1) {
      level = this.createInternalLevel(level);
    }

    this.root = level[0]!;
    this.entryCount = entries.length;
  }

  private chooseLeafPath(bounds: BoundingBox): Array<RTreeNode<T>> {
    const path = [this.root];
    let current = this.root;

    while (!current.leaf) {
      current = this.chooseBestChild(current, bounds);
      path.push(current);
    }

    return path;
  }

  private chooseBestChild(
    node: RTreeNode<T>,
    bounds: BoundingBox,
  ): RTreeNode<T> {
    let bestChild = node.children[0]!;
    let bestEnlargement = Number.POSITIVE_INFINITY;
    let bestArea = Number.POSITIVE_INFINITY;

    for (const child of node.children) {
      const enlarged = mergeBoundingBoxes([child.bounds, bounds]);
      const enlargement = boundingBoxArea(enlarged) - boundingBoxArea(child.bounds);
      const childArea = boundingBoxArea(child.bounds);

      if (
        enlargement < bestEnlargement ||
        (enlargement === bestEnlargement && childArea < bestArea)
      ) {
        bestChild = child;
        bestEnlargement = enlargement;
        bestArea = childArea;
      }
    }

    return bestChild;
  }

  private handleOverflow(path: ReadonlyArray<RTreeNode<T>>): void {
    for (let depth = path.length - 1; depth >= 0; depth -= 1) {
      const node = path[depth]!;

      this.recalculateBounds(node);

      if (this.getNodeSize(node) <= this.maxEntries) {
        continue;
      }

      const [left, right] = this.splitNode(node);

      if (depth === 0) {
        const newRoot = createNode<T>(false);

        newRoot.children.push(left, right);
        this.recalculateBounds(newRoot);
        this.root = newRoot;
        continue;
      }

      const parent = path[depth - 1]!;
      const index = parent.children.indexOf(node);

      parent.children.splice(index, 1, left, right);
      this.recalculateBounds(parent);
    }
  }

  private splitNode(node: RTreeNode<T>): [RTreeNode<T>, RTreeNode<T>] {
    const groups = node.leaf
      ? this.splitItems(node.entries)
      : this.splitItems(node.children);
    const left = createNode<T>(node.leaf);
    const right = createNode<T>(node.leaf);

    if (node.leaf) {
      left.entries.push(...(groups.left as Array<SpatialEntry<T>>));
      right.entries.push(...(groups.right as Array<SpatialEntry<T>>));
    } else {
      left.children.push(...(groups.left as Array<RTreeNode<T>>));
      right.children.push(...(groups.right as Array<RTreeNode<T>>));
    }

    this.recalculateBounds(left);
    this.recalculateBounds(right);

    return [left, right];
  }

  private splitItems<Item extends { readonly bounds: BoundingBox }>(
    items: ReadonlyArray<Item>,
  ): { left: Array<Item>; right: Array<Item> } {
    const pool = Array.from(items);
    const [seedLeftIndex, seedRightIndex] = this.pickSeeds(pool);
    const left = [pool[seedLeftIndex]!];
    const right = [pool[seedRightIndex]!];

    pool.splice(Math.max(seedLeftIndex, seedRightIndex), 1);
    pool.splice(Math.min(seedLeftIndex, seedRightIndex), 1);

    while (pool.length > 0) {
      const item = pool.shift()!;
      const leftBounds = mergeBoundingBoxes(left.map((entry) => entry.bounds));
      const rightBounds = mergeBoundingBoxes(right.map((entry) => entry.bounds));
      const leftEnlargement =
        boundingBoxArea(mergeBoundingBoxes([leftBounds, item.bounds])) -
        boundingBoxArea(leftBounds);
      const rightEnlargement =
        boundingBoxArea(mergeBoundingBoxes([rightBounds, item.bounds])) -
        boundingBoxArea(rightBounds);

      if (leftEnlargement < rightEnlargement) {
        left.push(item);
        continue;
      }

      if (rightEnlargement < leftEnlargement) {
        right.push(item);
        continue;
      }

      if (boundingBoxArea(leftBounds) <= boundingBoxArea(rightBounds)) {
        left.push(item);
      } else {
        right.push(item);
      }
    }

    return { left, right };
  }

  private pickSeeds<Item extends { readonly bounds: BoundingBox }>(
    items: ReadonlyArray<Item>,
  ): [number, number] {
    let bestPair: [number, number] = [0, 1];
    let bestDistance = Number.NEGATIVE_INFINITY;

    for (let leftIndex = 0; leftIndex < items.length; leftIndex += 1) {
      for (
        let rightIndex = leftIndex + 1;
        rightIndex < items.length;
        rightIndex += 1
      ) {
        const leftCenter = boundingBoxCenter(items[leftIndex]!.bounds);
        const rightCenter = boundingBoxCenter(items[rightIndex]!.bounds);
        const distance = Math.hypot(
          rightCenter.x - leftCenter.x,
          rightCenter.y - leftCenter.y,
        );

        if (distance > bestDistance) {
          bestPair = [leftIndex, rightIndex];
          bestDistance = distance;
        }
      }
    }

    return bestPair;
  }

  private searchNode(
    node: RTreeNode<T>,
    bounds: BoundingBox,
    results: Array<T>,
  ): void {
    if (this.getNodeSize(node) === 0) {
      return;
    }

    if (!intersectsBoundingBox(node.bounds, bounds)) {
      return;
    }

    if (node.leaf) {
      for (const entry of node.entries) {
        if (intersectsBoundingBox(entry.bounds, bounds)) {
          results.push(entry.value);
        }
      }

      return;
    }

    for (const child of node.children) {
      this.searchNode(child, bounds, results);
    }
  }

  private findEntryPath(
    node: RTreeNode<T>,
    bounds: BoundingBox,
    value: T,
    equals: (left: T, right: T) => boolean,
    path: Array<RTreeNode<T>> = [],
  ): Array<RTreeNode<T>> | undefined {
    if (this.getNodeSize(node) === 0 || !intersectsBoundingBox(node.bounds, bounds)) {
      return undefined;
    }

    path.push(node);

    if (node.leaf) {
      const found = node.entries.some(
        (entry) =>
          equals(entry.value, value) &&
          boundingBoxesEqual(entry.bounds, bounds),
      );

      if (found) {
        return Array.from(path);
      }

      path.pop();

      return undefined;
    }

    for (const child of node.children) {
      const result = this.findEntryPath(child, bounds, value, equals, path);

      if (result) {
        return result;
      }
    }

    path.pop();

    return undefined;
  }

  private recalculatePath(path: ReadonlyArray<RTreeNode<T>>): void {
    for (let index = path.length - 1; index >= 0; index -= 1) {
      this.recalculateBounds(path[index]!);
    }
  }

  private recalculateBounds(node: RTreeNode<T>): void {
    if (node.leaf) {
      node.bounds = node.entries.length === 0
        ? EMPTY_BOUNDS
        : mergeBoundingBoxes(node.entries.map((entry) => entry.bounds));
      return;
    }

    node.bounds = node.children.length === 0
      ? EMPTY_BOUNDS
      : mergeBoundingBoxes(node.children.map((child) => child.bounds));
  }

  private condenseRoot(): void {
    while (!this.root.leaf && this.root.children.length === 1) {
      this.root = this.root.children[0]!;
    }

    this.recalculateBounds(this.root);
  }

  private createLeafLevel(
    entries: ReadonlyArray<SpatialEntry<T>>,
  ): Array<RTreeNode<T>> {
    const sorted = Array.from(entries).sort((left, right) => {
      const leftCenter = boundingBoxCenter(left.bounds);
      const rightCenter = boundingBoxCenter(right.bounds);

      if (leftCenter.x === rightCenter.x) {
        return leftCenter.y - rightCenter.y;
      }

      return leftCenter.x - rightCenter.x;
    });
    const level: Array<RTreeNode<T>> = [];

    for (let index = 0; index < sorted.length; index += this.maxEntries) {
      const node = createNode<T>(true);

      node.entries.push(...sorted.slice(index, index + this.maxEntries));
      this.recalculateBounds(node);
      level.push(node);
    }

    return level;
  }

  private createInternalLevel(
    children: ReadonlyArray<RTreeNode<T>>,
  ): Array<RTreeNode<T>> {
    const sorted = Array.from(children).sort((left, right) => {
      const leftCenter = boundingBoxCenter(left.bounds);
      const rightCenter = boundingBoxCenter(right.bounds);

      if (leftCenter.x === rightCenter.x) {
        return leftCenter.y - rightCenter.y;
      }

      return leftCenter.x - rightCenter.x;
    });
    const level: Array<RTreeNode<T>> = [];

    for (let index = 0; index < sorted.length; index += this.maxEntries) {
      const node = createNode<T>(false);

      node.children.push(...sorted.slice(index, index + this.maxEntries));
      this.recalculateBounds(node);
      level.push(node);
    }

    return level;
  }

  private getNodeSize(node: RTreeNode<T>): number {
    return node.leaf ? node.entries.length : node.children.length;
  }
}
