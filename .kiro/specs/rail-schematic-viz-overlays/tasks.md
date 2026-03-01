# Implementation Plan: rail-schematic-viz-overlays

## Overview

This implementation plan creates the data visualization overlay system for the Rail Schematic Viz library. The overlay system provides a pluggable architecture for visualizing operational data, metrics, and annotations on railway schematic diagrams. The implementation includes five built-in overlay types (heat-map, annotation, range band, traffic flow, time-series), a custom overlay plugin API, color scale and palette libraries, legend rendering, spatial optimization (collision detection, clustering, R-tree indexing), and performance optimizations for large datasets.

The implementation follows a layered architecture: core overlay system (interfaces, manager, registry) → built-in overlays → rendering strategies (SVG, Canvas) → visualization support (colors, legends, spatial indexing, animation). All overlays implement the RailOverlay interface for uniform lifecycle management. The system uses Canvas rendering for dense data layers (10,000+ points at 60 FPS), SVG for interactive elements, D3 update patterns for efficient updates, and R-tree spatial indexing for viewport culling.

This package builds on @rail-schematic-viz/core (CoordinateBridge, RailGraph) and @rail-schematic-viz/layout (ViewportController, EventManager) to provide rich data visualization capabilities.

## Tasks

- [ ] 1. Set up package structure and core overlay interfaces
  - Create package.json with dependencies (d3, rbush, fast-check, vitest)
  - Define RailOverlay interface with lifecycle methods (initialize, render, update, resize, destroy)
  - Define OverlayContext and RenderContext interfaces
  - Define OverlayConfiguration base interface
  - Define Result type for error handling
  - Define OverlayError class with error codes
  - Export TypeScript type definitions
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.8, 30.1, 30.6_

- [ ]* 1.1 Write property test for overlay interface compliance
  - **Property 6: Data Structure Validation**
  - **Validates: Requirements 3.1, 6.1, 9.1, 11.1, 13.1**


- [ ] 2. Implement OverlayRegistry for custom overlay registration
  - Create OverlayRegistry class with factory pattern
  - Implement register() method accepting overlay type and factory function
  - Implement unregister() method for removing overlay types
  - Implement create() method for instantiating overlays
  - Implement validation that custom overlays implement RailOverlay interface
  - Pre-register built-in overlay types (heat-map, annotation, range-band, traffic-flow, time-series)
  - Define RegistryError class for registration errors
  - _Requirements: 16.1, 16.3, 16.6_

- [ ]* 2.1 Write property test for custom overlay registration
  - **Property 22: Custom Overlay Registration Validation**
  - **Validates: Requirements 16.3**

- [ ] 3. Implement OverlayManager for overlay lifecycle management
  - Create OverlayManager class with overlay collection (Map<string, RailOverlay>)
  - Implement addOverlay() method with unique ID generation
  - Implement removeOverlay() method with cleanup
  - Implement getOverlay() and getAllOverlays() methods
  - Implement visibility control methods (showOverlay, hideOverlay, toggleOverlay, showAll, hideAll)
  - Implement z-order control methods (setZOrder, bringToFront, sendToBack)
  - Implement opacity control methods (setOpacity with validation)
  - Implement updateOverlayData() and batchUpdate() methods
  - Implement renderAll() and renderOverlay() methods
  - Implement getLegends() method
  - Implement event emission (overlay-added, overlay-removed, visibility-change, z-order-change, opacity-change, data-update)
  - Implement error handling with OverlayError
  - _Requirements: 1.6, 1.7, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 20.1, 20.2, 20.3, 20.4, 20.6, 20.7, 21.1, 21.2, 21.3, 21.4, 21.6, 21.7, 23.1, 23.2, 23.4, 23.6, 23.7_

- [ ]* 3.1 Write property test for overlay collection maintenance
  - **Property 1: Overlay Collection Maintenance**
  - **Validates: Requirements 1.6**

