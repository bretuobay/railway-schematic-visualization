export interface MenuPosition {
  readonly x: number;
  readonly y: number;
}

export interface MenuSize {
  readonly width: number;
  readonly height: number;
}

export interface MenuViewport {
  readonly width: number;
  readonly height: number;
}

export type MenuSource =
  | 'keyboard'
  | 'outside-pointer'
  | 'programmatic'
  | 'selection'
  | 'trigger'
  | 'escape-key';

export interface ContextMenuTarget {
  readonly id?: string;
  readonly type?: string;
  readonly label?: string;
  readonly data?: Readonly<Record<string, unknown>>;
}

export interface MenuEvaluationContext<
  TTarget extends ContextMenuTarget = ContextMenuTarget,
> {
  readonly target?: TTarget;
  readonly position: MenuPosition;
  readonly viewport: MenuViewport;
}

export interface MenuActionContext<
  TTarget extends ContextMenuTarget = ContextMenuTarget,
> extends MenuEvaluationContext<TTarget> {
  readonly item: ResolvedMenuItem<TTarget>;
  readonly source: MenuSource;
  readonly triggerEvent?: Readonly<Record<string, unknown>>;
}

export type MenuLabelResolver<
  TTarget extends ContextMenuTarget = ContextMenuTarget,
> = string | ((context: MenuEvaluationContext<TTarget>) => string);

export type MenuPredicate<
  TTarget extends ContextMenuTarget = ContextMenuTarget,
> = boolean | ((context: MenuEvaluationContext<TTarget>) => boolean);

export interface MenuItem<TTarget extends ContextMenuTarget = ContextMenuTarget> {
  readonly id: string;
  readonly label?: MenuLabelResolver<TTarget>;
  readonly icon?: string;
  readonly action?: (
    context: MenuActionContext<TTarget>,
  ) => void | Promise<void>;
  readonly visible?: MenuPredicate<TTarget>;
  readonly disabled?: MenuPredicate<TTarget>;
  readonly separator?: boolean;
  readonly shortcut?: string;
  readonly submenu?: ReadonlyArray<MenuItem<TTarget>>;
}

export interface ResolvedMenuItem<
  TTarget extends ContextMenuTarget = ContextMenuTarget,
> {
  readonly id: string;
  readonly label: string;
  readonly icon?: string;
  readonly action?: (
    context: MenuActionContext<TTarget>,
  ) => void | Promise<void>;
  readonly disabled: boolean;
  readonly separator: boolean;
  readonly shortcut?: string;
  readonly submenu: ReadonlyArray<ResolvedMenuItem<TTarget>>;
}

export interface ContextMenuState<
  TTarget extends ContextMenuTarget = ContextMenuTarget,
> {
  readonly visible: boolean;
  readonly items: ReadonlyArray<ResolvedMenuItem<TTarget>>;
  readonly activeIndex: number;
  readonly position: MenuPosition;
  readonly size: MenuSize;
  readonly viewport: MenuViewport;
  readonly target?: TTarget;
  readonly source: MenuSource;
}

export interface ContextMenuShowRequest<
  TTarget extends ContextMenuTarget = ContextMenuTarget,
> extends MenuEvaluationContext<TTarget> {
  readonly source?: MenuSource;
  readonly size?: Partial<MenuSize>;
  readonly triggerEvent?: Readonly<Record<string, unknown>>;
}

export type ContextMenuStateChangeReason =
  | 'focus'
  | 'hide'
  | 'items-change'
  | 'show';

export interface ContextMenuStateChangeEvent<
  TTarget extends ContextMenuTarget = ContextMenuTarget,
> {
  readonly reason: ContextMenuStateChangeReason;
  readonly state: ContextMenuState<TTarget>;
}

export interface ContextMenuSelectionEvent<
  TTarget extends ContextMenuTarget = ContextMenuTarget,
