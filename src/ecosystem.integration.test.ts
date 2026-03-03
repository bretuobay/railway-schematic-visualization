import { describe, expect, it, vi } from 'vitest';

import {
  CoordinateSystemType,
  GraphBuilder,
  JSONParser,
  JSONSerializer,
  SVGRenderer,
} from './index';
import {
  DARK_THEME,
  ThemeManager,
} from '../packages/themes/src';
import { I18nManager } from '../packages/i18n/src';
import { PluginManager } from '../packages/plugins/src';
import { ContextMenuController } from '../packages/context-menu/src';
import { CSVAdapter } from '../packages/adapters-regional/src';
import { BrushingLinkingCoordinatorImpl } from '../packages/brushing-linking/src';
import { SSRRenderer } from '../packages/ssr/src';
import { CanvasRenderer, HybridRenderer } from '../packages/canvas/src';

function buildScreenGraph() {
  return new GraphBuilder()
    .addNode({
      id: 'station-a',
      name: 'Station A',
      type: 'station',
      coordinate: {
        type: CoordinateSystemType.Screen,
        x: 0,
        y: 0,
      },
    })
    .addNode({
      id: 'endpoint-b',
      name: 'Endpoint B',
      type: 'endpoint',
      coordinate: {
        type: CoordinateSystemType.Screen,
        x: 120,
        y: 24,
      },
    })
    .addEdge({
      id: 'edge-a-b',
      source: 'station-a',
      target: 'endpoint-b',
      length: 120,
      geometry: {
        type: 'straight',
      },
    })
    .addLine({
      id: 'line-main',
      name: 'Main Line',
      edges: ['edge-a-b'],
    })
    .build();
}

