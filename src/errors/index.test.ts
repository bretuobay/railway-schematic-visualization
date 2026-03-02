import { describe, expect, it } from 'vitest';

import {
  BuildError,
  ERROR_CODES,
  ParseError,
  ProjectionError,
  RailSchematicError,
  ValidationError,
} from './index';

describe('RailSchematicError hierarchy', () => {
  it('constructs errors with code and context', () => {
    const error = new ParseError('Invalid XML document.', {
      column: 12,
      fieldPath: 'infrastructure.netElements[0]',
      line: 7,
      source: 'railml.xml',
    });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(RailSchematicError);
    expect(error.code).toBe(ERROR_CODES.PARSE_ERROR);
    expect(error.context).toEqual({
      column: 12,
      fieldPath: 'infrastructure.netElements[0]',
      line: 7,
      source: 'railml.xml',
    });
  });

  it('exposes distinct error codes for each category', () => {
    expect(new ParseError('parse').code).toBe(ERROR_CODES.PARSE_ERROR);
    expect(new ValidationError('validation').code).toBe(ERROR_CODES.VALIDATION_ERROR);
    expect(new ProjectionError('projection').code).toBe(ERROR_CODES.PROJECTION_ERROR);
    expect(new BuildError('build').code).toBe(ERROR_CODES.BUILD_ERROR);
  });

  it('formats messages without dropping the base message', () => {
    const error = new ProjectionError('Coordinate 5400 exceeds track range.', {
      source: 'track-42',
    });

    expect(error.message).toContain('Coordinate 5400 exceeds track range.');
    expect(error.toString()).toContain(ERROR_CODES.PROJECTION_ERROR);
    expect(error.toString()).toContain('Coordinate 5400 exceeds track range.');
  });
});
