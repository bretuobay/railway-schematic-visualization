# Implementation Plan: rail-schematic-viz-core

## Overview

This implementation plan breaks down the rail-schematic-viz-core package into discrete coding tasks. The package provides the foundational layer for railway network visualization, including a graph-based data model, coordinate systems, parsers (railML 3, JSON, Builder API), SVG rendering engine, and coordinate bridge for linear referencing.

The implementation follows a bottom-up approach: core data structures first, then parsers and builders, followed by rendering and coordinate transformation capabilities. Each task builds incrementally, with testing integrated throughout to validate functionality early.

## Tasks

- [x] 1. Set up package structure and TypeScript configuration
  - Create package.json with @rail-schematic-viz/core name and dependencies
  - Configure TypeScript with strict mode enabled
  - Set up ESM and CommonJS dual exports
  - Create directory structure (src/model, src/parsers, src/builder, src/renderer, src/coordinates, src/errors)
  - Configure testing framework (Jest or Vitest) with fast-check for property-based testing
  - _Requirements: 13.1, 13.8, 11.8_

- [x] 2. Implement core data model types and structures
  - [x] 2.1 Create coordinate type definitions
    - Define ScreenCoordinate, LinearCoordinate, GeographicCoordinate as discriminated unions
    - Define CoordinateSystemType enum
    - Create branded types for NodeId, EdgeId, LineId
    - _Requirements: 2.1, 2.2, 2.3, 11.5_
  
  - [x] 2.2 Implement RailNode class
    - Define RailNode interface with id, name, type, coordinate, metadata
    - Define NodeType union type
    - _Requirements: 1.4, 11.2_
  
  - [x] 2.3 Implement RailEdge class
    - Define RailEdge interface with id, source, target, length, geometry, metadata
    - Define EdgeGeometry discriminated union (StraightGeometry, CurveGeometry, SwitchGeometry)
    - Define SwitchType union type
    - _Requirements: 1.5, 11.3_
  
  - [x] 2.4 Implement RailLine class
    - Define RailLine interface with id, name, edges, color, metadata
    - _Requirements: 1.6, 11.4_
  
  - [x] 2.5 Implement RailGraph class
    - Create RailGraph with ReadonlyMap for nodes, edges, lines
    - Implement getNode, getEdge, getLine query methods
    - Implement getEdgesFrom, getEdgesTo, getConnectedNodes traversal methods
    - Implement validate method for coordinate system consistency
    - _Requirements: 1.1, 1.2, 1.3, 1.7, 1.8, 1.9, 2.7, 11.1_
  
  - [x]* 2.6 Write property tests for core data model
    - **Property 1: Node Query Correctness** - Validates: Requirements 1.7
    - **Property 2: Edge Query by Endpoints** - Validates: Requirements 1.8
    - **Property 3: Connected Edge Traversal** - Validates: Requirements 1.9
    - **Property 4: Coordinate System Consistency** - Validates: Requirements 2.7

- [x] 3. Implement error handling system
  - [x] 3.1 Create error class hierarchy
    - Define RailSchematicError base class
    - Define ParseError, ValidationError, ProjectionError, BuildError classes
    - Define error code constants
    - Define ParseErrorContext type
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_
  
  - [x]* 3.2 Write unit tests for error classes
    - Test error construction with context
    - Test error code presence
    - Test error message formatting
    - _Requirements: 12.7, 12.8_

- [x] 4. Implement Builder API
  - [x] 4.1 Create GraphBuilder class
    - Implement addNode method with chained configuration
    - Implement addEdge method with chained configuration
    - Implement addLine method with chained configuration
    - Implement build method with validation
    - Validate node references when adding edges
    - Validate edge references when adding lines
    - Return BuildError for invalid references
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_
  
  - [x]* 4.2 Write property tests for Builder API
    - **Property 6: Builder Node Reference Validation** - Validates: Requirements 5.5
    - **Property 7: Builder Edge Reference Validation** - Validates: Requirements 5.6
  
  - [x]* 4.3 Write unit tests for Builder API
    - Test building simple 3-node graph
    - Test chained method calls
    - Test invalid node reference error
    - Test invalid edge reference error
    - Test empty graph construction
    - _Requirements: 5.1-5.8_