> {
  readonly item: ResolvedMenuItem<TTarget>;
  readonly state: ContextMenuState<TTarget>;
  readonly source: MenuSource;
}

export interface ContextMenuControllerOptions {
  readonly defaultSize?: Partial<MenuSize>;
}

export interface ContextMenuManager<
  TTarget extends ContextMenuTarget = ContextMenuTarget,
> {
  registerMenuItem(item: MenuItem<TTarget>): MenuItem<TTarget>;
  unregisterMenuItem(id: string): boolean;
  show(request: ContextMenuShowRequest<TTarget>): ContextMenuState<TTarget>;
  hide(source?: MenuSource): ContextMenuState<TTarget>;
  isVisible(): boolean;
}

export interface ContextMenuPackageMetadata {
  readonly packageName: '@rail-schematic-viz/context-menu';
  readonly supportsKeyboardNavigation: true;
}

type StateListener<TTarget extends ContextMenuTarget> = (
  event: ContextMenuStateChangeEvent<TTarget>,
) => void;
type SelectionListener<TTarget extends ContextMenuTarget> = (
  event: ContextMenuSelectionEvent<TTarget>,
) => void;

const DEFAULT_POSITION: MenuPosition = { x: 0, y: 0 };
const DEFAULT_SIZE: MenuSize = { height: 240, width: 220 };
const DEFAULT_VIEWPORT: MenuViewport = { height: 0, width: 0 };

export const PACKAGE_METADATA = {
  packageName: '@rail-schematic-viz/context-menu',
  supportsKeyboardNavigation: true,
} as const satisfies ContextMenuPackageMetadata;

export function getPackageMetadata(): ContextMenuPackageMetadata {
  return PACKAGE_METADATA;
}

export class ContextMenuController<
  TTarget extends ContextMenuTarget = ContextMenuTarget,
