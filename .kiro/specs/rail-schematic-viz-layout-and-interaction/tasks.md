# Implementation Plan: rail-schematic-viz-layout-and-interaction

## Overview

This implementation plan breaks down the rail-schematic-viz-layout-and-interaction package into discrete coding tasks. The package provides the UX layer for railway network visualization, including multiple layout modes (proportional, compressed, fixed-segment, metro-map), auto-layout engine, viewport controls (pan, zoom, fit-to-view), semantic zoom with level-of-detail rendering, comprehensive event handling, keyboard navigation, element selection, minimap navigation, and viewport culling for performance optimization.

The implementation follows a layered approach: layout engine and strategies first, then viewport management with D3 integration, followed by interaction system and accessibility features. Each task builds incrementally, with testing integrated throughout to validate functionality early. The package builds on @rail-schematic-viz/core and uses TypeScript strict mode, Vitest for testing, and fast-check for property-based testing.

## Tasks

- [x] 1. Set up package structure and TypeScript configuration
  - Create package.json with @rail-schematic-viz/layout name and dependencies
  - Configure TypeScript with strict mode enabled
  - Set up ESM and CommonJS dual exports
  - Create directory structure (src/layout, src/viewport, src/interactions, src/components, src/spatial, src/accessibility)
  - Configure testing framework (Vitest) with fast-check for property-based testing
  - Declare @rail-schematic-viz/core as peer dependency
  - _Requirements: 30.1, 30.8_

- [x] 2. Implement core layout engine architecture
  - [x] 2.1 Create LayoutStrategy interface
    - Define LayoutStrategy interface with computePositions and computeGeometries methods
    - Define LayoutConfiguration interface with padding, orientation, manual overrides
    - Define PositionedGraph interface extending RailGraph
    - Define LayoutData interface for export/import
    - _Requirements: 1.1, 1.5, 23.1_
  
  - [x] 2.2 Create LayoutEngine class
    - Implement constructor accepting LayoutStrategy and configuration
    - Implement layout() method returning Promise<PositionedGraph>
    - Implement setStrategy() method for runtime mode switching
    - Implement event emitter for layout-start, layout-progress, layout-complete events
    - Implement exportLayout() and importLayout() methods
    - Validate that computed positions don't create overlapping elements
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 28.1, 28.3_
  
  - [x]* 2.3 Write property tests for layout engine core
    - **Property 1: Layout Computation Completeness** - Validates: Requirements 1.2, 1.3, 1.8
    - **Property 2: Topology Preservation** - Validates: Requirements 1.4
    - **Property 3: No Overlapping Nodes** - Validates: Requirements 1.7

- [x] 3. Implement Proportional Layout mode
  - [x] 3.1 Create ProportionalLayout class
    - Implement LayoutStrategy interface
    - Implement computePositions using breadth-first traversal with scale factor
    - Apply configurable scale factor to convert real-world distances to screen pixels
    - Maintain consistent scale across all segments
    - Support configurable layout orientation (horizontal, vertical, auto)
    - Emit warning and fall back to unit length when edge length data is missing
    - Preserve junction angles from geographic coordinates when available
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_
  
  - [x] 3.2 Implement computeGeometries for proportional layout
    - Generate straight-line geometries between positioned nodes
    - Preserve junction angles from geographic coordinates
    - _Requirements: 2.6_
  
  - [x]* 3.3 Write property tests for proportional layout
    - **Property 4: Proportional Layout Scale Consistency** - Validates: Requirements 2.1, 2.3, 2.7
    - **Property 5: Proportional Layout Scale Factor** - Validates: Requirements 2.2
    - **Property 6: Geographic Angle Preservation** - Validates: Requirements 2.6
  
  - [x]* 3.4 Write unit tests for proportional layout
    - Test layout with simple 3-station line
    - Test scale factor application
    - Test missing edge length fallback
    - Test orientation configuration
    - _Requirements: 2.1-2.7_

