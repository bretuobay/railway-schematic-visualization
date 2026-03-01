# Requirements Document

## Introduction

The rail-schematic-viz-layout-and-interaction package provides the UX layer for the Rail Schematic Viz library. This package implements multiple layout modes (proportional, compressed, fixed-segment, metro-map), an auto-layout engine for graphs without coordinates, viewport controls (pan, zoom, fit-to-view), semantic zoom (Level of Detail), interactive event handling, keyboard navigation, element selection, minimap navigation, and viewport culling for performance optimization.

This package builds on @rail-schematic-viz/core and enhances the basic renderer with sophisticated layout algorithms and rich interaction capabilities. It transforms the core rendering engine into a fully interactive visualization tool suitable for railway operations, planning, and analysis.

## Glossary

- **LayoutEngine**: The component that computes visual positioning and geometry for track elements
- **Layout_Mode**: A positioning strategy (proportional, compressed, fixed-segment, metro-map)
- **Proportional_Layout**: Layout mode where segment lengths are proportional to real-world distances
- **Compressed_Layout**: Layout mode that equalizes visual segment lengths for clarity
- **Fixed_Segment_Layout**: Layout mode where all segments have equal length
- **Metro_Map_Layout**: Layout mode with octilinear constraints (0°, 45°, 90° angles only)
- **Auto_Layout**: Algorithm that generates screen coordinates from topology without manual positioning
- **Viewport**: The visible portion of the schematic canvas
- **Viewport_Culling**: Performance optimization that renders only visible elements
- **Semantic_Zoom**: Level-of-detail rendering that changes visual detail based on zoom level
- **LOD**: Level of Detail - the amount of visual information shown at a given zoom level
- **Zoom_Threshold**: A zoom level value that triggers a change in level of detail
- **Pan_Behavior**: User interaction allowing dragging to move the viewport
- **Zoom_Behavior**: User interaction allowing scaling the view in and out
- **Fit_To_View**: Operation that adjusts viewport to show all or selected elements
- **Interactive_Element**: A rendered element that responds to user input events
- **Event_Handler**: A callback function that processes user interaction events
- **Selection_State**: The set of currently selected elements
- **Brush_Selection**: Selecting multiple elements by dragging a rectangle
- **Minimap**: A small overview showing the entire schematic with viewport indicator
- **Keyboard_Navigation**: Traversing and interacting with elements using keyboard controls
- **Focus_Indicator**: Visual highlight showing which element has keyboard focus
- **Performance_Monitor**: Component that tracks rendering performance metrics

## Requirements

### Requirement 1: Layout Engine Architecture

**User Story:** As a library user, I want a flexible layout system, so that I can choose the best visualization mode for my use case.

#### Acceptance Criteria

1. THE LayoutEngine SHALL accept a RailGraph and Layout_Mode as input
2. THE LayoutEngine SHALL compute Screen_Coordinate positions for all nodes
3. THE LayoutEngine SHALL compute geometry arrays for all edges
4. THE LayoutEngine SHALL preserve topological connectivity when computing positions
5. THE LayoutEngine SHALL provide a method to switch between layout modes at runtime
6. THE LayoutEngine SHALL emit events when layout computation begins and completes
7. THE LayoutEngine SHALL validate that computed positions do not create overlapping elements
8. WHEN layout computation completes, THE LayoutEngine SHALL return a positioned RailGraph

### Requirement 2: Proportional Layout Mode

**User Story:** As a railway planner, I want segment lengths proportional to real distances, so that I can understand relative distances between locations.

#### Acceptance Criteria

1. WHEN Proportional_Layout mode is selected, THE LayoutEngine SHALL scale segment lengths proportional to edge length properties
2. THE LayoutEngine SHALL apply a configurable scale factor to convert real-world distances to screen pixels
3. THE LayoutEngine SHALL maintain consistent scale across all segments in the network
4. THE LayoutEngine SHALL support configurable layout orientation (horizontal, vertical, auto)
5. WHEN edge length data is missing, THE LayoutEngine SHALL emit a warning and fall back to unit length
6. THE LayoutEngine SHALL preserve junction angles from geographic coordinates when available
7. FOR ALL edges in the network, the ratio of screen length to real length SHALL be constant within 1% tolerance

### Requirement 3: Compressed Layout Mode

**User Story:** As a railway operator viewing dense urban networks, I want compressed layouts, so that I can see all stations clearly without excessive scrolling.

