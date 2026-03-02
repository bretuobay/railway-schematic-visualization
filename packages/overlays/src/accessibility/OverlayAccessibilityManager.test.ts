import { describe, expect, it } from 'vitest';

import { OverlayAccessibilityManager } from './OverlayAccessibilityManager';

describe('OverlayAccessibilityManager', () => {
  it('adds ARIA attributes to interactive and descriptive nodes', () => {
    const manager = new OverlayAccessibilityManager();
    const nodes = manager.enhanceNodes(
      [
        {
          id: 'cluster-1',
          tag: 'circle',
          attributes: { cx: '10', cy: '10', r: '4' },
        },
        {
          id: 'playback-control',
          tag: 'text',
          attributes: { x: '20', y: '20', text: 'Play' },
        },
      ],
      {
        overlayId: 'annotation-1',
        interactiveNodeIds: ['cluster-1', 'playback-control'],
        expandedNodeIds: ['cluster-1'],
        pressedNodeIds: ['playback-control'],
        describedBy: { 'cluster-1': 'tooltip-1' },
      },
    );

    expect(nodes[0]?.attributes.role).toBe('button');
    expect(nodes[0]?.attributes['aria-expanded']).toBe('true');
    expect(nodes[0]?.attributes['aria-describedby']).toBe('tooltip-1');
    expect(nodes[1]?.attributes['aria-pressed']).toBe('true');
  });

  it('supports keyboard navigation and focus management', () => {
    const manager = new OverlayAccessibilityManager();

    manager.enhanceNodes(
      [
        { id: 'a', tag: 'circle', attributes: { cx: '0', cy: '0', r: '1' } },
        { id: 'b', tag: 'circle', attributes: { cx: '1', cy: '1', r: '1' } },
      ],
      {
        overlayId: 'overlay-1',
        interactiveNodeIds: ['a', 'b'],
      },
    );

    expect(manager.handleKeyboard({ key: 'Tab' })).toBe('a');
    expect(manager.handleKeyboard({ key: 'ArrowRight' })).toBe('b');
    expect(manager.handleKeyboard({ key: 'Enter' })).toBe('b');
    expect(manager.handleKeyboard({ key: 'Escape' })).toBeUndefined();
  });

  it('tracks live region messages', () => {
    const manager = new OverlayAccessibilityManager();

    manager.announce('Overlay shown');

    expect(manager.getLiveRegion()).toBe('Overlay shown');
  });
});
