# Implementation Plan: rail-schematic-viz-adapters

## Overview

This implementation plan breaks down the rail-schematic-viz-adapters package into discrete coding tasks. The package provides framework integration for the Rail Schematic Viz library, including export capabilities (SVG, PNG, print) and framework-specific adapters (React, Vue, Web Components) that enable developers to integrate railway schematic visualizations into their applications.

The implementation follows a layered approach: shared export system first, then framework adapters (React, Vue, Web Components) with their respective hooks/composables, and finally package configuration and documentation. Each task builds incrementally with testing integrated throughout.

## Tasks

- [ ] 1. Set up package structure and monorepo configuration
  - Create four packages: @rail-schematic-viz/adapters-shared, @rail-schematic-viz/react, @rail-schematic-viz/vue, @rail-schematic-viz/web-component
  - Configure TypeScript with strict mode for all packages
  - Set up ESM and CommonJS dual exports
  - Create directory structures for each package
  - Configure testing framework (Vitest) with fast-check for property-based testing
  - Set up @testing-library/react, @vue/test-utils, @open-wc/testing
  - Configure peer dependencies (React 18+, Vue 3, core packages)
  - _Requirements: 28.1, 28.5, 28.6, 29.1, 29.5, 29.6, 30.1, 30.5_

- [ ] 2. Implement shared export system
  - [ ] 2.1 Create ExportSystem class
    - Implement constructor accepting renderer, viewport, overlayManager
    - Create event emitter for export events (start, progress, complete, error)
    - Define exportSVG, exportPNG, configurePrint, print methods
    - Implement event registration with on() method
    - _Requirements: 1.1, 1.7_
  
  - [ ] 2.2 Implement SVGExporter class
    - Implement exportSVG method returning Promise<string>
    - Clone SVG DOM tree to avoid mutations
    - Apply viewport transformation based on viewportMode (current, full, selection)
    - Filter overlays based on includeOverlays/excludeOverlays config
    - Embed CSS styles inline for external rendering
    - Add metadata elements (timestamp, library version)
    - Optionally embed fonts
    - Serialize to string with pretty-print or minified option
    - Validate SVG structure before returning
    - _Requirements: 2.1, 2.2, 2.5, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [ ]* 2.3 Write property tests for SVGExporter
    - **Property 1: Export Viewport Capture** - Validates: Requirements 1.2
    - **Property 2: Export Completeness** - Validates: Requirements 1.3, 2.3, 2.4
    - **Property 3: Export Dimension Configuration** - Validates: Requirements 1.4, 2.6
    - **Property 4: Selection-Based Export** - Validates: Requirements 1.6
    - **Property 6: SVG Validity** - Validates: Requirements 2.2
    - **Property 7: SVG Style Embedding** - Validates: Requirements 2.5
    - **Property 8: SVG Metadata Inclusion** - Validates: Requirements 2.7
    - **Property 9: SVG Export Round-Trip** - Validates: Requirements 2.8, 27.8
    - **Property 10: SVG Configuration Application** - Validates: Requirements 3.2, 3.3, 3.5, 3.6, 3.7
    - **Property 11: Overlay Filtering** - Validates: Requirements 3.4
    - **Property 12: Configuration Validation and Defaults** - Validates: Requirements 3.8
  
  - [ ]* 2.4 Write unit tests for SVGExporter
    - Test exporting simple schematic to SVG
    - Test viewport mode options (current, full, selection)
    - Test overlay filtering with include/exclude
    - Test metadata inclusion
    - Test font embedding
    - Test pretty-print vs minified output
    - _Requirements: 2.1-2.8, 3.1-3.8_