- [ ]* 3.2 Write property test for unique overlay identifiers
  - **Property 3: Unique Overlay Identifiers**
  - **Validates: Requirements 2.3**

- [ ]* 3.3 Write property test for overlay lifecycle method invocation
  - **Property 4: Overlay Lifecycle Method Invocation**
  - **Validates: Requirements 2.4, 2.5, 17.6**

- [ ]* 3.4 Write property test for multiple instances support
  - **Property 5: Multiple Instances Support**
  - **Validates: Requirements 2.6, 16.6**

- [ ]* 3.5 Write property test for visibility control isolation
  - **Property 14: Visibility Control Isolation**
  - **Validates: Requirements 19.2**

- [ ]* 3.6 Write property test for z-order rendering sequence
  - **Property 2: Z-Order Rendering Sequence**
  - **Validates: Requirements 1.7, 20.4**

- [ ]* 3.7 Write property test for opacity validation
  - **Property 16: Opacity Range Validation**
  - **Validates: Requirements 21.1, 21.6**

- [ ]* 3.8 Write property test for data update isolation
  - **Property 18: Data Update Isolation**
  - **Validates: Requirements 23.4**

- [ ] 4. Implement rendering strategies (SVG and Canvas)
  - Define RenderStrategy interface with render(), update(), clear() methods
  - Define RenderElement interface with geometry and style
  - Define geometry types (PointGeometry, LineGeometry, PolygonGeometry, PathGeometry)
  - Implement SVGRenderer with D3 data join for efficient rendering
  - Implement CanvasRenderer with offscreen canvas support
  - Implement UpdatePattern class encapsulating D3 enter-update-exit pattern
  - _Requirements: 3.7, 28.1, 28.2_

- [ ]* 4.1 Write unit tests for SVGRenderer
  - Test element creation for each geometry type
  - Test style application
  - Test D3 update pattern

- [ ]* 4.2 Write unit tests for CanvasRenderer
  - Test rendering for each geometry type
  - Test offscreen canvas usage
  - Test clear operation


- [ ] 5. Implement color scale library
  - Create ColorScale class with static methods for scale types
  - Implement linear() scale using d3.scaleLinear
  - Implement logarithmic() scale using d3.scaleLog
  - Implement quantile() scale using d3.scaleQuantile
  - Implement threshold() scale using d3.scaleThreshold
  - Implement sequential() scale using d3.scaleSequential
  - Implement diverging() scale using d3.scaleDiverging
  - Implement custom() scale accepting user-defined functions
  - Define ColorScaleFunction type
  - _Requirements: 3.4, 26.1, 26.2, 26.3, 26.4, 26.5, 26.6, 26.8_

- [ ]* 5.1 Write property test for custom color scale registration
  - **Property 23: Custom Color Scale Registration**
  - **Validates: Requirements 26.8**

- [ ] 6. Implement color palette library
  - Create ColorPalette class with predefined palettes as static properties
  - Implement sequential palettes (Blues, Greens, Reds, Greys)
  - Implement diverging palettes (RdBu, RdYlGn, Spectral)
  - Implement perceptually uniform palettes (Viridis, Plasma, Inferno)
  - Implement color-blind safe palettes (ColorBlindSafe, ColorBlindSafeDiverging)
  - Implement high contrast palette (HighContrast) meeting WCAG 2.1 AAA
  - Implement categorical palettes (Category10, Category20)
  - Implement getPalette() method
  - Implement isColorBlindSafe() and isHighContrast() helper methods
  - _Requirements: 27.1, 27.2, 27.3, 27.4, 27.5, 27.6, 27.7, 27.8, 29.3_

- [ ]* 6.1 Write property test for custom color palette registration
  - **Property 24: Custom Color Palette Registration**
  - **Validates: Requirements 27.8**

- [ ]* 6.2 Write unit tests for color palette accessibility
  - Test color-blind safe palette identification
  - Test high contrast palette WCAG compliance
  - Test contrast ratios meet minimum requirements