#### Acceptance Criteria

1. WHEN Compressed_Layout mode is selected, THE LayoutEngine SHALL apply logarithmic compression to segment lengths
2. THE LayoutEngine SHALL ensure minimum visual separation between adjacent stations
3. THE LayoutEngine SHALL apply greater compression to longer segments than shorter segments
4. THE LayoutEngine SHALL provide configurable compression strength parameter
5. THE LayoutEngine SHALL preserve relative ordering of stations along lines
6. THE LayoutEngine SHALL maintain topological accuracy while reducing visual span
7. WHEN compression is applied, THE LayoutEngine SHALL provide a scale indicator showing the non-linear scale

### Requirement 4: Fixed-Segment Layout Mode

**User Story:** As a schematic designer, I want all segments at equal length, so that I can create clean, uniform diagrams.

#### Acceptance Criteria

1. WHEN Fixed_Segment_Layout mode is selected, THE LayoutEngine SHALL render all track segments at equal length
2. THE LayoutEngine SHALL use a configurable segment length value
3. THE LayoutEngine SHALL distribute stations evenly along lines
4. THE LayoutEngine SHALL optimize junction positions to minimize edge crossings
5. THE LayoutEngine SHALL preserve line continuity and connectivity
6. THE LayoutEngine SHALL support configurable spacing between parallel lines
7. FOR ALL edges in the network, the screen length SHALL be equal within 1 pixel tolerance

### Requirement 5: Metro-Map Layout Mode

**User Story:** As a passenger information system developer, I want metro-map style layouts, so that I can create clear, readable transit diagrams.

#### Acceptance Criteria

1. WHEN Metro_Map_Layout mode is selected, THE LayoutEngine SHALL constrain all edge angles to 0°, 45°, or 90° (octilinear)
2. THE LayoutEngine SHALL apply force-directed optimization to minimize edge length while maintaining angle constraints
3. THE LayoutEngine SHALL distribute stations to avoid overlapping labels
4. THE LayoutEngine SHALL align parallel lines to run alongside each other
5. THE LayoutEngine SHALL optimize junction positions to create clean intersections
6. THE LayoutEngine SHALL support configurable grid spacing for station positioning
7. FOR ALL edges in the network, the angle SHALL be within 1° of the nearest octilinear angle (0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°)

### Requirement 6: Auto-Layout Engine

**User Story:** As a developer with topology data but no coordinates, I want automatic layout generation, so that I can visualize networks without manual positioning.

#### Acceptance Criteria

1. WHEN a RailGraph without Screen_Coordinate data is provided, THE Auto_Layout SHALL generate screen coordinates using force-directed simulation
2. THE Auto_Layout SHALL use D3 force simulation with configurable parameters
3. THE Auto_Layout SHALL apply link distance forces based on edge length properties
4. THE Auto_Layout SHALL apply charge forces to prevent node overlap
5. THE Auto_Layout SHALL apply centering forces to keep the network in the viewport
6. THE Auto_Layout SHALL respect line structure by applying stronger forces along line edges
7. THE Auto_Layout SHALL provide a method to export computed coordinates for reuse
8. WHEN auto-layout completes for a network with 500 nodes, THE computation SHALL finish within 5 seconds
9. FOR ALL generated layouts, nodes SHALL be separated by at least the configured minimum distance

### Requirement 7: Layout Optimization

**User Story:** As a library user, I want optimized layouts, so that schematics are readable and aesthetically pleasing.

#### Acceptance Criteria

1. THE LayoutEngine SHALL minimize edge crossings using a configurable optimization algorithm
2. THE LayoutEngine SHALL apply label collision detection and resolution
3. THE LayoutEngine SHALL optimize station spacing to maintain readability
4. THE LayoutEngine SHALL align parallel tracks to run alongside each other
5. THE LayoutEngine SHALL provide configurable padding around the network bounds
6. THE LayoutEngine SHALL support manual position overrides for specific nodes
7. WHEN optimization is applied, THE LayoutEngine SHALL preserve topological correctness

### Requirement 8: Viewport Pan Behavior

**User Story:** As a user viewing large networks, I want to pan the view, so that I can explore different areas of the schematic.

#### Acceptance Criteria