- [ ] 3. Implement PNG export system
  - [ ] 3.1 Implement PNGExporter class
    - Implement exportPNG method returning Promise<string>
    - Export SVG using SVGExporter for consistency
    - Create offscreen canvas with configured dimensions
    - Create Image element from SVG data URL
    - Wait for image load event
    - Draw image to canvas with scaling
    - Apply background color if specified
    - Convert canvas to data URL with format and quality
    - Check canvas size limits to prevent browser crashes
    - _Requirements: 4.1, 4.2, 4.4, 4.6, 5.1, 5.3, 5.6_
  
  - [ ]* 3.2 Write property tests for PNGExporter
    - **Property 13: PNG Dimension Scaling** - Validates: Requirements 4.5, 5.2
    - **Property 14: PNG Format Selection** - Validates: Requirements 5.5
    - **Property 15: PNG Color Preservation** - Validates: Requirements 5.7
    - **Property 16: PNG Export Performance** - Validates: Requirements 4.7
  
  - [ ]* 3.3 Write unit tests for PNGExporter
    - Test exporting simple schematic to PNG
    - Test scale factor application (1x, 2x, 3x)
    - Test format selection (PNG, JPEG, WebP)
    - Test quality parameter for JPEG
    - Test background color application
    - Test canvas size limit handling
    - Test export performance with large schematics
    - _Requirements: 4.1-4.8, 5.1-5.8_

- [ ] 4. Implement print export system
  - [ ] 4.1 Implement PrintExporter class
    - Implement configurePrint method accepting PrintConfig
    - Generate print stylesheet with page size, orientation, margins
    - Apply high-contrast colors for B&W printing
    - Calculate page layout for multi-page printing
    - Implement renderLegend for overlay legends
    - Implement renderScaleBar for distance indication
    - Implement renderMetadata for footer information
    - Implement printPreview and print methods
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6, 6.7, 7.1, 7.2, 7.5, 7.6, 7.8_
  
  - [ ]* 4.2 Write property tests for PrintExporter
    - **Property 17: Print Aspect Ratio Preservation** - Validates: Requirements 6.4
    - **Property 18: Print Legend Inclusion** - Validates: Requirements 6.5
    - **Property 19: Print Page Orientation** - Validates: Requirements 6.8, 7.3
    - **Property 20: Print Margin Application** - Validates: Requirements 7.4
    - **Property 21: Print Multi-Page Layout** - Validates: Requirements 7.7
  
  - [ ]* 4.3 Write unit tests for PrintExporter
    - Test print stylesheet generation
    - Test page size configuration (A4, Letter, Legal, custom)
    - Test orientation (portrait, landscape)
    - Test margin application
    - Test legend rendering
    - Test scale bar rendering
    - Test metadata footer rendering
    - Test multi-page layout calculation
    - _Requirements: 6.1-6.8, 7.1-7.8_

- [ ] 5. Implement shared error handling
  - [ ] 5.1 Create error class hierarchy
    - Define AdapterError base class with code and context
    - Define ExportError with stage information
    - Define LifecycleError with phase information
    - Define ERROR_CODES constant with all error codes
    - _Requirements: 1.8_
  
  - [ ]* 5.2 Write unit tests for error classes
    - Test error construction with context
    - Test error code presence
    - Test error message formatting
    - _Requirements: 1.8_
  
  - [ ]* 5.3 Write property test for export error handling
    - **Property 5: Export Error Handling** - Validates: Requirements 1.8

- [ ] 6. Checkpoint - Ensure export system tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement shared lifecycle utilities
  - [ ] 7.1 Create LifecycleManager utility
    - Implement initialization logic for renderer, viewport, overlay manager
    - Implement cleanup logic with resource disposal
    - Implement update logic for prop/attribute changes
    - Handle errors during lifecycle phases
    - _Requirements: 8.5, 8.6, 14.5, 14.6, 20.5, 20.6_
  
  - [ ]* 7.2 Write unit tests for LifecycleManager
    - Test initialization sequence
    - Test cleanup sequence
    - Test update handling
    - Test error handling during lifecycle
    - _Requirements: 8.5, 8.6, 14.5, 14.6, 20.5, 20.6_

- [ ] 8. Implement shared event mapping utilities
  - [ ] 8.1 Create EventMapper utility
    - Implement mapping from library events to framework events
    - Handle event data transformation
    - Support different event naming conventions (camelCase, kebab-case)
    - _Requirements: 10.6, 16.6, 23.6_
  
  - [ ]* 8.2 Write unit tests for EventMapper
    - Test event name transformation
    - Test event data mapping
    - Test different naming conventions
    - _Requirements: 10.6, 16.6, 23.6_

