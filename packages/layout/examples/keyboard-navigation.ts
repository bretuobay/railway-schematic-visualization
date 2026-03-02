import {
  EventManager,
  KeyboardNavigation,
  KeyboardShortcuts,
  SelectionEngine,
} from '@rail-schematic-viz/layout';

declare const rootElement: HTMLElement;

const events = new EventManager(rootElement);
const selection = new SelectionEngine({ eventManager: events });
const navigation = new KeyboardNavigation({ root: rootElement });
const shortcuts = new KeyboardShortcuts({ root: rootElement });

selection.clearSelection();
navigation.destroy();
shortcuts.destroy();
events.destroy();
