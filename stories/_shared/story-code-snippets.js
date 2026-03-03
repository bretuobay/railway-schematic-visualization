export const minimalCoreSnippet = `import { CoordinateSystemType, GraphBuilder, SVGRenderer } from '@rail-schematic-viz/core';

const graph = new GraphBuilder()
  .addNode({ id: 'west', name: 'West Junction', type: 'station', coordinate: { type: CoordinateSystemType.Screen, x: 64, y: 160 } })
  .addNode({ id: 'east', name: 'East Junction', type: 'station', coordinate: { type: CoordinateSystemType.Screen, x: 640, y: 160 } })
  .addEdge({ id: 'main', source: 'west', target: 'east', length: 576, geometry: { type: 'straight' } })
  .build();

const svg = new SVGRenderer().render(graph);`;

export const reactAdapterSnippet = `import { RailSchematic } from '@rail-schematic-viz/react';
import type { RailGraph } from '@rail-schematic-viz/core';

export function OperationsView({ graph }: { graph: RailGraph }) {
  return (
    <RailSchematic
      data={graph}
      onSelectionChange={handleSelection}
    />
  );
}`;

export const vueAdapterSnippet = `import { defineComponent } from 'vue';
import { RailSchematicVue } from '@rail-schematic-viz/vue';

export default defineComponent({
  components: { RailSchematicVue },
  props: { graph: { type: Object, required: true } },
  template:
    '<RailSchematicVue :data="graph" @selection-change="handleSelection" />',
});`;

export const webComponentSnippet = `import '@rail-schematic-viz/web-component';

const element =
  document.querySelector('rail-schematic-viz');
element.data = graph;
element.addEventListener(
  'rail-selection-change',
  handleSelection,
);`;

export const exportWorkflowSnippet = `await api.exportSVG({ includeOverlays: true });
await api.exportPNG({ format: 'image/png', scale: 2 });
await api.printPreview({ pageSize: 'A4', orientation: 'landscape' });`;

export const themeI18nSnippet = `import { ThemeManager } from '@rail-schematic-viz/themes';
import { I18nManager } from '@rail-schematic-viz/i18n';

const theme = new ThemeManager({ initialTheme: 'high-contrast' });
const i18n = new I18nManager();
i18n.setLocale('ar-SA');`;
