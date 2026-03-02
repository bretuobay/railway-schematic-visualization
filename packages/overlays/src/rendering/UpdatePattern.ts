import type { RenderElement } from './types';

export interface UpdateDelta<TItem> {
  readonly enter: ReadonlyArray<TItem>;
  readonly update: ReadonlyArray<TItem>;
  readonly exit: ReadonlyArray<TItem>;
}

export class UpdatePattern<TItem extends { readonly id: string }> {
  private previous = new Map<string, TItem>();

  public apply(items: ReadonlyArray<TItem>): UpdateDelta<TItem> {
    const next = new Map(items.map((item) => [item.id, item] as const));
    const enter: TItem[] = [];
    const update: TItem[] = [];
    const exit: TItem[] = [];

    for (const item of items) {
      if (this.previous.has(item.id)) {
        update.push(item);
      } else {
        enter.push(item);
      }
    }

    for (const [id, item] of this.previous) {
      if (!next.has(id)) {
        exit.push(item);
      }
    }

    this.previous = next;

    return { enter, update, exit };
  }

  public reset(): void {
    this.previous.clear();
  }
}

export function sortByRenderOrder(
  elements: ReadonlyArray<RenderElement>,
): Array<RenderElement> {
  return [...elements].sort(
    (left, right) => (left.zIndex ?? 0) - (right.zIndex ?? 0) || left.id.localeCompare(right.id),
  );
}