- [x] 4. Implement Compressed Layout mode
  - [x] 4.1 Create CompressedLayout class
    - Implement LayoutStrategy interface
    - Apply logarithmic compression: screenLength = k * log(1 + realLength / k)
    - Ensure minimum visual separation between adjacent stations
    - Apply greater compression to longer segments than shorter segments
    - Preserve relative ordering of stations along lines
    - Support configurable compression strength parameter
    - Provide scale indicator showing non-linear scale
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_
  
  - [x]* 4.2 Write property tests for compressed layout
    - **Property 7: Compressed Layout Logarithmic Formula** - Validates: Requirements 3.1
    - **Property 8: Minimum Node Separation** - Validates: Requirements 3.2
    - **Property 9: Compression Increases with Length** - Validates: Requirements 3.3
    - **Property 10: Station Ordering Preservation** - Validates: Requirements 3.5
  
  - [x]* 4.3 Write unit tests for compressed layout
    - Test logarithmic compression formula
    - Test minimum separation enforcement
    - Test compression strength parameter
    - Test ordering preservation
    - _Requirements: 3.1-3.7_

- [x] 5. Implement Fixed-Segment Layout mode
  - [x] 5.1 Create FixedSegmentLayout class
    - Implement LayoutStrategy interface
    - Render all track segments at equal length
    - Use configurable segment length value
    - Distribute stations evenly along lines
    - Optimize junction positions to minimize edge crossings
    - Support configurable spacing between parallel lines
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_
  
  - [x]* 5.2 Write property tests for fixed-segment layout
    - **Property 11: Fixed-Segment Equal Lengths** - Validates: Requirements 4.1, 4.2, 4.7
    - **Property 12: Fixed-Segment Even Distribution** - Validates: Requirements 4.3
  
  - [x]* 5.3 Write unit tests for fixed-segment layout
    - Test equal segment lengths
    - Test even station distribution
    - Test segment length configuration
    - Test parallel line spacing
    - _Requirements: 4.1-4.7_

- [x] 6. Checkpoint - Ensure basic layout modes tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement Metro-Map Layout mode
  - [x] 7.1 Create MetroMapLayout class
    - Implement LayoutStrategy interface
    - Start with force-directed layout
    - Snap nodes to grid
    - Constrain edge angles to octilinear (0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°)
    - Apply force-directed optimization with angle constraints
    - Align parallel lines to run alongside each other
    - Optimize junction positions for clean intersections
    - Support configurable grid spacing
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
  
  - [x]* 7.2 Write property tests for metro-map layout
    - **Property 13: Metro-Map Octilinear Constraints** - Validates: Requirements 5.1, 5.7
    - **Property 14: Label Collision Avoidance** - Validates: Requirements 5.3
  
  - [x]* 7.3 Write unit tests for metro-map layout
    - Test octilinear angle constraints
    - Test grid snapping
    - Test force-directed optimization
    - Test grid spacing configuration
    - _Requirements: 5.1-5.7_

- [x] 8. Implement Auto-Layout engine
  - [x] 8.1 Create AutoLayout class
    - Implement LayoutStrategy interface
    - Use D3 force simulation with configurable parameters
    - Apply link distance forces based on edge length properties
    - Apply charge forces to prevent node overlap
    - Apply centering forces to keep network in viewport
    - Apply stronger forces along line edges
    - Provide method to export computed coordinates for reuse
    - Ensure nodes are separated by at least configured minimum distance
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_
  
  - [x]* 8.2 Write property tests for auto-layout
    - **Property 15: Auto-Layout Coordinate Generation** - Validates: Requirements 6.1
    - **Property 16: Auto-Layout Node Separation** - Validates: Requirements 6.4, 6.9
    - **Property 17: Auto-Layout Centering** - Validates: Requirements 6.5
  
  - [x]* 8.3 Write unit tests for auto-layout
    - Test coordinate generation for graph without coordinates
    - Test D3 force simulation integration
    - Test node separation enforcement
    - Test centering forces
    - Test performance with 500 nodes (within 5 seconds)
    - _Requirements: 6.1-6.9_

- [x] 9. Implement layout optimization utilities
  - [x] 9.1 Create LayoutOptimizer class
    - Implement edge crossing minimization algorithm
    - Implement label collision detection and resolution
    - Apply configurable padding around network bounds
    - Support manual position overrides for specific nodes
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_
  
  - [x]* 9.2 Write property tests for layout optimization
    - **Property 18: Layout Bounds Padding** - Validates: Requirements 7.5
    - **Property 19: Manual Position Overrides** - Validates: Requirements 7.6
  
  - [x]* 9.3 Write unit tests for layout optimization
    - Test padding application
    - Test manual override application
    - Test label collision resolution
    - _Requirements: 7.1-7.7_

