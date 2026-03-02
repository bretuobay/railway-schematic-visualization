import type { SvgRenderNode } from '../rendering';

export interface AccessibilityEnhancementOptions {
  readonly overlayId: string;
  readonly interactiveNodeIds?: ReadonlyArray<string>;
  readonly expandedNodeIds?: ReadonlyArray<string>;
  readonly pressedNodeIds?: ReadonlyArray<string>;
  readonly describedBy?: Readonly<Record<string, string>>;
}

export interface KeyboardInput {
  readonly key: string;
}

export class OverlayAccessibilityManager {
  private readonly nodesByOverlay = new Map<string, Array<SvgRenderNode>>();
  private focusOrder: Array<{ readonly overlayId: string; readonly nodeId: string }> = [];
  private focusedIndex = -1;
  private liveRegion = '';

  public enhanceNodes(
    nodes: ReadonlyArray<SvgRenderNode>,
    options: AccessibilityEnhancementOptions,
  ): ReadonlyArray<SvgRenderNode> {
    const interactive = new Set(options.interactiveNodeIds ?? []);
    const expanded = new Set(options.expandedNodeIds ?? []);
    const pressed = new Set(options.pressedNodeIds ?? []);

    const enhanced = nodes.map((node) => {
      const isInteractive = interactive.has(node.id);
      const role = isInteractive ? 'button' : 'img';
      const labelBase = node.attributes.text ?? node.id;

      return {
        ...node,
        attributes: {
          ...node.attributes,
          role,
          'aria-label': `${options.overlayId}:${labelBase}`,
          ...(isInteractive ? { tabindex: '0' } : {}),
          ...(expanded.has(node.id) ? { 'aria-expanded': 'true' } : {}),
          ...(pressed.has(node.id) ? { 'aria-pressed': 'true' } : {}),
          ...(options.describedBy?.[node.id]
            ? { 'aria-describedby': options.describedBy[node.id]! }
            : {}),
        },
      };
    });

    this.nodesByOverlay.set(options.overlayId, [...enhanced]);
    this.rebuildFocusOrder();

    return enhanced;
  }

  public handleKeyboard(input: KeyboardInput): string | undefined {
    if (this.focusOrder.length === 0) {
      return undefined;
    }

    switch (input.key) {
      case 'Tab':
      case 'ArrowRight':
      case 'ArrowDown':
        this.focusedIndex = (this.focusedIndex + 1 + this.focusOrder.length) % this.focusOrder.length;
        return this.focusOrder[this.focusedIndex]?.nodeId;
      case 'ArrowLeft':
      case 'ArrowUp':
        this.focusedIndex = (this.focusedIndex - 1 + this.focusOrder.length) % this.focusOrder.length;
        return this.focusOrder[this.focusedIndex]?.nodeId;
      case 'Escape':
        this.focusedIndex = -1;
        return undefined;
      case 'Enter':
      case ' ':
        return this.focusOrder[this.focusedIndex]?.nodeId;
      default:
        return undefined;
    }
  }

  public announce(message: string): void {
    this.liveRegion = message;
  }

  public getLiveRegion(): string {
    return this.liveRegion;
  }

  public getFocusedNodeId(): string | undefined {
    return this.focusOrder[this.focusedIndex]?.nodeId;
  }

  public focusOverlay(overlayId: string): string | undefined {
    const firstIndex = this.focusOrder.findIndex((entry) => entry.overlayId === overlayId);

    if (firstIndex < 0) {
      return undefined;
    }

    this.focusedIndex = firstIndex;

    return this.focusOrder[firstIndex]?.nodeId;
  }

  public getNodes(overlayId: string): ReadonlyArray<SvgRenderNode> {
    return this.nodesByOverlay.get(overlayId) ?? [];
  }

  public clear(overlayId?: string): void {
    if (overlayId) {
      this.nodesByOverlay.delete(overlayId);
    } else {
      this.nodesByOverlay.clear();
    }

    this.rebuildFocusOrder();
  }

  private rebuildFocusOrder(): void {
    this.focusOrder = [...this.nodesByOverlay.entries()].flatMap(([overlayId, nodes]) =>
      nodes
        .filter((node) => node.attributes.tabindex === '0')
        .map((node) => ({
          overlayId,
          nodeId: node.id,
        })),
    );

    if (this.focusedIndex >= this.focusOrder.length) {
      this.focusedIndex = this.focusOrder.length - 1;
    }
  }
}
