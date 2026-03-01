# Design Document: Rail Schematic Viz

## Overview

Rail Schematic Viz is an open-source TypeScript library that renders interactive railway schematic diagrams in web browsers. The library treats railway schematics as a topology-driven rendering engine, using railML® 3's screenPositioningSystem as the primary coordinate space for human-readable presentation.

### Purpose

The library fills the gap between full GIS tooling and simplistic diagram libraries by providing:
- Accurate railway topology modeling using directed multigraphs
- Linear referencing support (kilometre-posts) for operational data overlay
- Standards compliance with railML® 3 and RailTopoModel®
- Framework-agnostic core with adapters for React, Vue, and Web Components

### Key Capabilities

- Parse railML® 3 XML, JSON, or use programmatic builder API
- Render interactive SVG/Canvas schematics with pan, zoom, and semantic zoom
- Support multiple layout modes: proportional, compressed, fixed-segment, metro-map
- Overlay system for heat-maps, annotations, range bands, traffic flow, and time-series
- Export to SVG, PNG, and print-ready formats
- Accessibility compliant (WCAG 2.1 AA)
- Performance optimized for networks up to 5000 netElements at 60fps

### Design Philosophy

1. **Topology-First**: Railway networks are directed multigraphs with typed nodes and edges
2. **Coordinate System Separation**: Three independent positioning systems (screen, linear, geographic)
3. **Composable Overlays**: Data layers are independent, stackable, and extensible
4. **Framework Agnostic**: Core library is pure TypeScript + D3, with optional framework adapters
5. **Standards Compliant**: Native support for railML® 3, RailTopoModel®, and regional standards (UK ELR, EU RINF)


## Architecture

### Package Structure

The library is organized as a monorepo with separate npm packages:

```
@rail-schematic-viz/
├── core                 # Graph model, renderer, overlay system, coordinate bridge
├── layout               # Layout engine (proportional, compressed, metro-map, auto)
├── parser-railml        # railML® 3 XML parser and validator
├── react                # React component wrapper
├── vue                  # Vue 3 component wrapper
├── web-component        # Custom element wrapper
└── themes               # Default, high-contrast, and color-blind safe themes
```

### Modular Design Rationale

- **Separation of Concerns**: Parsing, layout, rendering, and framework adapters are independent
- **Tree-Shaking**: Consumers import only what they need
- **Extensibility**: Custom layout engines or parsers can replace built-in implementations
- **Bundle Size**: Core package < 80KB gzipped, framework adapters are optional

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Data Input Layer                         │
│  railML® 3 XML │ JSON Schema │ Builder API │ Custom Adapters │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    RailGraph Model                           │
│  Typed directed multigraph with nodes, edges, lines          │
│  Three coordinate systems: screen, linear, geographic        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Layout Engine                             │
│  Proportional │ Compressed │ Fixed │ Metro-map │ Auto        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Renderer (D3 + SVG/Canvas)                │
│  Base layer: tracks, stations, signals, switches             │
│  Overlay layers: heat-maps, annotations, traffic, time       │
│  Interaction: click, hover, keyboard, selection              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                Framework Adapters (Optional)                 │
│         React │ Vue │ Web Components │ Angular               │
└─────────────────────────────────────────────────────────────┘
```

### Rendering Pipeline

1. **Parse**: Convert input data (XML/JSON/Builder) → RailGraph
2. **Validate**: Check topology constraints, screen coordinates presence
3. **Layout**: Apply selected layout mode, compute missing coordinates
4. **Render Base**: Draw tracks, stations, signals, switches using D3
5. **Render Overlays**: Stack overlay layers in z-order
6. **Optimize**: Apply viewport culling, semantic zoom, label collision detection
7. **Attach Events**: Wire up click, hover, keyboard, selection handlers

### Coordinate System Architecture

The library manages three independent positioning systems:

1. **screenPositioningSystem** (Primary)
   - 2D Cartesian (x, y) coordinates for schematic rendering
   - No geographic meaning, optimized for human readability
   - All visual layout uses this system

2. **linearPositioningSystem** (Secondary)
   - Position along named tracks using distance measures (km-posts)
   - Format: `{ trackId: string, measure: number, direction?: "up" | "down" }`
   - Used to anchor overlay data to track locations

3. **geometricPositioningSystem** (Optional)
   - Geographic coordinates (WGS-84 or EPSG-coded CRS)
   - Used for brushing/linking with GIS views
   - Optional for pure schematic workflows

### CoordinateBridge

The CoordinateBridge component provides bidirectional mapping between coordinate systems:

```typescript
interface CoordinateBridge {
  // Linear → Screen (primary use case for overlays)
  project(linearPos: LinearPosition): ScreenCoordinate;
  
  // Screen → Linear (for click events)
  unproject(screenCoord: ScreenCoordinate): LinearPosition;
  
  // Geographic ↔ Screen (for brushing/linking)
  geoToScreen(geoCoord: GeographicCoordinate): ScreenCoordinate;
  screenToGeo(screenCoord: ScreenCoordinate): GeographicCoordinate;
}
```


## Components and Interfaces

### Core Data Model

```typescript
// Primary graph structure
interface RailGraph {
  nodes: Map<string, RailNode>;
  edges: Map<string, RailEdge>;
  lines: Map<string, RailLine>;
  metadata: GraphMetadata;
}

interface RailNode {
  id: string;
  screenCoord: ScreenCoordinate;        // Primary: { x: number, y: number }
  linearRefs: LinearReference[];        // Secondary: km-post references
  geoCoord?: GeographicCoordinate;      // Optional: WGS-84
  type: "station" | "junction" | "signal" | "buffer" | "generic";
  adjacentEdges: string[];
  properties: Record<string, unknown>;  // Extensible metadata
}

interface RailEdge {
  id: string;
  fromNode: string;
  toNode: string;
  lengthMetres: number;
  lineRef: string;
  infrastructureObjects: InfraObject[]; // Signals, crossings, mileposts
  properties: Record<string, unknown>;
}

interface RailLine {
  id: string;
  name: string;
  color?: string;
  edges: string[];
}

// Coordinate types
interface ScreenCoordinate {
  x: number;
  y: number;
}

interface LinearPosition {
  trackId: string;
  measure: number;                      // Distance from datum in metres
  direction?: "up" | "down";
}

