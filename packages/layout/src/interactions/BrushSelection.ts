import type { BoundingBox } from '../spatial';

import type { EventManager } from './EventManager';
import type { SelectionEngine } from './SelectionEngine';

export type BrushModifierKey = 'Alt' | 'Shift' | 'Meta' | 'Ctrl';
export type BrushSelectionMode = 'replace' | 'add' | 'subtract';
export type BrushSelectionEvent = 'brush-selection';

export interface BrushSelectionConfig {
  readonly modifierKey?: BrushModifierKey;
  readonly rectangleStyles?: Readonly<Record<string, string>>;
  readonly eventManager?: Pick<EventManager, 'emit'>;
}

export interface BrushSelectableElement {
  readonly id: string;
  readonly bounds: BoundingBox;
}

export interface BrushSelectionState {
  readonly active: boolean;
  readonly rect: BoundingBox | null;
  readonly visible: boolean;
  readonly styles: Readonly<Record<string, string>>;
}

export interface BrushSelectionPayload {
  readonly selection: ReadonlyArray<string>;
  readonly mode: BrushSelectionMode;
  readonly rect: BoundingBox;
}

type BrushSelectionHandler = (payload: BrushSelectionPayload) => void;

const DEFAULT_RECTANGLE_STYLES: Readonly<Record<string, string>> = {
  fill: 'rgba(30, 136, 229, 0.18)',
  stroke: '#1e88e5',
  strokeWidth: '1',
};

export class BrushSelection {
  private readonly selectionEngine: Pick<
    SelectionEngine,
    | 'clearSelection'
    | 'deselect'
    | 'getSelection'
    | 'select'
    | 'selectByPredicate'
  >;
  private readonly config: BrushSelectionConfig;
  private readonly handlers = new Map<BrushSelectionEvent, Set<BrushSelectionHandler>>();
  private readonly elements = new Map<string, BoundingBox>();
  private readonly rectangleStyles: Readonly<Record<string, string>>;
  private activeRect: BoundingBox | null = null;

  public constructor(
    selectionEngine: Pick<
      SelectionEngine,
      | 'clearSelection'
      | 'deselect'
      | 'getSelection'
      | 'select'
      | 'selectByPredicate'
    >,
    config: BrushSelectionConfig = {},
  ) {
    this.selectionEngine = selectionEngine;
    this.config = config;
    this.rectangleStyles = {
      ...DEFAULT_RECTANGLE_STYLES,
      ...config.rectangleStyles,
    };
  }

  public on(event: BrushSelectionEvent, handler: BrushSelectionHandler): void {
    const handlers = this.handlers.get(event) ?? new Set<BrushSelectionHandler>();

    handlers.add(handler);
    this.handlers.set(event, handlers);
  }

  public off(event: BrushSelectionEvent, handler: BrushSelectionHandler): void {
    this.handlers.get(event)?.delete(handler);
  }

  public registerElement(element: BrushSelectableElement): void {
    this.elements.set(element.id, element.bounds);
  }

  public unregisterElement(id: string): void {
    this.elements.delete(id);
  }

  public getModifierKey(): BrushModifierKey {
    return this.config.modifierKey ?? 'Alt';
  }

  public getState(): BrushSelectionState {
    return {
      active: this.activeRect !== null,
      rect: this.activeRect,
      visible: this.activeRect !== null,
      styles: this.rectangleStyles,
    };
  }

  public start(point: { readonly x: number; readonly y: number }): void {
    this.activeRect = {
      minX: point.x,
      minY: point.y,
      maxX: point.x,
      maxY: point.y,
    };
    this.config.eventManager?.emit('brush-start', {
      coordinates: point,
    });
  }

  public update(point: { readonly x: number; readonly y: number }): void {
    if (!this.activeRect) {
      return;
    }

    this.activeRect = normalizeRect({
      minX: this.activeRect.minX,
      minY: this.activeRect.minY,
      maxX: point.x,
      maxY: point.y,
    });
    this.config.eventManager?.emit('brush-move', {
      coordinates: point,
    });
  }

  public end(mode: BrushSelectionMode = 'replace'): BrushSelectionPayload {
    if (!this.activeRect) {
      return {
        selection: this.selectionEngine.getSelection(),
        mode,
        rect: {
          minX: 0,
          minY: 0,
          maxX: 0,
          maxY: 0,
        },
      };
    }

    const rect = this.activeRect;
    const selectedIds = Array.from(this.elements.entries())
      .filter(([, bounds]) => intersects(bounds, rect))
      .map(([id]) => id);

    if (mode === 'replace') {
      this.selectionEngine.clearSelection();
      for (const id of selectedIds) {
        this.selectionEngine.select(id, { additive: true });
      }
    } else if (mode === 'add') {
      for (const id of selectedIds) {
        this.selectionEngine.select(id, { additive: true });
      }
    } else {
      for (const id of selectedIds) {
        this.selectionEngine.deselect(id);
      }
    }

    this.activeRect = null;
    this.config.eventManager?.emit('brush-end', {
      selection: selectedIds,
    });

    const payload: BrushSelectionPayload = {
      selection: this.selectionEngine.getSelection(),
      mode,
      rect,
    };

    this.emit('brush-selection', payload);

    return payload;
  }

  private emit(event: BrushSelectionEvent, payload: BrushSelectionPayload): void {
    const handlers = this.handlers.get(event);

    if (!handlers) {
      return;
    }

    for (const handler of handlers) {
      handler(payload);
    }
  }
}

function normalizeRect(bounds: BoundingBox): BoundingBox {
  return {
    minX: Math.min(bounds.minX, bounds.maxX),
    minY: Math.min(bounds.minY, bounds.maxY),
    maxX: Math.max(bounds.minX, bounds.maxX),
    maxY: Math.max(bounds.minY, bounds.maxY),
  };
}

function intersects(left: BoundingBox, right: BoundingBox): boolean {
  return !(
    left.maxX < right.minX ||
    left.minX > right.maxX ||
    left.maxY < right.minY ||
    left.minY > right.maxY
  );
}
