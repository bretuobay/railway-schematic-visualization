# Rail Schematic Viz — Product Requirements Document

> **Version:** 0.1 — Initial PRD  
> **Status:** Draft — For Review  
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

---

## 2. Background & Motivation

### 2.1 The Problem

Railway operations teams and their software partners face a recurring challenge:

- **Geographic (GIS) maps** are too complex and cognitively demanding for day-to-day operational use.
- **Generic diagramming tools** (e.g. Mermaid, Lucidchart) have no concept of railway topology, linear referencing, or operational overlays.

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

By building a library that speaks railML® natively, renders schematic layouts via the `screenPositioningSystem`, and exposes an extensible overlay API, we can offer railway operators and their technology vendors a composable foundation rather than a locked-in tool.

---

## 3. Goals & Non-Goals

### 3.1 Goals

- Render interactive railway schematic diagrams from railML® 3 data.
- Support the railML® `screenPositioningSystem` as the primary coordinate space, with optional projection bridges to `linearPositioningSystem` (kilometre-posts) and `geometricPositioningSystem` (WGS-84 / EPSG-coded CRS).
- Provide a plug-in overlay system for heat-maps, annotations, traffic data, capacity indicators, and inspection states.
- Ship a minimal-dependency core rendering engine (D3 only) with optional adapters for React, Vue, and Web Components.
- Remain data-source agnostic: consume railML® XML, a JSON equivalent, or a programmatic builder API.
- Support pan, zoom, and click/hover interactions out of the box.
- Be accessible (WCAG 2.1 AA), internationalisation-ready, and print-exportable to SVG/PDF.

### 3.2 Non-Goals

- Full GIS geographic rendering (use Mapbox / OpenLayers for that).
- Train scheduling or timetable management.
- Real-time signalling or interlocking logic.
- Mobile-native (iOS / Android) implementations in v1.
- A hosted SaaS product — this is a library, not a platform.

---

## 4. Target Users & Use Cases

### 4.1 Primary User Segments

| User Segment                                                           | Representative Use Case                                                                                        |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Infrastructure Managers (e.g. Network Rail, DB InfraNetz, SNCF Réseau) | Overlay inspection coverage, asset health scores, and planned work onto a schematic of their managed route.    |
| Train Operating Companies                                              | Visualise real-time train positions and delay propagation on a simplified route diagram.                       |
| Rail Technology Vendors                                                | Embed a schematic view inside their PMS, CMMS, or performance analytics product without building from scratch. |
| Academic & Standards Bodies                                            | Prototype and publish railML® topology examples as interactive schematics.                                     |

### 4.2 Developer Personas

- **Frontend engineer** at a rail software company integrating the library into a React or Angular dashboard.
- **Data engineer** scripting batch SVG exports for operational reports.
- **Researcher** exploring track topology algorithms using the builder API.

---

## 5. Coordinate System Architecture

Understanding the three positioning systems in railML® 3 is essential context for the library's design.

### 5.1 The Three Positioning Systems

| System                       | Description                                                                                                                                       | Library Role                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `screenPositioningSystem`    | 2-D Cartesian (x, y) canvas coordinates assigned by schematic map authors. No geographic meaning.                                                 | **PRIMARY** — the core rendering coordinate space. All visual layout uses this system.                         |
| `linearPositioningSystem`    | Position along a named railway line expressed as a kilometre / mileage measure (e.g. "Line 6869, km 3.400"). The classic railway asset reference. | **SECONDARY** — used to anchor overlay data (inspection results, speed restrictions, etc.) to track positions. |
| `geometricPositioningSystem` | Geographic coordinates referenced by an EPSG code (e.g. WGS-84 / EPSG:4326). GPS-accurate positions.                                              | **OPTIONAL** — used when satellite imagery or geographic context is requested by the consumer.                 |

### 5.2 `screenPositioningSystem` Detail

The `screenPositioningSystem` defines a flat (x, y) coordinate for each `netElement` node. The library stores these as a typed `ScreenCoordinate { x: number; y: number }` and renders them directly onto an SVG canvas via D3 projection. Scale and aspect ratio are controlled by the library consumer through viewport configuration.