- [x] 5. Checkpoint - Ensure core model and builder tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement JSON schema and parser
  - [x] 6.1 Define JSON schema types
    - Create TypeScript interfaces matching JSON structure
    - Define schema for nodes, edges, lines
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [x] 6.2 Implement JSONParser class
    - Implement parse method returning Result<RailGraph, ParseError>
    - Validate JSON structure and required fields
    - Convert JSON objects to RailGraph entities
    - Return descriptive errors with field paths for invalid input
    - _Requirements: 4.4, 4.5_
  
  - [x] 6.3 Implement JSONSerializer class
    - Implement serialize method converting RailGraph to JSON string
    - Ensure output conforms to JSON schema
    - _Requirements: 4.6_
  
  - [x]* 6.4 Write property test for JSON round-trip
    - **Property 5: JSON Serialization Round-Trip** - Validates: Requirements 4.7
  
  - [x]* 6.5 Write unit tests for JSON parser
    - Test parsing valid JSON document
    - Test parsing invalid JSON with missing fields
    - Test serialization of simple graph
    - Test round-trip with complex graph
    - _Requirements: 4.4, 4.5, 4.6, 4.7_

- [x] 7. Implement railML 3 XML parser
  - [x] 7.1 Implement RailMLParser class structure
    - Create RailMLParser implementing Parser<string> interface
    - Implement main parse method with XML parsing
    - Set up XML DOM parsing and validation
    - _Requirements: 3.1_
  
  - [x] 7.2 Implement topology extraction
    - Extract netElements and convert to RailNode instances
    - Extract netRelations and convert to RailEdge instances
    - Map topology structure to graph model
    - _Requirements: 3.2_
  
  - [x] 7.3 Implement coordinate extraction
    - Extract screenPositioningSystem coordinates to Screen_Coordinate
    - Extract geographic coordinates to Geographic_Coordinate
    - Extract track lengths and convert to edge length properties
    - _Requirements: 3.3, 3.4, 3.5_
  
  - [x] 7.4 Implement switch and signal extraction
    - Extract switch definitions and map to RailEdge type properties
    - Extract signal positions and create RailNode instances with signal type
    - _Requirements: 3.6, 3.7_
  
  - [x] 7.5 Implement error handling for railML parser
    - Return descriptive errors with line numbers for invalid XML
    - Return errors listing missing required elements
    - _Requirements: 3.8, 3.9_
  
  - [x]* 7.6 Write unit tests for railML parser
    - Test parsing valid railML 3 document
    - Test parsing invalid XML with syntax errors
    - Test parsing document with missing required elements
    - Test coordinate extraction for all coordinate types
    - Test switch and signal extraction
    - Use fixture files for test data
    - _Requirements: 3.1-3.9_

- [x] 8. Checkpoint - Ensure parser tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement coordinate projection utilities
  - [x] 9.1 Implement geographic projection functions
    - Implement Web Mercator projection (lat/lon to x/y)
    - Implement inverse Web Mercator projection
    - _Requirements: 6.9_
  
  - [x]* 9.2 Write unit tests for geographic projection
    - Test projection of known coordinates
    - Test inverse projection
    - Test projection accuracy within tolerance
    - _Requirements: 6.9_