interface GeographicCoordinate {
  latitude: number;
  longitude: number;
  epsgCode?: string;                    // Default: "EPSG:4326" (WGS-84)
}
```

### Parser Interface

```typescript
interface RailGraphParser {
  parse(input: string | object): Promise<RailGraph>;
  validate(input: string | object): ValidationResult;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

// Built-in parsers
class RailML3Parser implements RailGraphParser { }
class JSONSchemaParser implements RailGraphParser { }
class GeoJSONAdapter implements RailGraphParser { }
class CSVAdapter implements RailGraphParser { }
```

### Builder API

```typescript
class RailGraphBuilder {
  addLine(id: string, name?: string): this;
  addStation(id: string, coord: ScreenCoordinate, props?: object): this;
  addJunction(id: string, coord: ScreenCoordinate): this;
  addTrack(id: string, from: string, to: string, length: number): this;
  addSwitch(id: string, mainTrack: string, branchTrack: string, coord: ScreenCoordinate): this;
  addSignal(id: string, trackId: string, measure: number): this;
  build(): RailGraph;
}
```

### Layout Engine Interface

```typescript
interface LayoutEngine {
  compute(graph: RailGraph, mode: LayoutMode, options: LayoutOptions): RailGraph;
}

type LayoutMode = "proportional" | "compressed" | "fixed-segment" | "metro-map" | "auto";

interface LayoutOptions {
  orientation?: "horizontal" | "vertical" | "auto";
  segmentLength?: number;              // For fixed-segment mode
  compressionFactor?: number;          // For compressed mode
  octilinearAngles?: number[];         // For metro-map mode (default: [0, 45, 90])
  forceSimulationParams?: {            // For auto mode
    linkDistance: number;
    chargeStrength: number;
    iterations: number;
  };
}
```

### Renderer Interface

```typescript
interface Renderer {
  render(graph: RailGraph, container: HTMLElement, config: RenderConfig): void;
  update(graph: RailGraph): void;
  destroy(): void;
  
  // Viewport control
  setViewport(dimensions: { width: number, height: number }): void;
  zoom(scale: number, center?: ScreenCoordinate): void;
  pan(delta: { dx: number, dy: number }): void;
  fitToView(): void;
  
  // Export
  exportSVG(): string;
  exportPNG(resolution?: { width: number, height: number }): Promise<string>;
}

interface RenderConfig {
  mode: "svg" | "canvas" | "hybrid";
  viewport: { width: number, height: number, padding: number };
  zoom: { min: number, max: number, initial: number };
  semanticZoom: { lowThreshold: number, highThreshold: number };
  viewportCulling: boolean;
  styles: StyleConfig;
}
```

### Overlay System

```typescript
interface RailOverlay<T = unknown> {
  id: string;
  type: string;
  data: T[];
  zIndex: number;
  visible: boolean;
  opacity: number;
  
  render(canvas: D3Selection, bridge: CoordinateBridge): void;
  update(data: T[]): void;
  destroy(): void;
  
  getLegend(): LegendDescriptor;
}

interface LegendDescriptor {
  title: string;
  items: Array<{ label: string, color: string, symbol?: string }>;
  units?: string;
}

// Built-in overlay types
class HeatMapOverlay implements RailOverlay<HeatMapDataPoint> { }
class AnnotationOverlay implements RailOverlay<Annotation> { }
class RangeBandOverlay implements RailOverlay<RangeBand> { }
class TrafficFlowOverlay implements RailOverlay<TrafficFlow> { }
class TimeSeriesOverlay implements RailOverlay<TimeSeriesData> { }

// Overlay data types
interface HeatMapDataPoint {
  linearPos: LinearPosition;
  value: number;
}

interface Annotation {
  linearPos: LinearPosition;
  label: string;
  icon?: string;
  properties?: Record<string, unknown>;
}

interface RangeBand {
  startPos: LinearPosition;
  endPos: LinearPosition;
  color: string;
  opacity: number;
  label?: string;
}

interface TrafficFlow {
  linearPos: LinearPosition;
  direction: "up" | "down" | "bidirectional";
  frequency: number;
}

interface TimeSeriesData {
  timestamp: number;
  states: Map<string, unknown>;  // Element ID → state value
}
```

### Event System

```typescript
interface EventEmitter {
  on(event: string, handler: EventHandler): void;
  off(event: string, handler: EventHandler): void;
  emit(event: string, data: unknown): void;
}

// Event types
type RailSchematicEvent =
  | { type: "element:click", data: ElementClickEvent }
  | { type: "element:hover", data: ElementHoverEvent }
  | { type: "selection:change", data: SelectionChangeEvent }
  | { type: "viewport:change", data: ViewportChangeEvent }
  | { type: "overlay:toggle", data: OverlayToggleEvent };

interface ElementClickEvent {
  elementId: string;
  elementType: "node" | "edge" | "overlay";
  screenCoord: ScreenCoordinate;
  linearPos?: LinearPosition;
  geoCoord?: GeographicCoordinate;
  properties: Record<string, unknown>;
}
```

### Framework Adapters

```typescript
// React
interface RailSchematicProps {
  graph: RailGraph;
  config?: Partial<RenderConfig>;
  overlays?: RailOverlay[];
  onElementClick?: (event: ElementClickEvent) => void;
  onSelectionChange?: (selection: string[]) => void;
}

function RailSchematic(props: RailSchematicProps): JSX.Element;

// React hooks
function useRailSchematic(graph: RailGraph, config?: RenderConfig): {
  ref: RefObject<HTMLDivElement>;
  addOverlay: (overlay: RailOverlay) => void;
  removeOverlay: (id: string) => void;
  selectElements: (ids: string[]) => void;
  exportSVG: () => string;
};

// Vue
interface RailSchematicVueProps {
  graph: RailGraph;
  config?: Partial<RenderConfig>;
  overlays?: RailOverlay[];
}

// Vue composable
function useRailSchematic(graph: Ref<RailGraph>, config?: RenderConfig): {
  containerRef: Ref<HTMLDivElement>;
  addOverlay: (overlay: RailOverlay) => void;
  removeOverlay: (id: string) => void;
  selectElements: (ids: string[]) => void;
};

// Web Component
class RailSchematicElement extends HTMLElement {
  data: RailGraph;
  config: RenderConfig;
  
