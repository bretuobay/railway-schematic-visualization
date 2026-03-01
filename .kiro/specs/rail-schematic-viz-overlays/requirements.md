# Requirements Document

## Introduction

The rail-schematic-viz-overlays package provides the data visualization layer for the Rail Schematic Viz library. This package implements a pluggable overlay system that enables railway operators, analysts, and planners to visualize operational data, metrics, and annotations on top of railway schematic diagrams. The overlay system supports multiple built-in overlay types (heat-maps, annotations, range bands, traffic flow, time-series) and provides an extensible architecture for custom overlay development.

This package builds on @rail-schematic-viz/core (data model, rendering, coordinate bridge) and @rail-schematic-viz/layout (viewport, interaction) to provide rich data visualization capabilities. It transforms static schematic diagrams into dynamic, data-driven visualizations suitable for operational monitoring, capacity planning, maintenance tracking, and analytical workflows.

The overlay system is designed for performance with large datasets, supporting Canvas rendering for dense data layers, efficient update patterns to avoid full re-renders, and intelligent label collision detection for readable annotations.

## Glossary

- **Overlay**: A composable visual layer rendered on top of the base schematic diagram
- **Overlay_System**: The architecture managing multiple overlay instances and their rendering
- **Heat_Map_Overlay**: An overlay that visualizes continuous scalar metrics using color gradients
- **Annotation_Overlay**: An overlay that displays labeled markers at specific track locations
- **Range_Band_Overlay**: An overlay that highlights track sections between two positions
- **Traffic_Flow_Overlay**: An overlay that visualizes train frequency and direction with arrows
- **Time_Series_Overlay**: An overlay that displays temporal data with playback controls
- **Custom_Overlay**: A user-defined overlay type registered via the plugin API
- **Overlay_Manager**: The component that controls visibility, z-order, and opacity of overlays
- **Color_Scale**: A mapping function from scalar values to colors
- **Color_Palette**: A predefined set of colors for data visualization
- **Legend_Descriptor**: Metadata describing an overlay's visual encoding (scale, units, colors)
- **Collision_Detection**: Algorithm that prevents overlapping labels for readability
- **Canvas_Rendering**: Performance optimization using HTML5 Canvas for dense data layers
- **Update_Pattern**: D3's enter-update-exit pattern for efficient data-driven updates
- **Linear_Position**: A position along a track expressed as track ID and distance measure
- **Screen_Coordinate**: A 2D position in SVG viewport units (x, y pixels)
- **CoordinateBridge**: Component from core package that projects linear to screen coordinates
- **RailGraph**: The core data structure representing railway topology
- **Renderer**: The SVG/Canvas rendering engine from the core package
- **Viewport**: The visible portion of the schematic canvas
- **Z_Order**: The rendering order of overlays (controls which appears on top)
- **Opacity**: The transparency level of an overlay (0.0 = transparent, 1.0 = opaque)

## Requirements

### Requirement 1: Overlay System Architecture

**User Story:** As a library user, I want a pluggable overlay system, so that I can add multiple data visualization layers to schematics.

#### Acceptance Criteria

1. THE Overlay_System SHALL define a RailOverlay interface that all overlay types must implement
2. THE RailOverlay interface SHALL include a render() method accepting canvas context and CoordinateBridge
3. THE RailOverlay interface SHALL include an update() method for data updates without full re-render
4. THE RailOverlay interface SHALL include a destroy() method for cleanup when overlay is removed
5. THE RailOverlay interface SHALL include a getLegend() method returning Legend_Descriptor
6. THE Overlay_System SHALL maintain a collection of active overlay instances
7. THE Overlay_System SHALL render overlays in z-order sequence
8. THE Overlay_System SHALL provide TypeScript type definitions for the RailOverlay interface

### Requirement 2: Overlay Registration

**User Story:** As a developer, I want to add overlays to schematics, so that I can visualize operational data.

#### Acceptance Criteria