> implements ContextMenuManager<TTarget> {
  private readonly items = new Map<string, MenuItem<TTarget>>();
  private readonly selectionListeners = new Set<SelectionListener<TTarget>>();
  private readonly stateListeners = new Set<StateListener<TTarget>>();
  private readonly defaultSize: MenuSize;
  private state: ContextMenuState<TTarget>;
  private currentTriggerEvent: Readonly<Record<string, unknown>> | undefined;

  public constructor(options: ContextMenuControllerOptions = {}) {
    this.defaultSize = resolveMenuSize(options.defaultSize);
    this.state = {
      activeIndex: -1,
      items: [],
      position: DEFAULT_POSITION,
      size: this.defaultSize,
      source: 'programmatic',
      viewport: DEFAULT_VIEWPORT,
      visible: false,
    };
  }

  public registerMenuItem(item: MenuItem<TTarget>): MenuItem<TTarget> {
    validateMenuItem(item);
    this.items.set(item.id, item);
    this.refreshVisibleState('items-change');

    return item;
  }

  public unregisterMenuItem(id: string): boolean {
    const removed = this.items.delete(id);

    if (removed) {
      this.refreshVisibleState('items-change');
    }

    return removed;
  }

  public show(request: ContextMenuShowRequest<TTarget>): ContextMenuState<TTarget> {
    const size = resolveMenuSize(request.size, this.defaultSize);
    const position = clampPosition(request.position, request.viewport, size);
    const items = this.resolveItems(
      createEvaluationContext(position, request.viewport, request.target),
    );

    this.currentTriggerEvent = request.triggerEvent;
    this.state = {
      activeIndex: this.findFirstFocusableIndex(items),
      items,
      position,
      size,
      source: request.source ?? 'trigger',
      viewport: request.viewport,
      visible: true,
      ...(request.target !== undefined ? { target: request.target } : {}),
    };
    this.emitStateChange('show');

    return this.getState();
  }

  public hide(source: MenuSource = 'programmatic'): ContextMenuState<TTarget> {
    if (!this.state.visible) {
      return this.getState();
    }

    this.currentTriggerEvent = undefined;
    this.state = {
      ...this.state,
      activeIndex: -1,
      items: [],
      source,
      visible: false,
    };
    this.emitStateChange('hide');

    return this.getState();
  }

  public isVisible(): boolean {
    return this.state.visible;
  }

  public getState(): ContextMenuState<TTarget> {
    return {
      ...this.state,
      items: this.state.items.map(cloneResolvedItem),
      position: { ...this.state.position },
      size: { ...this.state.size },
      viewport: { ...this.state.viewport },
    };
  }

  public resolveItems(
    context: MenuEvaluationContext<TTarget>,
  ): ReadonlyArray<ResolvedMenuItem<TTarget>> {
    const resolved = Array.from(this.items.values())
      .map((item) => resolveMenuItem(item, context))
      .filter((item): item is ResolvedMenuItem<TTarget> => item !== undefined);

    return normalizeSeparators(resolved);
  }

  public onStateChange(listener: StateListener<TTarget>): () => void {
    this.stateListeners.add(listener);

    return () => {
      this.stateListeners.delete(listener);
    };
  }

  public onSelect(listener: SelectionListener<TTarget>): () => void {
    this.selectionListeners.add(listener);

    return () => {
      this.selectionListeners.delete(listener);
    };
  }

  public moveFocus(direction: 1 | -1): ContextMenuState<TTarget> {
    if (!this.state.visible || this.state.items.length === 0) {
      return this.getState();
    }

    const focusableIndexes = this.getFocusableIndexes(this.state.items);

    if (focusableIndexes.length === 0) {
      return this.getState();
    }

    const currentOffset = Math.max(
      0,
      focusableIndexes.indexOf(this.state.activeIndex),
    );
    const nextOffset = (currentOffset + direction + focusableIndexes.length)
      % focusableIndexes.length;

    this.state = {
      ...this.state,
      activeIndex: focusableIndexes[nextOffset] ?? -1,
    };
    this.emitStateChange('focus');

    return this.getState();
  }

  public focusFirst(): ContextMenuState<TTarget> {
    if (!this.state.visible) {
      return this.getState();
    }

    this.state = {
      ...this.state,
      activeIndex: this.findFirstFocusableIndex(this.state.items),
    };
    this.emitStateChange('focus');

    return this.getState();
  }

  public focusLast(): ContextMenuState<TTarget> {
    if (!this.state.visible) {
      return this.getState();
    }

    const focusableIndexes = this.getFocusableIndexes(this.state.items);

    this.state = {
      ...this.state,
      activeIndex: focusableIndexes.at(-1) ?? -1,
    };
    this.emitStateChange('focus');

    return this.getState();
  }

  public async activateFocusedItem(
    source: MenuSource = 'keyboard',
  ): Promise<boolean> {
    if (!this.state.visible || this.state.activeIndex < 0) {
      return false;
    }

    const item = this.state.items[this.state.activeIndex];

    if (!item) {
      return false;
    }

    return this.selectItem(item.id, source);
  }

  public async selectItem(
    id: string,
    source: MenuSource = 'selection',
  ): Promise<boolean> {
    if (!this.state.visible) {
      return false;
    }

    const item = findItemById(this.state.items, id);

    if (!item || item.separator || item.disabled) {
      return false;
    }

    const selectionState = this.getState();

    if (item.action) {
      await item.action({
        item,
        position: selectionState.position,
        source,
        viewport: selectionState.viewport,
        ...(selectionState.target !== undefined
          ? { target: selectionState.target }
          : {}),
        ...(this.currentTriggerEvent !== undefined
          ? { triggerEvent: this.currentTriggerEvent }
          : {}),
      });
    }

    this.selectionListeners.forEach((listener) => {
      listener({
        item,
        source,
        state: selectionState,
      });
    });

    this.hide('selection');

    return true;
  }

  public handlePointerDown(position: MenuPosition): boolean {
    if (!this.state.visible) {
      return false;
    }

    const { x, y } = position;
    const left = this.state.position.x;
    const top = this.state.position.y;
    const right = left + this.state.size.width;
    const bottom = top + this.state.size.height;
    const inside = x >= left && x <= right && y >= top && y <= bottom;

    if (inside) {
      return false;
    }

    this.hide('outside-pointer');

    return true;
  }

  public async handleKeyDown(key: string): Promise<boolean> {
    if (!this.state.visible) {
      return false;
    }

    switch (key) {
      case 'ArrowDown':
        this.moveFocus(1);
        return true;
      case 'ArrowUp':
        this.moveFocus(-1);
        return true;
      case 'Home':
        this.focusFirst();
        return true;
      case 'End':
        this.focusLast();
        return true;
      case 'Enter':
      case ' ':
        return this.activateFocusedItem('keyboard');
      case 'Escape':
        this.hide('escape-key');
        return true;
      default:
        return false;
    }
  }

  private refreshVisibleState(reason: ContextMenuStateChangeReason): void {
    if (!this.state.visible) {
      return;
    }

    const items = this.resolveItems(
      createEvaluationContext(
        this.state.position,
        this.state.viewport,
        this.state.target,
      ),
    );
    const focusableIndexes = this.getFocusableIndexes(items);
    const activeIndex = focusableIndexes.includes(this.state.activeIndex)
      ? this.state.activeIndex
      : (focusableIndexes[0] ?? -1);

    this.state = {
      ...this.state,
      activeIndex,
      items,
    };
    this.emitStateChange(reason);
  }

  private emitStateChange(reason: ContextMenuStateChangeReason): void {
    const event: ContextMenuStateChangeEvent<TTarget> = {
      reason,
      state: this.getState(),
    };

    this.stateListeners.forEach((listener) => {
      listener(event);
    });
  }

  private findFirstFocusableIndex(
    items: ReadonlyArray<ResolvedMenuItem<TTarget>>,
  ): number {
    return this.getFocusableIndexes(items)[0] ?? -1;
  }

  private getFocusableIndexes(
    items: ReadonlyArray<ResolvedMenuItem<TTarget>>,
  ): ReadonlyArray<number> {
    return items.reduce<number[]>((indexes, item, index) => {
      if (!item.separator && !item.disabled) {
        indexes.push(index);
      }

      return indexes;
    }, []);
  }
}