- [ ] 9. Implement React adapter component
  - [ ] 9.1 Create RailSchematic component structure
    - Implement functional component with forwardRef
    - Define RailSchematicProps interface with all props
    - Define RailSchematicRef interface with imperative methods
    - Create refs for container, renderer, viewport, overlayManager, exportSystem
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.8, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 12.1_
  
  - [ ] 9.2 Implement React component initialization
    - Implement useEffect for initialization on mount
    - Create renderer, layout engine, viewport controller
    - Create overlay manager with dependencies
    - Create export system
    - Render initial graph
    - Append SVG to container
    - Return cleanup function destroying all resources
    - _Requirements: 8.5, 8.6_
  
  - [ ] 9.3 Implement React component reactivity
    - Implement useEffect watching data prop changes
    - Implement useEffect watching layoutMode prop changes
    - Implement useEffect watching overlays prop changes
    - Re-render schematic when props change without full remount
    - _Requirements: 9.8_
  
  - [ ] 9.4 Implement React event handlers
    - Implement useEffect for event handler setup
    - Map library events to React event handler props
    - Support onClick, onHover, onSelectionChange, onViewportChange, onOverlayClick
    - Clean up event listeners on unmount
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_
  
  - [ ] 9.5 Implement React ref forwarding
    - Implement useImperativeHandle exposing imperative methods
    - Expose pan, zoom, fitToView methods
    - Expose addOverlay, removeOverlay, toggleOverlay methods
    - Expose exportSVG, exportPNG, print methods
    - Expose selectElements, clearSelection methods
    - Expose getRenderer, getViewport, getOverlayManager methods
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_
  
  - [ ] 9.6 Apply React performance optimizations
    - Wrap component with React.memo
    - Use useMemo for expensive computations
    - Use useCallback for stable event handler references
    - _Requirements: 13.1, 13.2, 13.3_
  
  - [ ]* 9.7 Write property tests for React adapter
    - **Property 22: React Lifecycle Management** - Validates: Requirements 8.5, 8.6
    - **Property 23: React Props Reactivity** - Validates: Requirements 9.8
    - **Property 24: React Event Mapping** - Validates: Requirements 10.6
    - **Property 25: React Event Cleanup** - Validates: Requirements 10.8
    - **Property 27: React Memo Optimization** - Validates: Requirements 13.1
    - **Property 28: React Update Performance** - Validates: Requirements 13.7
  
  - [ ]* 9.8 Write unit tests for React adapter
    - Test component mounting and initialization
    - Test component unmounting and cleanup
    - Test data prop changes trigger re-render
    - Test layoutMode prop changes
    - Test overlay prop changes
    - Test event handler invocation
    - Test ref method calls
    - Test React.memo prevents unnecessary re-renders
    - Test memory leak prevention
    - _Requirements: 8.1-8.8, 9.1-9.8, 10.1-10.8, 12.1-12.8, 13.1-13.8_

- [ ] 10. Implement React useRailSchematic hook
  - [ ] 10.1 Create useRailSchematic hook
    - Accept ref to RailSchematic component
    - Create state for viewport position, scale, selected elements
    - Subscribe to viewport and selection changes in useEffect
    - Return viewport object with position, scale, pan, zoom, fitToView
    - Return overlays object with add, remove, toggle, list methods
    - Return selection object with selected, select, clear methods
    - Return export object with toSVG, toPNG, print methods
    - Use useMemo to prevent unnecessary re-creation
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_
  
  - [ ]* 10.2 Write property test for React hook
    - **Property 26: React Hook Reactive State** - Validates: Requirements 11.6
  
  - [ ]* 10.3 Write unit tests for useRailSchematic hook
    - Test hook returns correct structure
    - Test viewport state updates on viewport changes
    - Test selection state updates on selection changes
    - Test method calls delegate to component ref
    - _Requirements: 11.1-11.8_