1. THE Renderer SHALL provide an addOverlay() method accepting overlay type and configuration
2. THE Renderer SHALL provide a removeOverlay() method accepting overlay identifier
3. THE Renderer SHALL assign a unique identifier to each overlay instance
4. WHEN an overlay is added, THE Renderer SHALL invoke the overlay's render() method
5. WHEN an overlay is removed, THE Renderer SHALL invoke the overlay's destroy() method
6. THE Renderer SHALL support adding multiple instances of the same overlay type with independent data
7. THE Renderer SHALL emit overlay-added and overlay-removed events
8. THE Renderer SHALL validate that overlay configuration includes required properties

### Requirement 3: Heat-Map Overlay Implementation

**User Story:** As a railway operations analyst, I want to visualize continuous scalar metrics along tracks, so that I can identify areas of high utilization, stress, or delay.

#### Acceptance Criteria

1. THE Heat_Map_Overlay SHALL accept data as an array of {linearPosition, value} pairs
2. WHEN heat-map data is provided, THE Heat_Map_Overlay SHALL project each linearPosition to Screen_Coordinate using CoordinateBridge
3. THE Heat_Map_Overlay SHALL render a continuous color gradient along track segments based on scalar values
4. THE Heat_Map_Overlay SHALL support configurable Color_Scale including linear, logarithmic, and custom functions
5. THE Heat_Map_Overlay SHALL support configurable Color_Palette including sequential, diverging, and color-blind safe options
6. THE Heat_Map_Overlay SHALL interpolate colors between data points for smooth gradients
7. THE Heat_Map_Overlay SHALL render using Canvas when enabled for performance with dense data
8. WHEN heat-map data is updated, THE Heat_Map_Overlay SHALL use D3's update pattern to avoid full re-render

### Requirement 4: Heat-Map Performance

**User Story:** As a user viewing large datasets, I want smooth heat-map rendering, so that I can interact without lag.

#### Acceptance Criteria

1. WHEN Canvas rendering is enabled, THE Heat_Map_Overlay SHALL render up to 10000 data points at 60 frames per second
2. THE Heat_Map_Overlay SHALL use spatial indexing to query only data points visible in the current viewport
3. THE Heat_Map_Overlay SHALL cache rendered gradients to avoid redundant computation
4. THE Heat_Map_Overlay SHALL debounce updates during continuous viewport changes (pan, zoom)
5. THE Heat_Map_Overlay SHALL complete data updates within 100 milliseconds for datasets with 1000 points
6. THE Heat_Map_Overlay SHALL provide configurable performance mode (quality vs speed trade-offs)
7. THE Heat_Map_Overlay SHALL emit performance metrics for render time and data point count

### Requirement 5: Heat-Map Legend

**User Story:** As a user viewing heat-maps, I want to understand the color encoding, so that I can interpret the visualization.

#### Acceptance Criteria

1. THE Heat_Map_Overlay SHALL provide a getLegend() method returning Legend_Descriptor
2. THE Legend_Descriptor SHALL include the metric name and units
3. THE Legend_Descriptor SHALL include the Color_Scale type (linear, logarithmic, custom)
4. THE Legend_Descriptor SHALL include the Color_Palette with color stops and values
5. THE Legend_Descriptor SHALL include the data value range (minimum, maximum)
6. THE Renderer SHALL provide a method to render legend descriptors as SVG elements
7. THE Renderer SHALL support configurable legend position (top-left, top-right, bottom-left, bottom-right)

### Requirement 6: Annotation Overlay Implementation

**User Story:** As a track inspector, I want to place labeled markers at specific locations, so that I can annotate defects, inspection waypoints, and speed restrictions.

#### Acceptance Criteria

1. THE Annotation_Overlay SHALL accept data as an array of {linearPosition, label, icon} objects
2. WHEN annotation data is provided, THE Annotation_Overlay SHALL project each linearPosition to Screen_Coordinate
3. THE Annotation_Overlay SHALL render a pin marker at each projected coordinate
4. THE Annotation_Overlay SHALL render label text adjacent to each pin marker
5. THE Annotation_Overlay SHALL support configurable pin icons including default markers and custom SVG symbols
6. THE Annotation_Overlay SHALL support configurable label styling including font size, color, and background
7. THE Annotation_Overlay SHALL emit click events when annotation pins are clicked
8. THE Annotation_Overlay SHALL include annotation data (linearPosition, label, custom properties) in click events