  addOverlay(overlay: RailOverlay): void;
  removeOverlay(id: string): void;
  selectElements(ids: string[]): void;
  exportSVG(): string;
}
```


## Data Models

### RailGraph Topology Model

The RailGraph is a typed directed multigraph where:
- **Nodes** represent stations, junctions, signals, and buffer stops
- **Edges** represent track segments connecting nodes
- **Lines** group edges into logical railway lines/routes
- **Multiple edges** can exist between the same pair of nodes (parallel tracks)

#### Topology Constraints

1. All edges must reference valid from/to nodes
2. Node adjacency lists must be consistent with edge definitions
3. Line edge lists must reference valid edges
4. Screen coordinates are required for all nodes (or auto-layout must be enabled)
5. Linear references must specify valid track IDs and measures within track bounds

### Infrastructure Objects

Infrastructure objects are positioned along edges using linear referencing:

```typescript
interface InfraObject {
  id: string;
  type: "signal" | "crossing" | "milepost" | "bridge" | "tunnel" | "custom";
  linearPos: LinearPosition;
  properties: Record<string, unknown>;
}

// Specific infrastructure types
interface Signal extends InfraObject {
  type: "signal";
  direction: "up" | "down";
  aspect?: string;
}

interface LevelCrossing extends InfraObject {
  type: "crossing";
  protected: boolean;
}

interface Milepost extends InfraObject {
  type: "milepost";
  measure: number;
  units: "km" | "miles";
}
```

### Switch/Point Topology

Switches are modeled as special nodes with specific geometry:

```typescript
interface SwitchNode extends RailNode {
  type: "junction";
  switchType: "left-turnout" | "right-turnout" | "double-slip" | "single-crossover";
  mainTrack: string;      // Edge ID of main/through track
  branchTrack: string;    // Edge ID of diverging track
  limbAngle: number;      // Angle in degrees (default: 15)
}
```

### Style Configuration

```typescript
interface StyleConfig {
  tracks: TrackStyle;
  stations: StationStyle;
  signals: SignalStyle;
  switches: SwitchStyle;
  labels: LabelStyle;
  theme: ThemeConfig;
}

interface TrackStyle {
  defaultColor: string;
  defaultWidth: number;
  defaultDashArray?: string;
  stateColors: {
    normal: string;
    degraded: string;
    blocked: string;
    maintenance: string;
  };
}

interface StationStyle {
  markerType: "circle" | "rectangle" | "custom";
  markerSize: number;
  labelPosition: "top" | "bottom" | "left" | "right" | "auto";
  labelFont: string;
}

interface ThemeConfig {
  name: string;
  colors: Record<string, string>;
  darkMode: boolean;
  colorBlindSafe: boolean;
}
```

### Viewport and Camera Model

```typescript
interface Viewport {
  width: number;
  height: number;
  padding: number;
  
  // Current view transform
  transform: {
    x: number;          // Pan offset X
    y: number;          // Pan offset Y
    scale: number;      // Zoom scale
  };
  
  // Zoom constraints
  minScale: number;
  maxScale: number;
  
  // Semantic zoom thresholds
  lodThresholds: {
    low: number;        // Below this: show only lines and stations
    high: number;       // Above this: show all details
  };
}

interface VisibleBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}
```

### Performance Optimization Data Structures

```typescript
// Spatial index for viewport culling
interface SpatialIndex {
  insert(element: RailNode | RailEdge, bounds: BoundingBox): void;
  query(bounds: VisibleBounds): Array<RailNode | RailEdge>;
  clear(): void;
}