- [ ] 11. Checkpoint - Ensure React adapter tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Implement Vue adapter component
  - [ ] 12.1 Create RailSchematic component structure
    - Implement component using script setup with TypeScript
    - Define Props interface with all props using defineProps
    - Define Emits interface with all events using defineEmits
    - Create refs for container, renderer, viewport, overlayManager, exportSystem
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.8, 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7_
  
  - [ ] 12.2 Implement Vue component initialization
    - Implement onMounted hook for initialization
    - Create renderer, layout engine, viewport controller
    - Create overlay manager with dependencies
    - Create export system
    - Render initial graph
    - Append SVG to container
    - Implement onUnmounted hook destroying all resources
    - _Requirements: 14.5, 14.6_
  
  - [ ] 12.3 Implement Vue component reactivity
    - Implement watch for data prop changes
    - Implement watch for layoutMode prop changes
    - Implement watch for overlays prop changes
    - Re-render schematic when reactive props change
    - Use deep watching for complex objects
    - _Requirements: 15.8, 19.1, 19.2, 19.3, 19.4_
  
  - [ ] 12.4 Implement Vue event emitters
    - Implement setupEventHandlers function
    - Map library events to Vue emits
    - Emit click, hover, selection-change, viewport-change, overlay-click events
    - Use kebab-case naming convention
    - Include typed event payloads
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8_
  
  - [ ] 12.5 Implement Vue template ref exposure
    - Use defineExpose to expose imperative methods
    - Expose pan, zoom, fitToView methods
    - Expose addOverlay, removeOverlay, toggleOverlay methods
    - Expose exportSVG, exportPNG, print methods
    - Expose selectElements, clearSelection methods
    - Expose getRenderer, getViewport, getOverlayManager methods
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7_
  
  - [ ]* 12.6 Write property tests for Vue adapter
    - **Property 29: Vue Lifecycle Management** - Validates: Requirements 14.5, 14.6
    - **Property 30: Vue Props Reactivity** - Validates: Requirements 15.8
    - **Property 31: Vue Event Emission** - Validates: Requirements 16.6
    - **Property 33: Vue Reactive Update Efficiency** - Validates: Requirements 19.1-19.7
  
  - [ ]* 12.7 Write unit tests for Vue adapter
    - Test component mounting and initialization
    - Test component unmounting and cleanup
    - Test reactive data prop changes
    - Test reactive layoutMode prop changes
    - Test reactive overlays prop changes
    - Test event emission
    - Test template ref method calls
    - Test update performance
    - _Requirements: 14.1-14.8, 15.1-15.8, 16.1-16.8, 18.1-18.8, 19.1-19.8_

- [ ] 13. Implement Vue useRailSchematic composable
  - [ ] 13.1 Create useRailSchematic composable
    - Accept ref to RailSchematic component
    - Create reactive refs for viewport position, scale, selected elements
    - Subscribe to viewport and selection changes in onMounted
    - Return viewport computed with position, scale, pan, zoom, fitToView
    - Return overlays computed with add, remove, toggle, list methods
    - Return selection computed with selected, select, clear methods
    - Return export computed with toSVG, toPNG, print methods
    - Use computed for reactive method objects
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8_
  
  - [ ]* 13.2 Write property test for Vue composable
    - **Property 32: Vue Composable Reactive State** - Validates: Requirements 17.6
  
  - [ ]* 13.3 Write unit tests for useRailSchematic composable
    - Test composable returns correct structure
    - Test reactive refs update on viewport changes
    - Test reactive refs update on selection changes
    - Test method calls delegate to component ref
    - _Requirements: 17.1-17.8_