### Requirement 7: Annotation Collision Detection

**User Story:** As a user viewing dense annotations, I want readable labels, so that I can distinguish individual annotations.

#### Acceptance Criteria

1. THE Annotation_Overlay SHALL implement Collision_Detection to prevent overlapping labels
2. THE Collision_Detection SHALL compute bounding boxes for all label elements
3. WHEN labels overlap, THE Collision_Detection SHALL adjust label positions to maintain readability
4. THE Collision_Detection SHALL support configurable proximity threshold for collision detection
5. THE Collision_Detection SHALL prioritize higher-importance annotations when resolving collisions
6. THE Collision_Detection SHALL use leader lines to connect adjusted labels to their pin markers
7. THE Collision_Detection SHALL complete within 200 milliseconds for 500 annotations
8. THE Annotation_Overlay SHALL provide configurable collision resolution strategy (adjust, hide, cluster)

### Requirement 8: Annotation Clustering

**User Story:** As a user viewing many annotations at low zoom, I want clustered markers, so that I can see overview without clutter.

#### Acceptance Criteria

1. WHERE clustering is enabled, THE Annotation_Overlay SHALL group nearby annotations into cluster markers
2. THE Annotation_Overlay SHALL display cluster markers with a count badge showing number of annotations
3. THE Annotation_Overlay SHALL support configurable clustering distance threshold
4. WHEN a user clicks on a cluster marker, THE Annotation_Overlay SHALL emit a cluster-click event with all annotation data
5. WHEN zoom level increases, THE Annotation_Overlay SHALL expand clusters into individual annotations
6. THE Annotation_Overlay SHALL animate cluster expansion and collapse transitions
7. THE Annotation_Overlay SHALL use spatial indexing (R-tree or quadtree) for efficient clustering

### Requirement 9: Range Band Overlay Implementation

**User Story:** As a railway planner, I want to highlight track sections, so that I can visualize engineering possessions, speed restriction zones, and work areas.

#### Acceptance Criteria

1. THE Range_Band_Overlay SHALL accept data as an array of {startPosition, endPosition, color, label} objects
2. WHEN range band data is provided, THE Range_Band_Overlay SHALL project start and end positions to Screen_Coordinates
3. THE Range_Band_Overlay SHALL render a colored zone covering the track segment between positions
4. THE Range_Band_Overlay SHALL support configurable band colors, opacity, and border styles
5. THE Range_Band_Overlay SHALL follow track topology when rendering bands spanning multiple connected segments
6. THE Range_Band_Overlay SHALL support hover events that emit band data when cursor enters band area
7. THE Range_Band_Overlay SHALL render optional labels at the midpoint of each band
8. THE Range_Band_Overlay SHALL support configurable label positioning (above, below, inline)

### Requirement 10: Range Band Overlap Handling

**User Story:** As a user viewing overlapping range bands, I want to see all bands, so that I can understand multiple concurrent restrictions or zones.

#### Acceptance Criteria

1. WHEN multiple range bands overlap, THE Range_Band_Overlay SHALL render them with configurable z-ordering
2. THE Range_Band_Overlay SHALL support configurable blending modes (normal, multiply, screen)
3. THE Range_Band_Overlay SHALL support stacked rendering where overlapping bands are offset vertically
4. THE Range_Band_Overlay SHALL support configurable opacity to show overlapping bands through transparency
5. THE Range_Band_Overlay SHALL render band borders to distinguish overlapping bands
6. WHEN a user hovers over overlapping bands, THE Range_Band_Overlay SHALL highlight the topmost band
7. THE Range_Band_Overlay SHALL emit hover events for all overlapping bands at cursor position

### Requirement 11: Traffic Flow Overlay Implementation

**User Story:** As a capacity planner, I want to visualize train frequency and direction, so that I can identify bottlenecks and optimize scheduling.

#### Acceptance Criteria

