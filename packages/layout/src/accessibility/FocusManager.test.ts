import { describe, expect, it, vi } from 'vitest';

import { FocusManager } from './FocusManager';
import { MockAccessibleElement } from './accessibility.test-helpers';

describe('FocusManager', () => {
  it('renders a visible focus indicator on the focused element', () => {
    const manager = new FocusManager();
    const element = new MockAccessibleElement();

    manager.focus(element);

    expect(element.getAttribute('tabindex')).toBe('0');
    expect(element.getAttribute('data-focus-visible')).toBe('true');
    expect(element.style.outline).toContain('solid');
    expect(manager.getFocusedElement()).toBe(element);
  });

  it('clears the focus indicator on blur', () => {
    const manager = new FocusManager();
    const element = new MockAccessibleElement();

    manager.focus(element);
    manager.blur();

    expect(element.style.outline).toBe('none');
    expect(element.getAttribute('data-focus-visible')).toBe('false');
    expect(manager.getFocusedElement()).toBeNull();
  });

  it('checks WCAG contrast and falls back for weak colors', () => {
    const manager = new FocusManager({
      indicatorStyle: {
        color: '#777777',
        backgroundColor: '#888888',
      },
    });
    const element = new MockAccessibleElement();

    expect(manager.meetsContrastRequirement()).toBe(false);
    manager.focus(element);
    expect(element.style.outline).toContain('#0f172a');
  });

  it('supports skip-to-content activation', () => {
    const action = vi.fn();
    const manager = new FocusManager({
      skipToContentLabel: 'Skip main diagram',
    });

    expect(manager.getSkipToContent().label).toBe('Skip main diagram');
    manager.setSkipToContent(action);
    expect(manager.activateSkipToContent()).toBe(true);
    expect(action).toHaveBeenCalledTimes(1);
  });
});
