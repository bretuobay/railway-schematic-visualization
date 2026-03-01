# Rail Schematic Viz — Product Requirements Document

> **Version:** 1.0
> **Status:** Final Draft
> **Author:** The Baobab Solutions / Festus Yeboah
> **Date:** March 2026
> **Classification:** Confidential — Internal Use Only

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Background & Motivation](#2-background--motivation)
3. [Goals & Non-Goals](#3-goals--non-goals)
4. [Target Users & Use Cases](#4-target-users--use-cases)
5. [Coordinate System Architecture](#5-coordinate-system-architecture)
6. [Functional Requirements](#6-functional-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Technical Architecture](#8-technical-architecture)
9. [Data Standards & Interoperability](#9-data-standards--interoperability)
10. [Milestones & Phasing](#10-milestones--phasing)
11. [Success Metrics](#11-success-metrics)
12. [Risks & Mitigations](#12-risks--mitigations)
13. [Open Questions](#13-open-questions)
14. [Appendix: Reference Material](#14-appendix-reference-material)

---

## 1. Executive Summary

**Rail Schematic Viz** is an open-source TypeScript library built on D3.js that enables railway operators, infrastructure managers, and software vendors to render interactive schematic (track layout) diagrams in browser-based products.

The library fills a clear gap between full GIS tooling and simplistic diagram libraries by targeting the specific needs of the rail domain: accurate topology modelling, linear referencing, overlay layers for operational data, and standards compliance with **railML® 3** and the **RailTopoModel® (RTM)**.

The coordinate system at the heart of the library is railML's `screenPositioningSystem` — a 2-D Cartesian canvas space that positions track elements purely for human-readable schematic presentation, independent of geographic coordinates. This mirrors the approach used in the KONUX Network product (deployed with Network Rail, UK), where schematic views underpinned heat-map visualisations of track utilisation and inspection coverage, delivering a 25% reduction in unnecessary track inspections.

Railway operators struggle to visualize dense technical data — stress scores, utilisation heat-maps, traffic flow, maintenance schedules — on geographic maps because curves, overlapping tracks, and scale make the data illegible. This library abstracts complex railway geometry into a clean, schematic view, allowing for high-density data overlays while preserving topological correctness.

---

## 2. Background & Motivation

### 2.1 The Problem

Railway operations teams and their software partners face a recurring challenge:

- **Geographic (GIS) maps** are too complex and cognitively demanding for day-to-day operational use. Curves, overlapping tracks, and geographic scale make dense data overlays illegible.
- **Generic diagramming tools** (e.g. Mermaid, Lucidchart) have no concept of railway topology, linear referencing, or operational overlays.
- **Bespoke solutions** are expensive, inconsistent, and non-interoperable — teams rebuild the same schematic views from scratch for each project.

The result is expensive bespoke builds, inconsistent data standards, and poor interoperability between systems.

### 2.2 Observed Industry Practice

Schematic railway maps are a long-established convention in the rail industry. Examples range from Copenhagen's city rail schematic and Mumbai's metro map to the KONUX Network product, which layered utilisation heat-maps and inspection annotations on top of a schematic track layout to help Network Rail optimise maintenance resources.

Existing tooling addresses adjacent problems but none provides a reusable, standards-compliant, operational schematic visualisation component for web applications:

| Tool                        | What it does                      | Gap                                          |
| --------------------------- | --------------------------------- | -------------------------------------------- |
| CARD/1                      | Professional railway CAD / design | Desktop-only, not embeddable                 |
| QGIS + LUKS                 | GIS-side track inspection viewer  | Geographic maps, not schematic               |
| tabatkins/railroad-diagrams | Syntax railroad diagrams in JS    | No topology, no overlays, no rail data model |
| OpenRailwayMap              | Geographic OSM-based rail map     | Geographic only                              |

### 2.3 Opportunity

By building a library that speaks railML® natively, renders schematic layouts via the `screenPositioningSystem`, and exposes an extensible overlay API, we can offer railway operators and their technology vendors a composable foundation rather than a locked-in tool. The key innovation is: **treat railway schematics like a topology-driven rendering engine, not a map.**

Our differentiators:

- **Linear referencing native** — positions assets by track + kilometre-post, not lat/lon
- **Overlay-first architecture** — heat-maps, annotations, and capacity data as composable layers
- **Web-native** — TypeScript + D3 + SVG, embeddable in any modern web stack
- **Standards-compliant** — railML® 3 and RailTopoModel® as first-class citizens

---

## 3. Goals & Non-Goals

### 3.1 Goals

- Render interactive railway schematic diagrams from railML® 3 data.
- Support the railML® `screenPositioningSystem` as the primary coordinate space, with optional projection bridges to `linearPositioningSystem` (kilometre-posts) and `geometricPositioningSystem` (WGS-84 / EPSG-coded CRS).
- Provide a plug-in overlay system for heat-maps, annotations, traffic data, capacity indicators, time-series replay, and inspection states.
- Ship a minimal-dependency core rendering engine (D3 only) with optional adapters for React, Vue, and Web Components.
- Remain data-source agnostic: consume railML® XML, a JSON equivalent, or a programmatic builder API.
- Support pan, zoom, semantic zoom (Level of Detail), and click/hover interactions out of the box.
- Be accessible (WCAG 2.1 AA), internationalisation-ready, and print-exportable to SVG/PDF.
- Provide multiple layout modes: proportional, compressed, fixed-segment, and metro-map (octilinear).

### 3.2 Non-Goals

- Full GIS geographic rendering (use Mapbox / OpenLayers for that).
- Train scheduling or timetable management.
- Real-time signalling or interlocking logic.
- Mobile-native (iOS / Android) implementations in v1.
- A hosted SaaS product — this is a library, not a platform.
- A full WYSIWYG diagram editor — the focus is on rendering from data.
- Automatic layout of extremely dense, complex station throat areas (may require manual intervention or future algorithmic improvements).

---

## 4. Target Users & Use Cases

### 4.1 Primary User Segments

| User Segment                                                           | Representative Use Case                                                                                        |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Infrastructure Managers (e.g. Network Rail, DB InfraNetz, SNCF Réseau) | Overlay inspection coverage, asset health scores, and planned work onto a schematic of their managed route.    |
| Train Operating Companies                                              | Visualise real-time train positions and delay propagation on a simplified route diagram.                       |
| Rail Technology Vendors                                                | Embed a schematic view inside their PMS, CMMS, or performance analytics product without building from scratch. |
| Capacity Planning Teams                                                | Visualise occupancy blocks, headway between trains, and capacity utilisation on corridor schematics.           |
| Academic & Standards Bodies                                            | Prototype and publish railML® topology examples as interactive schematics.                                     |

### 4.2 Developer Personas

- **Frontend engineer** at a rail software company integrating the library into a React or Angular dashboard.
- **Data engineer** scripting batch SVG exports for operational reports.
- **Researcher** exploring track topology algorithms using the builder API.
- **Maintenance engineer** needing heat-maps of track stress/temperature on a schematic line.

---

## 5. Coordinate System Architecture

Understanding the three positioning systems in railML® 3 is essential context for the library's design. The separation between logical/engineering coordinates (source of truth) and schematic rendering coordinates is **critical** to the architecture.

### 5.1 The Three Positioning Systems

| System                       | Description                                                                                                                                       | Library Role                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `screenPositioningSystem`    | 2-D Cartesian (x, y) canvas coordinates assigned by schematic map authors. No geographic meaning.                                                 | **PRIMARY** — the core rendering coordinate space. All visual layout uses this system.                         |
| `linearPositioningSystem`    | Position along a named railway line expressed as a kilometre / mileage measure (e.g. "Line 6869, km 3.400"). The classic railway asset reference. | **SECONDARY** — used to anchor overlay data (inspection results, speed restrictions, etc.) to track positions. |
| `geometricPositioningSystem` | Geographic coordinates referenced by an EPSG code (e.g. WGS-84 / EPSG:4326). GPS-accurate positions.                                              | **OPTIONAL** — used when satellite imagery or geographic context is requested by the consumer.                 |

### 5.2 `screenPositioningSystem` Detail

The `screenPositioningSystem` defines a flat (x, y) coordinate for each `netElement` node. The library stores these as a typed `ScreenCoordinate { x: number; y: number }` and renders them directly onto an SVG canvas via D3 projection. Scale and aspect ratio are controlled by the library consumer through viewport configuration.

Track segments (`netElements`) between nodes are drawn as **cubic Bézier curves** by default, with straight-line and orthogonal (Manhattan) options available via a segment renderer plugin. Points / switches are rendered as branching fork glyphs anchored at their screen coordinate.

### 5.3 Linear Referencing Model

Each asset and overlay data point is positioned using linear references:

```typescript
interface LinearPosition {
  trackId: string;        // Track or line identifier (e.g. ELR)
  startMeasure: number;   // Distance from datum in metres
  endMeasure?: number;    // Optional end for ranged assets
  direction?: "up" | "down"; // Direction-aware positioning
}
```

This supports:
- **Single-point assets** — signals, defects, mileposts
- **Ranged assets** — bridges, slow zones, engineering possessions
- **Direction-aware positioning** — for bidirectional track overlays

### 5.4 Coordinate Bridge

The library exposes a `CoordinateBridge` interface that maps linear measures to screen coordinates by interpolating along the rendered curve of the associated `netElement`. This bridge is the mechanism through which overlay data referenced by kilometre-post is positioned accurately on the schematic canvas.

```
Linear position (km 3.400 on Line 6869)
         ↓  CoordinateBridge.project()
Screen coordinate (x: 487, y: 312) on SVG canvas
```

### 5.5 Brushing & Linking

The `CoordinateBridge` also enables **brushing and linking** between views: clicking a schematic segment can highlight the corresponding geographic segment on a secondary map (and vice versa), enabling dual-view workflows where operators use the schematic for analysis and the geographic view for spatial context.

---

## 6. Functional Requirements

### 6.1 Data Ingestion

#### 6.1.1 railML® 3 Parser

- Parse railML® 3.1 / 3.2 / 3.3 XML into an internal graph model.
- Extract `netElements`, `netRelations`, operational points, signals, and all three positioning systems.
- Validate required `screenPositioningSystem` coordinates; warn gracefully on missing values.

#### 6.1.2 JSON Schema

- Define and publish a JSON equivalent of the internal graph model (`railschemjson`) for consumers who cannot or do not wish to work with XML.

#### 6.1.3 Programmatic Builder API

Provide a fluent TypeScript builder for constructing topology graphs without file parsing:

```typescript
const graph = RailSchematic.builder()
  .addLine("L1")
  .addStation("StationA", { x: 100, y: 200 })
  .addStation("StationB", { x: 500, y: 200 })
  .addTrack("T1", "StationA", "StationB")
  .addSwitch("SW01", "T1", "T2", { x: 300, y: 200 })
  .build();
```

#### 6.1.4 Data Adapters

Provide adapter interfaces for transforming common input formats into the internal graph model:
- railML® 3.x XML
- JSON topology
- GeoJSON with linear referencing extensions
- CSV (Line ID, Start_Mileage, End_Mileage) for simple use cases

---

### 6.2 Rendering Engine

#### 6.2.1 Core SVG Canvas

- Render the entire schematic as a single responsive SVG element using D3.
- Support configurable viewport dimensions, padding, and auto-fit mode.
- Implement D3 zoom and pan with configurable min/max scale bounds.
- Implement **viewport culling** — only render elements visible in the current viewport for large networks.

#### 6.2.2 Track Primitives

| Primitive                        | Rendering                                                             |
| -------------------------------- | --------------------------------------------------------------------- |
| Straight segment                 | Polyline from screen coordinates                                      |
| Curved segment                   | Cubic Bézier with auto-computed control points from adjacent tangents |
| Switch / point                   | Y-fork glyph with configurable limb angle                             |
| Station / operational point      | Configurable marker (rectangle, circle, or custom SVG symbol)         |
| Signal                           | Directional arrow glyph placed at linear position on track            |
| Level crossing / tunnel / bridge | Optional glyph annotations                                            |

#### 6.2.3 Switch Rendering System

Provide configurable switch / point templates:

- Left turnout
- Right turnout
- Double-slip crossover
- Single crossover

Switch geometry must preserve topology, allow stylisation, and support operator-specific branding.

#### 6.2.4 Track Styling

- Line colour, width, and dash pattern configurable per line, route, or individual `netElement`.
- State-based styling (normal, degraded, blocked, under maintenance) via CSS custom properties.
- Dark mode support via CSS media queries.

#### 6.2.5 Layout Modes

The library must support multiple schematic layout strategies:

| Mode             | Description                                                                      |
| ---------------- | -------------------------------------------------------------------------------- |
| **Proportional** | Segment lengths proportional to real-world distances                             |
| **Compressed**   | Distances compressed to equalise visual segment lengths                          |
| **Fixed-segment**| All segments rendered at equal length regardless of real-world distance           |
| **Metro-map**    | Octilinear (0°, 45°, 90° angles only) as in classic transit schematics          |

Layout orientation is configurable: horizontal, vertical, or auto-fit.

#### 6.2.6 Semantic Zoom (Level of Detail)

Implement **semantic zooming** where visual detail changes with zoom level:

- **Zoomed out:** Line segments, station names, major junctions only
- **Mid zoom:** Signals, switches, kilometre-posts become visible
- **Zoomed in:** Individual rails, sleepers, asset detail annotations appear

LOD thresholds are configurable by the consumer.

---

### 6.3 Overlay System

Overlays are composable layers rendered on top of the base schematic. They consume data mapped to `linearPositioningSystem` coordinates and are projected onto the canvas via the `CoordinateBridge`.

#### 6.3.1 Built-in Overlay Types

| Overlay                | Description                                                                                                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Heat-map**           | Continuous colour gradient along a track segment representing a scalar metric (e.g. track utilisation %, stress index, delay minutes). Directly inspired by the KONUX Network product. |
| **Annotation pin**     | Point label anchored at a linear position (e.g. defect location, inspection waypoint, speed restriction sign).                                                                         |
| **Range band**         | Coloured zone between two linear positions (e.g. a possession or engineering work zone).                                                                                               |
| **Traffic flow arrow** | Directional arrow with width proportional to train frequency.                                                                                                                          |
| **Threshold marker**   | Icon placed when a metric crosses a configurable threshold.                                                                                                                            |
| **Time-series**        | Time slider enabling historical state replay and predictive forecast visualisation across track segments.                                                                               |

#### 6.3.2 Overlay API

- Overlays implement a typed interface `RailOverlay<T>` with a `render(canvas, bridge)` method.
- Multiple overlays can be stacked; consumers control z-order.
- Each overlay has independent opacity, visibility toggle, and legend descriptor.
- Custom overlays registered via `RailSchematic.registerOverlay(name, factory)`.
- **Label collision detection** — annotation overlays intelligently avoid overlapping labels.

```typescript
// Example: registering a custom overlay
RailSchematic.registerOverlay("tamping-score", (data) => ({
  render(canvas, bridge) {
    data.forEach(({ linearPos, score }) => {
      const { x, y } = bridge.project(linearPos);
      canvas
        .append("circle")
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", 6)
        .attr("fill", scoreToColour(score));
    });
  },
}));
```

---

### 6.4 Interaction

- **Click / tap** on track, station, signal, switch: emits typed event with entity ID and linear position.
- **Hover tooltip**: configurable content renderer (default shows entity name + linear position).
- **Keyboard navigation**: focus ring traversal of stations and named elements.
- **Minimap**: optional inset overview with viewport rectangle.
- **Context menu**: extensible right-click / long-press menu per element type.
- **Brush selection**: drag to select a range of track and all elements within it.
- **Multi-select**: shift-click or programmatic multi-element selection.
- **Programmatic highlighting**: API to highlight specific elements by ID or filter predicate.

---

### 6.5 Export

- Export current view as **SVG string** (for embedding in documents or further processing).
- Export as **PNG** via Canvas API (rasterisation).
- **Print stylesheet**: full-page layout with legend and scale bar.

---

### 6.6 Framework Adapters

| Package                             | Deliverable                                                                   |
| ----------------------------------- | ----------------------------------------------------------------------------- |
| `@rail-schematic-viz/react`         | React component `<RailSchematic />` with hooks for events and overlay control |
| `@rail-schematic-viz/vue`           | Vue 3 component with composables                                              |
| `@rail-schematic-viz/web-component` | Custom element `<rail-schematic>` for framework-agnostic embedding            |
| `@rail-schematic-viz/angular`       | Angular component (community contribution, post-v1)                           |

---

## 7. Non-Functional Requirements

### 7.1 Performance

- Render a network of up to **5,000 netElements** at 60 fps on a mid-range laptop (i5 / 8 GB RAM, Chrome stable).
- Initial parse + render of a 500-element network must complete in **under 500 ms**.
- Overlay updates (e.g. live heat-map refresh) must not cause full re-render; use D3 update pattern.
- **Viewport culling**: only render elements visible in the current viewport.
- **Canvas fallback**: optional Canvas renderer for performance-critical layers (heat-maps with 10k+ data points).

### 7.2 Accessibility

- WCAG 2.1 AA minimum for colour contrast on all default themes.
- All interactive elements reachable and operable via keyboard.
- ARIA roles and labels on SVG elements for screen-reader compatibility.
- Colour-blind safe palettes included as a default option.

### 7.3 Security & Privacy

- No telemetry, no network calls from the library core.
- DOM-based SVG only — no Canvas fingerprinting.

### 7.4 Browser & Environment Support

- Modern evergreen browsers: Chrome 115+, Firefox 119+, Safari 17+, Edge 115+.
- Node.js 18+ for SSR / headless SVG export via jsdom.
- No IE11 support.

### 7.5 Bundle Size

- Core bundle (no adapters): **< 80 KB gzip**.
- D3 v7 peer dependency: consumers provide their own D3.

### 7.6 Developer Experience

- A developer should be able to render a basic schematic view from sample data in **under 10 lines of code**.
- Comprehensive API documentation, getting-started guide, and live examples.
- TypeScript types for full IDE autocompletion and type-safety.

---

## 8. Technical Architecture

### 8.1 Package Structure

| Package                             | Responsibility                                              |
| ----------------------------------- | ----------------------------------------------------------- |
| `@rail-schematic-viz/core`          | Graph model, coordinate systems, D3 renderer, overlay system|
| `@rail-schematic-viz/layout`        | Layout engine (proportional, compressed, metro-map, auto)   |
| `@rail-schematic-viz/parser-railml` | railML® 3 XML parser and validator                          |
| `@rail-schematic-viz/react`         | React wrapper                                               |
| `@rail-schematic-viz/vue`           | Vue 3 wrapper                                               |
| `@rail-schematic-viz/web-component` | Custom element wrapper                                      |
| `@rail-schematic-viz/themes`        | Default, high-contrast, and colour-blind safe theme tokens  |

The modular architecture allows developers to replace the layout engine with a custom one while keeping the data model, rendering, and interaction layers intact.

### 8.2 Internal Data Model

The core graph model is a typed directed multigraph:

```typescript
interface RailGraph {
  nodes: Map<string, RailNode>;
  edges: Map<string, RailEdge>;
  lines: Map<string, RailLine>;
  metadata: GraphMetadata;
}

interface RailNode {
  id: string;
  screenCoord: ScreenCoordinate; // { x, y } — primary
  linearRefs: LinearReference[]; // km-post references
  geoCoord?: GeographicCoordinate; // optional WGS-84
  type: "station" | "junction" | "signal" | "buffer" | "generic";
  adjacentEdges: string[];
}

interface RailEdge {
  id: string;
  fromNode: string;
  toNode: string;
  lengthMetres: number;
  lineRef: string;
  infrastructureObjects: InfraObject[]; // signals, crossings, mileposts
}

interface RailOverlay<T> {
  render(canvas: D3Selection, bridge: CoordinateBridge): void;
  data: T[];
  zIndex: number;
  visible: boolean;
  legend: LegendDescriptor;
}
```

### 8.3 Layout Pipeline

```
1. Parse input (railML® XML, JSON, or builder API)  →  RailGraph
2. Validate: check all screen coords present;
   fill missing via auto-layout algorithm (force-directed fallback)
3. Apply selected layout mode (proportional / compressed / metro-map)
4. Render base layer: edges → nodes → labels
5. Render overlay layers in registered z-order
6. Apply label collision detection
7. Attach event listeners
8. Apply viewport culling for visible elements
```

### 8.4 Auto-Layout Fallback

When `screenPositioningSystem` coordinates are absent (e.g. data sourced purely from `linearPositioningSystem`), the library uses a **topology-aware force simulation** to produce a readable schematic. The simulation respects line direction, station prominence, and junction angles. Output coordinates can be saved back as `screenPositioningSystem` values for reuse.

For geographic-to-schematic conversion, the library can apply line simplification (Douglas-Peucker algorithm) to reduce complex geographic curves into clean schematic segments.

### 8.5 Rendering Strategy

- **SVG** (default): for interactive elements, precise styling, and small-to-medium networks.
- **Canvas** (optional): for performance-critical layers — heat-maps with 10k+ data points, large network overviews.
- **Hybrid**: SVG for interactive elements (stations, signals) with Canvas underlay for dense data layers.

---

## 9. Data Standards & Interoperability

### 9.1 railML® 3

The parser supports all three railML® 3 positioning systems and the full topology model (`netElements`, `netRelations`, operational points). The library does not modify railML® XML but can emit updated `screenPositioningSystem` coordinates from auto-layout results.

### 9.2 RailTopoModel® (RTM)

The internal graph model closely mirrors the RTM abstract topology, making it straightforward to ingest data from any RTM-compliant tool chain (OpenTrack, Railsys, LUKS, OpenRailwayMap exports).

### 9.3 NaPTAN & BODS (UK)

An optional adapter resolves Network Rail's **ELR (Engineer's Line Reference)** and mileage to linear coordinates, enabling direct integration with UK operational data streams such as the Darwin live feed and the Public Performance Measure (PPM) dataset. Support for UK-specific units (Miles & Chains) is included.

### 9.4 RINF (EU)

Support for parsing **RINF** (Register of Infrastructure) section-of-line identifiers as a `linearPositioningSystem` reference, enabling integration with ERA RINF portal data.

---

## 10. Milestones & Phasing

### Phase 1 — Foundation _(Months 1–3)_

- Core graph model and TypeScript type definitions.
- railML® 3.2 / 3.3 parser (topology + `screenPositioningSystem` only).
- Basic SVG renderer: straight tracks, stations, switches.
- Pan & zoom.
- Proportional and compressed layout modes.
- React adapter.
- Unit test coverage ≥ 80%.
- Builder API for programmatic graph construction.

### Phase 2 — Overlays & Interactions _(Months 4–6)_

- Heat-map, annotation pin, and range band overlay types.
- `CoordinateBridge` (linear ↔ screen projection).
- Click / hover events with entity context.
- Label collision detection.
- Vue 3 and Web Component adapters.
- Storybook component library with interactive demos.

### Phase 3 — Advanced Features _(Months 7–10)_

- Auto-layout engine for data without screen coordinates.
- Metro-map (octilinear) and fixed-segment layout modes.
- Semantic zoom (Level of Detail).
- Export (SVG, PNG, print).
- WCAG 2.1 AA accessibility audit and remediation.
- NaPTAN / ELR adapter for UK deployments.
- Performance tuning: viewport culling, Canvas fallback for 5,000+ node networks.
- Time-series overlay with time slider.
- Brush selection and multi-select interactions.

### Phase 4 — Ecosystem _(Months 11–12)_

- RINF adapter for EU deployments.
- Plugin SDK documentation and example plugins.
- Angular community adapter.
- Brushing & linking between schematic and geographic views.
- Publish to npm under `@rail-schematic-viz` org.
- Developer documentation site (VitePress).

---

## 11. Success Metrics

| Metric                         | Target at 12 Months Post-Launch  |
| ------------------------------ | -------------------------------- |
| npm weekly downloads           | > 1,000                          |
| GitHub stars                   | > 500                            |
| Production integrations        | > 3 railway operators or vendors |
| Core bundle size               | < 80 KB gzip                     |
| Lighthouse Accessibility score | ≥ 90                             |
| P1 bug resolution time         | < 72 hours                       |
| Time to first render (new dev) | < 15 minutes with docs           |
| Render performance (500 nodes) | < 500 ms initial render          |

---

## 12. Risks & Mitigations

| Risk                                                      | Impact                                | Mitigation                                                                             |
| --------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------- |
| railML® schema complexity slows parser development        | High — delays Phase 1                 | Start with a constrained subset (topology + screen coords only); expand incrementally. |
| D3 v7 breaking changes                                    | Medium — rendering regressions        | Pin peer dependency range; maintain test suite against multiple D3 versions.           |
| Railway data licensing prevents public demos              | Medium — limits adoption              | Build synthetic demo datasets; partner with OpenRailwayMap for open data.              |
| Performance degrades on large networks                    | High — operators reject library       | Profile early; implement viewport culling; consider Canvas/WebGL for 5k+ nodes.        |
| Limited railway domain expertise in team                  | Medium — incorrect topology semantics | Engage a rail standards consultant; reference RTM and railML® 3 specs directly.        |
| Dense station throat areas resist automatic layout        | Medium — poor visual output           | Provide manual override API; document complex layouts as an advanced use case.          |
| Competing with internal tooling at large rail operators   | Medium — adoption friction            | Focus on composability and open standards; position as a building block, not a product. |

---

## 13. Open Questions

1. Should the library support rendering 3D / elevated track sections (viaducts, tunnels indicated by depth) in a future version?
2. Is a hosted Storybook / playground sufficient for the documentation site, or should there be a dedicated marketing / product page?
3. What licensing model best serves adoption: **MIT**, **Apache 2.0**, or a dual commercial licence for enterprise features?
4. Should the auto-layout engine be a separate package to keep the core lean?
5. Bi-directional sync with railML® editors (CARD/1, Railsys) — is this in scope beyond read-only for v2?
6. Should the Canvas renderer be a separate opt-in package or bundled in core with tree-shaking?
7. What level of real-time data integration (WebSocket feeds, MQTT) should the library support vs. leaving to the consuming application?

---

## 14. Appendix: Reference Material

### Standards & Specifications

- [railML® 3 Wiki — CO:positioning](https://wiki3.railml.org/wiki/CO:positioning)
- [RailTopoModel® specification](https://wiki.railtopomodel.org)
- [ERA RINF portal](https://rinf.era.europa.eu)

### Inspiration & Prior Art

- **KONUX Network product** — network usage insights for track inspection optimisation (Network Rail). Heat-map overlays on schematic track views reducing inspections by 25%.
- **Copenhagen City Rail & Mumbai Metro schematic maps** (Wikimedia Commons) — design reference for schematic conventions and octilinear (metro-map) layout.
- **tabatkins/railroad-diagrams** — syntax railroad diagrams in JS (adjacent problem, not a competitor).
- **CARD/1 railway design modules** — professional CAD tooling showing domain depth required.
- **OpenRailwayMap / QGIS + LUKS** — GIS-side tooling confirming the gap in schematic-only visualisation.
- **Lucas Jellema — Live inspection of railway data in QGIS** — practical example of rail data consumption patterns.

### The `screenPositioningSystem` in Context

The coordinate system at the core of this library is defined in railML® 3's `CO:positioning` schema. Within a railML® document, the `<positioning>` element under `<common>` can declare three child systems:

```xml
<common id="co_01">
  <positioning>
    <screenPositioningSystems>
      <!-- 2D canvas coords for schematic rendering -->
    </screenPositioningSystems>
    <linearPositioningSystems>
      <!-- km-post references along named lines -->
    </linearPositioningSystems>
    <geometricPositioningSystems>
      <!-- geographic coords via EPSG code -->
    </geometricPositioningSystems>
  </positioning>
</common>
```

The `screenPositioningSystem` was the system used at KONUX for the Network Rail product — schematic (x, y) positions assigned to each track node, enabling operational overlay data to be presented in a human-readable layout independent of geographic distortion.

---

_— End of Document —_