Track segments (`netElements`) between nodes are drawn as **cubic Bézier curves** by default, with straight-line and orthogonal (Manhattan) options available via a segment renderer plugin. Points / switches are rendered as branching fork glyphs anchored at their screen coordinate.

### 5.3 Coordinate Bridge

The library exposes a `CoordinateBridge` interface that maps linear measures to screen coordinates by interpolating along the rendered curve of the associated `netElement`. This bridge is the mechanism through which overlay data referenced by kilometre-post is positioned accurately on the schematic canvas.

```
Linear position (km 3.400 on Line 6869)
         ↓  CoordinateBridge.project()
Screen coordinate (x: 487, y: 312) on SVG canvas
```

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

---

### 6.2 Rendering Engine

#### 6.2.1 Core SVG Canvas

- Render the entire schematic as a single responsive SVG element using D3.
- Support configurable viewport dimensions, padding, and auto-fit mode.
- Implement D3 zoom and pan with configurable min/max scale bounds.

#### 6.2.2 Track Primitives

| Primitive                        | Rendering                                                             |
| -------------------------------- | --------------------------------------------------------------------- |
| Straight segment                 | Polyline from screen coordinates                                      |
| Curved segment                   | Cubic Bézier with auto-computed control points from adjacent tangents |
| Switch / point                   | Y-fork glyph with configurable limb angle                             |
| Station / operational point      | Configurable marker (rectangle, circle, or custom SVG symbol)         |
| Signal                           | Directional arrow glyph placed at linear position on track            |
| Level crossing / tunnel / bridge | Optional glyph annotations                                            |

#### 6.2.3 Track Styling

- Line colour, width, and dash pattern configurable per line, route, or individual `netElement`.
- State-based styling (normal, degraded, blocked, under maintenance) via CSS custom properties.
- Dark mode support via CSS media queries.

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

#### 6.3.2 Overlay API

- Overlays implement a typed interface `RailOverlay<T>` with a `render(canvas, bridge)` method.
- Multiple overlays can be stacked; consumers control z-order.
- Each overlay has independent opacity, visibility toggle, and legend descriptor.
- Custom overlays registered via `RailSchematic.registerOverlay(name, factory)`.

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

### 7.2 Accessibility

- WCAG 2.1 AA minimum for colour contrast on all default themes.
- All interactive elements reachable and operable via keyboard.
- ARIA roles and labels on SVG elements for screen-reader compatibility.

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

---

## 8. Technical Architecture

### 8.1 Package Structure

| Package                             | Responsibility                                                              |
| ----------------------------------- | --------------------------------------------------------------------------- |
| `@rail-schematic-viz/core`          | Graph model, coordinate systems, layout engine, D3 renderer, overlay system |
| `@rail-schematic-viz/parser-railml` | railML® 3 XML parser and validator                                          |
| `@rail-schematic-viz/react`         | React wrapper                                                               |
| `@rail-schematic-viz/vue`           | Vue 3 wrapper                                                               |
| `@rail-schematic-viz/web-component` | Custom element wrapper                                                      |
| `@rail-schematic-viz/themes`        | Default and high-contrast theme tokens                                      |

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
  type: "station" | "junction" | "signal" | "generic";
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
1. Parse input (railML® XML or JSON)  →  RailGraph
2. Validate: check all screen coords present;
   fill missing via auto-layout algorithm (force-directed fallback)
