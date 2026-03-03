import type { EventManager } from './EventManager';

export type SelectionMode = 'single' | 'multi' | 'brush';
export type SelectionEngineEvent = 'selection-change';

export interface SelectionStylableTarget {
  readonly style?: Record<string, string>;
}

export interface SelectionEngineConfig {
  readonly selectionMode?: SelectionMode;
  readonly selectedStyles?: Readonly<Record<string, string>>;
  readonly eventManager?: Pick<EventManager, 'on' | 'off' | 'emit'>;
}

export interface SelectionElementRegistration {
  readonly id: string;
  readonly type: string;
  readonly target?: SelectionStylableTarget;
}

export interface SelectionChangePayload {
  readonly selection: ReadonlyArray<string>;
  readonly added: ReadonlyArray<string>;
  readonly removed: ReadonlyArray<string>;
  readonly mode: SelectionMode;
}

export interface SelectionClickOptions {
  readonly shiftKey?: boolean;
  readonly additive?: boolean;
  readonly type?: string;
  readonly target?: SelectionStylableTarget;
}

type SelectionEngineHandler = (payload: SelectionChangePayload) => void;

interface RegisteredElement {
  type: string;
  target?: SelectionStylableTarget;
}

export class SelectionEngine {
  private readonly config: SelectionEngineConfig;
  private readonly eventManager: SelectionEngineConfig['eventManager'];
  private readonly handlers = new Map<SelectionEngineEvent, Set<SelectionEngineHandler>>();
  private readonly registry = new Map<string, RegisteredElement>();
  private readonly eventManagerClickHandler: ((payload: {
    readonly element?: { readonly id: string; readonly type: string };
    readonly originalEvent?: unknown;
  }) => void) | undefined;
  private selection = new Set<string>();
  private mode: SelectionMode;

  public constructor(config: SelectionEngineConfig = {}) {
    this.config = config;
    this.eventManager = config.eventManager;
    this.mode = config.selectionMode ?? 'single';

    if (this.eventManager) {
      this.eventManagerClickHandler = (payload) => {
        if (!payload.element) {
          return;
        }

        this.handleElementClick(payload.element.id, {
          type: payload.element.type,
          shiftKey: this.resolveShiftKey(payload.originalEvent),
          ...(this.resolveTarget(payload.originalEvent)
            ? { target: this.resolveTarget(payload.originalEvent)! }
            : {}),
        });
      };

      this.eventManager.on('element-click', this.eventManagerClickHandler);
    }
  }

  public destroy(): void {
    if (this.eventManager && this.eventManagerClickHandler) {
      this.eventManager.off('element-click', this.eventManagerClickHandler);
    }
  }

  public on(event: SelectionEngineEvent, handler: SelectionEngineHandler): void {
    const handlers = this.handlers.get(event) ?? new Set<SelectionEngineHandler>();

    handlers.add(handler);
    this.handlers.set(event, handlers);
  }

  public off(event: SelectionEngineEvent, handler: SelectionEngineHandler): void {
    this.handlers.get(event)?.delete(handler);
  }

  public setMode(mode: SelectionMode): void {
    this.mode = mode;
  }

  public getMode(): SelectionMode {
    return this.mode;
  }

  public registerElement(
    id: string,
    type: string,
    target?: SelectionStylableTarget,
  ): void {
    this.registry.set(id, target ? { type, target } : { type });

    if (this.selection.has(id)) {
      this.applySelectedStylesTo(id);
    }
  }

  public unregisterElement(id: string): void {
    if (this.selection.has(id)) {
      this.removeSelectedStylesFrom(id);
    }

    this.registry.delete(id);
  }

  public select(id: string, options: SelectionClickOptions = {}): void {
    this.upsertRegistration(id, options);

    const nextSelection = new Set(
      options.additive ? this.selection : [],
    );

    nextSelection.add(id);
    this.commitSelection(nextSelection);
  }

  public deselect(id: string): void {
    if (!this.selection.has(id)) {
      return;
    }

    const nextSelection = new Set(this.selection);

    nextSelection.delete(id);
    this.commitSelection(nextSelection);
  }

  public toggle(id: string, options: SelectionClickOptions = {}): void {
    this.upsertRegistration(id, options);

    if (this.selection.has(id)) {
      this.deselect(id);
      return;
    }

    this.select(id, { ...options, additive: true });
  }

