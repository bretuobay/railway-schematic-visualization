import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { EventManager } from './EventManager';
import {
  MockInteractionElement,
  MockInteractionRoot,
} from './EventManager.test-helpers';

describe('EventManager properties', () => {
  it('emits complete click event data for delegated element clicks', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 12 }),
        fc.constantFrom('station', 'track', 'signal', 'overlay'),
        fc.integer({ min: -500, max: 500 }),
        fc.integer({ min: -500, max: 500 }),
        fc.dictionary(
          fc.string({ minLength: 1, maxLength: 6 }),
          fc.string({ minLength: 0, maxLength: 10 }),
          { maxKeys: 4 },
        ),
        (elementId, elementType, x, y, properties) => {
          const root = new MockInteractionRoot();
          const manager = new EventManager(root);
          const received: Array<unknown> = [];
          const element = new MockInteractionElement({
            elementId,
            elementType,
            elementProps: JSON.stringify(properties),
          });

          manager.on('element-click', (payload) => {
            received.push(payload);
          });

          root.dispatch('click', {
            target: element,
            clientX: x,
            clientY: y,
          });

          expect(received).toHaveLength(1);
          expect(received[0]).toEqual(
            expect.objectContaining({
              event: 'element-click',
              element: {
                id: elementId,
                type: elementType,
                properties,
                isOverlay: false,
              },
              coordinates: { x, y },
              originalEvent: expect.objectContaining({
                clientX: x,
                clientY: y,
              }),
            }),
          );
        },
      ),
    );
  });

  it('propagates overlay events to the overlay element and underlying track element', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 12 }),
        fc.string({ minLength: 1, maxLength: 12 }),
        fc.constantFrom('track', 'line', 'segment'),
        (overlayId, underlyingId, underlyingType) => {
          const root = new MockInteractionRoot();
          const manager = new EventManager(root);
          const received: Array<string> = [];
          const overlay = new MockInteractionElement({
            elementId: overlayId,
            elementType: 'overlay',
            overlayFor: underlyingId,
            underlyingType,
          });

          manager.on('element-click', (payload) => {
            received.push(`${payload.element?.id}:${payload.element?.type}`);
          });

          root.dispatch('click', {
            target: overlay,
            clientX: 0,
            clientY: 0,
          });

          expect(received).toEqual([
            `${overlayId}:overlay`,
            `${underlyingId}:${underlyingType}`,
          ]);
        },
      ),
    );
  });
});
