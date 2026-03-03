import { EventManager, TouchGestures, ViewportController } from '@rail-schematic-viz/layout';

declare const rootElement: HTMLElement;
declare const svgElement: SVGSVGElement;

const events = new EventManager(rootElement);
const viewport = new ViewportController(svgElement);

const gestures = new TouchGestures({
  root: rootElement,
  eventManager: events,
  viewportController: viewport,
});

void gestures.handleTouchStart({
  changedTouches: [
    { identifier: 1, clientX: 0, clientY: 0 },
    { identifier: 2, clientX: 20, clientY: 0 },
  ],
});