function validateMenuItem<TTarget extends ContextMenuTarget>(
  item: MenuItem<TTarget>,
): void {
  if (!item || typeof item !== 'object') {
    throw new Error('Menu item must be an object.');
  }

  if (!item.id || typeof item.id !== 'string') {
    throw new Error('Menu item id must be a non-empty string.');
  }

  if (item.label !== undefined && typeof item.label !== 'string' && typeof item.label !== 'function') {
    throw new Error(`Menu item "${item.id}" label must be a string or function.`);
  }

  if (item.action !== undefined && typeof item.action !== 'function') {
    throw new Error(`Menu item "${item.id}" action must be a function when provided.`);
  }

  if (item.visible !== undefined && typeof item.visible !== 'boolean' && typeof item.visible !== 'function') {
    throw new Error(`Menu item "${item.id}" visible must be a boolean or function.`);
  }

  if (item.disabled !== undefined && typeof item.disabled !== 'boolean' && typeof item.disabled !== 'function') {
    throw new Error(`Menu item "${item.id}" disabled must be a boolean or function.`);
  }

  if (item.submenu) {
    item.submenu.forEach((child) => {
      validateMenuItem(child);
    });
  }
}

function resolveMenuItem<TTarget extends ContextMenuTarget>(
  item: MenuItem<TTarget>,
  context: MenuEvaluationContext<TTarget>,
): ResolvedMenuItem<TTarget> | undefined {
  if (!evaluatePredicate(item.visible, context, true)) {
    return undefined;
  }

  const submenu = normalizeSeparators(
    (item.submenu ?? [])
      .map((child) => resolveMenuItem(child, context))
      .filter((child): child is ResolvedMenuItem<TTarget> => child !== undefined),
  );

  return {
    disabled:
      item.separator || (!item.action && submenu.length > 0)
        ? true
        : evaluatePredicate(item.disabled, context, false),
    id: item.id,
    label: resolveLabel(item.label, context, item.id),
    separator: item.separator ?? false,
    submenu,
    ...(item.action !== undefined ? { action: item.action } : {}),
    ...(item.icon !== undefined ? { icon: item.icon } : {}),
    ...(item.shortcut !== undefined ? { shortcut: item.shortcut } : {}),
  };
}