1. THE Renderer SHALL implement D3 drag behavior for viewport panning
2. WHEN a user drags on the schematic background, THE Viewport SHALL translate in the drag direction
3. THE Renderer SHALL support configurable pan extent limits to prevent panning beyond network bounds
4. THE Renderer SHALL provide smooth panning with 60 frames per second performance
5. THE Renderer SHALL emit pan events containing the new viewport position
6. THE Renderer SHALL support programmatic panning via a panTo() method
7. THE Renderer SHALL support animated panning with configurable duration and easing

### Requirement 9: Viewport Zoom Behavior

**User Story:** As a user examining details, I want to zoom in and out, so that I can see both overview and detail.

#### Acceptance Criteria

1. THE Renderer SHALL implement D3 zoom behavior with mouse wheel and pinch gesture support
2. THE Renderer SHALL support configurable minimum and maximum zoom scale bounds
3. THE Renderer SHALL zoom toward the cursor position (zoom-to-point behavior)
4. THE Renderer SHALL provide smooth zooming with 60 frames per second performance
5. THE Renderer SHALL emit zoom events containing the new zoom level
6. THE Renderer SHALL support programmatic zooming via zoomTo() and zoomBy() methods
7. THE Renderer SHALL support animated zooming with configurable duration and easing
8. WHEN zoom level changes, THE Renderer SHALL update within 16 milliseconds (60 FPS)

### Requirement 10: Fit-to-View Operations

**User Story:** As a user, I want to fit the entire network or selected elements in view, so that I can quickly navigate to relevant areas.

#### Acceptance Criteria

1. THE Renderer SHALL provide a fitToView() method that adjusts viewport to show all elements
2. THE Renderer SHALL provide a fitSelection() method that adjusts viewport to show selected elements
3. THE Renderer SHALL apply configurable padding when fitting to view
4. THE Renderer SHALL preserve aspect ratio when fitting to view
5. THE Renderer SHALL support animated fit-to-view with configurable duration
6. THE Renderer SHALL respect minimum and maximum zoom bounds when fitting
7. WHEN fitToView() is called, THE Renderer SHALL complete the operation within 500 milliseconds

### Requirement 11: Semantic Zoom System

**User Story:** As a user zooming in and out, I want appropriate detail levels, so that I see overview when zoomed out and details when zoomed in.

#### Acceptance Criteria

1. THE Renderer SHALL define three LOD levels: low-detail, mid-detail, and high-detail
2. THE Renderer SHALL provide configurable Zoom_Threshold values for each LOD transition
3. WHEN zoom level is below low-detail threshold, THE Renderer SHALL display only lines, stations, and major junctions
4. WHEN zoom level is between low and mid thresholds, THE Renderer SHALL add signals, switches, and kilometre-posts
5. WHEN zoom level is above mid-detail threshold, THE Renderer SHALL add detailed annotations and asset markers
6. THE Renderer SHALL transition between LOD levels within 200 milliseconds
7. THE Renderer SHALL emit LOD change events when crossing thresholds
8. THE Renderer SHALL support custom LOD configurations per element type

### Requirement 12: Viewport Culling

**User Story:** As a user viewing large networks, I want smooth performance, so that I can interact without lag.

#### Acceptance Criteria

1. WHEN rendering networks with more than 1000 elements, THE Renderer SHALL implement Viewport_Culling
2. THE Renderer SHALL compute the visible viewport bounds in graph coordinates
3. THE Renderer SHALL render only elements whose bounding boxes intersect the viewport
4. THE Renderer SHALL use spatial indexing (R-tree or quadtree) for efficient visibility queries
5. THE Renderer SHALL update the culled element set within 16 milliseconds when viewport changes
6. THE Renderer SHALL apply a configurable buffer margin around the viewport for smooth panning
7. WHEN viewport culling is active, THE Renderer SHALL maintain 60 FPS during pan and zoom operations

### Requirement 13: Interactive Element Events

**User Story:** As a user, I want to click on elements to view details, so that I can access information about tracks, stations, and signals.

#### Acceptance Criteria

1. WHEN a user clicks on an Interactive_Element, THE Renderer SHALL emit a click event with element ID and data
2. WHEN a user double-clicks on an Interactive_Element, THE Renderer SHALL emit a double-click event
3. WHEN a user right-clicks on an Interactive_Element, THE Renderer SHALL emit a context-menu event
4. THE Renderer SHALL support configurable Event_Handler registration for each event type
5. THE Renderer SHALL use event delegation to minimize listener overhead
6. THE Renderer SHALL provide element data including type, ID, coordinates, and custom properties in events
7. WHEN an overlay element is clicked, THE Renderer SHALL emit events for both overlay and underlying track element

