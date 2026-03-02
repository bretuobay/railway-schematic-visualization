import { Minimap, ViewportController } from '@rail-schematic-viz/layout';

declare const container: HTMLElement;
declare const svgElement: SVGSVGElement;
declare const positionedGraph: Parameters<typeof Minimap>[1];

const viewport = new ViewportController(svgElement, {
  minScale: 0.5,
  maxScale: 6,
});

const minimap = new Minimap(container, positionedGraph, viewport, {
  width: 200,
  height: 140,
  corner: 'bottom-right',
});

void minimap.handleClick({
  clientX: 50,
  clientY: 50,
});