- [x] 10. Implement layout export and import
  - [x] 10.1 Implement exportLayout in LayoutEngine
    - Return layout data as JSON with node positions, edge geometries, layout mode
    - Include timestamp in exported data
    - _Requirements: 28.1, 28.2_
  
  - [x] 10.2 Implement importLayout in LayoutEngine
    - Validate that node IDs match current RailGraph
    - Support partial layout import (apply positions for matching nodes only)
    - Emit events when layout is exported or imported
    - _Requirements: 28.3, 28.4, 28.5, 28.7_
  
  - [x]* 10.3 Write property tests for layout export/import
    - **Property 58: Layout Export Completeness** - Validates: Requirements 28.2
    - **Property 59: Layout Import Validation** - Validates: Requirements 28.4
    - **Property 60: Layout Import Partial Application** - Validates: Requirements 28.5
    - **Property 61: Layout Export-Import Round-Trip** - Validates: Requirements 28.6
  
  - [x]* 10.4 Write unit tests for layout export/import
    - Test export includes all required fields
    - Test import with matching node IDs
    - Test import with mismatched node IDs
    - Test partial import
    - Test round-trip preservation
    - _Requirements: 28.1-28.7_

- [x] 11. Checkpoint - Ensure all layout modes and optimization tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Implement spatial indexing for viewport culling
  - [x] 12.1 Create BoundingBox utility
    - Define BoundingBox interface with minX, minY, maxX, maxY
    - Implement intersection and containment methods
    - _Requirements: 12.2_
  
  - [x] 12.2 Create RTree spatial index
    - Implement RTree class with insert, remove, search, clear methods
    - Implement bulk load for efficient initial construction
    - Support configurable max entries per node
    - _Requirements: 12.4_
  
  - [x]* 12.3 Write unit tests for spatial indexing
    - Test R-tree insertion and search
    - Test bulk load performance
    - Test bounding box intersection
    - _Requirements: 12.4_

- [x] 13. Implement viewport controller and behaviors
  - [x] 13.1 Create ViewportController class
    - Implement constructor accepting SVG element and configuration
    - Integrate D3 zoom and drag behaviors
    - Maintain viewport transform state (x, y, scale)
    - Implement getTransform() and getVisibleBounds() methods
    - Implement event emitter for pan, zoom, transform, viewport-change events
    - _Requirements: 8.1, 9.1, 24.1_
  
  - [x] 13.2 Implement pan operations
    - Implement panTo() and panBy() methods with animation support
    - Support configurable pan extent limits
    - Emit pan events containing new viewport position
    - Ensure smooth panning with 60 FPS performance
    - _Requirements: 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_
  
  - [x] 13.3 Implement zoom operations
    - Implement zoomTo(), zoomBy(), and zoomToPoint() methods
    - Support configurable minimum and maximum zoom scale bounds
    - Zoom toward cursor position (zoom-to-point behavior)
    - Emit zoom events containing new zoom level
    - Ensure smooth zooming with 60 FPS performance
    - _Requirements: 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_
  
  - [x]* 13.4 Write property tests for viewport controller
    - **Property 20: Pan Extent Bounds** - Validates: Requirements 8.3
    - **Property 21: Zoom Scale Bounds** - Validates: Requirements 9.2
    - **Property 22: Zoom-to-Point Invariance** - Validates: Requirements 9.3
  
  - [x]* 13.5 Write unit tests for viewport controller
    - Test pan operations with and without animation
    - Test zoom operations with and without animation
    - Test pan extent limits
    - Test zoom scale bounds
    - Test zoom-to-point behavior
    - Test event emission
    - _Requirements: 8.1-8.7, 9.1-9.8_

- [x] 14. Implement fit-to-view operations
  - [x] 14.1 Create FitToView utility
    - Implement fitToView() method that adjusts viewport to show all elements
    - Implement fitSelection() method that adjusts viewport to show selected elements
    - Apply configurable padding when fitting to view
    - Preserve aspect ratio when fitting to view
    - Support animated fit-to-view with configurable duration
    - Respect minimum and maximum zoom bounds when fitting
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_
  
  - [x]* 14.2 Write property tests for fit-to-view
    - **Property 23: Fit-to-View Completeness** - Validates: Requirements 10.1
    - **Property 24: Fit-Selection Completeness** - Validates: Requirements 10.2
    - **Property 25: Fit-to-View Padding** - Validates: Requirements 10.3
    - **Property 26: Fit-to-View Aspect Ratio** - Validates: Requirements 10.4
    - **Property 27: Fit-to-View Zoom Bounds** - Validates: Requirements 10.6
  
  - [x]* 14.3 Write unit tests for fit-to-view
    - Test fitToView with simple graph
    - Test fitSelection with selected elements
    - Test padding application
    - Test aspect ratio preservation
    - Test zoom bounds respect
    - Test animation support
    - Test performance (within 500ms)
    - _Requirements: 10.1-10.7_