- [ ] 7. Implement spatial indexing with R-tree
  - Create SpatialIndex class wrapping RBush library
  - Implement insert() method for adding entries
  - Implement remove() method for removing entries
  - Implement search() method for bounding box queries
  - Implement clear() method
  - Implement bulkLoad() method for efficient initial construction
  - Define IndexEntry interface
  - _Requirements: 4.2, 7.7, 8.7, 28.4_

- [ ]* 7.1 Write unit tests for spatial index operations
  - Test insert and search operations
  - Test bulk load performance
  - Test bounding box queries

- [ ] 8. Implement collision detection for annotations
  - Create CollisionDetection class
  - Implement detect() method accepting labels with positions and priorities
  - Implement computeBoundingBox() method for text dimension estimation
  - Implement resolveCollisions() method with strategy pattern (adjust, hide, cluster)
  - Implement position adjustment algorithm to prevent overlaps
  - Implement priority-based collision resolution
  - Define CollisionConfig, CollisionResult, AdjustedPosition interfaces
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

- [ ]* 8.1 Write property test for collision detection
  - **Property 10: Collision Detection for Overlapping Labels**
  - **Validates: Requirements 7.1**

- [ ]* 8.2 Write property test for leader lines on adjusted labels
  - **Property 11: Leader Lines for Adjusted Labels**
  - **Validates: Requirements 7.6**

- [ ]* 8.3 Write unit tests for collision detection strategies
  - Test adjust strategy with various label arrangements
  - Test hide strategy with priority ordering
  - Test bounding box computation accuracy


- [ ] 9. Implement clustering for annotations
  - Create Clustering class
  - Implement cluster() method accepting annotations and zoom scale
  - Implement shouldCluster() method checking zoom threshold
  - Implement groupNearby() method using spatial index for proximity queries
  - Implement cluster marker creation with count badges
  - Define ClusteringConfig, ClusterResult, Cluster interfaces
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [ ]* 9.1 Write property test for annotation clustering by proximity
  - **Property 12: Annotation Clustering by Proximity**
  - **Validates: Requirements 8.1**

- [ ]* 9.2 Write unit tests for clustering behavior
  - Test zoom-based clustering threshold
  - Test cluster expansion and collapse
  - Test cluster count accuracy

- [ ] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement HeatMapOverlay
  - Create HeatMapOverlay class implementing RailOverlay interface
  - Implement initialize() method setting up Canvas rendering and spatial index
  - Implement render() method with viewport culling and color gradient rendering
  - Implement update() method using D3 update pattern
  - Implement resize() method for viewport dimension changes
  - Implement destroy() method for cleanup
  - Implement getLegend() method returning color scale and value range
  - Implement getPerformanceMetrics() method
  - Implement configure() and getConfiguration() methods
  - Implement color interpolation between data points
  - Implement caching for rendered gradients
  - Implement performance mode configuration (quality, balanced, speed)
  - Define HeatMapDataPoint and HeatMapConfiguration interfaces
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ]* 11.1 Write property test for coordinate projection completeness
  - **Property 7: Coordinate Projection Completeness**
  - **Validates: Requirements 3.2, 6.2, 9.2**

- [ ]* 11.2 Write property test for legend descriptor validity
  - **Property 8: Legend Descriptor Validity**
  - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 11.8**

- [ ]* 11.3 Write unit tests for HeatMapOverlay
  - Test data acceptance and validation
  - Test color scale application
  - Test interpolation modes (linear, step, smooth)
  - Test viewport culling with spatial index
  - Test cache behavior

- [ ] 12. Implement AnnotationOverlay
  - Create AnnotationOverlay class implementing RailOverlay interface
  - Implement initialize() method setting up SVG rendering, collision detection, and clustering
  - Implement render() method with projection, clustering, collision detection, and pin/label rendering
  - Implement update() method using D3 update pattern
  - Implement resize() method
  - Implement destroy() method
  - Implement getLegend() method
  - Implement getPerformanceMetrics() method
  - Implement configure() and getConfiguration() methods
  - Implement click event handling with annotation data emission
  - Implement cluster click event handling
  - Implement leader line rendering for adjusted labels
  - Implement pin icon rendering (default, circle, square, triangle, custom SVG)
  - Define AnnotationDataPoint and AnnotationConfiguration interfaces
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.8, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [ ]* 12.1 Write property test for event emission on interaction
  - **Property 9: Event Emission on Interaction**
  - **Validates: Requirements 6.7, 8.4, 24.1**