1. THE Traffic_Flow_Overlay SHALL accept data as an array of {linearPosition, direction, frequency} objects
2. WHEN traffic flow data is provided, THE Traffic_Flow_Overlay SHALL render directional arrows along track segments
3. THE Traffic_Flow_Overlay SHALL scale arrow width proportional to frequency value
4. THE Traffic_Flow_Overlay SHALL orient arrows based on direction value (up, down, bidirectional)
5. THE Traffic_Flow_Overlay SHALL support configurable arrow colors, styles, and spacing
6. THE Traffic_Flow_Overlay SHALL support optional animation showing flow direction
7. WHEN traffic flow includes bidirectional data, THE Traffic_Flow_Overlay SHALL render separate arrows for each direction
8. THE Traffic_Flow_Overlay SHALL provide a getLegend() method indicating frequency scale and units

### Requirement 12: Traffic Flow Animation

**User Story:** As a user viewing traffic flow, I want animated arrows, so that I can quickly understand flow direction.

#### Acceptance Criteria

1. WHERE animation is enabled, THE Traffic_Flow_Overlay SHALL animate arrows moving in the flow direction
2. THE Traffic_Flow_Overlay SHALL support configurable animation speed proportional to frequency
3. THE Traffic_Flow_Overlay SHALL use CSS animations or Canvas animation for smooth 60 FPS performance
4. THE Traffic_Flow_Overlay SHALL provide controls to enable/disable animation
5. THE Traffic_Flow_Overlay SHALL pause animation when overlay is not visible
6. THE Traffic_Flow_Overlay SHALL support configurable animation style (continuous, pulsing, dashed)
7. THE Traffic_Flow_Overlay SHALL minimize CPU usage by using requestAnimationFrame

### Requirement 13: Time-Series Overlay Implementation

**User Story:** As a railway analyst, I want to replay historical states and view forecasts, so that I can analyze temporal patterns and plan future operations.

#### Acceptance Criteria

1. THE Time_Series_Overlay SHALL accept data as an array of {timestamp, linearPosition, value, metric} objects
2. THE Time_Series_Overlay SHALL render a time slider control with configurable position
3. WHEN the time slider position changes, THE Time_Series_Overlay SHALL update visualization to show state at selected timestamp
4. THE Time_Series_Overlay SHALL support playback controls including play, pause, and stop buttons
5. THE Time_Series_Overlay SHALL support configurable playback speed (0.5x, 1x, 2x, 5x)
6. THE Time_Series_Overlay SHALL support both historical data replay and future forecast visualization
7. THE Time_Series_Overlay SHALL display current timestamp in human-readable format
8. THE Time_Series_Overlay SHALL emit time-change events when slider position changes

### Requirement 14: Time-Series Multi-Metric Support

**User Story:** As an analyst viewing multiple metrics over time, I want to toggle metric visibility, so that I can focus on relevant data.

#### Acceptance Criteria

1. WHEN time-series data includes multiple metrics, THE Time_Series_Overlay SHALL provide metric toggle controls
2. THE Time_Series_Overlay SHALL render each metric as a separate visual layer
3. THE Time_Series_Overlay SHALL support independent styling for each metric layer
4. WHEN a metric is toggled off, THE Time_Series_Overlay SHALL hide that metric's visualization
5. THE Time_Series_Overlay SHALL update visualization within 100 milliseconds when metric visibility changes
6. THE Time_Series_Overlay SHALL provide a legend showing all available metrics with toggle state
7. THE Time_Series_Overlay SHALL support configurable default visibility for each metric

### Requirement 15: Time-Series Performance

**User Story:** As a user viewing large time-series datasets, I want smooth playback, so that I can analyze temporal patterns without lag.

#### Acceptance Criteria

1. THE Time_Series_Overlay SHALL update visualization within 100 milliseconds when time slider position changes
2. THE Time_Series_Overlay SHALL maintain 60 FPS during playback for datasets with up to 10000 time points
3. THE Time_Series_Overlay SHALL use temporal indexing to query only data points for the current timestamp
4. THE Time_Series_Overlay SHALL preload adjacent time slices for smooth playback
5. THE Time_Series_Overlay SHALL support configurable temporal resolution (aggregate data to reduce point count)
6. THE Time_Series_Overlay SHALL cache rendered frames for frequently accessed timestamps
7. THE Time_Series_Overlay SHALL emit performance metrics for update time and data point count

### Requirement 16: Custom Overlay Registration