- [x] 15. Implement semantic zoom system
  - [x] 15.1 Create SemanticZoom class
    - Define three LOD levels: low-detail, mid-detail, high-detail
    - Provide configurable zoom threshold values for each LOD transition
    - Implement updateLOD() method based on zoom scale
    - Implement isVisible() method for element type visibility
    - Implement getVisibilityMap() for all element types
    - Support custom LOD configurations per element type
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_
  
  - [x]* 15.2 Write property tests for semantic zoom
    - **Property 28: LOD Low-Detail Visibility** - Validates: Requirements 11.3
    - **Property 29: LOD Mid-Detail Visibility** - Validates: Requirements 11.4
    - **Property 30: LOD High-Detail Visibility** - Validates: Requirements 11.5
  
  - [x]* 15.3 Write unit tests for semantic zoom
    - Test LOD level transitions
    - Test visibility rules for each LOD level
    - Test custom LOD configurations
    - Test LOD change event emission
    - Test transition performance (within 200ms)
    - _Requirements: 11.1-11.8_

- [x] 16. Implement viewport culling
  - [x] 16.1 Create ViewportCulling class
    - Implement constructor with culling configuration
    - Implement buildIndex() to construct R-tree from positioned graph
    - Implement queryVisible() to find elements intersecting viewport bounds
    - Apply configurable buffer margin around viewport
    - Enable culling only for networks with more than 1000 elements
    - Update culled element set within 16ms when viewport changes
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_
  
  - [x]* 16.2 Write property tests for viewport culling
    - **Property 31: Viewport Culling Activation** - Validates: Requirements 12.1
    - **Property 32: Viewport Culling Correctness** - Validates: Requirements 12.3
    - **Property 33: Viewport Culling Buffer** - Validates: Requirements 12.6
  
  - [x]* 16.3 Write unit tests for viewport culling
    - Test culling activation threshold
    - Test visible element query correctness
    - Test buffer margin application
    - Test R-tree spatial index usage
    - Test update performance (within 16ms)
    - Test 60 FPS maintenance with 5000 elements
    - _Requirements: 12.1-12.7_

- [x] 17. Checkpoint - Ensure viewport and culling tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 18. Implement event management system
  - [x] 18.1 Create EventManager class
    - Implement constructor accepting SVG root element
    - Set up event delegation on SVG root
    - Implement on() and off() methods for event handler registration
    - Implement emit() method for event emission
    - Support event types: element-click, element-dblclick, element-contextmenu, element-hover, element-hover-end, selection-change, brush-start, brush-move, brush-end, focus-change
    - Use event delegation to minimize listener overhead
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [x] 18.2 Implement element event handling
    - Emit click events with element ID, type, coordinates, and custom properties
    - Emit double-click events
    - Emit context-menu events
    - Emit events for both overlay and underlying track element when overlay is clicked
    - _Requirements: 13.1, 13.2, 13.3, 13.6, 13.7_
  
  - [x]* 18.3 Write property tests for event management
    - **Property 34: Click Event Data Completeness** - Validates: Requirements 13.6
    - **Property 35: Overlay Event Propagation** - Validates: Requirements 13.7
  
  - [x]* 18.4 Write unit tests for event management
    - Test event delegation setup
    - Test click event emission
    - Test double-click event emission
    - Test context-menu event emission
    - Test event data completeness
    - Test overlay event propagation
    - _Requirements: 13.1-13.7_

- [x] 19. Implement hover interaction
  - [x] 19.1 Create HoverInteraction class
    - Emit hover events when user hovers over elements
    - Emit hover-end events when cursor moves away
    - Apply configurable hover styles to elements under cursor
    - Support configurable hover delay before triggering events
    - Provide default tooltip rendering with configurable content templates
    - Position tooltips to avoid viewport edges
    - Update hover state within 16ms for smooth interaction
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_
  
  - [x]* 19.2 Write property tests for hover interaction
    - **Property 36: Tooltip Viewport Positioning** - Validates: Requirements 14.6
  
  - [x]* 19.3 Write unit tests for hover interaction
    - Test hover event emission
    - Test hover-end event emission
    - Test hover style application
    - Test hover delay
    - Test tooltip rendering
    - Test tooltip positioning
    - Test hover state update performance
    - _Requirements: 14.1-14.7_