- [ ]* 12.2 Write unit tests for AnnotationOverlay
  - Test pin icon rendering for each type
  - Test label styling application
  - Test collision detection integration
  - Test clustering integration
  - Test click event data structure


- [ ] 13. Implement RangeBandOverlay
  - Create RangeBandOverlay class implementing RailOverlay interface
  - Implement initialize() method setting up SVG rendering
  - Implement render() method with start/end position projection and track topology following
  - Implement update() method using D3 update pattern
  - Implement resize() method
  - Implement destroy() method
  - Implement getLegend() method
  - Implement getPerformanceMetrics() method
  - Implement configure() and getConfiguration() methods
  - Implement hover event handling with band data emission
  - Implement overlapping band rendering with z-ordering and blend modes
  - Implement stacked rendering mode with vertical offset
  - Implement label rendering at band midpoints
  - Define RangeBandDataPoint and RangeBandConfiguration interfaces
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [ ]* 13.1 Write property test for range band overlap handling
  - **Property 13: Range Band Overlap Rendering**
  - **Validates: Requirements 10.1**

- [ ]* 13.2 Write unit tests for RangeBandOverlay
  - Test track topology following for multi-segment bands
  - Test blend modes (normal, multiply, screen)
  - Test stacking mode with offset calculation
  - Test label positioning (above, below, inline)
  - Test hover event emission for overlapping bands

- [ ] 14. Implement TrafficFlowOverlay
  - Create TrafficFlowOverlay class implementing RailOverlay interface
  - Implement initialize() method setting up SVG rendering and animation controller
  - Implement render() method with arrow rendering based on direction and frequency
  - Implement update() method using D3 update pattern
  - Implement resize() method
  - Implement destroy() method
  - Implement getLegend() method with frequency scale
  - Implement getPerformanceMetrics() method
  - Implement configure() and getConfiguration() methods
  - Implement arrow width scaling based on frequency
  - Implement arrow orientation based on direction (up, down, bidirectional)
  - Implement animation support (continuous, pulsing, dashed styles)
  - Define TrafficFlowDataPoint and TrafficFlowConfiguration interfaces
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

- [ ]* 14.1 Write unit tests for TrafficFlowOverlay
  - Test arrow rendering for each direction type
  - Test width scaling function application
  - Test animation styles
  - Test bidirectional arrow separation
  - Test legend frequency scale

- [ ] 15. Implement AnimationController
  - Create AnimationController class
  - Implement start() method with requestAnimationFrame loop
  - Implement stop() method with cleanup
  - Implement pause() and resume() methods
  - Implement setSpeed() method for playback rate adjustment
  - Implement tick() method updating all active animations
  - Define AnimationConfig and AnimationState interfaces
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

- [ ]* 15.1 Write unit tests for AnimationController
  - Test animation lifecycle (start, pause, resume, stop)
  - Test speed adjustment
  - Test multiple simultaneous animations
  - Test frame callback invocation


- [ ] 16. Implement TimeSeriesOverlay
  - Create TimeSeriesOverlay class implementing RailOverlay interface
  - Implement initialize() method setting up temporal index and UI controls
  - Implement render() method with timestamp filtering and metric visibility
  - Implement update() method rebuilding temporal index
  - Implement resize() method
  - Implement destroy() method
  - Implement getLegend() method with all metrics and visibility state
  - Implement getPerformanceMetrics() method
  - Implement configure() and getConfiguration() methods
  - Implement playback control methods (play, pause, stop, setPlaybackSpeed, seekTo)
  - Implement metric control methods (toggleMetric, setMetricVisibility)
  - Implement time slider UI with position updates
  - Implement temporal indexing (Map<timestamp, data points>) for O(1) queries
  - Implement frame preloading for smooth playback
  - Implement frame caching for frequently accessed timestamps
  - Define TimeSeriesDataPoint and TimeSeriesConfiguration interfaces
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7_

