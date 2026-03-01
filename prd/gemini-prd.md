This Product Requirements Document (PRD) outlines the development of **"RailSchematic.js"**, a TypeScript/D3-based library specifically designed for railway infrastructure visualization.

As you noted from your experience at KONUX and working with Network Rail, the core challenge is moving away from purely geographic (GPS) coordinates toward **Linear Referencing Systems (LRS)** and **Schematic Layouts**.

---

# PRD: RailSchematic.js Visualisation Library

## 1. Executive Summary

Railway operators struggle to visualize dense technical data (stress, heatmaps, traffic, maintenance schedules) on geographic maps because curves, overlapping tracks, and scale make the data illegible.

**RailSchematic.js** is a frontend library that abstracts complex railway geometry into a clean, schematic "straightened" or "grid-aligned" view, allowing for high-density data overlays (Heatmaps, Annotations, Capacity Planning).

## 2. The Core Concept: Positioning Systems

To recreate the KONUX/Network Rail style, the library must support two primary coordinate systems:

- **Linear Referencing System (LRS):** Positioning based on "Line Number" (e.g., ELR - Engineering Line Reference) and "Mileage/Chainage" (distance from a fixed datum). This is how Network Rail identifies every asset.
- **Schematic/Orthogonal Grid:** A coordinate system where tracks are forced into 0, 45, or 90-degree angles (like the London Underground map) to maximize readability for traffic and maintenance monitoring.

## 3. User Personas

- **Maintenance Engineer:** Needs to see "Heatmaps" of track stress/temperature on a schematic line.
- **Capacity Planner:** Needs to see "occupancy blocks" and "headway" between trains.
- **Software Developer:** Needs a D3-compatible API to feed JSON/GeoJSON/railML data into a web dashboard.

## 4. Functional Requirements

### 4.1 Data Input & Normalization

- **Multi-Format Support:** Import data via **railML** (Positioning schema), GeoJSON, or simple CSV (Line ID, Start_Mileage, End_Mileage).
- **Coordinate Transformation:** A "Projection Engine" that converts GPS Lat/Long into a normalized 1D linear path or a 2D schematic grid.

### 4.2 Visualization Features

- **The "Straightened" View:** Ability to "unroll" a curved track into a perfectly horizontal line for time-distance (string-line) charts.
- **Heatmap Overlays:** A layer-based system to apply gradients to track segments based on numerical values (e.g., tonnage, rail wear, or temperature).
- **Node & Link Components:** Pre-defined SVG components for:
- Switches/Points (Turnouts)
- Signals (LED/Semaphore status)
- Stations/Platforms
- Kilometer/Mile Posts

- **Dynamic Zoom (LOD):** Semantic zooming where track details (individual rails, sleepers) appear when zooming in, but only "Line segments" appear when zooming out.

### 4.3 Annotations & Interaction

- **Event Markers:** Support for "Point Assets" (e.g., a specific fault at Mile 12.4).
- **Time-Space Integration:** Support for visualizing moving objects (trains) along the schematic path in real-time.
- **Brushing & Linking:** Clicking a schematic segment should highlight the corresponding geographic segment on a secondary map.

## 5. Technical Stack

- **Language:** TypeScript (for type-safe railway logic).
- **Rendering:** D3.js (SVG for interactivity, Canvas for high-performance heatmaps with 10k+ data points).
- **State Management:** Framework agnostic (should work with React, Vue, or Angular).
- **Geometry Engine:** `d3-linear-axis` or a custom implementation of the **Douglas-Peucker algorithm** to simplify geographic lines into schematic ones.

## 6. Implementation Phases

### Phase 1: The Linear Engine (MVP)

- Build the math engine that maps `Track_ID + Mileage` to an `(x, y)` coordinate on a screen.
- Render a single track with a basic "Heatmap" overlay.

### Phase 2: Topology & Junctions

- Introduce "Switches." Handle the logic of diverging lines.
- Ensure that when a main line is "straightened," the branch lines follow at a 45-degree angle.

### Phase 3: The "Network Rail" Layer

- Support for UK-specific units (Miles & Chains).
- Integration of Signal-to-Signal "Block" visualization.

## 7. Reference Benchmarks (from your links)

- **Linear Positioning:** Inspired by [railML CO:positioning](https://wiki3.railml.org/wiki/CO:positioning).
- **Visual Style:** Mimicking the [Copenhagen Schematic](https://commons.wikimedia.org/wiki/File:Copenhagen_City_Rail_Schematic_Map.png) for clean 45-degree angles.
- **Data Density:** Inspired by [KONUX Network Usage Insights](https://konux.com/introducing-konux-network-network-usage-insights-to-optimise-inspections-resources/) for health-monitoring overlays.

## 8. Success Metrics

- **Performance:** Ability to render 100km of track data with 1-meter resolution at 60fps.
- **Usability:** A developer can render a basic schematic track with 5 lines of code.
- **Accuracy:** The transformation from GPS to Schematic must maintain a consistent "Distance" scale so that engineers can rely on the mileage readings.