- [x] 20. Implement selection engine
  - [x] 20.1 Create SelectionEngine class
    - Implement constructor with selection configuration
    - Implement select(), deselect(), toggle(), clearSelection() methods
    - Implement isSelected() and getSelection() query methods
    - Implement selectByType() and selectByPredicate() methods
    - Apply configurable selection styles to selected elements
    - Emit selection-change events containing selected element IDs
    - Support single, multi, and brush selection modes
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7_
  
  - [x]* 20.2 Write property tests for selection engine
    - **Property 37: Selection State Click** - Validates: Requirements 15.1
    - **Property 38: Selection State Background Click** - Validates: Requirements 15.2
    - **Property 39: Selection State Shift-Click Toggle** - Validates: Requirements 15.3
    - **Property 40: Selection Style Application** - Validates: Requirements 15.4
  
  - [x]* 20.3 Write unit tests for selection engine
    - Test element selection on click
    - Test background click clears selection
    - Test shift-click toggle
    - Test selection style application
    - Test selection-change event emission
    - Test programmatic selection methods
    - Test selectByType and selectByPredicate
    - _Requirements: 15.1-15.7_

- [x] 21. Implement brush selection
  - [x] 21.1 Create BrushSelection class
    - Implement start(), update(), end() methods for brush lifecycle
    - Display selection rectangle during brush drag
    - Select all elements within rectangle bounds when drag ends
    - Support configurable modifier key for brush selection (default: Alt)
    - Provide visual feedback with semi-transparent rectangle
    - Support additive brush selection (add to existing selection)
    - Support subtractive brush selection (remove from existing selection)
    - Emit brush-selection events containing selected element IDs
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7_
  
  - [x]* 21.2 Write property tests for brush selection
    - **Property 41: Brush Selection Completeness** - Validates: Requirements 16.2
    - **Property 42: Brush Selection Additive Mode** - Validates: Requirements 16.5
    - **Property 43: Brush Selection Subtractive Mode** - Validates: Requirements 16.6
  
  - [x]* 21.3 Write unit tests for brush selection
    - Test brush rectangle display
    - Test element selection within bounds
    - Test modifier key configuration
    - Test visual feedback
    - Test additive mode
    - Test subtractive mode
    - Test brush-selection event emission
    - _Requirements: 16.1-16.7_

- [x] 22. Implement keyboard navigation
  - [x] 22.1 Create KeyboardNavigation class
    - Implement keyboard focus traversal of all interactive elements
    - Support Tab and Shift+Tab for sequential focus traversal
    - Support arrow keys for topological navigation (following track connections)
    - Support Enter and Space keys to activate focused elements
    - Support Escape key to clear selection and reset focus
    - Emit focus-change events when keyboard focus moves
    - _Requirements: 17.1, 17.2, 17.4, 17.5, 17.6, 17.7, 17.8_
  
  - [x] 22.2 Implement focus indicator rendering
    - Render visible focus indicator on focused element
    - Ensure focus indicator meets WCAG 2.1 AA contrast requirements (3:1 minimum)
    - Apply configurable focus indicator styles
    - _Requirements: 17.2, 17.3_
  
  - [x]* 22.3 Write property tests for keyboard navigation
    - **Property 44: Keyboard Focus Traversal** - Validates: Requirements 17.1
    - **Property 45: Focus Indicator Visibility** - Validates: Requirements 17.2
    - **Property 46: Focus Indicator Contrast** - Validates: Requirements 17.3
    - **Property 47: Topological Navigation** - Validates: Requirements 17.5
    - **Property 48: Keyboard Activation** - Validates: Requirements 17.6
    - **Property 49: Escape Key Clears Selection** - Validates: Requirements 17.7
  
  - [x]* 22.4 Write unit tests for keyboard navigation
    - Test Tab key focus traversal
    - Test Shift+Tab reverse traversal
    - Test arrow key topological navigation
    - Test Enter/Space activation
    - Test Escape key behavior
    - Test focus indicator rendering
    - Test focus indicator contrast
    - Test focus-change event emission
    - _Requirements: 17.1-17.8_