// Label collision detection
interface LabelQuadtree {
  insert(label: Label, bounds: BoundingBox): boolean;  // Returns false if collision
  query(bounds: BoundingBox): Label[];
  clear(): void;
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

### Internationalization Model

```typescript
interface I18nConfig {
  locale: string;
  translations: Record<string, string>;
  numberFormat: Intl.NumberFormat;
  rtl: boolean;
}

// Default translation keys
const DEFAULT_TRANSLATIONS = {
  "tooltip.station": "Station",
  "tooltip.signal": "Signal",
  "tooltip.switch": "Switch",
  "tooltip.track": "Track",
  "legend.title": "Legend",
  "export.svg": "Export as SVG",
  "export.png": "Export as PNG",
  "zoom.in": "Zoom In",
  "zoom.out": "Zoom Out",
  "zoom.fit": "Fit to View",
};
```

### Plugin System Model

```typescript
interface Plugin {
  name: string;
  version: string;
  
  initialize(context: PluginContext): void;
  onPreRender?(graph: RailGraph): void;
  onPostRender?(canvas: D3Selection): void;
  cleanup?(): void;
}

interface PluginContext {
  graph: RailGraph;
  renderer: Renderer;
  bridge: CoordinateBridge;
  config: RenderConfig;
  
  registerOverlay(overlay: RailOverlay): void;
  registerContextMenuItem(item: ContextMenuItem): void;
}

interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  condition?: (element: RailNode | RailEdge) => boolean;
  action: (element: RailNode | RailEdge) => void;
  submenu?: ContextMenuItem[];
}
```

### Regional Data Adapters

```typescript
// UK Railway Data (ELR + Mileage)
interface UKRailwayAdapter {
  resolveELR(elr: string): string;  // ELR → track ID
  convertMileage(miles: number, chains: number): number;  // Miles.Chains → metres
  toLinearPosition(elr: string, miles: number, chains: number): LinearPosition;
}

// EU Railway Data (RINF)
interface EURailwayAdapter {
  resolveRINFSection(sectionId: string): string;  // RINF section → track ID
  resolveRINFOperationalPoint(opId: string): string;  // RINF OP → station ID
  toLinearPosition(sectionId: string, measure: number): LinearPosition;
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: railML® 3 Round-Trip Serialization

*For any* valid RailGraph object, serializing to railML® 3 XML, then parsing, then serializing again SHALL produce an equivalent XML structure.

**Validates: Requirements 1.7**

### Property 2: JSON Round-Trip Serialization

*For any* valid RailGraph object, converting to JSON, then parsing, then converting again SHALL produce an equivalent JSON structure.

**Validates: Requirements 2.5**

### Property 3: Parser Coordinate Extraction Completeness

*For any* valid railML® 3 XML file containing positioning system data (screen, linear, or geographic), the parser SHALL extract all coordinates and associate them with the correct netElements, such that no positioning data is lost.

**Validates: Requirements 1.2, 1.3, 1.4**

### Property 4: Parser Error Handling

*For any* invalid input data (malformed XML, invalid JSON, or data violating schema constraints), the parser SHALL return a descriptive error message identifying the specific validation failure.

**Validates: Requirements 1.6, 2.4**

### Property 5: Parser Warning Emission

*For any* railML® 3 XML file missing required screenPositioningSystem coordinates, the parser SHALL emit warnings identifying all missing elements.

**Validates: Requirements 1.5**

### Property 6: Builder Topology Validation

*For any* builder operation sequence that produces invalid topology (disconnected edges, invalid node references, or constraint violations), calling build() SHALL throw a descriptive error before returning a RailGraph.

**Validates: Requirements 3.4, 3.5**

### Property 7: Builder Valid Graph Construction

*For any* valid sequence of builder operations, calling build() SHALL produce a complete RailGraph that satisfies all topology constraints.

**Validates: Requirements 3.3**

### Property 8: Renderer SVG Generation

*For any* valid RailGraph, the renderer SHALL generate valid SVG output containing all nodes, edges, and infrastructure objects from the graph.

**Validates: Requirements 4.1**

### Property 9: Viewport Aspect Ratio Preservation

*For any* viewport dimension change, the renderer SHALL scale the schematic such that the aspect ratio of the original graph layout is preserved.

**Validates: Requirements 4.3**

### Property 10: Zoom Bounds Enforcement

*For any* zoom operation, the resulting scale SHALL remain within the configured minimum and maximum scale bounds.

**Validates: Requirements 4.4**

### Property 11: Viewport Culling Correctness

*For any* RailGraph with more than 1000 netElements, only elements whose bounding boxes intersect the current visible viewport SHALL be rendered in the DOM.

**Validates: Requirements 4.6**

### Property 12: Track Primitive Rendering Correctness

*For any* netElement of a specific type (straight track, curved track, switch, station, signal, or infrastructure annotation), the renderer SHALL produce the corresponding SVG primitive (polyline, Bézier curve, Y-fork glyph, marker, arrow, or annotation glyph) at the correct screen coordinates.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6**

### Property 13: Switch Topology Preservation

*For any* switch node with connected tracks, the rendered switch glyph SHALL maintain topological connectivity such that all connected track segments visually connect to the switch location.

**Validates: Requirements 6.5**

### Property 14: Style Configuration Application

*For any* netElement with custom style configuration (color, width, dash pattern, or state-based styling), the rendered SVG element SHALL have the configured style properties applied.

**Validates: Requirements 7.1, 7.2, 7.4**

### Property 15: Layout Mode Correctness

*For any* RailGraph and selected layout mode:
- Proportional mode: segment lengths SHALL be proportional to real-world distances
- Compressed mode: visual segment lengths SHALL be equalized
- Fixed-segment mode: all segments SHALL have equal length
- Metro-map mode: all track angles SHALL be constrained to 0°, 45°, or 90°

**Validates: Requirements 8.1, 8.2, 8.3, 8.4**

### Property 16: Semantic Zoom Level-of-Detail

*For any* zoom level:
- Below low threshold: only lines, stations, and major junctions SHALL be visible
- Between thresholds: signals, switches, and kilometre-posts SHALL also be visible
- Above high threshold: all detail elements SHALL be visible

**Validates: Requirements 9.1, 9.2, 9.3**

### Property 17: Linear-to-Screen Projection Validity

*For any* LinearPosition referencing a valid track and measure within bounds, the CoordinateBridge.project() method SHALL return a ScreenCoordinate that lies on the rendered track curve.

**Validates: Requirements 10.2**

### Property 18: Linear Position Monotonic Ordering

*For any* sequence of LinearPositions on the same track with increasing measures, the projected ScreenCoordinates SHALL maintain monotonic ordering along the track curve direction.

**Validates: Requirements 10.6**

### Property 19: CoordinateBridge Error Handling

*For any* LinearPosition with an invalid track identifier or out-of-bounds measure, the CoordinateBridge SHALL return an error indicating the specific validation failure.

**Validates: Requirements 10.3, 10.4**

### Property 20: Heat-Map Overlay Rendering

*For any* heat-map data with LinearPosition and scalar value pairs, the overlay SHALL render a continuous color gradient along the corresponding track segments using the configured color scale.

**Validates: Requirements 11.1, 11.2, 11.3**

### Property 21: Heat-Map Overlay Update Efficiency

*For any* heat-map data update, the overlay SHALL re-render using D3's update pattern without triggering a full schematic re-render.

**Validates: Requirements 11.4**

### Property 22: Annotation Overlay Collision Detection

*For any* set of annotations, when multiple annotations are positioned within the configured proximity threshold, the overlay SHALL adjust label positions such that no labels overlap.

**Validates: Requirements 12.3, 12.4**

### Property 23: Annotation Overlay Event Emission

*For any* click event on an annotation pin, the overlay SHALL emit an event containing the annotation data.

**Validates: Requirements 12.5**

### Property 24: Range Band Overlay Topology Following

*For any* range band spanning multiple connected track segments, the overlay SHALL render the band by following the track topology from start to end position.

**Validates: Requirements 13.5**

### Property 25: Range Band Overlay Overlap Handling

*For any* set of overlapping range bands, the overlay SHALL render them with the configured z-ordering and blending modes.

**Validates: Requirements 13.3**

### Property 26: Traffic Flow Overlay Directional Rendering

*For any* traffic flow data with bidirectional flows, the overlay SHALL render separate arrows for each direction with widths proportional to frequency values.

**Validates: Requirements 14.1, 14.2, 14.4**

### Property 27: Time-Series Overlay State Synchronization

*For any* time slider position change, the overlay SHALL update the visualization to display the state at the selected timestamp within the configured update time.

**Validates: Requirements 15.2**

### Property 28: Custom Overlay Registration and Invocation

*For any* registered custom overlay implementing the RailOverlay interface, when added to the schematic, the renderer SHALL invoke the overlay's render() method with the canvas and CoordinateBridge.

**Validates: Requirements 16.2, 16.3**

### Property 29: Overlay Visibility Toggle

*For any* overlay visibility toggle operation, the renderer SHALL update the display within the configured time without re-rendering other overlays.

**Validates: Requirements 17.5**

### Property 30: Overlay Z-Order Rendering

*For any* set of overlays with configured z-index values, the renderer SHALL render them in ascending z-index order.

**Validates: Requirements 17.2**

### Property 31: Interactive Element Event Emission

*For any* user interaction (click, hover, or context menu) on a track element, the library SHALL emit a typed event containing the entity ID, coordinates (screen, linear, and geographic if available), and element properties.

**Validates: Requirements 18.1, 18.2, 18.5**

### Property 32: Keyboard Focus Traversal

*For any* interactive element, pressing Tab SHALL move focus to the next element in document order, and pressing Shift+Tab SHALL move focus to the previous element.

**Validates: Requirements 19.1, 19.5**

### Property 33: Keyboard Focus Visibility

*For any* element receiving keyboard focus, the library SHALL render a visible focus indicator meeting WCAG 2.1 AA contrast requirements.

**Validates: Requirements 19.2**

### Property 34: Keyboard Navigation Topology Following

*For any* focused track element, pressing arrow keys SHALL move focus to adjacent track elements following the topology graph.

**Validates: Requirements 19.4**

### Property 35: Minimap Viewport Synchronization

*For any* viewport position change in the main view, the minimap SHALL update the viewport rectangle position within the configured update time.

**Validates: Requirements 20.6**

### Property 36: Minimap Click Navigation

*For any* click on the minimap, the main viewport SHALL pan to center on the clicked location.

**Validates: Requirements 20.3**

### Property 37: Element Selection State Consistency

*For any* selection operation (click, shift-click, or drag-select), the library SHALL update the selection state and emit a selection change event containing all selected element IDs.

**Validates: Requirements 21.1, 21.2, 21.3, 21.6**

### Property 38: SVG Export Round-Trip Visual Equivalence

*For any* valid schematic, exporting to SVG then rendering in a browser SHALL produce a visual result equivalent to the original schematic.

**Validates: Requirements 22.6**

### Property 39: SVG Export Validity

*For any* SVG export, the output SHALL be valid according to the SVG 1.1 specification and include embedded styles for consistent external rendering.

**Validates: Requirements 22.3, 22.4**

### Property 40: PNG Export Completeness

*For any* PNG export, the output SHALL include all visible track elements, overlays, and labels at the current zoom and pan state.

**Validates: Requirements 23.4**

### Property 41: Print Output Completeness

*For any* print operation, the output SHALL include the schematic fitted to page dimensions, a legend for all visible overlays, and a scale bar.

**Validates: Requirements 24.2, 24.3, 24.4**

### Property 42: React Component Prop Update Efficiency

*For any* React prop change (graph data, config, or overlays), the component SHALL update the schematic using React's reconciliation without full re-render.

**Validates: Requirements 25.6**

### Property 43: Vue Component Reactivity

*For any* reactive prop change in Vue, the component SHALL update the schematic efficiently using Vue's reactivity tracking.

**Validates: Requirements 26.7**

### Property 44: Web Component Attribute Synchronization

*For any* attribute change on the rail-schematic custom element, the component SHALL update the schematic to reflect the new configuration.

**Validates: Requirements 27.3**

### Property 45: Auto-Layout Topology Preservation

*For any* RailGraph without screenPositioningSystem coordinates, the auto-layout engine SHALL generate screen coordinates that preserve the topology (node connectivity and edge relationships).

**Validates: Requirements 28.2**

### Property 46: Auto-Layout Coordinate Export Round-Trip

*For any* auto-generated screen coordinates, exporting them and using them as input SHALL produce the same visual layout.

**Validates: Requirements 28.4**

### Property 47: Accessibility ARIA Label Completeness

*For any* interactive SVG element, the library SHALL assign appropriate ARIA roles and labels to enable screen reader compatibility.

**Validates: Requirements 30.3, 30.5**

### Property 48: Accessibility Keyboard Operability

*For any* interactive element, all functionality accessible via mouse SHALL also be accessible via keyboard with visible focus indicators.

**Validates: Requirements 30.4**

### Property 49: Accessibility Color Contrast

*For any* default theme, all text and interactive elements SHALL meet WCAG 2.1 AA color contrast ratios (4.5:1 for normal text, 3:1 for large text and interactive elements).

**Validates: Requirements 30.2**

### Property 50: Data Adapter Transformation Correctness

*For any* valid input in a supported format (railML® XML, JSON, GeoJSON, CSV), the corresponding adapter SHALL produce a RailGraph equivalent to the input data.

**Validates: Requirements 35.3, 35.4, 35.5**

### Property 51: Data Adapter Error Handling

*For any* invalid input data, the adapter SHALL return descriptive error messages indicating the specific validation failures.

**Validates: Requirements 35.7**

### Property 52: UK Railway ELR Resolution

*For any* valid ELR code and mileage (Miles.Chains format), the UK adapter SHALL convert to a LinearPosition with the measure in decimal metres.

**Validates: Requirements 36.1, 36.2, 36.3**

### Property 53: EU Railway RINF Resolution

*For any* valid RINF section-of-line identifier and measure, the EU adapter SHALL resolve to a LinearPosition referencing the correct track.

**Validates: Requirements 37.1, 37.3, 37.4**

### Property 54: Brushing and Linking Coordinate Bidirectionality

*For any* element with both ScreenCoordinate and GeographicCoordinate, the CoordinateBridge SHALL provide bidirectional transformation such that transforming screen→geo→screen returns the original coordinate.

**Validates: Requirements 38.4**

### Property 55: Theme Application Consistency

*For any* theme configuration, all rendered elements SHALL use colors and styles from the theme's CSS custom properties.

**Validates: Requirements 39.7**

### Property 56: Security XSS Prevention

*For any* user-provided text content (labels, tooltips, annotations), the library SHALL sanitize the content to prevent XSS attacks when rendering.

**Validates: Requirements 40.4**

### Property 57: Security No Network Requests

*For any* library operation, the core library code SHALL NOT make network requests or transmit telemetry data.

**Validates: Requirements 40.1, 40.2**

### Property 58: Error Handling Descriptive Messages

*For any* error condition (invalid data, missing configuration, topology violations), the library SHALL throw a typed error with a descriptive message and error code.

**Validates: Requirements 44.1, 44.4, 44.5**

### Property 59: Internationalization Locale Application

*For any* configured locale, all built-in UI text SHALL be rendered using the translations for that locale.

**Validates: Requirements 45.2**

### Property 60: Internationalization RTL Support

*For any* RTL locale (Arabic, Hebrew), text rendering SHALL follow right-to-left direction.

**Validates: Requirements 45.4**

### Property 61: Context Menu Conditional Items

*For any* context menu item with a condition function, the item SHALL only appear in the menu when the condition evaluates to true for the target element.

**Validates: Requirements 46.4**

### Property 62: Plugin Lifecycle Hook Invocation

*For any* registered plugin with lifecycle hooks, the library SHALL invoke the hooks at the correct phases (initialization, pre-render, post-render, cleanup).

**Validates: Requirements 47.2**

### Property 63: Server-Side Rendering Environment Detection

*For any* execution in a Node.js environment, the library SHALL detect the environment and disable browser-specific features.

**Validates: Requirements 48.5**

### Property 64: Canvas Rendering Visual Consistency

*For any* schematic rendered in both SVG and Canvas modes, the visual output SHALL be equivalent.

**Validates: Requirements 49.5**


## Error Handling

### Error Classification

The library uses a typed error system with error codes for programmatic handling:

```typescript
enum RailSchematicErrorCode {
  // Parsing errors (1000-1999)
  INVALID_RAILML_XML = 1000,
  INVALID_JSON_SCHEMA = 1001,
  MISSING_REQUIRED_COORDINATES = 1002,
  UNSUPPORTED_RAILML_VERSION = 1003,
  