- [ ]* 16.1 Write property test for time-series timestamp filtering
  - **Property 25: Time-Series Timestamp Filtering**
  - **Validates: Requirements 13.3**

- [ ]* 16.2 Write property test for time-series metric visibility toggle
  - **Property 26: Time-Series Metric Visibility Toggle**
  - **Validates: Requirements 14.1, 14.4**

- [ ]* 16.3 Write unit tests for TimeSeriesOverlay
  - Test temporal index construction and queries
  - Test playback controls (play, pause, stop, speed)
  - Test time slider position updates
  - Test metric toggle functionality
  - Test frame preloading and caching
  - Test time format display

- [ ] 17. Checkpoint - Ensure all overlay implementations pass tests
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 18. Implement legend system
  - Define LegendDescriptor interface with discriminated union for legend types
  - Define ContinuousLegendItem, DiscreteLegendItem, CategoricalLegendItem interfaces
  - Create LegendRenderer class
  - Implement render() method positioning and rendering legends based on type
  - Implement renderContinuous() method for gradient bars with ticks
  - Implement renderDiscrete() method for color stops with labels
  - Implement renderCategorical() method for symbols with labels
  - Implement update() method for efficient legend updates
  - Implement clear() method
  - Implement collapsible legend support with expand/collapse controls
  - Define LegendConfiguration interface
  - _Requirements: 5.6, 5.7, 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7, 22.8_

- [ ]* 18.1 Write property test for legend rendering for visible overlays
  - **Property 17: Legend Rendering for Visible Overlays**
  - **Validates: Requirements 22.2**

- [ ]* 18.2 Write unit tests for LegendRenderer
  - Test each legend type rendering (continuous, discrete, categorical)
  - Test legend positioning (all corner positions)
  - Test collapsible legend behavior
  - Test legend styling application


- [ ] 19. Implement performance optimization utilities
  - Create PerformanceMonitor class
  - Implement startMeasure() and endMeasure() methods
  - Implement getMetrics() and getAllMetrics() methods
  - Implement reset() method
  - Define OverlayMetrics interface with render/update time statistics
  - Create Debounce class with static debounce() and throttle() methods
  - Integrate debouncing for viewport change updates
  - _Requirements: 4.5, 4.7, 15.7, 28.5, 28.8_

- [ ]* 19.1 Write unit tests for PerformanceMonitor
  - Test measurement accuracy
  - Test metrics aggregation (average, max, min)
  - Test reset functionality

- [ ]* 19.2 Write unit tests for debounce and throttle
  - Test debounce delay behavior
  - Test throttle frequency limiting
  - Test function invocation timing

- [ ] 20. Implement overlay event handling system
  - Extend OverlayManager with event handling methods
  - Implement click event emission with overlay ID, element data, and coordinates
  - Implement hover and hover-end event emission
  - Implement event delegation for efficient listener management
  - Implement event handler registration per overlay instance
  - Implement configuration-change event emission
  - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.6, 24.7, 24.8, 25.7_

- [ ]* 20.1 Write unit tests for event handling
  - Test click event emission and data structure
  - Test hover event emission
  - Test event delegation behavior
  - Test event handler registration and cleanup

- [ ] 21. Implement overlay configuration validation
  - Extend OverlayManager with configuration validation
  - Implement validation for required configuration properties
  - Implement default value application for missing properties
  - Implement configuration update at runtime
  - Implement configuration schema validation for each overlay type
  - _Requirements: 2.8, 25.1, 25.2, 25.3, 25.4, 25.5, 25.6, 25.8_