- [x] 23. Implement keyboard shortcuts
  - [x] 23.1 Create KeyboardShortcuts class
    - Support shortcuts for zoom in (+), zoom out (-), reset (0)
    - Support shortcut for fit-to-view (F key)
    - Support shortcut for fit-selection (Shift+F)
    - Support shortcut for select-all (Ctrl/Cmd+A)
    - Support shortcut for deselect-all (Escape)
    - Provide registerShortcut() method for custom shortcuts
    - Prevent default browser behavior for registered shortcuts
    - Display keyboard shortcut reference when Help key (?) is pressed
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8_
  
  - [x]* 23.2 Write property tests for keyboard shortcuts
    - **Property 50: Keyboard Shortcut Execution** - Validates: Requirements 18.1, 18.2, 18.3, 18.4, 18.7
    - **Property 51: Keyboard Shortcut Help Display** - Validates: Requirements 18.8
  
  - [x]* 23.3 Write unit tests for keyboard shortcuts
    - Test zoom shortcuts (+, -, 0)
    - Test fit-to-view shortcut (F)
    - Test fit-selection shortcut (Shift+F)
    - Test select-all shortcut (Ctrl+A)
    - Test custom shortcut registration
    - Test default behavior prevention
    - Test help display (?)
    - _Requirements: 18.1-18.8_

- [x] 24. Checkpoint - Ensure interaction and keyboard tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 25. Implement touch gesture support
  - [x] 25.1 Create TouchGestures class
    - Support pinch-to-zoom gesture on touch devices
    - Support two-finger pan gesture on touch devices
    - Support tap gesture equivalent to click
    - Support long-press gesture equivalent to context menu
    - Prevent default touch behaviors that interfere with interactions
    - Provide smooth gesture handling with 60 FPS performance
    - Support configurable gesture sensitivity and thresholds
    - _Requirements: 27.1, 27.2, 27.3, 27.4, 27.5, 27.6, 27.7_
  
  - [x]* 25.2 Write property tests for touch gestures
    - **Property 67: Touch Gesture Mapping** - Validates: Requirements 27.1, 27.2, 27.3, 27.4
    - **Property 68: Touch Event Default Prevention** - Validates: Requirements 27.5
  
  - [x]* 25.3 Write unit tests for touch gestures
    - Test pinch-to-zoom gesture
    - Test two-finger pan gesture
    - Test tap gesture
    - Test long-press gesture
    - Test default behavior prevention
    - Test gesture sensitivity configuration
    - Test performance (60 FPS)
    - _Requirements: 27.1-27.7_

- [x] 26. Implement minimap component
  - [x] 26.1 Create Minimap class
    - Implement constructor accepting container, graph, viewport controller, and configuration
    - Render inset overview of complete schematic
    - Display rectangle indicating current viewport position and extent
    - Support configurable size, position (corner), and styling
    - Use simplified rendering (low LOD) for performance
    - Support toggling visibility via configuration
    - _Requirements: 19.1, 19.2, 19.3, 19.7, 19.8_
  
  - [x] 26.2 Implement minimap interactions
    - Pan main viewport to clicked location when user clicks on minimap
    - Update main viewport in real-time when user drags viewport rectangle
    - Highlight viewport indicator on hover
    - Support mouse wheel zoom on minimap to adjust main viewport zoom
    - Prevent event propagation to avoid triggering main viewport interactions
    - Provide visual feedback during interaction (cursor changes, highlights)
    - Support keyboard navigation (arrow keys to move viewport indicator)
    - Update within 100ms when main viewport changes
    - _Requirements: 19.4, 19.5, 19.6, 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7_
  
  - [x]* 26.3 Write property tests for minimap
    - **Property 52: Minimap Viewport Indicator** - Validates: Requirements 19.2
    - **Property 53: Minimap Click Navigation** - Validates: Requirements 19.4, 20.1
    - **Property 54: Minimap Drag Navigation** - Validates: Requirements 19.5, 20.2
    - **Property 55: Minimap Event Isolation** - Validates: Requirements 20.5
  
  - [x]* 26.4 Write unit tests for minimap
    - Test minimap rendering
    - Test viewport indicator display
    - Test click navigation
    - Test drag navigation
    - Test hover highlighting
    - Test mouse wheel zoom
    - Test event isolation
    - Test keyboard navigation
    - Test update performance (within 100ms)
    - _Requirements: 19.1-19.8, 20.1-20.7_