  // Topology errors (2000-2999)
  INVALID_NODE_REFERENCE = 2000,
  DISCONNECTED_EDGE = 2001,
  TOPOLOGY_CONSTRAINT_VIOLATION = 2002,
  CIRCULAR_DEPENDENCY = 2003,
  
  // Coordinate errors (3000-3999)
  INVALID_TRACK_ID = 3000,
  MEASURE_OUT_OF_BOUNDS = 3001,
  INVALID_LINEAR_POSITION = 3002,
  COORDINATE_PROJECTION_FAILED = 3003,
  
  // Rendering errors (4000-4999)
  INVALID_RENDER_CONFIG = 4000,
  SVG_GENERATION_FAILED = 4001,
  CANVAS_NOT_SUPPORTED = 4002,
  EXPORT_FAILED = 4003,
  
  // Overlay errors (5000-5999)
  INVALID_OVERLAY_DATA = 5000,
  OVERLAY_NOT_REGISTERED = 5001,
  OVERLAY_RENDER_FAILED = 5002,
  
  // Configuration errors (6000-6999)
  MISSING_REQUIRED_CONFIG = 6000,
  INVALID_CONFIG_VALUE = 6001,
  INCOMPATIBLE_OPTIONS = 6002,
}

class RailSchematicError extends Error {
  code: RailSchematicErrorCode;
  details: Record<string, unknown>;
  