### Requirement 14: Hover Interaction

**User Story:** As a user, I want to see information when hovering over elements, so that I can preview details without clicking.

#### Acceptance Criteria

1. WHEN a user hovers over an Interactive_Element, THE Renderer SHALL emit a hover event
2. WHEN a user moves the cursor away from an element, THE Renderer SHALL emit a hover-end event
3. THE Renderer SHALL apply configurable hover styles to elements under the cursor
4. THE Renderer SHALL support configurable hover delay before triggering hover events
5. THE Renderer SHALL provide default tooltip rendering with configurable content templates
6. THE Renderer SHALL position tooltips to avoid viewport edges
7. THE Renderer SHALL update hover state within 16 milliseconds for smooth interaction

### Requirement 15: Element Selection

**User Story:** As a user, I want to select elements, so that I can perform operations on them or highlight them for analysis.

#### Acceptance Criteria

1. WHEN a user clicks on an element, THE Renderer SHALL add it to the Selection_State
2. WHEN a user clicks on the background, THE Renderer SHALL clear the Selection_State
3. WHEN a user shift-clicks on an element, THE Renderer SHALL toggle its selection without clearing others
4. THE Renderer SHALL apply configurable selection styles to selected elements
5. THE Renderer SHALL emit selection-change events containing selected element IDs
6. THE Renderer SHALL provide programmatic selection methods: select(), deselect(), clearSelection()
7. THE Renderer SHALL support selecting elements by ID, type, or filter predicate

### Requirement 16: Brush Selection

**User Story:** As a user, I want to select multiple elements by dragging a rectangle, so that I can quickly select groups of elements.

#### Acceptance Criteria

1. WHEN a user drags on the schematic background with a modifier key, THE Renderer SHALL display a selection rectangle
2. WHEN the drag ends, THE Renderer SHALL select all elements within the rectangle bounds
3. THE Renderer SHALL support configurable modifier key for brush selection (default: Alt key)
4. THE Renderer SHALL provide visual feedback during brush selection with a semi-transparent rectangle
5. THE Renderer SHALL support additive brush selection (add to existing selection)
6. THE Renderer SHALL support subtractive brush selection (remove from existing selection)
7. THE Renderer SHALL emit brush-selection events containing selected element IDs

### Requirement 17: Keyboard Navigation

**User Story:** As a keyboard user, I want to navigate elements with keyboard, so that I can use the library without a mouse.

#### Acceptance Criteria

1. THE Renderer SHALL implement keyboard focus traversal of all Interactive_Elements
2. THE Renderer SHALL render a visible Focus_Indicator on the focused element
3. THE Focus_Indicator SHALL meet WCAG 2.1 AA contrast requirements (3:1 minimum)
4. THE Renderer SHALL support Tab and Shift+Tab for sequential focus traversal
5. THE Renderer SHALL support arrow keys for topological navigation (following track connections)
6. THE Renderer SHALL support Enter and Space keys to activate focused elements (equivalent to click)
7. THE Renderer SHALL support Escape key to clear selection and reset focus
8. THE Renderer SHALL emit focus-change events when keyboard focus moves

### Requirement 18: Keyboard Shortcuts

**User Story:** As a power user, I want keyboard shortcuts for common operations, so that I can work efficiently.

#### Acceptance Criteria

1. THE Renderer SHALL support configurable keyboard shortcuts for zoom in (+), zoom out (-), and reset (0)
2. THE Renderer SHALL support keyboard shortcut for fit-to-view (F key)
3. THE Renderer SHALL support keyboard shortcut for fit-selection (Shift+F)
4. THE Renderer SHALL support keyboard shortcut for select-all (Ctrl/Cmd+A)
5. THE Renderer SHALL support keyboard shortcut for deselect-all (Escape)
6. THE Renderer SHALL provide a method to register custom keyboard shortcuts
7. THE Renderer SHALL prevent default browser behavior for registered shortcuts
8. THE Renderer SHALL display a keyboard shortcut reference when Help key (?) is pressed

### Requirement 19: Minimap Component

**User Story:** As a user viewing large networks, I want a minimap overview, so that I can understand my position and navigate quickly.

#### Acceptance Criteria