- [ ] 14. Checkpoint - Ensure Vue adapter tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Implement Web Component adapter
  - [ ] 15.1 Create RailSchematicElement class structure
    - Extend HTMLElement
    - Define observedAttributes static getter
    - Implement constructor with Shadow DOM attachment
    - Define private properties for renderer, viewport, overlayManager, exportSystem
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.8, 25.1_
  
  - [ ] 15.2 Implement Web Component lifecycle callbacks
    - Implement connectedCallback for initialization
    - Implement disconnectedCallback for cleanup
    - Implement attributeChangedCallback for attribute reactivity
    - Parse data attribute as JSON
    - Create renderer, layout engine, viewport controller
    - Create overlay manager and export system
    - Render initial graph
    - Inject styles into Shadow DOM
    - _Requirements: 20.5, 20.6, 21.6, 21.7_
  
  - [ ] 15.3 Implement Web Component attributes
    - Define observed attributes: data, width, height, layout-mode, overlays
    - Implement attribute change handlers
    - Validate attribute values and emit warnings for invalid values
    - Update schematic when attributes change
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.8_
  
  - [ ] 15.4 Implement Web Component properties
    - Define data property getter/setter
    - Define config property getter/setter
    - Define overlays property getter/setter
    - Define viewport property getter/setter
    - Properties accept complex JavaScript objects
    - Properties take precedence over attributes
    - Update schematic when properties change
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.8_
  
  - [ ] 15.5 Implement Web Component events
    - Emit rail-click CustomEvent for element clicks
    - Emit rail-hover CustomEvent for element hovers
    - Emit rail-selection-change CustomEvent for selection changes
    - Emit rail-viewport-change CustomEvent for viewport changes
    - Emit rail-overlay-click CustomEvent for overlay clicks
    - Set bubbles: true and composed: true for all events
    - Include typed detail objects
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.6, 23.7, 23.8_
  
  - [ ] 15.6 Implement Web Component methods
    - Implement pan, zoom, fitToView methods
    - Implement addOverlay, removeOverlay methods
    - Implement exportSVG, exportPNG, print methods
    - Return promises for async operations
    - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.6, 24.7, 24.8_
  
  - [ ] 15.7 Implement Shadow DOM styling
    - Create getStyles method returning CSS string
    - Define :host styles for component container
    - Define CSS custom properties for theming
    - Inject styles into Shadow DOM
    - Document available CSS custom properties
    - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.8_
  
  - [ ]* 15.8 Write property tests for Web Component adapter
    - **Property 34: Web Component Lifecycle Management** - Validates: Requirements 20.5, 20.6
    - **Property 35: Web Component Attribute Reactivity** - Validates: Requirements 21.7
    - **Property 36: Web Component Attribute Validation** - Validates: Requirements 21.8
    - **Property 37: Web Component Property Precedence** - Validates: Requirements 22.8
    - **Property 38: Web Component Event Bubbling** - Validates: Requirements 23.7
    - **Property 39: Web Component Shadow DOM Style Isolation** - Validates: Requirements 25.5, 25.6
  
  - [ ]* 15.9 Write unit tests for Web Component adapter
    - Test element registration
    - Test connectedCallback initialization
    - Test disconnectedCallback cleanup
    - Test attribute changes trigger updates
    - Test property changes trigger updates
    - Test property precedence over attributes
    - Test CustomEvent emission
    - Test event bubbling
    - Test method calls
    - Test Shadow DOM style isolation
    - _Requirements: 20.1-20.8, 21.1-21.8, 22.1-22.8, 23.1-23.8, 24.1-24.8, 25.1-25.8_

- [ ] 16. Implement Web Component registration
  - [ ] 16.1 Create register function
    - Check if custom element already registered
    - Call customElements.define with rail-schematic name
    - Export register function
    - Support auto-registration as side-effect module
    - _Requirements: 30.2, 30.3_
  
  - [ ]* 16.2 Write unit tests for registration
    - Test register function registers element
    - Test duplicate registration is prevented
    - _Requirements: 30.2, 30.3_

- [ ] 17. Checkpoint - Ensure Web Component adapter tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 18. Configure React package exports and documentation
  - [ ] 18.1 Configure React package.json
    - Set name to @rail-schematic-viz/react
    - Configure main entry point exporting RailSchematic component
    - Configure hooks submodule export
    - Configure types export
    - Declare React 18+ as peer dependency
    - Declare core, layout, overlays packages as peer dependencies
    - Configure dual ESM and CommonJS exports
    - _Requirements: 28.1, 28.2, 28.3, 28.4, 28.5, 28.6_
  
  - [ ] 18.2 Write React README.md
    - Add installation instructions
    - Add basic usage example with component
    - Add usage example with useRailSchematic hook
    - Add usage example with ref forwarding
    - Add API documentation for props and methods
    - Document TypeScript types
    - _Requirements: 28.7_
  
  - [ ]* 18.3 Verify React package structure
    - Test importing from main entry point
    - Test importing from hooks submodule
    - Test TypeScript type availability
    - Verify test coverage meets 80% target
    - _Requirements: 28.8_

