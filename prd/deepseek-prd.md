---

### **Product Requirements Document: Railway Schematic Visualization Library (Working Title: `RailSchema`)**

**Version:** 1.0 (Draft)
**Date:** October 26, 2023
**Status:** Draft

### 1. Executive Summary

**Product Name:** `RailSchema` (working title)
**Objective:** To develop a robust, open-source JavaScript/TypeScript visualization library that enables railway operators and infrastructure managers to build interactive, schematic web applications. The library will focus on transforming complex railway network data—defined by linear references and topology—into clear, user-configurable schematic diagrams, moving beyond geographically-accurate maps for enhanced operational insights.

### 2. Problem Statement & Market Opportunity

Railway companies like Network Rail manage vast amounts of infrastructure data. While Geographic Information Systems (GIS) are essential, geographically accurate maps can become visually cluttered and cognitively difficult to use for specific tasks like traffic monitoring, capacity planning, and asset health visualization (e.g., heat maps).
A schematic view, which simplifies geometry and emphasizes topology and relative position, is often superior. It provides a cleaner, more focused canvas for overlaying operational data. Currently, teams often build bespoke, one-off solutions. A standard, well-documented library would significantly reduce development time and cost, providing a consistent and powerful tool for the industry. Your experience at KONUX directly validates this market need.

### 3. Target Audience & User Personas

- **Primary: Frontend Developers** in railway technology teams (e.g., at KONUX, Network Rail, Deutsche Bahn). They need a well-documented, type-safe (TypeScript) library with a clear API to build applications for their internal users.
- **Secondary: UI/UX Designers** specializing in geospatial or operational tools. They need to understand the library's capabilities and constraints to design effective user interfaces.
- **End Users (Indirect):** Traffic managers, capacity planners, infrastructure maintainers who will use the applications built with `RailSchema` to monitor train movements, plan maintenance, and visualize asset data.

### 4. Core Functional Requirements

#### 4.1. Data Model & Positioning System (The Core Challenge)

This is the most critical part. The library must accept and operate on a data model that aligns with industry standards (like **railML**) and the dual nature of railway positioning.

