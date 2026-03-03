import { describe, expect, it } from 'vitest';

import {
  ConfigurationError,
  InteractionError,
  LayoutError,
  LayoutInteractionError,
  ViewportError,
  configurationErrorCodes,
  interactionErrorCodes,
  layoutErrorCodes,
  viewportErrorCodes,
} from './LayoutInteractionError';

describe('LayoutInteractionError hierarchy', () => {
  it('constructs the base error with a formatted message', () => {
    const error = new LayoutInteractionError('Something failed', 'TEST_CODE');

    expect(error.name).toBe('LayoutInteractionError');
    expect(error.code).toBe('TEST_CODE');
    expect(error.message).toBe('TEST_CODE: Something failed');
  });

  it('constructs layout errors with context', () => {
    const error = new LayoutError('Overlapping nodes', 'LAYOUT_OVERLAP', {
      nodeIds: ['alpha', 'beta'],
    });

    expect(error.name).toBe('LayoutError');
    expect(error.code).toBe('LAYOUT_OVERLAP');
    expect(error.context).toEqual({
      nodeIds: ['alpha', 'beta'],
    });
  });

  it('constructs viewport errors with transform state', () => {
    const error = new ViewportError('Scale out of range', 'VIEWPORT_SCALE', {
      scale: 99,
    });

    expect(error.name).toBe('ViewportError');
    expect(error.transform).toEqual({
      scale: 99,
    });
  });

  it('constructs interaction and configuration errors with extra context', () => {
    const interaction = new InteractionError('Missing target', 'INTERACTION_TARGET', 'node-1');
    const configuration = new ConfigurationError('Invalid width', 'CONFIG_INVALID', 'width', -1);

    expect(interaction.elementId).toBe('node-1');
    expect(configuration.field).toBe('width');
    expect(configuration.value).toBe(-1);
  });

  it('exports all error codes', () => {
    expect(layoutErrorCodes).toContain('LAYOUT_OVERLAP');
    expect(viewportErrorCodes).toContain('VIEWPORT_SCALE');
    expect(interactionErrorCodes).toContain('INTERACTION_SELECTION');
    expect(configurationErrorCodes).toContain('CONFIG_REQUIRED');
  });
});
