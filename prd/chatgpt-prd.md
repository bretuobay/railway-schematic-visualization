Great problem space — and very aligned with your frontend architecture focus.

You’re not looking for **geographic coordinates (WGS84 lat/lon)**.
You’re looking for a **schematic or linear referencing coordinate system** — sometimes called:

- **Linear Referencing System (LRS)**
- **Chainage / Kilometrage positioning**
- **Engineering coordinate system**
- **Topological / schematic layout coordinate system**
- In railML: **Intrinsic / Linear Positioning** (see railML positioning model)

This is exactly what companies like Network Rail and vendors like KONUX use internally.

Instead of (lat, lon), you model:

```
TrackID + positionAlongTrack (meters)
```

Then render that onto a schematic layout that may:

- compress distances
- straighten curves
- exaggerate switches
- ignore geography entirely

---

# Key Concept for the PRD

Your library should support:

## 1️⃣ Dual Coordinate Model

### A. Logical / Engineering Coordinates (Source of Truth)

- Track ID
- Start / End chainage
- Direction
- Track topology graph (nodes + edges)
- Switches (points)
- Signals
- Assets

### B. Schematic Rendering Coordinates

- X/Y screen coordinates
- Layout constraints
- Spacing rules
- Switch geometry templates

This separation is CRITICAL.

---

# Product Requirements Document (PRD)

Below is a structured PRD draft tailored for a railway-grade visualisation SDK.

---

# 📘 Product Requirements Document

## Product: Railway Schematic Visualization SDK

---

## 1. Vision

Build a **TypeScript + D3-based visualization library** that enables railway operators to render interactive schematic railway views based on linear referencing systems rather than geographic coordinates.

The library should allow infrastructure managers (e.g. Network Rail), metro operators, and inspection platforms (like KONUX) to build:

- Track schematics
- Traffic overlays
- Capacity visualizations
- Asset heatmaps
- Maintenance planning tools
- Real-time condition monitoring dashboards

---

## 2. Problem Statement

Existing GIS-based solutions (e.g. QGIS) are:

- Too geographic
- Hard to visually compress
- Not optimized for operations dashboards
- Not suited for dense engineering overlays

Railway operators need:

- Linear clarity
- Topology correctness
- Operational readability
- Overlay capability

---

## 3. Target Users

### Primary

- Railway infrastructure operators
- Asset monitoring platforms
- Capacity planning teams
- Maintenance planners

### Secondary

- Control room dashboards
- Inspection engineers
- Digital twin platforms

---

## 4. Core Design Principles

1. **Topology-first**
2. **Linear referencing native**
3. **Overlay-ready**
4. **Highly extensible**
5. **Declarative rendering API**
6. **Framework-agnostic (React/Vue/Angular compatible)**

---

# 5. Functional Requirements

---

## 5.1 Data Model

### 5.1.1 Track Topology

The system must support:

- Nodes (switches, buffers, crossings)
- Edges (track segments)
- Directionality
- Multi-track corridors
- Branches
- Loops

Example:

```ts
type TrackNode = {
  id: string;
  type: "switch" | "buffer" | "junction";
};

type TrackEdge = {
  id: string;
  from: string;
  to: string;
  length: number; // meters
};
```

---

## 5.2 Linear Referencing Support (Core Requirement)

Each asset must support:

```ts
type LinearPosition = {
  trackId: string;
  startMeter: number;
  endMeter?: number;
};
```

Must support:

- Single-point assets (signals)
- Ranged assets (bridges, slow zones)
- Direction-aware positioning

---

## 5.3 Layout Engine (Schematic Coordinate System)

The library must:

### ✔ Convert topology → schematic layout

Options:

- Horizontal linear layout
- Vertical layout
- Multi-corridor stacked layout
- Branch layout with angle control
- Auto spacing rules

### ✔ Provide Layout Modes

1. **True scale mode** (proportional)
2. **Compressed mode**
3. **Fixed-segment mode**
4. **Metro-map mode** (like Copenhagen City Rail Schematic Map)

---

## 5.4 Rendering Engine

Built using:

- D3 (data binding + path generation)
- SVG for precision
- Optional Canvas for performance mode

Must support:

- Zoom
- Pan
- Fit-to-track
- Track highlighting
- Layer toggling

---

## 5.5 Overlay System (Critical)

This is where your KONUX inspiration comes in.

Support:

### 5.5.1 Heatmaps

- Condition scores
- Usage density
- Traffic intensity
- Capacity utilization

### 5.5.2 Annotation Layer

- Manual notes
- Alerts
- Engineering comments
- Issue markers

### 5.5.3 Time-Series Overlay

- Time slider
- Historical state replay
- Predictive forecast layer

---

## 5.6 Switch Rendering System

Provide configurable switch templates:

- Left turnout
- Right turnout
- Double-slip
- Crossover

Geometry must:

- Preserve topology
- Allow stylization
- Support operator branding

---

## 5.7 Interaction Model

- Click → select asset
- Hover → tooltip
- Brush selection
- Multi-select
- Event hooks

```ts
onAssetClick(assetId);
onTrackHover(trackId);
```

---

## 6. Non-Functional Requirements

### Performance

- Must handle 50k+ assets
- Virtualization for large corridors
- WebGL fallback optional

### Extensibility

- Plugin architecture
- Custom overlay plugins
- Theming system

### Accessibility

- Color-blind safe palettes
- Keyboard navigation

---

## 7. API Design

### Declarative Initialization

```ts
createRailwaySchematic({
  topology,
  assets,
  overlays,
  layout: {
    mode: "compressed",
    orientation: "horizontal",
  },
});
```

---

## 8. Integration Requirements

### Must Support:

- railML imports (via positioning model)
- JSON topology
- Real-time WebSocket feeds
- REST data sources

---

## 9. Competitive Landscape

### CAD-based Systems

- CARD/1
- Heavy engineering focus
- Not web-native

### GIS Systems

- QGIS
- Geographic bias
- Hard to abstract

### Diagram Libraries

- Railroad Diagrams
- Grammar diagrams
- Not railway topology-aware

Your opportunity:

> Build the first railway-native schematic SDK for modern web applications.

---

# 10. Future Extensions

- Real-time train tracking
- Conflict detection
- Capacity simulation
- Digital twin integration
- AI anomaly visualization
- Predictive maintenance overlays

---

# 11. Technical Architecture Proposal

### Core Packages

```
@rail-schematic/core
@rail-schematic/layout
@rail-schematic/react
@rail-schematic/overlays
@rail-schematic/railml
```

---

# 12. MVP Scope

For v1:

- Linear corridor
- Switch rendering
- Heatmap overlay
- Annotation layer
- Zoom/pan
- TypeScript API

No real-time yet.

---

# Final Strategic Advice

The key innovation is:

> Treat railway schematics like a topology-driven rendering engine
> not a map.

Your differentiator is:

- Linear referencing native
- Overlay-first architecture
- Web-native
- Highly composable

---

If you’d like, I can next:

- Turn this into a **board-ready strategy document**
- Or refine it into a **technical RFC for engineers**
- Or help you define the mathematical model of the schematic coordinate system in detail\*\*
