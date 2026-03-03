import type { BoundingBox } from '../spatial';

import type { FitToView } from '../viewport';
import type { SelectionEngine } from './SelectionEngine';

export interface KeyboardShortcutsRoot {
  addEventListener?(
    type: string,
    listener: (event: unknown) => void,
    options?: AddEventListenerOptions | boolean,
  ): void;
  removeEventListener?(
    type: string,
    listener: (event: unknown) => void,
    options?: EventListenerOptions | boolean,
  ): void;
}

export interface KeyboardShortcutsConfig {
  readonly root?: KeyboardShortcutsRoot;
  readonly viewportController?: {
    zoomBy(factor: number): Promise<unknown> | unknown;
    zoomTo(scale: number): Promise<unknown> | unknown;
    getTransform(): { readonly scale: number };
  };
  readonly fitToView?: Pick<FitToView, 'fitToView' | 'fitSelection'>;
  readonly selectionEngine?: Pick<SelectionEngine, 'clearSelection' | 'select'>;
  readonly getFitBounds?: (() => BoundingBox | ReadonlyArray<BoundingBox>) | BoundingBox | ReadonlyArray<BoundingBox>;
  readonly getSelectionBounds?: (() => ReadonlyArray<BoundingBox>) | ReadonlyArray<BoundingBox>;
  readonly selectAllIds?: ReadonlyArray<string>;
}

export interface KeyboardShortcutDefinition {
  readonly combo: string;
  readonly description: string;
  readonly handler: (event: KeyboardShortcutEventLike) => Promise<void> | void;
}

export interface KeyboardShortcutReference {
  readonly combo: string;
  readonly description: string;
}

export type KeyboardShortcutEventLike = {
  readonly key?: string;
  readonly shiftKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
  preventDefault?: () => void;
};

export class KeyboardShortcuts {
  private readonly config: KeyboardShortcutsConfig;
  private readonly shortcuts = new Map<string, KeyboardShortcutDefinition>();
  private readonly rootListener: ((event: unknown) => void) | undefined;
  private helpVisible = false;

  public constructor(config: KeyboardShortcutsConfig = {}) {
    this.config = config;
    this.registerDefaultShortcuts();

    if (config.root) {
      this.rootListener = (event) => {
        void this.handleKeyDown(event as KeyboardShortcutEventLike);
      };

      config.root.addEventListener?.('keydown', this.rootListener);
    }
  }

  public destroy(): void {
    if (this.config.root && this.rootListener) {
      this.config.root.removeEventListener?.('keydown', this.rootListener);
    }
  }

  public registerShortcut(
    combo: string,
    handler: KeyboardShortcutDefinition['handler'],
    description = 'Custom shortcut',
  ): void {
    this.shortcuts.set(normalizeCombo(combo), {
      combo: normalizeCombo(combo),
      description,
      handler,
    });
  }

  public getRegisteredShortcuts(): ReadonlyArray<KeyboardShortcutReference> {
    return Array.from(this.shortcuts.values()).map((shortcut) => ({
      combo: shortcut.combo,
      description: shortcut.description,
    }));
  }

  public isHelpVisible(): boolean {
    return this.helpVisible;
  }

  public async handleKeyDown(event: KeyboardShortcutEventLike): Promise<boolean> {
    const combo = eventToCombo(event);
    const shortcut = this.shortcuts.get(combo);

    if (!shortcut) {
      return false;
    }

    event.preventDefault?.();
    await shortcut.handler(event);

    return true;
  }

  private registerDefaultShortcuts(): void {
    this.registerShortcut('+', async () => {
      await this.config.viewportController?.zoomBy(1.2);
    }, 'Zoom in');
    this.registerShortcut('-', async () => {
      await this.config.viewportController?.zoomBy(1 / 1.2);
    }, 'Zoom out');
    this.registerShortcut('0', async () => {
      await this.config.viewportController?.zoomTo(1);
    }, 'Reset zoom');
    this.registerShortcut('f', async () => {
      const bounds = resolveBounds(this.config.getFitBounds);

      if (bounds !== undefined) {
        await this.config.fitToView?.fitToView(bounds);
      }
    }, 'Fit to view');
    this.registerShortcut('shift+f', async () => {
      const bounds = resolveSelectionBounds(this.config.getSelectionBounds);

      if (bounds.length > 0) {
        await this.config.fitToView?.fitSelection(bounds);
      }
    }, 'Fit selection');
    this.registerShortcut('ctrl+a', async () => {
      this.selectAll();
    }, 'Select all');
    this.registerShortcut('meta+a', async () => {
      this.selectAll();
    }, 'Select all');
    this.registerShortcut('escape', async () => {
      this.config.selectionEngine?.clearSelection();
    }, 'Deselect all');
    this.registerShortcut('shift+/', async () => {
      this.helpVisible = !this.helpVisible;
    }, 'Toggle keyboard shortcut help');
  }

  private selectAll(): void {
    if (!this.config.selectionEngine || !this.config.selectAllIds) {
      return;
    }

    this.config.selectionEngine.clearSelection();

    for (const id of this.config.selectAllIds) {
      this.config.selectionEngine.select(id, { additive: true });
    }
  }
}

function normalizeCombo(combo: string): string {
  const parts = combo
    .toLowerCase()
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean);
  const modifierSet = new Set(['ctrl', 'meta', 'shift']);
  const modifiers = parts.filter((part) => modifierSet.has(part));
  const keys = parts.filter((part) => !modifierSet.has(part));

  return [...modifiers.sort(), ...keys].join('+');
}

function eventToCombo(event: KeyboardShortcutEventLike): string {
  const key = normalizeKey(event.key ?? '');
  const modifiers = [
    event.ctrlKey ? 'ctrl' : undefined,
    event.metaKey ? 'meta' : undefined,
    event.shiftKey ? 'shift' : undefined,
  ].filter((part): part is string => Boolean(part));

  return normalizeCombo([...modifiers, key].join('+'));
}

function normalizeKey(key: string): string {
  if (key === '?') {
    return '/';
  }

  if (key === ' ') {
    return 'space';
  }

  return key.toLowerCase();
}

function resolveBounds(
  value:
    | KeyboardShortcutsConfig['getFitBounds']
    | undefined,
): BoundingBox | ReadonlyArray<BoundingBox> | undefined {
  if (typeof value === 'function') {
    return value();
  }

  return value;
}

function resolveSelectionBounds(
  value:
    | KeyboardShortcutsConfig['getSelectionBounds']
    | undefined,
): ReadonlyArray<BoundingBox> {
  if (!value) {
    return [];
  }

  if (typeof value === 'function') {
    return value();
  }

  return value;
}