**User Story:** As a developer extending the library, I want to register custom overlay types, so that I can visualize domain-specific data not covered by built-in overlays.

#### Acceptance Criteria

1. THE Overlay_System SHALL provide a registerOverlay() method accepting overlay name and factory function
2. THE factory function SHALL return an object implementing the RailOverlay interface
3. WHEN a custom overlay is registered, THE Overlay_System SHALL validate that it implements required methods
4. WHEN a registered custom overlay is added, THE Renderer SHALL invoke the overlay's render() method
5. THE Overlay_System SHALL provide the CoordinateBridge to custom overlays for position projection
6. THE Overlay_System SHALL support multiple instances of custom overlay types with independent data
7. THE Overlay_System SHALL provide TypeScript type definitions for custom overlay development
8. THE Overlay_System SHALL document the RailOverlay interface with examples of custom overlay patterns

### Requirement 17: Custom Overlay Lifecycle

**User Story:** As a custom overlay developer, I want lifecycle hooks, so that I can manage resources and respond to events.

#### Acceptance Criteria

1. THE RailOverlay interface SHALL define an initialize() method called when overlay is added
2. THE RailOverlay interface SHALL define a render() method called for initial rendering
3. THE RailOverlay interface SHALL define an update() method called when data changes
4. THE RailOverlay interface SHALL define a resize() method called when viewport dimensions change
5. THE RailOverlay interface SHALL define a destroy() method called when overlay is removed
6. THE Overlay_System SHALL invoke lifecycle methods in the correct sequence
7. THE Overlay_System SHALL pass context objects (renderer, coordinateBridge, viewport) to lifecycle methods
8. THE Overlay_System SHALL handle errors in custom overlay methods without crashing the renderer

### Requirement 18: Overlay Manager Implementation

**User Story:** As a railway operator, I want to control overlay visibility and ordering, so that I can focus on relevant data layers.

#### Acceptance Criteria

1. THE Overlay_Manager SHALL maintain a list of all active overlays with their identifiers
2. THE Overlay_Manager SHALL provide methods to show, hide, and toggle visibility of individual overlays
3. THE Overlay_Manager SHALL provide methods to adjust z-order of overlays
4. THE Overlay_Manager SHALL provide methods to adjust opacity of individual overlays
5. THE Overlay_Manager SHALL provide a method to retrieve all visible overlays
6. THE Overlay_Manager SHALL provide a method to retrieve legend descriptors for all visible overlays
7. THE Overlay_Manager SHALL emit visibility-change events when overlay visibility is toggled
8. THE Overlay_Manager SHALL emit z-order-change events when overlay ordering changes

### Requirement 19: Overlay Visibility Control

**User Story:** As a user managing multiple overlays, I want quick visibility controls, so that I can toggle layers efficiently.

#### Acceptance Criteria

1. WHEN an overlay's visibility is toggled, THE Renderer SHALL update display within 100 milliseconds
2. THE Renderer SHALL not re-render other overlays when toggling visibility of one overlay
3. THE Renderer SHALL support batch visibility changes for multiple overlays
4. THE Renderer SHALL provide a showAll() method to make all overlays visible
5. THE Renderer SHALL provide a hideAll() method to hide all overlays
6. THE Renderer SHALL preserve overlay state (data, configuration) when hidden
7. THE Renderer SHALL emit visibility-change events containing overlay identifier and new visibility state

### Requirement 20: Overlay Z-Order Control

**User Story:** As a user viewing overlapping overlays, I want to control rendering order, so that important data appears on top.

#### Acceptance Criteria

1. THE Overlay_Manager SHALL assign a z-order value to each overlay (higher values render on top)
2. THE Overlay_Manager SHALL provide a setZOrder() method to change an overlay's z-order
3. THE Overlay_Manager SHALL provide bringToFront() and sendToBack() methods for quick reordering
4. WHEN z-order changes, THE Renderer SHALL re-render overlays in the new order
5. THE Renderer SHALL complete z-order changes within 200 milliseconds
6. THE Overlay_Manager SHALL validate that z-order values are non-negative integers
7. THE Overlay_Manager SHALL emit z-order-change events containing overlay identifier and new z-order