  constructor(code: RailSchematicErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "RailSchematicError";
    this.code = code;
    this.details = details || {};
  }
}
```

### Error Handling Strategies

#### 1. Parsing Errors

- **Invalid XML/JSON**: Return descriptive error with line/column information
- **Missing coordinates**: Emit warnings, optionally trigger auto-layout
- **Schema violations**: List all violated constraints with paths to invalid data

```typescript
try {
  const graph = await parser.parse(xmlString);
} catch (error) {
  if (error instanceof RailSchematicError) {
    console.error(`Parsing failed: ${error.message}`);
    console.error(`Error code: ${error.code}`);
    console.error(`Details:`, error.details);
  }
}
```

#### 2. Topology Validation Errors

- **Invalid references**: Identify the specific node/edge IDs that are invalid
- **Disconnected components**: Report all disconnected subgraphs
- **Constraint violations**: Describe which constraint was violated and why

#### 3. Coordinate Projection Errors

- **Invalid track ID**: Return error with the invalid ID and list of valid IDs
- **Out of bounds**: Return error with the measure, track length, and valid range
- **Projection failure**: Return error with the LinearPosition and reason for failure

#### 4. Rendering Errors

- **Configuration errors**: Validate configuration before rendering, list missing/invalid options
- **SVG generation failures**: Catch D3 errors and wrap with context
- **Canvas fallback**: Gracefully degrade to SVG if Canvas is not supported

#### 5. Runtime Warnings

Non-critical issues are logged as warnings:

```typescript
enum WarningType {
  MISSING_OPTIONAL_DATA = "missing_optional_data",
  PERFORMANCE_DEGRADATION = "performance_degradation",
  DEPRECATED_API = "deprecated_api",
  SUBOPTIMAL_CONFIGURATION = "suboptimal_configuration",
}

interface Warning {
  type: WarningType;
  message: string;
  context: Record<string, unknown>;
}
```

### Validation Pipeline

All input data passes through a validation pipeline before processing:

```
Input Data
    ↓
Schema Validation (structure, types)
    ↓
Semantic Validation (references, constraints)
    ↓
Topology Validation (connectivity, cycles)
    ↓
Coordinate Validation (bounds, consistency)
    ↓
Validated RailGraph
```

### Error Recovery Strategies

1. **Graceful Degradation**: Missing optional data doesn't prevent rendering
2. **Auto-Layout Fallback**: Missing screen coordinates trigger auto-layout
3. **Partial Rendering**: Invalid elements are skipped with warnings
4. **Default Values**: Missing configuration uses sensible defaults
5. **Retry Logic**: Transient failures (e.g., Canvas context creation) are retried


## Testing Strategy

### Dual Testing Approach

The library employs both unit testing and property-based testing for comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, error conditions, and integration points
- **Property tests**: Verify universal properties across all inputs through randomization

Both approaches are complementary and necessary. Unit tests catch concrete bugs and document expected behavior through examples, while property tests verify general correctness across a wide input space.

### Property-Based Testing

#### Framework Selection

- **TypeScript/JavaScript**: Use `fast-check` library for property-based testing
- Minimum 100 iterations per property test (due to randomization)
- Each property test references its design document property

#### Property Test Structure

```typescript
import fc from 'fast-check';

describe('Feature: rail-schematic-viz, Property 1: railML® 3 Round-Trip Serialization', () => {
  it('should preserve RailGraph structure through XML serialization round-trip', () => {
    fc.assert(
      fc.property(
        railGraphArbitrary(),  // Generator for random valid RailGraphs
        (graph) => {
          const xml1 = serializeToRailML(graph);
          const parsed = parseRailML(xml1);
          const xml2 = serializeToRailML(parsed);
          
          // XML should be equivalent (ignoring whitespace/formatting)
          expect(normalizeXML(xml1)).toEqual(normalizeXML(xml2));
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

#### Generators (Arbitraries)

Property tests require generators for random valid inputs:

```typescript
// Generator for valid RailGraphs
function railGraphArbitrary(): fc.Arbitrary<RailGraph> {
  return fc.record({
    nodes: fc.dictionary(
      fc.string(),
      railNodeArbitrary()
    ),
    edges: fc.dictionary(
      fc.string(),
      railEdgeArbitrary()
    ),
    lines: fc.dictionary(
      fc.string(),
      railLineArbitrary()
    ),
    metadata: graphMetadataArbitrary()
  }).chain(ensureTopologyConstraints);  // Post-process to ensure validity
}

// Generator for screen coordinates
function screenCoordinateArbitrary(): fc.Arbitrary<ScreenCoordinate> {
  return fc.record({
    x: fc.double({ min: 0, max: 10000 }),
    y: fc.double({ min: 0, max: 10000 })
  });
}

// Generator for linear positions
function linearPositionArbitrary(trackIds: string[]): fc.Arbitrary<LinearPosition> {
  return fc.record({
    trackId: fc.constantFrom(...trackIds),
    measure: fc.double({ min: 0, max: 100000 }),
    direction: fc.option(fc.constantFrom("up", "down"))
  });
}
```

#### Edge Case Handling

Property tests should include edge cases through generator configuration:

- Empty graphs
- Single-node graphs
- Graphs with maximum size (5000 nodes)
- Graphs with no screen coordinates (auto-layout)
- Graphs with only linear coordinates
- Graphs with special characters in labels
- Graphs with extreme coordinate values

### Unit Testing

#### Test Organization

```
tests/
├── unit/
│   ├── parsers/
│   │   ├── railml-parser.test.ts
│   │   ├── json-parser.test.ts
│   │   └── builder-api.test.ts
│   ├── layout/
│   │   ├── proportional-layout.test.ts
│   │   ├── metro-map-layout.test.ts
│   │   └── auto-layout.test.ts
│   ├── rendering/
│   │   ├── svg-renderer.test.ts
│   │   ├── canvas-renderer.test.ts
│   │   └── viewport-culling.test.ts
│   ├── overlays/
│   │   ├── heatmap-overlay.test.ts
│   │   ├── annotation-overlay.test.ts
│   │   └── custom-overlay.test.ts
│   ├── coordinate-bridge/
│   │   └── coordinate-bridge.test.ts
│   └── adapters/
│       ├── uk-railway-adapter.test.ts
│       └── eu-railway-adapter.test.ts
├── integration/
│   ├── react-adapter.test.tsx
│   ├── vue-adapter.test.ts
│   ├── web-component.test.ts
│   └── end-to-end.test.ts
├── visual/
│   ├── snapshots/
│   └── visual-regression.test.ts
└── performance/
    └── benchmarks.test.ts
```

#### Unit Test Examples

```typescript
// Example: Specific edge case
describe('Parser', () => {
  it('should handle empty railML® XML', () => {
    const xml = '<railML version="3.2"><infrastructure /></railML>';
    const result = parser.parse(xml);
    
    expect(result.nodes.size).toBe(0);
    expect(result.edges.size).toBe(0);
  });
  
  it('should emit warning for missing screen coordinates', () => {
    const xml = loadFixture('railml-no-screen-coords.xml');
    const warnings: Warning[] = [];
    
    parser.on('warning', (w) => warnings.push(w));
    parser.parse(xml);
    
    expect(warnings).toContainEqual(
      expect.objectContaining({
        type: WarningType.MISSING_OPTIONAL_DATA,
        message: expect.stringContaining('screenPositioningSystem')
      })
    );
  });
});

// Example: Integration test
describe('React Adapter', () => {
  it('should update schematic when graph prop changes', () => {
    const { rerender } = render(<RailSchematic graph={graph1} />);
    
    expect(screen.getByTestId('rail-schematic')).toBeInTheDocument();
    
    rerender(<RailSchematic graph={graph2} />);
    
    // Verify new graph is rendered without full remount
    expect(screen.getByTestId('rail-schematic')).toBeInTheDocument();
    expect(screen.queryByText('Station A')).not.toBeInTheDocument();
    expect(screen.getByText('Station X')).toBeInTheDocument();
  });
});
```

### Visual Regression Testing

Use screenshot comparison to detect unintended visual changes:

```typescript
import { toMatchImageSnapshot } from 'jest-image-snapshot';

expect.extend({ toMatchImageSnapshot });

describe('Visual Regression', () => {
  it('should render metro-map layout consistently', async () => {
    const graph = loadFixture('sample-network.json');
    const svg = await renderToSVG(graph, { layoutMode: 'metro-map' });
    const screenshot = await svgToImage(svg);
    
    expect(screenshot).toMatchImageSnapshot({
      failureThreshold: 0.01,
      failureThresholdType: 'percent'
    });
  });
});
```

### Performance Benchmarking

Track performance metrics over time:

```typescript
describe('Performance Benchmarks', () => {
  it('should parse 500-element network in under 100ms', () => {
    const xml = generateLargeRailML(500);
    
    const start = performance.now();
    parser.parse(xml);
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(100);
  });
  
  it('should render 5000-element network at 60fps', () => {
    const graph = generateLargeGraph(5000);
    const renderer = new Renderer(container, config);
    
    const frameTimings: number[] = [];
    const measureFrame = () => {
      const start = performance.now();
      renderer.render(graph);
      frameTimings.push(performance.now() - start);
    };
    
    // Measure 60 frames
    for (let i = 0; i < 60; i++) {
      measureFrame();
    }
    
    const avgFrameTime = frameTimings.reduce((a, b) => a + b) / frameTimings.length;
    const fps = 1000 / avgFrameTime;
    
    expect(fps).toBeGreaterThanOrEqual(60);
  });
});
```

### Test Coverage Goals

- **Unit test coverage**: Minimum 80% for all core packages
- **Property test coverage**: All 64 correctness properties implemented
- **Integration test coverage**: All framework adapters tested
- **Visual regression coverage**: Key rendering scenarios captured
- **Performance benchmarks**: Critical performance requirements tracked

### Continuous Integration

All tests run on every pull request:

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:property
      - run: npm run test:integration
      - run: npm run test:visual
      - run: npm run test:performance
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### Testing Best Practices

1. **Property tests first**: Write property tests for universal behaviors
2. **Unit tests for specifics**: Use unit tests for concrete examples and edge cases
3. **Avoid over-testing**: Don't write unit tests for behaviors already covered by properties
4. **Test public APIs**: Focus on public interfaces, not internal implementation
5. **Use fixtures**: Maintain a library of realistic test data
6. **Mock sparingly**: Prefer real implementations over mocks when possible
7. **Test error paths**: Ensure error handling is thoroughly tested
8. **Performance regression**: Track performance metrics in CI

### Property Test Tag Format

Each property test must include a comment tag referencing the design document:

```typescript
/**
 * Feature: rail-schematic-viz
 * Property 1: railML® 3 Round-Trip Serialization
 * 
 * For any valid RailGraph object, serializing to railML® 3 XML, then parsing,
 * then serializing again SHALL produce an equivalent XML structure.
 */
describe('Property 1: railML® 3 Round-Trip Serialization', () => {
  // test implementation
});
```

This ensures traceability between requirements, design properties, and test implementation.


## Implementation Considerations

### Technology Stack

- **Language**: TypeScript 5.0+ with strict mode enabled
- **Rendering**: D3.js v7 (peer dependency)
- **Build Tool**: Vite for fast development and optimized production builds
- **Test Framework**: Vitest for unit and integration tests
- **Property Testing**: fast-check for property-based tests
- **Component Library**: Storybook for interactive documentation
- **Package Manager**: npm with workspaces for monorepo management

### Development Workflow

1. **Monorepo Structure**: Use npm workspaces to manage multiple packages
2. **Shared Configuration**: Common TypeScript, ESLint, and Prettier configs
3. **Incremental Development**: Build core packages first, then adapters
4. **Continuous Testing**: Run tests on every commit via pre-commit hooks
5. **Documentation-Driven**: Write Storybook stories alongside implementation

### Performance Optimization Techniques

#### 1. Viewport Culling

Use spatial indexing (R-tree or quadtree) to efficiently query visible elements:

```typescript
class SpatialIndex {
  private rtree: RBush<IndexedElement>;
  
  query(viewport: VisibleBounds): IndexedElement[] {
    return this.rtree.search({
      minX: viewport.minX,
      minY: viewport.minY,
      maxX: viewport.maxX,
      maxY: viewport.maxY
    });
  }
}
```

#### 2. D3 Update Pattern

Use D3's enter/update/exit pattern to minimize DOM manipulation:

```typescript
function updateOverlay(data: DataPoint[]) {
  const selection = canvas.selectAll('.data-point').data(data, d => d.id);
  
  // Enter: create new elements
  selection.enter()
    .append('circle')
    .attr('class', 'data-point')
    .merge(selection)  // Merge with existing
    .attr('cx', d => d.x)
    .attr('cy', d => d.y);
  
  // Exit: remove old elements
  selection.exit().remove();
}
```

#### 3. Canvas Rendering for Dense Data

Switch to Canvas for layers with >1000 elements:

```typescript
class HybridRenderer {
  renderBase(graph: RailGraph) {
    // SVG for interactive elements
    this.svgLayer.render(graph.nodes, graph.edges);
  }
  
  renderHeatMap(data: HeatMapDataPoint[]) {
    if (data.length > 1000) {
      // Canvas for dense data
      this.canvasLayer.render(data);
    } else {
      // SVG for sparse data
      this.svgLayer.renderHeatMap(data);
    }
  }
}
```

#### 4. Debouncing and Throttling

Throttle expensive operations during pan/zoom:

```typescript
const debouncedRender = debounce(() => {
  renderer.render(graph);
}, 16);  // ~60fps

zoom.on('zoom', (event) => {
  // Update transform immediately
  canvas.attr('transform', event.transform);
  
  // Debounce full re-render
  debouncedRender();
});
```

### Accessibility Implementation

#### ARIA Labels

```typescript
function renderStation(station: RailNode) {
  return svg.append('g')
    .attr('role', 'button')
    .attr('aria-label', `Station ${station.name}`)
    .attr('tabindex', 0)
    .on('click', handleClick)
    .on('keydown', handleKeydown);
}
```

#### Keyboard Navigation

```typescript
class KeyboardNavigator {
  private focusedElement: string | null = null;
  
  handleKeyDown(event: KeyboardEvent) {
    switch (event.key) {
      case 'Tab':
        this.focusNext(!event.shiftKey);
        break;
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        this.focusAdjacent(event.key);
        break;
      case 'Enter':
      case ' ':
        this.activateFocused();
        break;
    }
  }
}
```

### Security Considerations

#### XSS Prevention

```typescript
function sanitizeLabel(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderLabel(label: string) {
  // Use textContent instead of innerHTML
  element.textContent = label;
}
```

#### Content Security Policy

The library is compatible with strict CSP:

```
Content-Security-Policy: 
  default-src 'self';
  style-src 'self' 'unsafe-inline';  // Required for D3 inline styles
  script-src 'self';
```

### Phasing Recommendation

Given the scope of 50 requirements, I recommend breaking implementation into phases:

#### Phase 1: Core Foundation (Months 1-3)
**Scope**: Requirements 1-10, 33, 43, 44
- Core data model and RailGraph
- railML® 3 parser (basic topology + screenPositioningSystem)
- JSON schema and parser
- Builder API
- Basic SVG renderer (tracks, stations, switches)
- CoordinateBridge (linear ↔ screen)
- Layout engine (proportional and compressed modes)
- TypeScript types and error handling
- Unit test infrastructure

**Deliverable**: `@rail-schematic-viz/core` v0.1.0

#### Phase 2: Interactivity & Overlays (Months 4-6)
**Scope**: Requirements 11-21, 25
- Overlay system architecture
- Built-in overlays (heat-map, annotation, range band, traffic flow)
- Interactive events (click, hover, selection)
- Keyboard navigation
- Minimap
- React adapter
- Storybook component library

**Deliverable**: `@rail-schematic-viz/core` v0.2.0, `@rail-schematic-viz/react` v0.1.0

#### Phase 3: Advanced Features (Months 7-9)
**Scope**: Requirements 8, 9, 15, 22-24, 26-28, 30
- Additional layout modes (fixed-segment, metro-map)
- Semantic zoom (LOD)
- Auto-layout engine
- Time-series overlay
- Export (SVG, PNG, print)
- Vue and Web Component adapters
- Accessibility compliance (WCAG 2.1 AA)

**Deliverable**: `@rail-schematic-viz/core` v0.3.0, all adapters v0.1.0

#### Phase 4: Ecosystem & Polish (Months 10-12)
**Scope**: Requirements 29, 31, 32, 34-40, 45-49
- Performance optimization (viewport culling, Canvas fallback)
- Regional adapters (UK ELR, EU RINF)
- Brushing and linking
- Theme system
- Internationalization
- Context menu system
- Plugin system
- Server-side rendering support
- Documentation site
- Bundle size optimization

**Deliverable**: `@rail-schematic-viz/*` v1.0.0

### Alternative: Modular Specs

If the team prefers smaller, more focused specs, this could be split into:

1. **rail-schematic-viz-core**: Data model, parsing, basic rendering (Requirements 1-7, 33, 43, 44)
2. **rail-schematic-viz-layout**: Layout engine and modes (Requirements 8, 28)
3. **rail-schematic-viz-overlays**: Overlay system and built-in overlays (Requirements 11-17)
4. **rail-schematic-viz-interaction**: Events, keyboard, selection (Requirements 18-21)
5. **rail-schematic-viz-adapters**: Framework adapters (Requirements 25-27)
6. **rail-schematic-viz-export**: Export and print (Requirements 22-24)
7. **rail-schematic-viz-regional**: UK/EU data integration (Requirements 36-37)
8. **rail-schematic-viz-advanced**: Themes, i18n, plugins, SSR (Requirements 39, 45-48)

Each spec would have its own requirements, design, and tasks, making them more manageable.

### Risk Mitigation

1. **railML® Complexity**: Start with a constrained subset of railML® 3, expand incrementally
2. **Performance**: Profile early and often, implement optimizations before they're needed
3. **Browser Compatibility**: Test on target browsers from day one
4. **D3 Breaking Changes**: Pin peer dependency range, maintain compatibility matrix
5. **Auto-Layout Quality**: Provide manual override API, document limitations
6. **Accessibility**: Audit with screen readers and automated tools throughout development

### Success Criteria

The design is successful if:

1. A developer can render a basic schematic in <10 lines of code
2. The library handles networks of 5000 elements at 60fps
3. All 64 correctness properties pass with 100+ iterations
4. WCAG 2.1 AA compliance is achieved
5. Core bundle size is <80KB gzipped
6. Documentation enables self-service integration
7. The library is adopted by at least 3 railway operators or vendors within 12 months