- [x] 10. Implement CoordinateBridge for linear referencing
  - [x] 10.1 Create CoordinateBridge class structure
    - Implement constructor accepting linear and screen graphs
    - Validate that graphs have identical topology
    - Build internal segment index on construction
    - _Requirements: 10.1, 10.2_
  
  - [x] 10.2 Implement linear-to-screen projection
    - Implement projectToScreen method
    - Implement segment lookup with binary search
    - Implement linear interpolation along edges
    - Implement parametric interpolation for curved edges
    - Handle multi-segment tracks with distance accumulation
    - Return ProjectionError for out-of-range coordinates
    - _Requirements: 10.3, 10.5, 10.6, 10.8_
  
  - [x] 10.3 Implement screen-to-linear projection
    - Implement projectToLinear method
    - Find nearest edge to screen coordinate
    - Calculate linear distance from interpolation factor
    - _Requirements: 10.4_
  
  - [x]* 10.4 Write property tests for CoordinateBridge
    - **Property 24: Linear Coordinate Interpolation** - Validates: Requirements 10.5
    - **Property 25: Out-of-Range Coordinate Rejection** - Validates: Requirements 10.6
    - **Property 26: Coordinate Bridge Round-Trip** - Validates: Requirements 10.7
    - **Property 27: Multi-Segment Distance Accumulation** - Validates: Requirements 10.8
  
  - [x]* 10.5 Write unit tests for CoordinateBridge
    - Test projection with simple 2-node track
    - Test projection with multi-segment track
    - Test out-of-range coordinate error
    - Test round-trip projection accuracy
    - Test curved edge interpolation
    - _Requirements: 10.1-10.8_

- [x] 11. Implement styling configuration
  - [x] 11.1 Define StylingConfiguration interface
    - Define track styling properties (strokeColor, strokeWidth, fillColor)
    - Define station styling properties (radius, fillColor, strokeColor)
    - Define signal styling properties (size, fillColor)
    - Define switch styling properties (scaleFactor)
    - Define DEFAULT_STYLING constant
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 11.6_
  
  - [x]* 11.2 Write unit tests for styling configuration
    - Test default styling values
    - Test custom styling configuration
    - _Requirements: 9.8_

- [x] 12. Implement track primitives and switch templates
  - [x] 12.1 Define switch template data structures
    - Create SwitchTemplate interface
    - Define SWITCH_TEMPLATES constant with templates for all switch types
    - Include templates for left_turnout, right_turnout, double_crossover, single_crossover
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [x] 12.2 Implement TrackPrimitive interface and implementations
    - Define TrackPrimitive interface with generatePath method
    - Implement StraightPrimitive for straight track rendering
    - Implement CurvePrimitive for curved track with Bézier curves
    - Implement SwitchPrimitive for switch template application
    - Calculate Bézier control points from curvature radius
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_
  
  - [x]* 12.3 Write unit tests for track primitives
    - Test straight primitive generates M and L commands only
    - Test curve primitive generates C commands
    - Test Bézier control point calculation accuracy
    - Test switch primitive applies correct template
    - Test switch template orientation and scaling
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 8.5, 8.6, 8.7, 8.8_