3. Build D3 simulation or static layout
4. Render base layer: edges → nodes → labels
5. Render overlay layers in registered z-order
6. Attach event listeners
```

### 8.4 Auto-Layout Fallback

When `screenPositioningSystem` coordinates are absent (e.g. data sourced purely from `linearPositioningSystem`), the library uses a **topology-aware force simulation** to produce a readable schematic. The simulation respects line direction, station prominence, and junction angles. Output coordinates can be saved back as `screenPositioningSystem` values for reuse.

---

## 9. Data Standards & Interoperability

### 9.1 railML® 3

The parser supports all three railML® 3 positioning systems and the full topology model (`netElements`, `netRelations`, operational points). The library does not modify railML® XML but can emit updated `screenPositioningSystem` coordinates from auto-layout results.

### 9.2 RailTopoModel® (RTM)

The internal graph model closely mirrors the RTM abstract topology, making it straightforward to ingest data from any RTM-compliant tool chain (OpenTrack, Railsys, LUKS, OpenRailwayMap exports).

### 9.3 NaPTAN & BODS (UK)

An optional adapter resolves Network Rail's **ELR (Engineer's Line Reference)** and mileage to linear coordinates, enabling direct integration with UK operational data streams such as the Darwin live feed and the Public Performance Measure (PPM) dataset.

### 9.4 RINF (EU)

Support for parsing **RINF** (Register of Infrastructure) section-of-line identifiers as a `linearPositioningSystem` reference, enabling integration with ERA RINF portal data.

---

## 10. Milestones & Phasing

### Phase 1 — Foundation _(Months 1–3)_

- Core graph model and TypeScript type definitions.
- railML® 3.2 / 3.3 parser (topology + `screenPositioningSystem` only).
- Basic SVG renderer: straight tracks, stations, switches.
- Pan & zoom.
- React adapter.
- Unit test coverage ≥ 80%.

### Phase 2 — Overlays & Interactions _(Months 4–6)_

- Heat-map, annotation pin, and range band overlay types.
- `CoordinateBridge` (linear ↔ screen projection).
- Click / hover events with entity context.
- Vue 3 and Web Component adapters.
- Storybook component library with interactive demos.

### Phase 3 — Advanced Features _(Months 7–10)_

- Auto-layout engine for data without screen coordinates.
- Export (SVG, PNG, print).
- WCAG 2.1 AA accessibility audit and remediation.
- NaPTAN / ELR adapter for UK deployments.
- Performance tuning for 5,000-node networks.

### Phase 4 — Ecosystem _(Months 11–12)_

- RINF adapter for EU deployments.
- Plugin SDK documentation and example plugins.
- Angular community adapter.
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

---

## 12. Risks & Mitigations

| Risk                                               | Impact                                | Mitigation                                                                             |
| -------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------- |
| railML® schema complexity slows parser development | High — delays Phase 1                 | Start with a constrained subset (topology + screen coords only); expand incrementally. |
| D3 v7 breaking changes                             | Medium — rendering regressions        | Pin peer dependency range; maintain test suite against multiple D3 versions.           |
| Railway data licensing prevents public demos       | Medium — limits adoption              | Build synthetic demo datasets; partner with OpenRailwayMap for open data.              |
| Performance degrades on large networks             | High — operators reject library       | Profile early; consider WebGL renderer as opt-in for 5k+ node networks.                |
| Limited railway domain expertise in team           | Medium — incorrect topology semantics | Engage a rail standards consultant; reference RTM and railML® 3 specs directly.        |

---

## 13. Open Questions

1. Should the library support rendering 3D / elevated track sections (viaducts, tunnels indicated by depth) in a future version?
2. Is a hosted Storybook / playground sufficient for the documentation site, or should there be a dedicated marketing / product page?
3. What licensing model best serves adoption: **MIT**, **Apache 2.0**, or a dual commercial licence for enterprise features?
4. Should the auto-layout engine be a separate package to keep the core lean?
5. Bi-directional sync with railML® editors (CARD/1, Railsys) — is this in scope beyond read-only for v2?

---

## 14. Appendix: Reference Material

### Standards & Specifications

- [railML® 3 Wiki — CO:positioning](https://wiki3.railml.org/wiki/CO:positioning)
- [RailTopoModel® specification](https://wiki.railtopomodel.org)
- [ERA RINF portal](https://rinf.era.europa.eu)

### Inspiration & Prior Art

- **KONUX Network product** — network usage insights for track inspection optimisation (Network Rail). Heat-map overlays on schematic track views reducing inspections by 25%.
- **Copenhagen City Rail & Mumbai Metro schematic maps** (Wikimedia Commons) — design reference for schematic conventions.
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