- [ ] 19. Configure Vue package exports and documentation
  - [ ] 19.1 Configure Vue package.json
    - Set name to @rail-schematic-viz/vue
    - Configure main entry point exporting RailSchematic component
    - Configure composables submodule export
    - Configure types export
    - Declare Vue 3 as peer dependency
    - Declare core, layout, overlays packages as peer dependencies
    - Configure dual ESM and CommonJS exports
    - _Requirements: 29.1, 29.2, 29.3, 29.4, 29.5, 29.6_
  
  - [ ] 19.2 Write Vue README.md
    - Add installation instructions
    - Add basic usage example with component
    - Add usage example with useRailSchematic composable
    - Add usage example with template refs
    - Add API documentation for props, events, and methods
    - Document TypeScript types
    - _Requirements: 29.7_
  
  - [ ]* 19.3 Verify Vue package structure
    - Test importing from main entry point
    - Test importing from composables submodule
    - Test TypeScript type availability
    - Verify test coverage meets 80% target
    - _Requirements: 29.8_

- [ ] 20. Configure Web Component package exports and documentation
  - [ ] 20.1 Configure Web Component package.json
    - Set name to @rail-schematic-viz/web-component
    - Configure main entry point exporting register function
    - Configure side-effect module for auto-registration
    - Configure types export
    - Declare core, layout, overlays packages as dependencies
    - Configure dual ESM and CommonJS exports
    - _Requirements: 30.1, 30.2, 30.3, 30.4, 30.5_
  
  - [ ] 20.2 Write Web Component README.md
    - Add installation instructions
    - Add basic usage example with HTML
    - Add usage example with JavaScript properties
    - Add usage example with event listeners
    - Add API documentation for attributes, properties, methods, events
    - Document CSS custom properties for theming
    - Document browser compatibility requirements
    - _Requirements: 30.6, 30.8_
  
  - [ ]* 20.3 Verify Web Component package structure
    - Test importing register function
    - Test auto-registration side-effect
    - Test TypeScript type availability
    - Verify test coverage meets 80% target
    - _Requirements: 30.7_

- [ ] 21. Create integration tests across adapters
  - [ ]* 21.1 Write integration tests for export system
    - Test export from React component
    - Test export from Vue component
    - Test export from Web Component
    - Verify exported outputs are identical across adapters
    - _Requirements: 27.1, 27.2, 27.3, 27.4, 27.5, 27.6, 27.7_
  
  - [ ]* 21.2 Write memory leak tests
    - Test React component doesn't leak event listeners
    - Test Vue component doesn't leak event listeners
    - Test Web Component doesn't leak event listeners
    - Test export system doesn't leak resources
    - _Requirements: 26.8_
  
  - [ ]* 21.3 Write visual regression tests
    - Test React component rendering output
    - Test Vue component rendering output
    - Test Web Component rendering output
    - Verify visual consistency across adapters
    - _Requirements: 26.7_

- [ ] 22. Final checkpoint - Run all tests and verify packages
  - Run all unit tests and property tests for all packages
  - Verify TypeScript compilation with zero errors
  - Verify test coverage meets 80% target for all packages
  - Verify all error codes are tested
  - Test importing from all package entry points
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples, edge cases, and error conditions
- The implementation uses TypeScript with strict mode throughout
- Testing uses Vitest with fast-check for property-based testing
- Framework-specific testing libraries: @testing-library/react, @vue/test-utils, @open-wc/testing
- Checkpoints ensure incremental validation at logical breaks
- All adapters share the export system for consistency
- Each adapter follows framework-specific patterns and conventions