- [x] 13. Implement SVG renderer
  - [x] 13.1 Create SVGRenderer class structure
    - Implement constructor accepting optional StylingConfiguration
    - Implement main render method returning SVG string
    - _Requirements: 6.1, 9.7_
  
  - [x] 13.2 Implement coordinate projection for rendering
    - Implement projectCoordinates method
    - Use coordinates directly for screen coordinate system
    - Apply Web Mercator projection for geographic coordinates
    - _Requirements: 6.8, 6.9_
  
  - [x] 13.3 Implement viewBox calculation
    - Calculate bounding box from all node coordinates
    - Set SVG viewBox to encompass all nodes
    - _Requirements: 6.6_
  
  - [x] 13.4 Implement edge rendering
    - Render RailEdge instances as SVG path elements
    - Apply appropriate track primitive based on geometry type
    - Add CSS classes to path elements
    - Apply styling configuration to paths
    - _Requirements: 6.2, 6.7, 7.1, 7.2, 7.4_
  
  - [x] 13.5 Implement node rendering
    - Render station nodes as SVG circle elements
    - Render signal nodes as SVG polygon elements
    - Add CSS classes to node elements
    - Apply styling configuration to nodes
    - _Requirements: 6.3, 6.4, 6.7_
  
  - [x] 13.6 Implement styling application
    - Apply StylingConfiguration to all rendered elements
    - Use DEFAULT_STYLING when configuration not provided
    - Set stroke, fill, stroke-width attributes from configuration
    - _Requirements: 6.5, 9.7, 9.8_
  
  - [x]* 13.7 Write property tests for SVG renderer
    - **Property 8: SVG Validity** - Validates: Requirements 6.1
    - **Property 9: Edge Rendering Completeness** - Validates: Requirements 6.2
    - **Property 10: Station Node Rendering** - Validates: Requirements 6.3
    - **Property 11: Signal Node Rendering** - Validates: Requirements 6.4
    - **Property 12: Styling Application** - Validates: Requirements 6.5
    - **Property 13: ViewBox Encompasses All Nodes** - Validates: Requirements 6.6
    - **Property 14: CSS Class Presence** - Validates: Requirements 6.7
    - **Property 15: Screen Coordinate Direct Mapping** - Validates: Requirements 6.8
    - **Property 16: Geographic Coordinate Projection** - Validates: Requirements 6.9
    - **Property 17: Straight Geometry Rendering** - Validates: Requirements 7.1
    - **Property 18: Curve Geometry Rendering** - Validates: Requirements 7.2
    - **Property 19: Bézier Control Point Calculation** - Validates: Requirements 7.3
    - **Property 20: Switch Template Application** - Validates: Requirements 7.4, 8.5, 8.6
    - **Property 21: Switch Template Orientation** - Validates: Requirements 8.7
    - **Property 22: Switch Template Scaling** - Validates: Requirements 8.8
    - **Property 23: Default Styling Fallback** - Validates: Requirements 9.8
  
  - [x]* 13.8 Write unit tests for SVG renderer
    - Test rendering simple 2-node graph
    - Test rendering graph with all node types
    - Test rendering graph with all geometry types
    - Test rendering with custom styling
    - Test rendering with default styling
    - Test viewBox calculation
    - Test CSS class application
    - Test coordinate projection for geographic coordinates
    - _Requirements: 6.1-6.9, 7.1-7.7, 8.1-8.8, 9.1-9.8_

- [x] 14. Checkpoint - Ensure rendering tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Set up package exports and type definitions
  - [x] 15.1 Configure package.json exports
    - Set up main entry point exporting RailGraph and core types
    - Set up parsers submodule export
    - Set up renderer submodule export
    - Set up coordinates submodule export
    - Set up builder submodule export
    - Set up types submodule export
    - Configure dual ESM and CommonJS exports
    - _Requirements: 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8_
  
  - [x] 15.2 Create main index.ts entry point
    - Export RailGraph, RailNode, RailEdge, RailLine from model
    - Export all coordinate types
    - Export error classes
    - Re-export from submodules
    - _Requirements: 13.2, 11.1, 11.2, 11.3, 11.4, 11.5_
  
  - [x] 15.3 Create types/index.d.ts for TypeScript definitions
    - Export all public TypeScript types
    - Ensure strict mode compatibility
    - Verify zero compilation errors
    - _Requirements: 11.1-11.9_
  
  - [x]* 15.4 Write unit tests for package exports
    - Test importing from main entry point
    - Test importing from submodules
    - Test TypeScript type availability
    - _Requirements: 13.2-13.7_

- [x] 16. Create documentation and examples
  - [x] 16.1 Write README.md
    - Add installation instructions
    - Add basic usage examples for Builder API
    - Add basic usage examples for parsers
    - Add basic usage examples for renderer
    - Add basic usage examples for CoordinateBridge
    - Document package structure and exports
    - _Requirements: 13.9_
  
  - [x] 16.2 Create example files
    - Create example using Builder API to construct graph
    - Create example parsing JSON and rendering to SVG
    - Create example using CoordinateBridge for linear referencing
    - _Requirements: 13.9_

- [ ] 17. Final checkpoint - Run all tests and verify package
  - Run all unit tests and property tests
  - Verify TypeScript compilation with zero errors
  - Verify test coverage meets goals (90% line coverage, 85% branch coverage)
  - Verify all error codes are tested
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples, edge cases, and error conditions
- The implementation uses TypeScript with strict mode throughout
- Testing uses fast-check for property-based testing
- Checkpoints ensure incremental validation at logical breaks
