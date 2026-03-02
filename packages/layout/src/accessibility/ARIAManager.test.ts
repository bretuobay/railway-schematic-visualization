import { describe, expect, it } from 'vitest';

import { ARIAManager } from './ARIAManager';
import { MockAccessibleElement } from './accessibility.test-helpers';

describe('ARIAManager', () => {
  it('assigns ARIA role, label, and description', () => {
    const manager = new ARIAManager();
    const element = new MockAccessibleElement();

    manager.setRole(element, 'button');
    manager.setLabel(element, 'Zoom in');
    manager.setDescription(element, 'Increase the current zoom level');

    expect(element.getAttribute('role')).toBe('button');
    expect(element.getAttribute('aria-label')).toBe('Zoom in');
    expect(element.getAttribute('aria-description')).toBe('Increase the current zoom level');
  });

  it('announces selection changes and zoom updates through the polite region', () => {
    const manager = new ARIAManager();

    manager.announceSelectionChange(['alpha', 'beta']);
    expect(manager.getLiveRegion('polite').message).toBe('Selected 2 elements');

    manager.announceZoomLevel(1.25);
    expect(manager.getLiveRegion('polite').message).toBe('Zoom level 125%');
  });

  it('supports custom live-region message builders', () => {
    const manager = new ARIAManager({
      selectionMessageBuilder: (selection) => `Now tracking ${selection.join(', ')}`,
      zoomMessageBuilder: (scale) => `Scale changed to ${scale.toFixed(2)}`,
    });

    manager.announceSelectionChange(['node-1']);
    expect(manager.getLiveRegion('polite').message).toBe('Now tracking node-1');

    manager.announceZoomLevel(2);
    expect(manager.getLiveRegion('polite').message).toBe('Scale changed to 2.00');
  });
});