1. WHERE minimap is enabled, THE Renderer SHALL render an inset overview of the complete schematic
2. THE Minimap SHALL display a rectangle indicating the current Viewport position and extent
3. THE Minimap SHALL support configurable size, position (corner), and styling
4. WHEN a user clicks on the Minimap, THE Renderer SHALL pan the main viewport to center on the clicked location
5. WHEN a user drags the viewport rectangle in the Minimap, THE Renderer SHALL update the main viewport in real-time
6. THE Minimap SHALL update within 100 milliseconds when the main viewport changes
7. THE Minimap SHALL use simplified rendering (low LOD) for performance
8. THE Minimap SHALL support toggling visibility via a configuration option

### Requirement 20: Minimap Interaction

**User Story:** As a user, I want to interact with the minimap, so that I can navigate efficiently.

#### Acceptance Criteria

1. WHEN a user clicks in the Minimap, THE Renderer SHALL animate the main viewport to the clicked location
2. WHEN a user drags the viewport indicator in the Minimap, THE Renderer SHALL update the main viewport synchronously
3. THE Minimap SHALL highlight the viewport indicator on hover
4. THE Minimap SHALL support mouse wheel zoom on the minimap to adjust main viewport zoom
5. THE Minimap SHALL prevent event propagation to avoid triggering main viewport interactions
6. THE Minimap SHALL provide visual feedback during interaction (cursor changes, highlights)
7. THE Minimap SHALL support keyboard navigation (arrow keys to move viewport indicator)

### Requirement 21: Performance Monitoring

**User Story:** As a developer optimizing performance, I want performance metrics, so that I can identify bottlenecks.

#### Acceptance Criteria

1. THE Performance_Monitor SHALL track frame render time in milliseconds
2. THE Performance_Monitor SHALL track layout computation time
3. THE Performance_Monitor SHALL track number of rendered elements per frame
4. THE Performance_Monitor SHALL track number of culled elements per frame
5. THE Performance_Monitor SHALL provide a method to retrieve current performance metrics
6. THE Performance_Monitor SHALL emit performance events when frame time exceeds configurable thresholds
7. THE Performance_Monitor SHALL support enabling/disabling monitoring via configuration
8. WHERE performance monitoring is enabled, THE overhead SHALL be less than 5% of total render time

### Requirement 22: Performance Optimization

**User Story:** As a user viewing large networks, I want smooth performance, so that interactions feel responsive.

#### Acceptance Criteria

1. WHEN rendering networks with up to 5000 elements, THE Renderer SHALL maintain 60 FPS during pan and zoom
2. WHEN layout mode changes, THE Renderer SHALL recompute and re-render within 500 milliseconds for networks with 500 elements
3. THE Renderer SHALL use requestAnimationFrame for smooth animation
4. THE Renderer SHALL debounce expensive operations during continuous interactions (pan, zoom)
5. THE Renderer SHALL use D3's update pattern to minimize DOM manipulation
6. THE Renderer SHALL cache computed geometries to avoid redundant calculations
7. THE Renderer SHALL provide configurable performance mode (quality vs speed trade-offs)

### Requirement 23: Layout Configuration

**User Story:** As a developer, I want to configure layout behavior, so that I can customize the visualization for my use case.

#### Acceptance Criteria

1. THE LayoutEngine SHALL accept a configuration object with layout-specific parameters
2. THE configuration SHALL support scale factor for Proportional_Layout
3. THE configuration SHALL support compression strength for Compressed_Layout
4. THE configuration SHALL support segment length for Fixed_Segment_Layout
5. THE configuration SHALL support grid spacing for Metro_Map_Layout
6. THE configuration SHALL support layout orientation (horizontal, vertical, auto)
7. THE configuration SHALL support padding around network bounds
8. THE configuration SHALL support manual position overrides for specific nodes
9. THE LayoutEngine SHALL validate configuration and emit warnings for invalid values

### Requirement 24: Viewport Configuration

**User Story:** As a developer, I want to configure viewport behavior, so that I can control user interaction.

#### Acceptance Criteria

1. THE Renderer SHALL accept a viewport configuration object
2. THE configuration SHALL support minimum and maximum zoom scale bounds
3. THE configuration SHALL support pan extent limits (constrain panning area)
4. THE configuration SHALL support enabling/disabling pan and zoom behaviors independently
5. THE configuration SHALL support zoom-to-point behavior toggle
6. THE configuration SHALL support animation duration and easing functions
7. THE configuration SHALL support initial viewport position and zoom level
8. THE Renderer SHALL validate configuration and use defaults for invalid values

### Requirement 25: Interaction Configuration