### Requirement 21: Overlay Opacity Control

**User Story:** As a user viewing overlays, I want to adjust transparency, so that I can see underlying data.

#### Acceptance Criteria

1. THE Overlay_Manager SHALL support opacity values from 0.0 (transparent) to 1.0 (opaque)
2. THE Overlay_Manager SHALL provide a setOpacity() method accepting overlay identifier and opacity value
3. WHEN opacity changes, THE Renderer SHALL update the overlay's visual opacity
4. THE Renderer SHALL apply opacity to all overlay elements (markers, labels, gradients)
5. THE Renderer SHALL complete opacity changes within 100 milliseconds
6. THE Overlay_Manager SHALL validate that opacity values are in the range [0.0, 1.0]
7. THE Overlay_Manager SHALL emit opacity-change events containing overlay identifier and new opacity

### Requirement 22: Legend Rendering

**User Story:** As a user viewing overlays, I want to see legends, so that I can interpret the visual encoding.

#### Acceptance Criteria

1. THE Renderer SHALL provide a renderLegends() method that displays legends for all visible overlays
2. THE Renderer SHALL query each visible overlay's getLegend() method to retrieve Legend_Descriptor
3. THE Renderer SHALL render legends as SVG elements with configurable position
4. THE Renderer SHALL support legend positions: top-left, top-right, bottom-left, bottom-right, custom
5. THE Renderer SHALL render color scales, symbols, and labels based on Legend_Descriptor content
6. THE Renderer SHALL support collapsible legends to save screen space
7. THE Renderer SHALL update legends within 100 milliseconds when overlay visibility changes
8. THE Renderer SHALL support configurable legend styling including font size, background, and border

### Requirement 23: Overlay Data Updates

**User Story:** As a user viewing real-time data, I want efficient overlay updates, so that I can see current information without lag.

#### Acceptance Criteria

1. THE Overlay_System SHALL provide an updateOverlayData() method accepting overlay identifier and new data
2. WHEN overlay data is updated, THE Overlay_System SHALL invoke the overlay's update() method
3. THE overlay's update() method SHALL use D3's enter-update-exit pattern to avoid full re-render
4. THE Overlay_System SHALL not re-render other overlays when updating one overlay's data
5. THE Overlay_System SHALL complete data updates within 100 milliseconds for datasets with 1000 points
6. THE Overlay_System SHALL emit data-update events containing overlay identifier and update timestamp
7. THE Overlay_System SHALL support batch data updates for multiple overlays
8. THE Overlay_System SHALL validate that updated data conforms to the overlay's expected schema

### Requirement 24: Overlay Event Handling

**User Story:** As a developer, I want to handle overlay interaction events, so that I can respond to user actions on overlay elements.

#### Acceptance Criteria

1. THE Overlay_System SHALL emit click events when overlay elements are clicked
2. THE Overlay_System SHALL emit hover events when cursor enters overlay elements
3. THE Overlay_System SHALL emit hover-end events when cursor leaves overlay elements
4. THE click events SHALL include overlay identifier, element data, and Screen_Coordinate
5. THE hover events SHALL include overlay identifier, element data, and Screen_Coordinate
6. THE Overlay_System SHALL support registering event handlers for each overlay instance
7. THE Overlay_System SHALL support event delegation to minimize listener overhead
8. WHEN an overlay element is clicked, THE Overlay_System SHALL emit events for both overlay and underlying track element

### Requirement 25: Overlay Configuration

**User Story:** As a developer, I want to configure overlay appearance and behavior, so that I can customize visualizations for my use case.

#### Acceptance Criteria

1. THE Overlay_System SHALL accept configuration objects when adding overlays
2. THE configuration SHALL support styling properties (colors, sizes, fonts, opacity)
3. THE configuration SHALL support behavior properties (animation, collision detection, clustering)
4. THE configuration SHALL support data properties (color scales, value ranges, thresholds)
5. THE Overlay_System SHALL validate configuration and use defaults for missing properties
6. THE Overlay_System SHALL provide a method to update overlay configuration at runtime
7. THE Overlay_System SHALL emit configuration-change events when configuration is updated
8. THE Overlay_System SHALL document all configuration options with types and default values

