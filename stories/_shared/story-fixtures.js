import { GraphBuilder } from '../../src/builder/index.ts';
import { CoordinateSystemType } from '../../src/coordinates/index.ts';

export const stationNodes = [
  { id: 'west', label: 'West Junction', type: 'endpoint', x: 60, y: 170 },
  { id: 'central', label: 'Central', type: 'station', x: 190, y: 170 },
  { id: 'harbor', label: 'Harbor Exchange', type: 'junction', x: 340, y: 170 },
  { id: 'midtown', label: 'Midtown', type: 'station', x: 500, y: 170 },
  { id: 'east', label: 'East Terminal', type: 'endpoint', x: 690, y: 170 },
  { id: 'branchNorth', label: 'Airport Spur', type: 'station', x: 500, y: 74 },
  { id: 'northEnd', label: 'North Depot', type: 'endpoint', x: 660, y: 74 },
  { id: 'yardSignal', label: 'Maintenance Yard', type: 'signal', x: 500, y: 272 },
  { id: 'yardEnd', label: 'Freight Apron', type: 'endpoint', x: 660, y: 272 },
];

export const trackEdges = [
  { id: 'west-central', source: 'west', target: 'central', geometry: { type: 'straight' } },
  { id: 'central-harbor', source: 'central', target: 'harbor', geometry: { type: 'straight' } },
  { id: 'harbor-midtown', source: 'harbor', target: 'midtown', geometry: { type: 'straight' } },
  { id: 'midtown-east', source: 'midtown', target: 'east', geometry: { type: 'straight' } },
  { id: 'harbor-branch', source: 'harbor', target: 'branchNorth', geometry: { type: 'curve', curvature: -0.35 } },
  { id: 'branch-north-end', source: 'branchNorth', target: 'northEnd', geometry: { type: 'straight' } },
  { id: 'harbor-yard', source: 'harbor', target: 'yardSignal', geometry: { type: 'switch', orientation: 32, switchType: 'right_turnout' } },
  { id: 'yard-end', source: 'yardSignal', target: 'yardEnd', geometry: { type: 'straight' } },
];

export const lineDefinitions = [
  { id: 'main-line', name: 'Main Line', color: '#2563eb', edges: ['west-central', 'central-harbor', 'harbor-midtown', 'midtown-east'] },
  { id: 'airport-spur', name: 'Airport Spur', color: '#059669', edges: ['harbor-branch', 'branch-north-end'] },
  { id: 'freight-yard', name: 'Freight Yard', color: '#b45309', edges: ['harbor-yard', 'yard-end'] },
];

export const overlayMarkers = [
  { id: 'incident', label: 'Signal fault', x: 500, y: 138, tone: 'danger' },
  { id: 'maintenance', label: 'Night works', x: 500, y: 236, tone: 'warning' },
  { id: 'restriction', label: '40 mph cap', x: 660, y: 42, tone: 'info' },
];

export const operationalMetrics = [
  { label: 'Routes Monitored', value: '3', delta: 'All corridors live', tone: 'neutral' },
  { label: 'Open Alerts', value: '2', delta: '1 critical, 1 planned', tone: 'caution' },
  { label: 'Exports Ready', value: '3', delta: 'SVG, PNG, Print', tone: 'success' },
];

export const adapterEvents = [
  'selection-change · station:harbor',
  'viewport-change · zoom: 1.25x',
  'overlay-click · maintenance',
  'export-complete · png',
];

export const runtimeBadges = [
  'SSR ready',
  'Canvas hybrid',
  'Secure export',
  'A11y checked',
];

export const regionalSources = [
  { label: 'CSV', detail: 'Asset inventory import', count: '18 rows' },
  { label: 'GeoJSON', detail: 'Survey corridor', count: '7 features' },
  { label: 'ELR', detail: 'UK mileage mapping', count: '4 segments' },
  { label: 'RINF', detail: 'Infrastructure sections', count: '6 sections' },
];

export const pluginSlots = [
  { name: 'OccupancyPlugin', state: 'healthy' },
  { name: 'IncidentDeskPlugin', state: 'warning' },
  { name: 'RegionalImportPlugin', state: 'healthy' },
];

export const contextMenuActions = [
  'View details',
  'Select connected',
  'Export selection',
  'Zoom to element',
];

export const exportArtifacts = [
  { label: 'SVG', detail: 'Vector schematic with overlays', size: '42 KB' },
  { label: 'PNG', detail: 'Retina export @2x', size: '128 KB' },
  { label: 'Print', detail: 'Landscape A4 preview', size: '1 page' },
];

export const themePresets = [
  { name: 'default', label: 'Default' },
  { name: 'high-contrast', label: 'High Contrast' },
  { name: 'dark', label: 'Dark' },
];

export const localePresets = [
  { locale: 'en-US', label: 'English (US)' },
  { locale: 'fr-FR', label: 'Français' },
  { locale: 'ar-SA', label: 'العربية' },
];

export function createStoryGraph() {
  const builder = new GraphBuilder();

  for (const node of stationNodes) {
    builder.addNode({
      coordinate: {
        type: CoordinateSystemType.Screen,
        x: node.x,
        y: node.y,
      },
      id: node.id,
      metadata: {
        role: node.type,
      },
      name: node.label,
      type: node.type,
    });
  }

  for (const edge of trackEdges) {
    const source = stationNodes.find((node) => node.id === edge.source);
    const target = stationNodes.find((node) => node.id === edge.target);
    const dx = (target?.x ?? 0) - (source?.x ?? 0);
    const dy = (target?.y ?? 0) - (source?.y ?? 0);

    builder.addEdge({
      geometry: edge.geometry,
      id: edge.id,
      length: Math.round(Math.hypot(dx, dy)),
      source: edge.source,
      target: edge.target,
    });
  }

  for (const line of lineDefinitions) {
    builder.addLine(line);
  }

  return builder.build();
}