- [ ] 27. Implement performance monitoring
  - [ ] 27.1 Create PerformanceMonitor class
    - Track frame render time in milliseconds
    - Track layout computation time
    - Track number of rendered elements per frame
    - Track number of culled elements per frame
    - Provide getMetrics() method to retrieve current performance metrics
    - Emit performance events when frame time exceeds configurable thresholds
    - Support enabling/disabling monitoring via configuration
    - Ensure monitoring overhead is less than 5% of total render time
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7, 21.8_
  
  - [ ]* 27.2 Write property tests for performance monitoring
    - **Property 56: Performance Metrics Tracking** - Validates: Requirements 21.1, 21.3, 21.4
    - **Property 57: Performance Threshold Events** - Validates: Requirements 21.6
  
  - [ ]* 27.3 Write unit tests for performance monitoring
    - Test frame time tracking
    - Test layout computation time tracking
    - Test rendered element count tracking
    - Test culled element count tracking
    - Test getMetrics() method
    - Test threshold event emission
    - Test enable/disable configuration
    - Test monitoring overhead (< 5%)
    - _Requirements: 21.1-21.8_

- [ ] 28. Implement animation system
  - [ ] 28.1 Create AnimationSystem class
    - Provide animate() method for value animation over time
    - Support configurable animation duration and easing functions
    - Animate viewport changes (pan, zoom, fit-to-view)
    - Animate layout mode transitions
    - Animate LOD transitions to avoid jarring changes
    - Use requestAnimationFrame for smooth 60 FPS animations
    - Support disabling animations via configuration
    - Provide animation callbacks for start, progress, and complete events
    - Implement cancel() and cancelAll() methods
    - _Requirements: 29.1, 29.2, 29.3, 29.4, 29.5, 29.6, 29.7, 29.8_
  
  - [ ]* 28.2 Write property tests for animation system
    - **Property 62: Animation Callback Invocation** - Validates: Requirements 29.8
  
  - [ ]* 28.3 Write unit tests for animation system
    - Test animate() method
    - Test animation duration and easing
    - Test viewport animation
    - Test layout mode transition animation
    - Test LOD transition animation
    - Test requestAnimationFrame usage
    - Test animation disable configuration
    - Test callback invocation
    - Test cancel methods
    - _Requirements: 29.1-29.8_

- [ ] 29. Implement accessibility features
  - [ ] 29.1 Create ARIAManager class
    - Assign ARIA roles to interactive elements (button, link, or application)
    - Provide ARIA labels for all interactive elements
    - Announce selection changes to screen readers via ARIA live regions
    - Announce zoom level changes to screen readers
    - Implement setRole(), setLabel(), setDescription() methods
    - Implement announce() method with priority levels (polite, assertive)
    - Set up ARIA live regions
    - _Requirements: 26.1, 26.2, 26.3, 26.4_
  
  - [ ] 29.2 Create FocusManager class
    - Render focus indicator on focused elements
    - Ensure focus indicator meets WCAG 2.1 AA contrast requirements (3:1)
    - Apply configurable focus indicator styles
    - Provide skip-to-content functionality for keyboard users
    - _Requirements: 17.2, 17.3, 26.5, 26.7_
  
  - [ ]* 29.3 Write property tests for accessibility
    - **Property 64: ARIA Attribute Completeness** - Validates: Requirements 26.1, 26.2
    - **Property 65: ARIA Live Region Announcements** - Validates: Requirements 26.3, 26.4
    - **Property 66: Skip-to-Content Availability** - Validates: Requirements 26.7
  
  - [ ]* 29.4 Write unit tests for accessibility
    - Test ARIA role assignment
    - Test ARIA label assignment
    - Test ARIA description assignment
    - Test selection change announcements
    - Test zoom level announcements
    - Test focus indicator rendering
    - Test focus indicator contrast
    - Test skip-to-content functionality
    - _Requirements: 26.1-26.7_

- [ ] 30. Implement configuration validation
  - [ ] 30.1 Create configuration validation utilities
    - Validate layout configuration parameters
    - Validate viewport configuration parameters
    - Validate interaction configuration parameters
    - Emit warnings for invalid configuration values
    - Use default values for invalid or missing configuration
    - _Requirements: 23.9, 24.8, 25.8_
  
  - [ ]* 30.2 Write property tests for configuration validation
    - **Property 63: Configuration Validation** - Validates: Requirements 23.9, 24.8, 25.8
  
  - [ ]* 30.3 Write unit tests for configuration validation
    - Test invalid layout configuration handling
    - Test invalid viewport configuration handling
    - Test invalid interaction configuration handling
    - Test warning emission
    - Test default value fallback
    - _Requirements: 23.9, 24.8, 25.8_