- **Requirement 4.1.1:** The library's core data model MUST support a **Linear Referencing System (LRS)** . This is the "schematic coordinate system" you recall. It should be based on a network of lines (tracks) and measure values (e.g., mileage, kilometer points). (See [railML.org's Linear Positioning System](https://wiki3.railml.org/wiki/CO:positioning#Linear_Positioning_System)).
- **Requirement 4.1.2:** The data model MUST also accept **geometric (geographic) coordinates** (e.g., latitude/longitude) for each network element. The library will use these as a "fallback" or "base layer" but will _not_ be constrained by them for the final schematic layout. (See [railML.org's Geometric Positioning System](https://wiki3.railml.org/wiki/CO:positioning#Geometric_Positioning_System)).
- **Requirement 4.1.3:** The library MUST define a clear, internal data structure for a directed graph representing the railway network. This graph will consist of:
  - **Nodes:** Represent significant points like stations, junctions, signal locations, and points where track attributes change.
  - **Edges (Links):** Represent track segments between nodes, with properties like `length` (in meters/kilometers), `lineId`, and references to the LRS (e.g., `startMeasure`, `endMeasure`). This mirrors concepts from the [railML topology elements](https://wiki3.railml.org/wiki/CO:positioning#Length_of_Topology_elements).
- **Requirement 4.1.4:** The library MUST provide helper functions or expect a data adapter that can transform common input formats (e.g., GeoJSON with linear referencing extensions, railML 3.x) into its internal graph model.

#### 4.2. Schematic Layout Engine

This engine transforms the topological graph into a 2D visual representation.

- **Requirement 4.2.1:** **Schematic Projection:** Implement a default layout algorithm that renders the network schematically. It should prioritize topology and relative linear positions over geographic accuracy. For example, a perfectly straight 10km track in the real world might be drawn with a gentle, stylized curve to fit the screen, but its length relative to other segments on the same line should be visually discernible.
- **Requirement 4.2.2:** **Line Orientation:** Provide options for primary line orientation (e.g., horizontal, vertical, or octilinear—using only 0°, 45°, 90° angles—as seen in classic metro maps like [Copenhagen's](https://commons.wikimedia.org/wiki/File:Copenhagen_City_Rail_Schematic_Map.png) or [Mumbai's](https://de.wikipedia.org/wiki/Datei:Mumbai_Metropolitan_Railway_Schematic_Map.svg)).
- **Requirement 4.2.3:** **Node and Edge Styling:** Allow developers to define and apply visual styles based on data properties. Examples:
  - Stations as labeled circles or squares.
  - Junctions as diamonds.
  - Track lines with customizable colors, thickness, and dash patterns (e.g., single track, double track, electrified).
  - Support for complex track work like crossovers and turnouts using standard railway diagram symbols (inspired by [railroad-diagrams](https://github.com/tabatkins/railroad-diagrams)).

#### 4.3. Interactive Visualization & Overlays

This layer enables the powerful use cases you mentioned (heat maps, traffic monitoring).

- **Requirement 4.3.1:** **Dynamic Data Binding:** Provide an API to easily bind real-time or static data to the graph elements. This data can then be used to drive visual properties.
- **Requirement 4.3.2:** **Heatmap Overlays:** Enable the creation of heatmaps along track segments by binding a continuous data value (e.g., "axle counts," "track quality index," "remaining useful life") to the LRS. The library should interpolate the color along the edge based on the measure. (See [KONUX Network Usage Insights](https://konux.com/introducing-konux-network-network-usage-insights-to-optimise-inspections-resources/)).
- **Requirement 4.3.3:** **Annotations & Labels:** Support placing annotations (text, icons, tooltips) at specific LRS points or nodes. Annotations should be intelligently placed to avoid overlaps (label collision detection).
- **Requirement 4.3.4:** **Interactivity:** Standard interactive features are essential:
  - **Pan & Zoom:** Smooth navigation across the schematic.
  - **Click & Hover Events:** Emit events with the underlying data when a user interacts with an element (track, station, annotation).
  - **Selection & Highlighting:** Programmatically or interactively highlight specific elements.

### 5. Technical Requirements

- **Requirement 5.1:** **Core Stack:** Built with **TypeScript** for type safety and developer experience. Use **D3.js** for its powerful rendering (SVG/Canvas) and layout computation capabilities. D3 is the ideal choice for this kind of custom, data-driven visualization.
- **Requirement 5.2:** **Modular Architecture:** The library should be modular, allowing developers to potentially replace the layout engine with a custom one while keeping the data model and interaction layers.
- **Requirement 5.3:** **Framework Agnostic:** The core library should be vanilla JavaScript/TypeScript. Provide optional wrapper modules or clear integration examples for popular frameworks like React, Angular, and Vue.js.
- **Requirement 5.4:** **Performance:** Must handle large networks (e.g., thousands of nodes and edges) smoothly. Use techniques like canvas rendering for complex, static layers and SVG for interactive elements, or a hybrid approach. Implement viewport culling (only rendering what's visible).
- **Requirement 5.5:** **Accessibility (a11y):** Ensure generated graphics can be made accessible with appropriate ARIA labels and keyboard navigation support where possible.
- **Requirement 5.6:** **Documentation & Examples:** Provide comprehensive API documentation, a getting-started guide, and multiple live examples (e.g., simple line diagram, heatmap overlay, station panel view).

### 6. Out of Scope (for V1)

- A full, WYSIWYG diagram editor. The focus is on rendering from data.
- Automatic layout of extremely dense, complex station throat areas. This may require manual intervention or future algorithmic improvements.
- Integration with specific real-time data protocols (e.g., MQTT). The library will accept data via its standard API, leaving protocol handling to the application.
- Native mobile support (though the web library should be usable on tablets).

### 7. Success Metrics

- **Developer Adoption:** Number of downloads, GitHub stars, and community contributions.
- **Ease of Integration:** Time taken for a new developer to create a simple schematic view from sample data.
- **Performance:** Render time and frame rate for a standard network of ~1000 elements.
- **Feature Completeness:** Ability to successfully create a schematic view that supports the core use cases (line view with heatmap, station schematic) defined in this PRD.

This PRD provides a solid foundation. The next steps would be to define the specific data input format (JSON schema) and start prototyping the core schematic layout engine using D3.js and the principles of linear referencing. Good luck with this exciting project