describe('ecosystem cross-feature integration', () => {
  it('integrates the theme system with the SVG renderer', () => {
    const cssVariables = new Map<string, string>();
    const themeManager = new ThemeManager({
      cssTarget: {
        setProperty(name, value) {
          cssVariables.set(name, value);
        },
      },
    });
    const graph = buildScreenGraph();

    themeManager.setTheme(DARK_THEME.name);

    const svg = new SVGRenderer().render(
      graph,
      themeManager.getCurrentStylingConfiguration(),
    );

    expect(svg).toContain(DARK_THEME.colors.track.main);
    expect(cssVariables.get('--rail-colors-track-main')).toBe(DARK_THEME.colors.track.main);
  });

  it('integrates i18n with UI control labels and RTL direction', () => {
    const i18n = new I18nManager({
      warningHandler: () => {},
    });
    const menu = new ContextMenuController();

    i18n.setLocale('ar-SA');
    menu.registerMenuItem({
      id: 'view-details',
      label: () => i18n.t('contextMenu.viewDetails'),
      shortcut: i18n.t('shortcuts.openContextMenu', {
        shortcut: 'Shift+F10',
      }),
    });

    const state = menu.show({
      position: { x: 16, y: 24 },
      viewport: { width: 320, height: 240 },
    });

    expect(state.items[0]?.label).toBe('عرض التفاصيل');
    expect(state.items[0]?.shortcut).toBe('Open context menu (Shift+F10)');
    expect(i18n.getDirections().uiDirection).toBe('rtl');
    expect(i18n.getDirections().schematicDirection).toBe('ltr');
  });

  it('integrates the plugin system with the rendering lifecycle', async () => {
    const graph = buildScreenGraph();
    const renderer = new SVGRenderer();
    const lifecycle = vi.fn<(phase: string) => void>();
    const manager = new PluginManager<SVGRenderer, { zoom: number }, string>({
      graph: graph as never,
      renderer,
    });

    await manager.registerPlugin('trace-plugin', {
      initialize(context) {
        lifecycle(`initialize:${context.graph.nodes.size}`);
      },
      beforeRender(context) {
        lifecycle(`before:${context.viewport.zoom}:${context.svgRoot.startsWith('<svg')}`);
      },
      afterRender(context) {
        lifecycle(`after:${context.renderer === renderer}`);
      },
    });

    const svg = renderer.render(graph);
    await manager.beforeRender({ zoom: 2 }, svg);
    await manager.afterRender({ zoom: 2 }, svg);

    expect(lifecycle.mock.calls.flat()).toEqual([
      'initialize:2',
      'before:2:true',
      'after:true',
    ]);
  });

  it('integrates the context menu with event handling', async () => {
    const selections: string[] = [];
    const actions: string[] = [];
    const menu = new ContextMenuController<{ id: string; type: string }>();

    menu.onSelect((event) => {
      selections.push(`${event.item.id}:${event.source}`);
    });
    menu.registerMenuItem({
      id: 'zoom-to-element',
      label: 'Zoom to element',
      action(context) {
        actions.push(context.target?.id ?? 'missing');
      },
    });

    menu.show({
      position: { x: 12, y: 18 },
      target: { id: 'station-a', type: 'station' },
      viewport: { width: 400, height: 300 },
    });

    const handled = await menu.handleKeyDown('Enter');

    expect(handled).toBe(true);
    expect(actions).toEqual(['station-a']);
    expect(selections).toEqual(['zoom-to-element:keyboard']);
    expect(menu.isVisible()).toBe(false);
  });

  it('integrates regional adapters with the core JSON parser round-trip', () => {
    const csvResult = new CSVAdapter().parse([
      'Line ID,Start Mileage,End Mileage,Station Name',
      'MLN1,0,12,Alpha Junction',
    ].join('\n'));
    const serialized = new JSONSerializer().serialize(csvResult.graph as never);
    const parsed = new JSONParser().parse(serialized);

    expect(csvResult.rowCount).toBe(1);
    expect(parsed.ok).toBe(true);

    if (!parsed.ok) {
      throw parsed.error;
    }

    expect(parsed.value.nodes.size).toBe(csvResult.graph.nodes.size);
    expect(parsed.value.lines.size).toBe(csvResult.graph.lines.size);
  });

  it('integrates brushing and linking across multiple renderer instances', async () => {
    const graph = buildScreenGraph();
    const svgRenderer = new SVGRenderer();
    const canvasRenderer = new CanvasRenderer();
    const coordinator = new BrushingLinkingCoordinatorImpl<{ zoom: number }>({
      transforms: {
        screenToGeographic(coordinate) {
          return {
            type: CoordinateSystemType.Geographic,
            latitude: 51.5 + (coordinate.y / 10_000),
            longitude: -0.12 + (coordinate.x / 10_000),
          };
        },
        screenToLinear(coordinate) {
          return {
            type: CoordinateSystemType.Linear,
            direction: 'up',
            distance: coordinate.x,
            trackId: 'line-main',
          };
        },
      },
    });
    const svgSelections: string[][] = [];
    const canvasSelections: string[][] = [];
    const viewportUpdates: string[] = [];

    coordinator.registerView({
      id: 'svg-view',
      getCoordinateSystem: () => CoordinateSystemType.Screen,
      onSelectionChange(event) {
        svgSelections.push([...event.state.elementIds]);
        svgRenderer.render(graph);
      },
      onViewportChange(event) {
        viewportUpdates.push(`svg:${event.state.viewport.zoom}`);
      },
    });
    coordinator.registerView({
      id: 'canvas-view',
      getCoordinateSystem: () => CoordinateSystemType.Screen,
      onSelectionChange(event) {
        canvasSelections.push([...event.state.elementIds]);
        canvasRenderer.render(graph as never);
      },
      onViewportChange(event) {
        viewportUpdates.push(`canvas:${event.state.viewport.zoom}`);
      },
    });

    const selection = await coordinator.selectElements(
      {
        elements: [
          {
            id: 'station-a',
            coordinate: {
              type: CoordinateSystemType.Screen,
              x: 0,
              y: 0,
            },
          },
        ],
      },
      'svg-view',
    );
    const viewport = await coordinator.syncViewport(
      {
        coordinateSystem: CoordinateSystemType.Screen,
        center: {
          type: CoordinateSystemType.Screen,
          x: 60,
          y: 12,
        },
        viewport: { zoom: 3 },
      },
      'canvas-view',
    );

    expect(selection.elementIds).toEqual(['station-a']);
    expect(svgSelections).toEqual([]);
    expect(canvasSelections).toEqual([['station-a']]);
    expect(canvasRenderer.getLastSnapshot()?.nodeCount).toBeGreaterThan(0);
    expect(viewport.coordinateSystem).toBe(CoordinateSystemType.Screen);
    expect(viewportUpdates).toEqual(['svg:3']);
  });

  it('integrates SSR rendering for Node and headless DOM environments', () => {
    const graph = buildScreenGraph();
    const nodeRenderer = new SSRRenderer();
    const headlessRenderer = new SSRRenderer({
      environment: {
        headlessDocument: {
          createElement() {
            return {};
          },
        },
      },
    });

    const nodeEnvironment = nodeRenderer.getEnvironment();
    const headlessEnvironment = headlessRenderer.getEnvironment();
    const svg = headlessRenderer.render(graph as never, {
      title: 'SSR Preview',
      description: 'Server-rendered schematic',
    });

    expect(nodeEnvironment.isNode).toBe(true);
    expect(nodeEnvironment.domImplementation).toBe('none');
    expect(nodeEnvironment.warnings).toContain(
      'No DOM implementation detected. Falling back to string-based SVG serialization.',
    );
    expect(headlessEnvironment.domImplementation).toBe('headless');
    expect(svg).toContain('data-ssr="true"');
    expect(svg).toContain('<title>SSR Preview</title>');
    expect(svg).toContain('<desc>Server-rendered schematic</desc>');
  });

  it('integrates canvas rendering with the SVG renderer export path', () => {
    const graph = buildScreenGraph();
    const svgRenderer = new SVGRenderer();
    const canvasRenderer = new CanvasRenderer();
    const hybridRenderer = new HybridRenderer();

    const snapshot = canvasRenderer.render(graph as never);
    const canvasSvg = canvasRenderer.exportAsSVG();
    const svg = svgRenderer.render(graph);
    const hybridResult = hybridRenderer.render(graph as never, {
      denseLayerThreshold: 1,
      heatmapPoints: [
        {
          id: 'usage-hotspot',
          x: 42,
          y: 12,
          value: 0.85,
        },
      ],
    });

    expect(snapshot.edgeCount).toBe(1);
    expect(canvasSvg).toBe(svg);
    expect(hybridResult.usedCanvasForDenseLayers).toBe(true);
    expect(hybridResult.svgLayer).toBe(svg);
    expect(hybridRenderer.exportCanvasAsPNG()).toContain('data:image/png;base64,');
    expect(hybridRenderer.exportSVG()).toBe(svg);
  });
});