### Requirement 26: Color Scale Library

**User Story:** As a developer creating heat-maps, I want predefined color scales, so that I can quickly apply appropriate color encodings.

#### Acceptance Criteria

1. THE Overlay_System SHALL provide a color scale library with common scale types
2. THE library SHALL include linear scales (interpolate between two colors)
3. THE library SHALL include sequential scales (single-hue gradients for continuous data)
4. THE library SHALL include diverging scales (two-hue gradients for data with meaningful midpoint)
5. THE library SHALL include quantile scales (divide data into equal-sized buckets)
6. THE library SHALL include threshold scales (explicit breakpoints for categorical data)
7. THE library SHALL include at least one color-blind safe palette for each scale type
8. THE library SHALL support custom scale functions accepting value and returning color

### Requirement 27: Color Palette Library

**User Story:** As a developer, I want predefined color palettes, so that I can create accessible and aesthetically pleasing visualizations.

#### Acceptance Criteria

1. THE Overlay_System SHALL provide a color palette library with predefined palettes
2. THE library SHALL include sequential palettes (Blues, Greens, Reds, Greys)
3. THE library SHALL include diverging palettes (RdBu, RdYlGn, Spectral)
4. THE library SHALL include categorical palettes for discrete data
5. THE library SHALL include at least two color-blind safe palettes (deuteranopia, protanopia)
6. THE library SHALL include a high-contrast palette meeting WCAG 2.1 AAA requirements
7. THE library SHALL document which palettes are color-blind safe and high-contrast
8. THE library SHALL support custom palettes defined as arrays of color values

### Requirement 28: Overlay Performance Optimization

**User Story:** As a user viewing complex overlays, I want smooth performance, so that I can interact without lag.

#### Acceptance Criteria

1. THE Overlay_System SHALL use Canvas rendering for dense data layers (heat-maps with >1000 points)
2. THE Overlay_System SHALL use SVG rendering for interactive elements (annotations, range bands)
3. THE Overlay_System SHALL implement viewport culling to render only visible overlay elements
4. THE Overlay_System SHALL use spatial indexing (R-tree or quadtree) for efficient visibility queries
5. THE Overlay_System SHALL debounce updates during continuous viewport changes
6. THE Overlay_System SHALL cache rendered elements to avoid redundant computation
7. THE Overlay_System SHALL maintain 60 FPS during pan and zoom with up to 5 active overlays
8. THE Overlay_System SHALL emit performance metrics for render time and element count

### Requirement 29: Overlay Accessibility

**User Story:** As a user with disabilities, I want accessible overlays, so that I can interpret visualizations with assistive technologies.

#### Acceptance Criteria

1. THE Overlay_System SHALL assign ARIA labels to all interactive overlay elements
2. THE Overlay_System SHALL provide text alternatives for color-encoded data via legends
3. THE Overlay_System SHALL ensure overlay colors meet WCAG 2.1 AA contrast requirements (3:1 minimum)
4. THE Overlay_System SHALL support keyboard navigation for interactive overlay elements
5. THE Overlay_System SHALL announce overlay visibility changes to screen readers via ARIA live regions
6. THE Overlay_System SHALL provide configurable high-contrast mode for overlays
7. THE Overlay_System SHALL document accessibility features and limitations for each overlay type

### Requirement 30: Package Structure

**User Story:** As a developer, I want a well-organized package, so that I can import and use overlay features easily.

#### Acceptance Criteria

1. THE Package SHALL be published as @rail-schematic-viz/overlays
2. THE Package SHALL export the Overlay_System class from the main entry point
3. THE Package SHALL export all built-in overlay types from an overlays submodule
4. THE Package SHALL export the Overlay_Manager from a manager submodule
5. THE Package SHALL export color scale and palette libraries from a colors submodule
6. THE Package SHALL export TypeScript type definitions for all public APIs
7. THE Package SHALL declare @rail-schematic-viz/core and @rail-schematic-viz/layout as peer dependencies
8. THE Package SHALL include a README with installation, usage examples, and API overview
9. THE Package SHALL include unit tests with at least 80% code coverage
10. THE Package SHALL include property-based tests for overlay rendering and data updates