- [ ]* 21.1 Write property test for configuration validation
  - **Property 19: Configuration Validation and Defaults**
  - **Validates: Requirements 25.5**

- [ ]* 21.2 Write unit tests for configuration validation
  - Test required property validation
  - Test default value application
  - Test runtime configuration updates
  - Test invalid configuration rejection

- [ ] 22. Implement accessibility features
  - Add ARIA labels to all interactive overlay elements
  - Implement keyboard navigation support (Tab, Enter, Space, Escape, Arrow keys)
  - Implement ARIA live regions for overlay visibility announcements
  - Implement focus management for overlay elements
  - Add role attributes to overlay elements (button, img)
  - Implement aria-expanded for cluster markers
  - Implement aria-pressed for playback controls
  - Implement aria-describedby for tooltips
  - _Requirements: 29.1, 29.2, 29.4, 29.5_

- [ ]* 22.1 Write unit tests for accessibility features
  - Test ARIA label presence on interactive elements
  - Test keyboard navigation event handling
  - Test focus management
  - Test ARIA live region updates


- [ ] 23. Implement viewport culling optimization
  - Integrate SpatialIndex into HeatMapOverlay for viewport culling
  - Implement visible bounds calculation with buffer margin
  - Implement viewport culling in AnnotationOverlay
  - Implement viewport culling in RangeBandOverlay
  - Implement culled element count tracking in performance metrics
  - _Requirements: 4.2, 28.3, 28.4_

- [ ]* 23.1 Write unit tests for viewport culling
  - Test spatial index queries for visible bounds
  - Test buffer margin calculation
  - Test culled element count accuracy
  - Test rendering only visible elements

- [ ] 24. Checkpoint - Ensure all optimization and accessibility tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 25. Wire all components together and create main exports
  - Create src/index.ts with all public API exports
  - Export OverlayManager, OverlayRegistry, RailOverlay interface
  - Export all built-in overlay types (HeatMapOverlay, AnnotationOverlay, RangeBandOverlay, TrafficFlowOverlay, TimeSeriesOverlay)
  - Export ColorScale and ColorPalette
  - Export LegendRenderer and LegendDescriptor
  - Export CollisionDetection, Clustering, SpatialIndex
  - Export AnimationController and PerformanceMonitor
  - Create submodule exports (src/overlays/index.ts, src/colors/index.ts, src/legend/index.ts)
  - Export all TypeScript type definitions
  - _Requirements: 30.2, 30.3, 30.4, 30.5, 30.6_

- [ ] 26. Create package documentation
  - Create README.md with installation instructions
  - Add usage examples for each overlay type
  - Add custom overlay development guide
  - Add API reference overview
  - Document color scale and palette options
  - Document accessibility features
  - Document performance optimization guidelines
  - _Requirements: 30.8_

- [ ]* 26.1 Write integration tests for multi-overlay scenarios
  - Test multiple overlays with different z-orders
  - Test overlay visibility toggling with multiple overlays
  - Test batch data updates
  - Test legend rendering for multiple overlays
  - Test event handling with multiple overlays

- [ ]* 26.2 Write integration tests for core package dependencies
  - Test CoordinateBridge integration for all overlay types
  - Test ViewportController integration
  - Test EventManager integration
  - Test RailGraph integration

- [ ] 27. Final checkpoint - Ensure all tests pass and coverage meets 80% target
  - Run all unit tests and verify passing
  - Run all property-based tests and verify passing
  - Run all integration tests and verify passing
  - Check code coverage meets 80% minimum
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at logical breaks
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
- All overlays use TypeScript strict mode for type safety
- Testing framework: Vitest with fast-check for property-based tests
- Target: 80%+ code coverage across all modules
- Performance target: 60 FPS (16ms frame budget) for all overlay operations
- Canvas rendering for dense data layers (>1000 points)
- SVG rendering for interactive elements (<1000 points)
- R-tree spatial indexing for O(log n) viewport culling
- D3 update patterns for efficient data-driven updates