  public clearSelection(): void {
    if (this.selection.size === 0) {
      return;
    }

    this.commitSelection(new Set<string>());
  }

  public isSelected(id: string): boolean {
    return this.selection.has(id);
  }

  public getSelection(): ReadonlyArray<string> {
    return Array.from(this.selection);
  }

  public selectByType(
    type: string,
    options: Pick<SelectionClickOptions, 'additive'> = {},
  ): void {
    const matchingIds = Array.from(this.registry.entries())
      .filter(([, registration]) => registration.type === type)
      .map(([id]) => id);

    this.replaceWithIds(matchingIds, options.additive);
  }

  public selectByPredicate(
    predicate: (registration: SelectionElementRegistration) => boolean,
    options: Pick<SelectionClickOptions, 'additive'> = {},
  ): void {
    const matchingIds = Array.from(this.registry.entries())
      .filter(([id, registration]) =>
        predicate({
          id,
          type: registration.type,
          ...(registration.target ? { target: registration.target } : {}),
        }),
      )
      .map(([id]) => id);

    this.replaceWithIds(matchingIds, options.additive);
  }

  public handleElementClick(id: string, options: SelectionClickOptions = {}): void {
    if (options.shiftKey) {
      this.toggle(id, options);
      return;
    }

    if (this.mode === 'multi' || this.mode === 'brush') {
      this.select(id, { ...options, additive: true });
      return;
    }

    this.select(id, { ...options, additive: false });
  }

  public handleBackgroundClick(): void {
    this.clearSelection();
  }

  private replaceWithIds(ids: ReadonlyArray<string>, additive = false): void {
    const nextSelection = new Set(additive ? this.selection : []);

    for (const id of ids) {
      nextSelection.add(id);
    }

    this.commitSelection(nextSelection);
  }

  private commitSelection(nextSelection: ReadonlySet<string>): void {
    const previousSelection = this.selection;
    const added = Array.from(nextSelection).filter((id) => !previousSelection.has(id));
    const removed = Array.from(previousSelection).filter((id) => !nextSelection.has(id));

    if (added.length === 0 && removed.length === 0) {
      return;
    }

    for (const id of removed) {
      this.removeSelectedStylesFrom(id);
    }

    this.selection = new Set(nextSelection);

    for (const id of added) {
      this.applySelectedStylesTo(id);
    }

    const payload: SelectionChangePayload = {
      selection: this.getSelection(),
      added,
      removed,
      mode: this.mode,
    };

    this.emit('selection-change', payload);
    this.eventManager?.emit('selection-change', {
      selection: payload.selection,
    });
  }

  private emit(event: SelectionEngineEvent, payload: SelectionChangePayload): void {
    const handlers = this.handlers.get(event);

    if (!handlers) {
      return;
    }

    for (const handler of handlers) {
      handler(payload);
    }
  }

  private upsertRegistration(id: string, options: SelectionClickOptions): void {
    if (!options.type && !options.target) {
      return;
    }

    const current = this.registry.get(id);
    const type = options.type ?? current?.type ?? 'unknown';
    const target = options.target ?? current?.target;

    this.registry.set(id, target ? { type, target } : { type });
  }

  private applySelectedStylesTo(id: string): void {
    const target = this.registry.get(id)?.target;

    if (!target?.style || !this.config.selectedStyles) {
      return;
    }

    for (const [property, value] of Object.entries(this.config.selectedStyles)) {
      target.style[property] = value;
    }
  }

  private removeSelectedStylesFrom(id: string): void {
    const target = this.registry.get(id)?.target;

    if (!target?.style || !this.config.selectedStyles) {
      return;
    }

    for (const property of Object.keys(this.config.selectedStyles)) {
      delete target.style[property];
    }
  }

  private resolveShiftKey(event: unknown): boolean {
    if (!event || typeof event !== 'object') {
      return false;
    }

    return Boolean((event as { readonly shiftKey?: boolean }).shiftKey);
  }

  private resolveTarget(event: unknown): SelectionStylableTarget | undefined {
    if (!event || typeof event !== 'object') {
      return undefined;
    }

    const target = (event as { readonly target?: unknown }).target;

    if (!target || typeof target !== 'object') {
      return undefined;
    }

    return target as SelectionStylableTarget;
  }
}