function resolveLabel<TTarget extends ContextMenuTarget>(
  label: MenuLabelResolver<TTarget> | undefined,
  context: MenuEvaluationContext<TTarget>,
  fallbackId: string,
): string {
  if (typeof label === 'function') {
    return label(context);
  }

  if (typeof label === 'string' && label.length > 0) {
    return label;
  }

  return fallbackId;
}

function evaluatePredicate<TTarget extends ContextMenuTarget>(
  predicate: MenuPredicate<TTarget> | undefined,
  context: MenuEvaluationContext<TTarget>,
  fallback: boolean,
): boolean {
  if (typeof predicate === 'function') {
    return predicate(context);
  }

  if (typeof predicate === 'boolean') {
    return predicate;
  }

  return fallback;
}

function resolveMenuSize(
  override?: Partial<MenuSize>,
  fallback: MenuSize = DEFAULT_SIZE,
): MenuSize {
  return {
    height: Math.max(1, Math.round(override?.height ?? fallback.height)),
    width: Math.max(1, Math.round(override?.width ?? fallback.width)),
  };
}

function clampPosition(
  position: MenuPosition,
  viewport: MenuViewport,
  size: MenuSize,
): MenuPosition {
  return {
    x: clamp(position.x, 0, Math.max(0, viewport.width - size.width)),
    y: clamp(position.y, 0, Math.max(0, viewport.height - size.height)),
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function normalizeSeparators<TTarget extends ContextMenuTarget>(
  items: ReadonlyArray<ResolvedMenuItem<TTarget>>,
): ReadonlyArray<ResolvedMenuItem<TTarget>> {
  const normalized: ResolvedMenuItem<TTarget>[] = [];

  for (const item of items) {
    const previous = normalized.at(-1);

    if (item.separator && (!previous || previous.separator)) {
      continue;
    }

    normalized.push(item);
  }

  while (normalized.at(-1)?.separator) {
    normalized.pop();
  }

  return normalized;
}

function createEvaluationContext<TTarget extends ContextMenuTarget>(
  position: MenuPosition,
  viewport: MenuViewport,
  target: TTarget | undefined,
): MenuEvaluationContext<TTarget> {
  return {
    position,
    viewport,
    ...(target !== undefined ? { target } : {}),
  };
}

function findItemById<TTarget extends ContextMenuTarget>(
  items: ReadonlyArray<ResolvedMenuItem<TTarget>>,
  id: string,
): ResolvedMenuItem<TTarget> | undefined {
  for (const item of items) {
    if (item.id === id) {
      return item;
    }

    const child = findItemById(item.submenu, id);

    if (child) {
      return child;
    }
  }

  return undefined;
}

function cloneResolvedItem<TTarget extends ContextMenuTarget>(
  item: ResolvedMenuItem<TTarget>,
): ResolvedMenuItem<TTarget> {
  return {
    submenu: item.submenu.map(cloneResolvedItem),
    disabled: item.disabled,
    id: item.id,
    label: item.label,
    separator: item.separator,
    ...(item.action !== undefined ? { action: item.action } : {}),
    ...(item.icon !== undefined ? { icon: item.icon } : {}),
    ...(item.shortcut !== undefined ? { shortcut: item.shortcut } : {}),
  };
}
