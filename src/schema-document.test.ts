import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('json schema document', () => {
  it('publishes a versioned JSON schema document for the topology format', () => {
    const schema = JSON.parse(
      readFileSync(resolve(process.cwd(), 'schemas/rail-schematic-json-schema.v0.1.0.json'), 'utf8'),
    ) as {
      $id?: string;
      required?: string[];
      properties?: Record<string, unknown>;
      $defs?: Record<string, unknown>;
    };
    const packageJson = readFileSync(resolve(process.cwd(), 'package.json'), 'utf8');

    expect(schema.$id).toBe('https://rail-schematic-viz.dev/schemas/rail-schematic-json-schema.v0.1.0.json');
    expect(schema.required).toEqual(['nodes', 'edges', 'lines']);
    expect(schema.properties).toHaveProperty('nodes');
    expect(schema.properties).toHaveProperty('edges');
    expect(schema.properties).toHaveProperty('lines');
    expect(schema.$defs).toHaveProperty('coordinate');
    expect(schema.$defs).toHaveProperty('edgeGeometry');
    expect(packageJson).toContain('"./schema": "./schemas/rail-schematic-json-schema.v0.1.0.json"');
    expect(packageJson).toContain('"schemas"');
  });
});
