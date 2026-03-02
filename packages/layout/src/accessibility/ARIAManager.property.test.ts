import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { ARIAManager } from './ARIAManager';
import { MockAccessibleElement } from './accessibility.test-helpers';

describe('ARIAManager properties', () => {
  it('assigns complete ARIA attributes to interactive elements', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 40 }),
        async (role, label, description) => {
          const manager = new ARIAManager();
          const element = new MockAccessibleElement();

          manager.setRole(element, role);
          manager.setLabel(element, label);
          manager.setDescription(element, description);

          expect(element.getAttribute('role')).toBe(role);
          expect(element.getAttribute('aria-label')).toBe(label);
          expect(element.getAttribute('aria-description')).toBe(description);
        },
      ),
    );
  });

  it('stores announcements in the correct live region', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.constantFrom<'polite' | 'assertive'>('polite', 'assertive'),
        async (message, priority) => {
          const manager = new ARIAManager();

          manager.announce(message, priority);

          expect(manager.getLiveRegion(priority).message).toBe(message);
        },
      ),
    );
  });
});
