import type { ARIAElementLike } from './ARIAManager';

export interface FocusableElementLike extends ARIAElementLike {
  readonly style?: Record<string, string>;
}

export interface FocusIndicatorStyle {
  readonly color?: string;
  readonly backgroundColor?: string;
  readonly width?: number;
}

export interface SkipToContentLink {
  readonly label: string;
}

export interface FocusManagerConfig {
  readonly indicatorStyle?: FocusIndicatorStyle;
  readonly skipToContentLabel?: string;
}

const DEFAULT_STYLE: Required<FocusIndicatorStyle> = {
  color: '#0f172a',
  backgroundColor: '#ffffff',
  width: 2,
};

export class FocusManager {
  private indicatorStyle: Required<FocusIndicatorStyle>;
  private focusedElement: FocusableElementLike | null = null;
  private skipLink: SkipToContentLink;
  private skipAction: (() => void) | null = null;

  public constructor(config: FocusManagerConfig = {}) {
    this.indicatorStyle = {
      ...DEFAULT_STYLE,
      ...config.indicatorStyle,
    };
    this.skipLink = {
      label: config.skipToContentLabel ?? 'Skip to content',
    };
  }

  public setIndicatorStyle(style: FocusIndicatorStyle): void {
    this.indicatorStyle = {
      ...this.indicatorStyle,
      ...style,
    };
  }

  public focus(element: FocusableElementLike): void {
    if (this.focusedElement && this.focusedElement !== element) {
      this.clearIndicator(this.focusedElement);
    }

    this.focusedElement = element;
    element.setAttribute?.('tabindex', '0');
    element.setAttribute?.('data-focus-visible', 'true');
    this.applyIndicator(element);
  }

  public blur(): void {
    if (!this.focusedElement) {
      return;
    }

    this.clearIndicator(this.focusedElement);
    this.focusedElement.setAttribute?.('data-focus-visible', 'false');
    this.focusedElement = null;
  }

  public getFocusedElement(): FocusableElementLike | null {
    return this.focusedElement;
  }

  public meetsContrastRequirement(
    foreground = this.indicatorStyle.color,
    background = this.indicatorStyle.backgroundColor,
  ): boolean {
    return contrastRatio(foreground, background) >= 3;
  }

  public setSkipToContent(action: () => void, label = this.skipLink.label): SkipToContentLink {
    this.skipAction = action;
    this.skipLink = { label };

    return this.getSkipToContent();
  }

  public getSkipToContent(): SkipToContentLink {
    return { ...this.skipLink };
  }

  public activateSkipToContent(): boolean {
    if (!this.skipAction) {
      return false;
    }

    this.skipAction();
    return true;
  }

  private applyIndicator(element: FocusableElementLike): void {
    if (!element.style) {
      return;
    }

    const color = this.meetsContrastRequirement(
      this.indicatorStyle.color,
      this.indicatorStyle.backgroundColor,
    )
      ? this.indicatorStyle.color
      : DEFAULT_STYLE.color;

    element.style.outline = `${this.indicatorStyle.width}px solid ${color}`;
    element.style.outlineOffset = '2px';
  }

  private clearIndicator(element: FocusableElementLike): void {
    if (!element.style) {
      return;
    }

    element.style.outline = 'none';
    element.style.outlineOffset = '0';
  }
}

function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(parseHexColor(foreground));
  const backgroundLuminance = relativeLuminance(parseHexColor(background));
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

function parseHexColor(value: string): readonly [number, number, number] {
  const normalized = value.startsWith('#') ? value.slice(1) : value;
  const expanded = normalized.length === 3
    ? normalized
      .split('')
      .map((character) => `${character}${character}`)
      .join('')
    : normalized.padEnd(6, '0').slice(0, 6);

  return [
    Number.parseInt(expanded.slice(0, 2), 16),
    Number.parseInt(expanded.slice(2, 4), 16),
    Number.parseInt(expanded.slice(4, 6), 16),
  ];
}

function relativeLuminance([red, green, blue]: readonly [number, number, number]): number {
  const r = normalizeChannel(red);
  const g = normalizeChannel(green);
  const b = normalizeChannel(blue);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function normalizeChannel(channel: number): number {
  const normalized = channel / 255;

  return normalized <= 0.03928
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4);
}