- [ ] 31. Checkpoint - Ensure all component and accessibility tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 32. Implement error handling
  - [ ] 32.1 Create error class hierarchy
    - Define LayoutInteractionError base class
    - Define LayoutError class with code and context
    - Define ViewportError class with code and transform
    - Define InteractionError class with code and elementId
    - Define ConfigurationError class with code, field, and value
    - Define error codes for all error types
    - _Requirements: 1.6, 8.3, 9.2, 10.6, 23.9, 24.8, 25.8_
  
  - [ ]* 32.2 Write unit tests for error handling
    - Test error class construction
    - Test error code presence
    - Test error context inclusion
    - Test error message formatting
    - _Requirements: All error-related requirements_

- [ ] 33. Implement performance optimizations
  - [ ] 33.1 Optimize rendering performance
    - Use requestAnimationFrame for smooth animation
    - Debounce expensive operations during continuous interactions
    - Use D3's update pattern to minimize DOM manipulation
    - Cache computed geometries to avoid redundant calculations
    - Provide configurable performance mode (quality vs speed trade-offs)
    - Maintain 60 FPS with up to 5000 elements during pan and zoom
    - Recompute and re-render within 500ms for 500-element networks on layout mode change
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7_
  
  - [ ]* 33.2 Write performance benchmark tests
    - Test 60 FPS maintenance with 5000 elements
    - Test layout mode change performance (500 elements in 500ms)
    - Test requestAnimationFrame usage
    - Test D3 update pattern usage
    - Test performance mode configuration
    - _Requirements: 22.1-22.7_

- [ ] 34. Set up package exports and type definitions
  - [ ] 34.1 Configure package.json exports
    - Set up main entry point exporting LayoutEngine and ViewportController
    - Set up layout modes submodule export
    - Set up viewport submodule export
    - Set up interactions submodule export
    - Set up minimap submodule export
    - Set up types submodule export
    - Configure dual ESM and CommonJS exports
    - _Requirements: 30.2, 30.3, 30.4, 30.5, 30.6, 30.7_
  
  - [ ] 34.2 Create main index.ts entry point
    - Export LayoutEngine, LayoutStrategy, PositionedGraph
    - Export ViewportController, SemanticZoom, ViewportCulling
    - Export EventManager, SelectionEngine, KeyboardNavigation
    - Export Minimap, PerformanceMonitor, AnimationSystem
    - Export all configuration interfaces
    - Export error classes
    - Re-export from submodules
    - _Requirements: 30.2_
  
  - [ ] 34.3 Create types/index.d.ts for TypeScript definitions
    - Export all public TypeScript types
    - Ensure strict mode compatibility
    - Verify zero compilation errors
    - _Requirements: 30.7_
  
  - [ ]* 34.4 Write unit tests for package exports
    - Test importing from main entry point
    - Test importing from submodules
    - Test TypeScript type availability
    - _Requirements: 30.2-30.7_

- [ ] 35. Create documentation and examples
  - [ ] 35.1 Write README.md
    - Add installation instructions
    - Add basic usage examples for layout modes
    - Add basic usage examples for viewport controls
    - Add basic usage examples for interactions
    - Add basic usage examples for minimap
    - Add keyboard shortcuts reference
    - Document package structure and exports
    - Document accessibility features
    - _Requirements: 26.8_
  
  - [ ] 35.2 Create example files
    - Create example using proportional layout
    - Create example using metro-map layout
    - Create example with viewport controls and minimap
    - Create example with keyboard navigation
    - Create example with touch gestures
    - _Requirements: All requirements_

- [ ] 36. Final checkpoint - Run all tests and verify package
  - Run all unit tests and property tests
  - Verify TypeScript compilation with zero errors
  - Verify test coverage meets goals (90% line coverage, 85% branch coverage)
  - Verify all error codes are tested
  - Verify all 68 correctness properties are tested
  - Verify performance benchmarks pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples, edge cases, and error conditions
- The implementation uses TypeScript with strict mode throughout
- Testing uses Vitest and fast-check for property-based testing
- Checkpoints ensure incremental validation at logical breaks
- The package builds on @rail-schematic-viz/core and integrates D3 for viewport behaviors
- Target 80%+ test coverage with focus on critical paths
- Performance targets: 60 FPS with 5000 elements, layout computation within 5 seconds for 500 nodes
- Accessibility compliance: WCAG 2.1 AA for focus indicators, ARIA support, keyboard navigation
