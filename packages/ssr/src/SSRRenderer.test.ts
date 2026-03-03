import { CoordinateSystemType, GraphBuilder } from '@rail-schematic-viz/core';

import {
  SSR_FRAMEWORK_EXAMPLES,
  SSRRenderer,
  detectSSREnvironment,
  headlessExport,
  setupSSREnvironment,
} from './index';

function createScreenGraph() {
  const builder = new GraphBuilder();

  builder.addNode({
    coordinate: {
      type: CoordinateSystemType.Screen,
      x: 0,
      y: 0,
    },
    id: 'a',
    name: 'A',
    type: 'station',
  });
  builder.addNode({
    coordinate: {
      type: CoordinateSystemType.Screen,
      x: 100,
      y: 0,
    },
    id: 'b',
    name: 'B',
    type: 'station',
  });
  builder.addEdge({
    geometry: {
      type: 'straight',
    },
    id: 'edge-1',
    length: 100,
    source: 'a',
    target: 'b',
  });
  builder.addLine({
    edges: ['edge-1'],
    id: 'line-1',
    name: 'Line 1',
  });

  return builder.build();
}

function createLinearGraph() {
  const builder = new GraphBuilder();

  builder.addNode({
    coordinate: {
      distance: 0,
      trackId: 'track-1',
      type: CoordinateSystemType.Linear,
    },
    id: 'a',
    name: 'A',
    type: 'station',
  });
  builder.addNode({
    coordinate: {
      distance: 100,
      trackId: 'track-1',
      type: CoordinateSystemType.Linear,
    },
    id: 'b',
    name: 'B',
    type: 'station',
  });
  builder.addEdge({
    geometry: {
      type: 'straight',
    },
    id: 'edge-1',
    length: 100,
    source: 'a',
    target: 'b',
  });
  builder.addLine({
    edges: ['edge-1'],
    id: 'line-1',
    name: 'Line 1',
  });

  return builder.build();
}

describe('SSRRenderer', () => {
  it('detects a Node SSR environment and reports the string fallback clearly', () => {
    const environment = detectSSREnvironment();

    expect(environment.isNode).toBe(true);
    expect(environment.nodeVersion).toBeDefined();
    expect(environment.domImplementation).toBe('none');
    expect(environment.supportsDOM).toBe(false);
    expect(environment.warnings).toContain(
      'No DOM implementation detected. Falling back to string-based SVG serialization.',
    );
    expect(setupSSREnvironment()).toEqual(environment);
  });

  it('renders decorated SVG markup for SSR consumers', () => {
    const renderer = new SSRRenderer();
    const svg = renderer.render(createScreenGraph(), {
      className: 'print-ready',
      description: 'A server rendered schematic',
      height: 480,
      layoutMode: 'fit',
      metadata: {
        locale: 'en-US',
      },
      overlayMarkup: ['<g id="overlay-layer"></g>'],
      title: 'SSR Example',
      width: 640,
    });

    expect(svg).toContain('data-ssr="true"');
    expect(svg).toContain('data-dom-implementation="none"');
    expect(svg).toContain('class="rail-schematic print-ready"');
    expect(svg).toContain('width="640"');
    expect(svg).toContain('height="480"');
    expect(svg).toContain('data-layout-mode="fit"');
    expect(svg).toContain('<title>SSR Example</title>');
    expect(svg).toContain('<desc>A server rendered schematic</desc>');
    expect(svg).toContain('<metadata>{"locale":"en-US"}</metadata>');
    expect(svg).toContain('<g id="overlay-layer"></g>');
  });

  it('exposes environment info from the renderer instance', () => {
    const renderer = new SSRRenderer();
    const environment = renderer.getEnvironment();

    expect(environment.isNode).toBe(true);
    expect(environment.warnings.length).toBeGreaterThan(0);
  });

  it('returns mixed success and failure results from headless batch export', async () => {
    const result = await headlessExport([
      {
        graph: createScreenGraph(),
        id: 'valid',
      },
      {
        graph: createLinearGraph(),
        id: 'invalid',
      },
    ]);

    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(1);
    expect(result.results[0]).toEqual(
      expect.objectContaining({
        id: 'valid',
        ok: true,
        svg: expect.stringContaining('<svg'),
      }),
    );
    expect(result.results[1]).toEqual(
      expect.objectContaining({
        error: expect.stringContaining('SSR rendering failed'),
        id: 'invalid',
        ok: false,
      }),
    );
  });

  it('supports instance-level headless export and documents framework examples', async () => {
    const renderer = new SSRRenderer();
    const result = await renderer.headlessExport([
      {
        graph: createScreenGraph(),
        options: {
          title: 'Batch export',
        },
      },
    ]);

    expect(result.successCount).toBe(1);
    expect(result.results[0]?.svg).toContain('<title>Batch export</title>');
    expect(SSR_FRAMEWORK_EXAMPLES.nextjs).toContain('Next.js');
    expect(SSR_FRAMEWORK_EXAMPLES.nuxt).toContain('Nuxt');
  });
});