**User Story:** As a developer, I want to configure interaction behavior, so that I can customize user experience.

#### Acceptance Criteria

1. THE Renderer SHALL accept an interaction configuration object
2. THE configuration SHALL support enabling/disabling click, hover, and selection interactions
3. THE configuration SHALL support hover delay before triggering hover events
4. THE configuration SHALL support selection mode (single, multi, brush)
5. THE configuration SHALL support modifier keys for multi-select and brush selection
6. THE configuration SHALL support tooltip configuration (enabled, template, position)
7. THE configuration SHALL support keyboard navigation and shortcuts configuration
8. THE Renderer SHALL validate configuration and emit warnings for invalid values

### Requirement 26: Accessibility Support

**User Story:** As a user with disabilities, I want accessible interactions, so that I can use the library with assistive technologies.

#### Acceptance Criteria

1. THE Renderer SHALL assign ARIA roles to interactive elements (button, link, or application)
2. THE Renderer SHALL provide ARIA labels for all interactive elements
3. THE Renderer SHALL announce selection changes to screen readers via ARIA live regions
4. THE Renderer SHALL announce zoom level changes to screen readers
5. THE Renderer SHALL ensure Focus_Indicator meets WCAG 2.1 AA contrast requirements (3:1)
6. THE Renderer SHALL support keyboard-only navigation for all interactive features
7. THE Renderer SHALL provide skip-to-content functionality for keyboard users
8. THE Renderer SHALL document accessibility features and keyboard shortcuts

### Requirement 27: Touch Gesture Support

**User Story:** As a mobile user, I want touch gestures, so that I can interact on touchscreen devices.

#### Acceptance Criteria

1. THE Renderer SHALL support pinch-to-zoom gesture on touch devices
2. THE Renderer SHALL support two-finger pan gesture on touch devices
3. THE Renderer SHALL support tap gesture equivalent to click
4. THE Renderer SHALL support long-press gesture equivalent to context menu
5. THE Renderer SHALL prevent default touch behaviors that interfere with interactions
6. THE Renderer SHALL provide smooth gesture handling with 60 FPS performance
7. THE Renderer SHALL support configurable gesture sensitivity and thresholds

### Requirement 28: Layout Export and Import

**User Story:** As a developer, I want to save and restore layouts, so that I can persist user customizations.

#### Acceptance Criteria

1. THE LayoutEngine SHALL provide an exportLayout() method that returns layout data as JSON
2. THE exported layout SHALL include node positions, edge geometries, and layout mode
3. THE LayoutEngine SHALL provide an importLayout() method that applies saved layout data
4. WHEN importing layout, THE LayoutEngine SHALL validate that node IDs match the current RailGraph
5. THE LayoutEngine SHALL support partial layout import (apply positions for matching nodes only)
6. FOR ALL valid layouts, exporting then importing SHALL produce an equivalent visual result
7. THE LayoutEngine SHALL emit events when layout is exported or imported

### Requirement 29: Animation System

**User Story:** As a user, I want smooth animations, so that transitions feel natural and help me track changes.

#### Acceptance Criteria

1. THE Renderer SHALL provide an animation system for smooth transitions
2. THE Renderer SHALL support configurable animation duration and easing functions
3. THE Renderer SHALL animate viewport changes (pan, zoom, fit-to-view)
4. THE Renderer SHALL animate layout mode transitions
5. THE Renderer SHALL animate LOD transitions to avoid jarring changes
6. THE Renderer SHALL use requestAnimationFrame for smooth 60 FPS animations
7. THE Renderer SHALL support disabling animations via configuration
8. THE Renderer SHALL provide animation callbacks for start, progress, and complete events

### Requirement 30: Package Structure

**User Story:** As a developer, I want a well-organized package, so that I can import and use layout features easily.

#### Acceptance Criteria

1. THE Package SHALL be published as @rail-schematic-viz/layout
2. THE Package SHALL export the LayoutEngine class from the main entry point
3. THE Package SHALL export all layout mode implementations from a modes submodule
4. THE Package SHALL export viewport control utilities from a viewport submodule
5. THE Package SHALL export interaction handlers from an interactions submodule
6. THE Package SHALL export the Minimap component from a minimap submodule
7. THE Package SHALL export TypeScript type definitions for all public APIs
8. THE Package SHALL declare @rail-schematic-viz/core as a peer dependency
9. THE Package SHALL include a README with installation and usage examples

