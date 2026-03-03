import { describe, expect, it } from 'vitest';

import * as root from './index';
import * as builder from './builder';
import * as coordinates from './coordinates';
import * as errors from './errors';
import * as parsers from './parsers';
import * as renderer from './renderer';

describe('package exports', () => {
  it('exports the main entry point surface', () => {
    expect(root.RailGraph).toBeDefined();
    expect(root.GraphBuilder).toBeDefined();
    expect(root.CoordinateBridge).toBeDefined();
    expect(root.SVGRenderer).toBeDefined();
    expect(root.JSONParser).toBeDefined();
    expect(root.JSONSerializer).toBeDefined();
    expect(root.RailMLParser).toBeDefined();
    expect(root.RailMLSerializer).toBeDefined();
    expect(root.ParseError).toBeDefined();
    expect(root.RailSchematicCLI).toBeDefined();
    expect(root.runCLI).toBeDefined();
    expect(root.createDebugLogger).toBeDefined();
  });

  it('exports all public submodules', () => {
    expect(builder.GraphBuilder).toBeDefined();
    expect(coordinates.CoordinateBridge).toBeDefined();
    expect(coordinates.projectWebMercator).toBeDefined();
    expect(errors.BuildError).toBeDefined();
    expect(parsers.JSONSerializer).toBeDefined();
    expect(parsers.RailMLParser).toBeDefined();
    expect(parsers.RailMLSerializer).toBeDefined();
    expect(renderer.SVGRenderer).toBeDefined();
    expect(renderer.DEFAULT_STYLING).toBeDefined();
  });
});
