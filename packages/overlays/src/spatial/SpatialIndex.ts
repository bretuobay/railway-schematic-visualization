import type { OverlayBounds } from '../types';

export interface IndexEntry<T> extends OverlayBounds {
  readonly value: T;
}

function intersects(left: OverlayBounds, right: OverlayBounds): boolean {
  return !(
    left.maxX < right.minX ||
    left.minX > right.maxX ||
    left.maxY < right.minY ||
    left.minY > right.maxY
  );
}

export class SpatialIndex<T> {
  private entries: Array<IndexEntry<T>> = [];

  public get size(): number {
    return this.entries.length;
  }

  public insert(entry: IndexEntry<T>): void {
    this.entries.push(entry);
  }

  public remove(
    entry: IndexEntry<T>,
    equals: (left: T, right: T) => boolean = Object.is,
  ): boolean {
    const index = this.entries.findIndex(
      (candidate) =>
        candidate.minX === entry.minX &&
        candidate.minY === entry.minY &&
        candidate.maxX === entry.maxX &&
        candidate.maxY === entry.maxY &&
        equals(candidate.value, entry.value),
    );

    if (index < 0) {
      return false;
    }

    this.entries.splice(index, 1);

    return true;
  }

  public search(bounds: OverlayBounds): Array<IndexEntry<T>> {
    return this.entries.filter((entry) => intersects(entry, bounds));
  }

  public clear(): void {
    this.entries = [];
  }

  public bulkLoad(entries: ReadonlyArray<IndexEntry<T>>): void {
    this.entries = [...entries];
  }
}
